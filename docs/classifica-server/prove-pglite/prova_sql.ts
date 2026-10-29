// Prova della migrazione 20261029a su un Postgres vero (PGlite) con uno schema finto di PerfectGym e delle tabelle del portale:
// 1) la migrazione gira per intero; 2) il punteggio SQL e quello TypeScript coincidono su centinaia di scenari casuali;
// 3) chi e' dentro, il ricalcolo, la revoca, i diritti.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { punteggioMese, spostaGiorno, ultimoDelMese } from '/private/tmp/claude-501/prova_classifica/supabase/functions/_shared/classifica/punteggio.ts'

const MIGRAZIONE = process.env.MIGRAZIONE ?? '/Volumes/MTARUGGI/Github NEW/PORTALE-ATHLON/.claude/worktrees/apri-preview-portale-90481f/docs/classifica-server/supabase/migrations/20261029a_athlon_classifica.sql'
const db = new PGlite()

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
`)

// 1) La migrazione, per intero, e poi un'altra volta (deve essere rieseguibile).
await db.exec(readFileSync(MIGRAZIONE, 'utf8'))
await db.exec(readFileSync(MIGRAZIONE, 'utf8'))
console.log('ok  la migrazione gira per intero, e una seconda volta senza errori')
const job = await db.query<{ jobname: string }>(`select jobname from cron.job`)
assert.equal(job.rows.length >= 1, true)

// 2) Scenari casuali.
let seme = 20261029
const rnd = () => {
  seme |= 0
  seme = (seme + 0x6d2b79f5) | 0
  let t = Math.imul(seme ^ (seme >>> 15), 1 | seme)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const scegli = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
const giornoRoma = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const OGGI_VERO = giornoRoma(new Date())
const MESI = ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']

const N = 400
const histo: Record<string, number> = {}
let conFood = 0
let conRecover = 0
let diversi = 0
for (let s = 1; s <= N; s++) {
  const id = 100 + s
  const mese = scegli(MESI)
  const m1 = ultimoDelMese(mese)
  const massimo = [spostaGiorno(m1, 4), OGGI_VERO].sort()[0]
  const minimo = spostaGiorno(mese, -3)
  const oggi = spostaGiorno(minimo, Math.floor(rnd() * (Math.round((Date.parse(massimo) - Date.parse(minimo)) / 86400000) + 1)))
  const p = 0.05 + rnd() * 0.85
  const giorniTrain = new Set<string>()
  const primeTrain: string[] = []
  await db.exec(`insert into perfectgym.members (id, nome, cognome, data_nascita) values (${id}, 'N${id}', 'C${id}', '1985-05-05')`)
  for (let g = spostaGiorno(mese, -25); g <= spostaGiorno(oggi, 2); g = spostaGiorno(g, 1)) {
    if (rnd() > p) continue
    const tipo = scegli(['visita', 'visita', 'lezione', 'lezione', 'entrambi', 'lezione_non_valida'])
    if (tipo === 'visita' || tipo === 'entrambi') {
      // L'ora in UTC: vicino alla mezzanotte la data a Roma cambia (le 22:30 UTC sono le 23:30 o 00:30 del giorno dopo).
      const ora = scegli([0, 3, 9, 12, 15, 21, 22, 23])
      const quando = new Date(`${g}T${String(ora).padStart(2, '0')}:30:00Z`)
      await db.exec(`insert into perfectgym.member_club_visits (member_id, entrata, is_deleted) values (${id}, '${quando.toISOString()}', ${rnd() < 0.05})`)
      const cancellata = false
      if (!cancellata) {
        // il riferimento ricava la data a Roma e salta le righe cancellate: lo si legge dal flag appena scritto
      }
    }
    if (tipo === 'lezione' || tipo === 'entrambi' || tipo === 'lezione_non_valida') {
      if (g <= spostaGiorno(oggi, -1) && g <= spostaGiorno(OGGI_VERO, -1)) {
        const quando = new Date(`${g}T${String(scegli([8, 10, 18, 19, 22])).padStart(2, '0')}:00:00Z`)
        await db.exec(`insert into perfectgym.classes (id, inizio) values (${id * 1000 + Math.floor(rnd() * 900)}, '${quando.toISOString()}') on conflict do nothing`)
      }
    }
  }
  // Si rilegge dal database cio' che e' stato scritto e si costruisce il riferimento con le regole scritte a parte, in JS.
  // (Le righe cancellate o non valide non contano.)
  const visite = await db.query<{ entrata: string; is_deleted: boolean }>(`select entrata, is_deleted from perfectgym.member_club_visits where member_id = ${id}`)
  const lezioni = await db.query<{ id: number; inizio: string }>(`select id, inizio from perfectgym.classes where id between ${id * 1000} and ${id * 1000 + 999}`)
  // Per ogni lezione una prenotazione, con flag casuali: solo se presente e non annullata/in attesa/cancellata conta.
  const validiLezione: string[] = []
  for (const l of lezioni.rows) {
    const annullata = rnd() < 0.15
    const inAttesa = rnd() < 0.1
    const presente = rnd() < 0.85
    const cancellata = rnd() < 0.05
    await db.exec(`insert into perfectgym.class_bookings (class_id, member_id, annullata, in_attesa, presente, is_deleted) values (${l.id}, ${id}, ${annullata}, ${inAttesa}, ${presente}, ${cancellata})`)
    if (presente && !annullata && !inAttesa && !cancellata) validiLezione.push(giornoRoma(new Date(l.inizio)))
  }
  const validiVisita = visite.rows.filter((v) => !v.is_deleted).map((v) => giornoRoma(new Date(v.entrata)))
  const tutti = [...validiVisita, ...validiLezione]
  const primaTrain = tutti.length ? [...tutti].sort()[0] : null
  for (const g of tutti) giorniTrain.add(g)

  // Food
  const consensoFood = scegli(['nessuno', 'corrente', 'vecchio', 'revocato', 'nascosto', 'corrente_senza_profilo'])
  const senzaColazione = rnd() < 0.3
  if (consensoFood !== 'nessuno') {
    await db.exec(`insert into public.alimentazione_consensi (member_id, versione, revocato_il) values (${id}, '${consensoFood === 'vecchio' ? '2026-10-19' : '2026-10-20'}', ${consensoFood === 'revocato' ? 'now()' : 'null'})`)
    if (consensoFood !== 'corrente_senza_profilo') {
      await db.exec(`insert into public.alimentazione_profilo (member_id, questionario, nascondi_numeri) values (${id}, '${JSON.stringify(senzaColazione ? { colazione: 'mai' } : { colazione: 'sempre' })}', ${consensoFood === 'nascosto'})`)
    }
  }
  const diario = new Map<string, Set<string>>()
  const pf = rnd()
  for (let g = spostaGiorno(mese, -25); g <= spostaGiorno(oggi, 2); g = spostaGiorno(g, 1)) {
    if (rnd() > pf * 0.9) continue
    const pasti = ['colazione', 'pranzo', 'cena', 'spuntino'].filter(() => rnd() < 0.7)
    if (!pasti.length) continue
    diario.set(g, new Set(pasti))
    for (const x of pasti) {
      await db.exec(`insert into public.diario_alimentare (member_id, data, pasto) values (${id}, '${g}', '${x}')`)
      if (rnd() < 0.2) await db.exec(`insert into public.diario_alimentare (member_id, data, pasto) values (${id}, '${g}', '${x}')`) // doppione: non cambia niente
    }
  }
  const richiesti = senzaColazione ? ['pranzo', 'cena'] : ['colazione', 'pranzo', 'cena']
  const giorniFood = [...diario].filter(([, set]) => richiesti.every((x) => set.has(x))).map(([g]) => g)
  const primaFood = diario.size ? [...diario.keys()].sort()[0] : null
  const foodInUso = consensoFood === 'corrente' || consensoFood === 'nascosto' ? consensoFood === 'corrente' : false

  // Recover
  const consensoRec = scegli(['nessuno', 'corrente', 'vecchio', 'revocato'])
  if (consensoRec !== 'nessuno') {
    await db.exec(`insert into public.dispositivi_consensi (member_id, versione, revocato_il) values (${id}, '${consensoRec === 'vecchio' ? '2026-10-19' : '2026-10-20'}', ${consensoRec === 'revocato' ? 'now()' : 'null'})`)
  }
  const notti = new Map<string, { manuale: number | null; apple: number | null }>()
  const pn = rnd()
  for (let g = spostaGiorno(mese, -25); g <= spostaGiorno(oggi, 2); g = spostaGiorno(g, 1)) {
    if (rnd() > pn) continue
    const r = { manuale: rnd() < 0.7 ? scegli([240, 290, 299, 300, 330, 359, 360, 380, 419, 420, 430, 500]) : null, apple: rnd() < 0.5 ? scegli([250, 310, 370, 419, 420, 440, 520, null as unknown as number]) : null }
    notti.set(g, r)
    if (r.manuale !== null) await db.exec(`insert into public.dispositivi_giorni (member_id, fornitore, data, sonno_minuti) values (${id}, 'manuale', '${g}', ${r.manuale})`)
    if (r.apple !== null) await db.exec(`insert into public.dispositivi_giorni (member_id, fornitore, data, sonno_minuti) values (${id}, 'apple', '${g}', ${r.apple})`)
  }
  const nottiRif = [...notti]
    .map(([giorno, r]) => ({ giorno, minuti: r.apple ?? r.manuale })) // il dispositivo vince sulla notte scritta a mano
    .filter((n): n is { giorno: string; minuti: number } => n.minuti !== null)
  const primaNotte = nottiRif.length ? nottiRif.map((n) => n.giorno).sort()[0] : null
  const recoverInUso = consensoRec === 'corrente'

  if (foodInUso) conFood++
  if (recoverInUso) conRecover++

  const ts = punteggioMese({
    mese, oggi,
    giorniTrain: [...giorniTrain], primaTrain,
    food: foodInUso ? { giorni: giorniFood, prima: primaFood } : null,
    recover: recoverInUso ? { notti: nottiRif, prima: primaNotte } : null,
  })
  const q = await db.query<{ punteggio: number; giorni_attivi: number }>(`select * from public.athlon_classifica_punteggio(${id}, '${mese}'::date, '${oggi}'::date)`)
  const sqlr = q.rows[0]
  if (sqlr.punteggio !== ts.punteggio || sqlr.giorni_attivi !== ts.giorni_attivi) {
    diversi++
    console.log('DIVERSI', { s, id, mese, oggi, sql: sqlr, ts, consensoFood, consensoRec, p })
    if (diversi > 5) break
  }
  const b = Math.min(9, Math.floor(sqlr.punteggio / 10)) * 10
  histo[`${b}-${b + 9}`] = (histo[`${b}-${b + 9}`] ?? 0) + 1
}
assert.equal(diversi, 0, 'SQL e TypeScript devono coincidere')
console.log(`ok  ${N} scenari casuali: punteggio e giorni attivi uguali in SQL e in TypeScript (Food in uso in ${conFood}, Recover in ${conRecover})`)
console.log('    distribuzione dei punteggi:', JSON.stringify(histo))

// 3) Chi e' dentro, il ricalcolo, la revoca, i diritti.
await db.exec(`delete from public.athlon_classifica_mese; delete from public.athlon_classifica_consensi;`)
const mesiPrima = await db.query(`select count(*)::int n from public.athlon_classifica_mese`)
assert.equal((mesiPrima.rows[0] as { n: number }).n, 0)
// 1 adulto dentro; 2 versione vecchia; 3 revocato; 4 tolto dallo staff; 5 minorenne; 6 scheda cancellata; 7 senza consenso; 8 adulto dentro (secondo)
for (const [id, nasc, cancellato] of [[501, '1990-01-01', false], [502, '1990-01-01', false], [503, '1990-01-01', false], [504, '1990-01-01', false], [505, '2012-01-01', false], [506, '1990-01-01', true], [507, '1990-01-01', false], [508, '1980-03-03', false]] as [number, string, boolean][]) {
  await db.exec(`insert into perfectgym.members (id, nome, cognome, data_nascita, is_deleted) values (${id}, 'N${id}', 'C${id}', '${nasc}', ${cancellato})`)
  for (const g of ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23']) {
    await db.exec(`insert into perfectgym.member_club_visits (member_id, entrata) values (${id}, '${g}T10:00:00Z')`)
  }
}
const c = (id: number, versione: string, extra = '') => db.exec(`insert into public.athlon_classifica_consensi (member_id, versione ${extra ? ', ' + extra.split('=')[0] : ''}) values (${id}, '${versione}' ${extra ? ', ' + extra.split('=')[1] : ''})`)
await c(501, '2026-10-29')
await c(502, '2026-10-19')
await c(503, '2026-10-29', 'revocato_il=now()')
await c(504, '2026-10-29', 'rimossa_dallo_staff=true')
await c(505, '2026-10-29')
await c(506, '2026-10-29')
await c(508, '2026-10-29')
const dentro = await db.query<{ member_id: string }>(`select member_id from public.athlon_classifica_dentro order by 1`)
assert.deepEqual(dentro.rows.map((r) => Number(r.member_id)), [501, 508])
console.log('ok  dentro sono solo 501 e 508: non chi ha una versione vecchia, ha revocato, e\' stato tolto dallo staff, e\' minorenne o ha la scheda cancellata')

const n1 = await db.query<{ n: number }>(`select public.athlon_classifica_ricalcola('2026-10-01'::date, null) as n`)
assert.equal(n1.rows[0].n, 2)
const righe = await db.query<{ member_id: string; riga_id: string; punteggio: number }>(`select member_id, riga_id, punteggio from public.athlon_classifica_mese where mese = '2026-10-01' order by member_id`)
assert.deepEqual(righe.rows.map((r) => Number(r.member_id)), [501, 508])
assert.ok(righe.rows.every((r) => r.punteggio > 0))
const id1 = righe.rows[0].riga_id
// Il ricalcolo e' idempotente e l'identificativo della riga resta lo stesso.
await db.exec(`select public.athlon_classifica_ricalcola('2026-10-01'::date, null)`)
const righe2 = await db.query<{ riga_id: string }>(`select riga_id from public.athlon_classifica_mese where mese = '2026-10-01' and member_id = 501`)
assert.equal(righe2.rows[0].riga_id, id1)
console.log('ok  il ricalcolo scrive solo chi e\' dentro, ed e\' idempotente (la riga ha lo stesso identificativo)')

// Un solo socio: si ricalcola solo lui.
await db.exec(`update public.athlon_classifica_mese set punteggio = 1 where mese = '2026-10-01'`)
await db.exec(`select public.athlon_classifica_ricalcola('2026-10-01'::date, 501)`)
const dopo = await db.query<{ member_id: string; punteggio: number }>(`select member_id, punteggio from public.athlon_classifica_mese where mese = '2026-10-01' order by member_id`)
assert.ok(dopo.rows[0].punteggio > 1 && dopo.rows[1].punteggio === 1)
console.log('ok  il ricalcolo di un solo socio non tocca gli altri')

// La revoca: appena non e' piu' dentro, il ricalcolo lo toglie dal mese.
await db.exec(`update public.athlon_classifica_consensi set revocato_il = now() where member_id = 508`)
await db.exec(`select public.athlon_classifica_ricalcola('2026-10-01'::date, null)`)
const restano = await db.query<{ member_id: string }>(`select member_id from public.athlon_classifica_mese where mese = '2026-10-01'`)
assert.deepEqual(restano.rows.map((r) => Number(r.member_id)), [501])
await db.exec(`update public.athlon_classifica_consensi set rimossa_dallo_staff = true where member_id = 501`)
await db.exec(`select public.athlon_classifica_ricalcola('2026-10-01'::date, null)`)
assert.equal((await db.query(`select 1 from public.athlon_classifica_mese where mese = '2026-10-01'`)).rows.length, 0)
console.log('ok  chi revoca o viene tolto dallo staff esce dal mese al ricalcolo')

// Il giro (mese in corso) gira e restituisce un numero.
const giro = await db.query<{ n: number }>(`select public.athlon_classifica_giro() as n`)
assert.equal(typeof giro.rows[0].n, 'number')
console.log('ok  il giro notturno gira')

// I diritti: nessuno tranne service_role.
const diritti = await db.query<{ chi: string; cosa: string; si: boolean }>(`
  select r as chi, f as cosa, has_function_privilege(r, f, 'execute') as si
    from unnest(array['anon','authenticated','service_role']) r,
         unnest(array['public.athlon_classifica_punteggio(bigint,date,date)','public.athlon_classifica_ricalcola(date,bigint)','public.athlon_classifica_giro()','public.athlon_classifica_versione(text)']) f`)
for (const d of diritti.rows) assert.equal(d.si, d.chi === 'service_role', `${d.chi} ${d.cosa}`)
const tab = await db.query<{ chi: string; tabella: string; si: boolean }>(`
  select r as chi, t as tabella, has_table_privilege(r, t, 'select') as si
    from unnest(array['anon','authenticated']) r,
         unnest(array['public.athlon_classifica_consensi','public.athlon_classifica_mese','public.athlon_classifica_segnalazioni','public.athlon_classifica_consensi_log','public.athlon_classifica_config','public.athlon_classifica_dentro']) t`)
for (const d of tab.rows) assert.equal(d.si, false, `${d.chi} legge ${d.tabella}`)
const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(`select relname, relrowsecurity from pg_class where relname like 'athlon_classifica_%' and relkind = 'r'`)
assert.ok(rls.rows.length === 5 && rls.rows.every((r) => r.relrowsecurity))
console.log('ok  solo service_role esegue le funzioni; anon e authenticated non leggono nessuna tabella; RLS accesa su tutte e cinque')

// Un solo socio per riga del mese e un solo consenso: i vincoli.
await assert.rejects(db.exec(`insert into public.athlon_classifica_mese (mese, member_id, punteggio) values ('2026-10-15', 1, 5)`)) // non e' il primo del mese
await assert.rejects(db.exec(`insert into public.athlon_classifica_mese (mese, member_id, punteggio) values ('2026-10-01', 1, 101)`))
await assert.rejects(db.exec(`insert into public.athlon_classifica_consensi (member_id, versione, motto) values (900, 'x', '${'a'.repeat(81)}')`))
console.log('ok  i vincoli: mese = primo del mese, punteggio 0-100, motto di al massimo 80 caratteri')
console.log('\nPGlite: tutto passato.')
