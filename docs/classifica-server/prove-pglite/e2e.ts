// La funzione portale-lab-classifica (index.ts vera, impacchettata) su un Postgres vero (PGlite), con la sessione e le foto simulate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const MIGRAZIONE = '/Volumes/MTARUGGI/Github NEW/PORTALE-ATHLON/.claude/worktrees/apri-preview-portale-90481f/docs/classifica-server/supabase/migrations/20261029a_athlon_classifica.sql'
const db = new PGlite()
;(globalThis as any).__db = db
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema perfectgym; create schema cron;
create table perfectgym.members (id bigint primary key, nome text, cognome text, data_nascita date, is_deleted boolean not null default false);
create table perfectgym.member_club_visits (id bigserial primary key, member_id bigint, entrata timestamptz, is_deleted boolean not null default false);
create table perfectgym.classes (id bigserial primary key, inizio timestamptz, is_deleted boolean not null default false);
create table perfectgym.class_bookings (id bigserial primary key, class_id bigint, member_id bigint, annullata boolean not null default false, in_attesa boolean not null default false, presente boolean not null default false, is_deleted boolean not null default false);
create table public.alimentazione_consensi (id uuid primary key default gen_random_uuid(), member_id bigint, versione text, accettato_il timestamptz default now(), revocato_il timestamptz);
create table public.alimentazione_profilo (member_id bigint primary key, questionario jsonb not null default '{}', nascondi_numeri boolean not null default false);
create table public.diario_alimentare (id uuid primary key default gen_random_uuid(), member_id bigint, data date, pasto text);
create table public.dispositivi_consensi (id uuid primary key default gen_random_uuid(), member_id bigint, versione text, accettato_il timestamptz default now(), revocato_il timestamptz);
create table public.dispositivi_giorni (member_id bigint, fornitore text, data date, sonno_minuti int, aggiornato_il timestamptz default now(), primary key (member_id, fornitore, data));
create table cron.job (jobname text);
create function cron.unschedule(j text) returns boolean language sql as $$ select true $$;
create function cron.schedule(j text, s text, c text) returns bigint language sql as $$ insert into cron.job values (j); select 1::bigint $$;
create table public.nuclei (email text primary key, titolare bigint);
create function public.metodo_nucleo_da_email(p_email text) returns table (titolare bigint) language sql as $$ select n.titolare from public.nuclei n where n.email = p_email $$;
`)
await db.exec(readFileSync(MIGRAZIONE, 'utf8'))

// Il mondo finto: la funzione si carica con un `Deno` finto.
let handler: (req: Request) => Promise<Response>
;(globalThis as any).Deno = { serve: (h: typeof handler) => { handler = h }, env: { get: (k: string) => (k === 'SUPABASE_DB_URL' ? 'postgres://finto' : undefined) } }
await import('/private/tmp/claude-501/e2e/dist/funzione.mjs')

const chiama = async (email: string, corpo: object, intestazioni: Record<string, string> = {}) => {
  const r = await handler(new Request('http://x/functions/v1/portale-lab-classifica', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-email': email, ...intestazioni }, body: JSON.stringify(corpo) }))
  const testo = await r.text()
  return { stato: r.status, testo, dati: JSON.parse(testo) }
}
const GIORNI = ['2026-10-01', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26', '2026-10-27']
async function socio(id: number, nasc: string, visite: string[], nome = `Nome${id}`, cognome = `Cognome${id}`) {
  await db.exec(`insert into perfectgym.members (id, nome, cognome, data_nascita) values (${id}, '${nome}', '${cognome}', '${nasc}')`)
  await db.exec(`insert into public.nuclei (email, titolare) values ('m${id}@test', ${id})`)
  for (const g of visite) await db.exec(`insert into perfectgym.member_club_visits (member_id, entrata) values (${id}, '${g}T09:00:00Z')`)
}
const mail = (id: number) => `m${id}@test`
const VERSIONE = '2026-10-29'
let passi = 0
const ok = (s: string) => { passi++; console.log(`ok  ${s}`) }

// Gli altri soci, dentro, con punteggi diversi (da 1 a 14 giorni di ingresso nel mese).
for (let k = 1; k <= 14; k++) {
  await socio(700 + k, '1985-05-05', GIORNI.slice(0, k), `Altro${k}`, `Rossi${k}`)
  await db.exec(`insert into public.athlon_classifica_consensi (member_id, versione, mostra_foto, motto) values (${700 + k}, '${VERSIONE}', ${k % 2 === 0}, ${k === 3 ? `'Un passo alla volta'` : 'null'})`)
}
await socio(601, '1990-01-01', ['2026-10-12'], 'Marco', 'Rossi Bianchi') // la persona che prova: un solo ingresso
await socio(602, '2012-06-01', GIORNI, 'Piccolo', 'Minorenne')
await socio(603, '1990-01-01', GIORNI, 'Tolta', 'Staff')
await db.exec(`select public.athlon_classifica_ricalcola(null::date, null)`)

// --- prima del consenso
let r = await chiama(mail(601), { azione: 'stato' })
assert.equal(r.stato, 200)
assert.equal(r.dati.consenso, null)
assert.equal(r.dati.profilo, null)
assert.equal(r.dati.me, null)
assert.equal(r.dati.maggiorenne, true)
assert.equal(r.dati.nome_pubblico, 'Marco R.')
assert.equal(r.dati.partecipanti, 14)
assert.equal(r.dati.versione, VERSIONE)
assert.deepEqual(r.dati.mese, { id: '2026-10', inizio: '2026-10-01', fine: '2026-10-31', giorni_rimasti: 3 })
assert.ok(!r.testo.includes('Altro') && !r.testo.includes('Rossi1'), 'chi non e\' dentro non vede nessun nome')
ok('stato prima del consenso: senza consenso, profilo e posizione; solo quanti sono (14), nessun nome; «Marco R.»')

r = await chiama(mail(601), { azione: 'mese' })
assert.equal(r.stato, 403)
assert.equal(r.dati.consenso, false)
for (const azione of ['profilo', 'segnala']) {
  const x = await chiama(mail(601), { azione, motto: null, mostra_foto: false, riga: '00000000-0000-4000-8000-000000000000' })
  assert.equal(x.stato, 403, azione)
}
ok('mese, profilo e segnala senza consenso: 403 con consenso:false')

// --- il consenso
r = await chiama(mail(601), { azione: 'consenso', versione: '2026-01-01' })
assert.equal(r.stato, 400)
r = await chiama(mail(601), { azione: 'consenso', versione: VERSIONE, motto: 'scrivimi a me@esempio.it' })
assert.equal(r.stato, 422)
assert.ok(r.dati.errore.length > 5)
assert.equal((await db.query(`select 1 from public.athlon_classifica_consensi where member_id = 601`)).rows.length, 0)
r = await chiama(mail(602), { azione: 'consenso', versione: VERSIONE })
assert.equal(r.stato, 403)
r = await chiama(mail(601), { azione: 'consenso', versione: VERSIONE, motto: '  Ogni   giorno  un po\' meglio ', mostra_foto: true })
assert.equal(r.stato, 200)
assert.equal(r.dati.consenso.versione, VERSIONE)
assert.deepEqual(r.dati.profilo, { motto: 'Ogni giorno un po\' meglio', mostra_foto: true })
assert.equal(r.dati.partecipanti, 15)
assert.ok(r.dati.me && r.dati.me.punti > 0, 'chi entra si vede subito: la sua riga e\' gia\' ricalcolata')
assert.equal(r.dati.me.su, 15)
assert.ok(r.dati.me.posizione >= 11, 'con un solo ingresso e\' in fondo')
const log = await db.query(`select azione, versione from public.athlon_classifica_consensi_log where member_id = 601`)
assert.deepEqual(log.rows, [{ azione: 'consenso', versione: VERSIONE }])
ok('consenso: versione sbagliata 400, motto con una mail 422 (e non salva niente), minorenne 403; valido: dentro subito, motto ripulito, registro scritto')

// --- le versioni delle informative sono state scritte per il giro notturno
const cfg = await db.query<{ chiave: string; valore: string }>(`select chiave, valore from public.athlon_classifica_config order by 1`)
assert.deepEqual(cfg.rows, [{ chiave: 'classifica', valore: VERSIONE }, { chiave: 'dispositivi', valore: '2026-10-20' }, { chiave: 'food', valore: '2026-10-20' }])
ok('la funzione scrive nel database le tre versioni delle informative (le legge il giro di notte)')

// --- la classifica del mese
r = await chiama(mail(601), { azione: 'mese' })
assert.equal(r.stato, 200)
const righe = r.dati.righe as { id: string; posizione: number; nome: string; punti: number; motto: string | null; foto: string | null; tu: boolean }[]
assert.equal(r.dati.su, 15)
assert.ok(r.dati.aggiornata_il)
assert.equal(righe.filter((x) => x.tu).length, 1)
const io = righe.find((x) => x.tu)!
assert.equal(io.motto, 'Ogni giorno un po\' meglio')
assert.ok(righe.every((x, i) => i === 0 || x.posizione >= righe[i - 1].posizione), 'in ordine')
assert.equal(righe.filter((x) => x.posizione <= 10).length, righe.filter((x) => x.posizione <= 10).length)
const sopraIo = righe.filter((x) => x.posizione < io.posizione).length
assert.ok(righe.some((x) => x.posizione === 1))
assert.ok(righe.length >= 10 && righe.length <= 15)
assert.ok(righe.every((x) => Object.keys(x).sort().join() === 'foto,id,motto,nome,posizione,punti,tu'))
// Nessun dato interno: ne' member_id, ne' cognomi interi, ne' email, ne' i punti dei pilastri.
for (const vietato of ['Rossi1', 'Cognome', 'Bianchi', '@test', 'member', 'punti_', 'train', 'food', 'recover']) {
  assert.ok(!r.testo.includes(vietato), `esce «${vietato}»`)
}
// Nessun numero uguale a un member_id (601, 701-714) come valore JSON: gli id veri sono uuid, e i punti sono altro.
const numeriNelJson = [...r.testo.matchAll(/[:\[,](\d+)(?=[,}\]])/g)].map((m) => Number(m[1]))
for (const id of [601, ...Array.from({ length: 14 }, (_, k) => 701 + k)]) {
  const posizioniOPunti = new Set(righe.flatMap((x) => [x.posizione, x.punti]))
  if (posizioniOPunti.has(id)) continue
  assert.ok(!numeriNelJson.includes(id), `esce il numero ${id}`)
}
assert.ok(righe.every((x) => /^[0-9a-f-]{36}$/.test(x.id)))
ok(`la classifica: ${righe.length} righe in ordine, io in fondo con i vicini sopra, solo id opaco/posizione/nome/punti/motto/foto/tu; nessun cognome, email, member_id o punti dei pilastri`)

// Le foto: solo di chi le mostra (pari), e firmate; il mio motto c'e', quello di chi non l'ha messo no.
const conFoto = righe.filter((x) => x.foto)
assert.ok(conFoto.every((x) => x.foto!.includes('firma=1h')))
const altro3 = righe.find((x) => x.motto === 'Un passo alla volta')
if (altro3) assert.equal(altro3.foto, null) // Altro3: mostra_foto falso (3 e' dispari)
ok('le foto escono solo per chi ha scelto di mostrarle (link firmato); il motto solo se c\'e\'')

// Lo staff nasconde una foto e un motto: spariscono per gli altri, la persona resta.
await db.exec(`update public.athlon_classifica_consensi set foto_nascosta = true where member_id = 714`)
await db.exec(`update public.athlon_classifica_consensi set motto_nascosto = true where member_id = 703`)
r = await chiama(mail(601), { azione: 'mese' })
const r2 = r.dati.righe as typeof righe
assert.ok(!r.testo.includes('Un passo alla volta'))
assert.ok(r2.every((x) => x.foto === null || !x.foto.includes('/714.')))
assert.equal(r.dati.su, 15)
ok('lo staff nasconde un motto e una foto: spariscono per gli altri, la persona resta in classifica')

// Chi ha lo stesso punteggio ha la stessa posizione.
await db.exec(`update public.athlon_classifica_mese set punteggio = 77 where member_id in (705, 706) and mese = '2026-10-01'`)
r = await chiama(mail(601), { azione: 'mese' })
const pos77 = (r.dati.righe as typeof righe).filter((x) => x.punti === 77).map((x) => x.posizione)
assert.equal(pos77.length, 2)
assert.equal(pos77[0], pos77[1])
ok('i parimerito hanno la stessa posizione')

// --- il profilo
r = await chiama(mail(601), { azione: 'profilo', motto: 'Più forte di ieri', mostra_foto: false })
assert.equal(r.stato, 200)
assert.deepEqual(r.dati.profilo, { motto: 'Più forte di ieri', mostra_foto: false })
r = await chiama(mail(601), { azione: 'profilo', motto: 'vai su www.esempio.it', mostra_foto: false })
assert.equal(r.stato, 422)
r = await chiama(mail(601), { azione: 'profilo', motto: 'ciao' })
assert.equal(r.stato, 400)
r = await chiama(mail(601), { azione: 'profilo', motto: null, mostra_foto: true })
assert.equal(r.stato, 200)
assert.deepEqual(r.dati.profilo, { motto: null, mostra_foto: true })
ok('profilo: motto e foto si cambiano, un motto con un link e\' 422, senza la scelta della foto 400, motto null lo toglie')

// Il motto nascosto dallo staff: un motto nuovo non eredita la decisione sul vecchio.
await db.exec(`update public.athlon_classifica_consensi set motto = 'Vecchio motto', motto_nascosto = true where member_id = 601`)
await chiama(mail(601), { azione: 'profilo', motto: 'Vecchio motto', mostra_foto: false })
assert.equal(((await db.query<{ motto_nascosto: boolean }>(`select motto_nascosto from public.athlon_classifica_consensi where member_id = 601`)).rows[0]).motto_nascosto, true)
await chiama(mail(601), { azione: 'profilo', motto: 'Motto nuovo', mostra_foto: false })
assert.equal(((await db.query<{ motto_nascosto: boolean }>(`select motto_nascosto from public.athlon_classifica_consensi where member_id = 601`)).rows[0]).motto_nascosto, false)
ok('il motto nascosto dallo staff resta nascosto se non si cambia, e un motto nuovo riparte pulito')

// --- le segnalazioni
const rigaAltro = (await chiama(mail(601), { azione: 'mese' })).dati.righe.find((x: any) => !x.tu).id as string
r = await chiama(mail(601), { azione: 'segnala', riga: rigaAltro })
assert.deepEqual(r.dati, { ok: true })
r = await chiama(mail(601), { azione: 'segnala', riga: rigaAltro })
assert.equal(r.stato, 200)
assert.equal((await db.query(`select 1 from public.athlon_classifica_segnalazioni`)).rows.length, 1)
const mio = (await chiama(mail(601), { azione: 'mese' })).dati.righe.find((x: any) => x.tu).id as string
assert.equal((await chiama(mail(601), { azione: 'segnala', riga: mio })).stato, 400)
assert.equal((await chiama(mail(601), { azione: 'segnala', riga: 'non-un-uuid' })).stato, 400)
assert.equal((await chiama(mail(601), { azione: 'segnala', riga: '00000000-0000-4000-8000-000000000000' })).stato, 404)
for (let i = 0; i < 25; i++) await db.exec(`insert into public.athlon_classifica_segnalazioni (mese, riga_member_id, segnalata_da) values ('2026-09-01', ${1000 + i}, 601)`)
assert.equal((await chiama(mail(601), { azione: 'segnala', riga: (await chiama(mail(601), { azione: 'mese' })).dati.righe.filter((x: any) => !x.tu)[1].id })).stato, 429)
ok('segnala: una volta sola per riga, non la propria, id non valido 400, riga che non c\'e\' 404, oltre 20 al giorno 429')

// --- vista cliente: tutto chiuso
for (const azione of ['stato', 'consenso', 'profilo', 'revoca', 'mese', 'segnala']) {
  const x = await chiama(mail(601), { azione, versione: VERSIONE }, { 'x-test-vista': 'staff@test' })
  assert.equal(x.stato, 403, azione)
}
ok('vista cliente: nessuna azione passa (403)')

// --- la revoca
const prima = (await chiama(mail(601), { azione: 'stato' })).dati.partecipanti
r = await chiama(mail(601), { azione: 'revoca' })
assert.equal(r.stato, 200)
assert.equal(r.dati.consenso, null)
assert.equal(r.dati.profilo, null)
assert.equal(r.dati.me, null)
assert.equal(r.dati.partecipanti, prima - 1)
const riga601 = await db.query<{ motto: string | null; mostra_foto: boolean; revocato_il: string | null }>(`select motto, mostra_foto, revocato_il from public.athlon_classifica_consensi where member_id = 601`)
assert.equal(riga601.rows[0].motto, null)
assert.equal(riga601.rows[0].mostra_foto, false)
assert.ok(riga601.rows[0].revocato_il)
assert.equal((await db.query(`select 1 from public.athlon_classifica_mese where member_id = 601`)).rows.length, 0)
const logRevoca = await db.query(`select azione from public.athlon_classifica_consensi_log where member_id = 601 order by il, azione`)
assert.deepEqual(logRevoca.rows.map((x: any) => x.azione).sort(), ['consenso', 'revoca'])
assert.equal((await chiama(mail(601), { azione: 'mese' })).stato, 403)
const dopo = await chiama(mail(701), { azione: 'mese' })
assert.ok(!dopo.testo.includes('Più forte') && !dopo.testo.includes('Motto nuovo'))
assert.ok((dopo.dati.righe as typeof righe).length >= 10)
ok('revoca: esce subito (riga del mese cancellata, motto e foto cancellati, uscita registrata), non vede piu\' la classifica e gli altri non ne vedono traccia')

// Chi e' stato tolto dallo staff non rientra da solo.
await db.exec(`insert into public.athlon_classifica_consensi (member_id, versione, revocato_il, rimossa_dallo_staff) values (603, '${VERSIONE}', now(), true)`)
r = await chiama(mail(603), { azione: 'consenso', versione: VERSIONE })
assert.equal(r.stato, 403)
// Una versione vecchia del consenso non vale: si deve riaccettare.
await db.exec(`update public.athlon_classifica_consensi set versione = '2026-10-01' where member_id = 701`)
r = await chiama(mail(701), { azione: 'stato' })
assert.equal(r.dati.consenso, null)
assert.equal((await chiama(mail(701), { azione: 'mese' })).stato, 403)
ok('chi e\' stato tolto dallo staff non rientra da solo; con una versione vecchia del consenso si deve riaccettare')

// Altro
assert.equal((await chiama(mail(601), { azione: 'boh' })).stato, 400)
assert.equal((await handler(new Request('http://x/', { method: 'POST', body: '{}' }))).status, 401)
assert.equal((await chiama('sconosciuto@test', { azione: 'stato' })).stato, 409)
ok('azione sconosciuta 400, senza sessione 401, senza scheda 409')

console.log(`\n${passi} gruppi di prove sulla funzione, tutti passati.`)
