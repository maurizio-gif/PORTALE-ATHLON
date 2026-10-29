// La classifica mensile dell'Athlon Health Score nell'app dei soci (app.athlonroma.it/allenamento/classifica), 29/10/2026.
// Il contratto con l'app e' in PORTALE-ATHLON: `src/api/classifica.ts` e `docs/classifica-contratto.md`. Tabelle, calcolo e cron: migrazione 20261029a.
//
//   POST (Authorization: Bearer <sessione del portale>)
//   { azione: 'stato' }                                     <- StatoClassifica (anche per chi non e' dentro: consenso/profilo/me null)
//   { azione: 'consenso', versione, motto?, mostra_foto? }  <- StatoClassifica; 400 se la versione non e' quella corrente, 422 se il motto non passa
//   { azione: 'profilo', motto, mostra_foto }               <- StatoClassifica
//   { azione: 'revoca' }                                    <- StatoClassifica (consenso null); esce subito e cancella motto e scelta della foto
//   { azione: 'mese' }                                      <- { mese, righe, su, aggiornata_il }; 403 con `consenso: false` se non e' dentro
//   { azione: 'segnala', riga }                             <- { ok: true }
//
// **I punti li calcola il database**, di notte (`athlon_classifica_giro`, pg_cron), da fonti che la persona non scrive per Train (tornello e
// presenze segnate dalla reception) e dal diario e dal sonno per Food e Recover, solo con consenso. L'app non manda mai un punto. Qui si
// ricalcola subito solo la riga di chi entra, perche' si veda appena si e' dentro.
// **Chi e' dentro**: consenso vivo alla versione corrente, non tolto dallo staff, maggiorenne (vista `athlon_classifica_dentro`). Solo il
// titolare. **Chi non e' dentro non vede nessun nome**, solo quanti sono. La classifica la vede solo chi e' dentro.
// **Non esce mai** un member_id, un'email, un cognome intero o i punti di un pilastro. La foto di un altro esce solo come link firmato di un'ora
// (bucket `foto-soci`, come l'anagrafica) e solo con `mostra_foto`, consenso vivo e foto non nascosta dallo staff.
// **Lo staff non vede niente da qui**: nessuna azione e' fra le LETTURE di _shared/sessione-portale.ts, quindi in vista cliente ogni azione e' 403.

import postgres from 'npm:postgres@3.4.5'
import { cancello, leggiCorpo, rispostaJson } from '../_shared/sito.ts'
import { ammessoAlPortale, solaLettura, utentePortale, vietataInVista } from '../_shared/sessione-portale.ts'
import { conLingua, t } from '../_shared/lingua.ts'
import { fotoFirmataDi } from '../_shared/foto-socio.ts'
import { VERSIONE_INFORMATIVA_FOOD } from '../_shared/alimentazione/versione.ts'
import { VERSIONE_INFORMATIVA as VERSIONE_INFORMATIVA_DISPOSITIVI } from '../_shared/dispositivi/tipi.ts'
import { VERSIONE_INFORMATIVA_CLASSIFICA } from '../_shared/classifica/versione.ts'
import { validaMotto } from '../_shared/classifica/motto.ts'
import { giornoRoma, meseDa, nomePubblico, posizioni, rigaPubblica, scegliRighe, type Candidato } from '../_shared/classifica/righe.ts'

// idle_timeout: la connessione si chiude dopo 10 s senza lavoro (come le altre funzioni: senza, esaurivano le connessioni del database).
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, idle_timeout: 10, max: 1 })
const nonRiuscito = () => t('Non siamo riusciti a completare adesso. Riprova fra qualche minuto.', 'We couldn’t complete this right now. Please try again in a few minutes.')
/** Quante segnalazioni al giorno per persona. */
const SEGNALAZIONI_AL_GIORNO = 20

// Le versioni delle tre informative, dal codice al database: il giro notturno non puo' leggere le costanti di TypeScript.
let versioniScritte = false
async function scriviVersioni() {
  if (versioniScritte) return
  await sql`
    insert into public.athlon_classifica_config (chiave, valore)
    values ('food', ${VERSIONE_INFORMATIVA_FOOD}), ('dispositivi', ${VERSIONE_INFORMATIVA_DISPOSITIVI}), ('classifica', ${VERSIONE_INFORMATIVA_CLASSIFICA})
    on conflict (chiave) do update set valore = excluded.valore, aggiornato_il = now()
      where public.athlon_classifica_config.valore is distinct from excluded.valore`
  versioniScritte = true
}

type Scheda = { nome: string | null; cognome: string | null; data_nascita: string | Date | null }
async function schedaDi(memberId: number): Promise<Scheda | null> {
  const [m] = await sql<Scheda[]>`select nome, cognome, data_nascita from perfectgym.members where id = ${memberId} and not is_deleted`
  return m ?? null
}

/** Maggiorenne secondo la data di nascita della scheda del club; senza data, no (come in portale-lab-alimentazione). */
function maggiorenne(m: Scheda | null): boolean {
  if (!m?.data_nascita) return false
  const n = new Date(m.data_nascita)
  return Date.UTC(n.getUTCFullYear() + 18, n.getUTCMonth(), n.getUTCDate()) <= Date.now()
}

type Consenso = { versione: string; accettato_il: string | Date; mostra_foto: boolean; motto: string | null }
/** Il consenso se e' vivo: non revocato, alla versione corrente, non tolto dallo staff. */
async function consensoVivo(memberId: number): Promise<Consenso | null> {
  const [c] = await sql<Consenso[]>`
    select versione, accettato_il, mostra_foto, motto
      from public.athlon_classifica_consensi
     where member_id = ${memberId} and revocato_il is null and not rimossa_dallo_staff and versione = ${VERSIONE_INFORMATIVA_CLASSIFICA}`
  return c ?? null
}

/** Chi ha almeno un punto nel mese, dal primo, con le posizioni (parimerito = stessa posizione). Solo chi e' dentro. */
async function graduatoria(inizio: string) {
  const righe = await sql<{ member_id: string; riga_id: string; punteggio: number }[]>`
    select m.member_id, m.riga_id, m.punteggio
      from public.athlon_classifica_mese m
      join public.athlon_classifica_dentro d on d.member_id = m.member_id
     where m.mese = ${inizio}::date and m.punteggio >= 1
     order by m.punteggio desc, m.giorni_attivi desc, m.riga_id`
  const candidati: Candidato[] = righe.map((r) => ({ member_id: Number(r.member_id), riga_id: r.riga_id, punti: r.punteggio }))
  return posizioni(candidati)
}

async function costruisciStato(memberId: number) {
  const mese = meseDa(giornoRoma(new Date()))
  const [scheda, c, [conta]] = await Promise.all([
    schedaDi(memberId),
    consensoVivo(memberId),
    sql<{ n: number }[]>`select count(*)::int as n from public.athlon_classifica_dentro`,
  ])
  const adulto = maggiorenne(scheda)
  let me: { posizione: number | null; su: number; punti: number } | null = null
  if (c && adulto) {
    const ordinata = await graduatoria(mese.inizio)
    const io = ordinata.find((r) => r.member_id === memberId)
    const [mio] = await sql<{ punteggio: number }[]>`select punteggio from public.athlon_classifica_mese where mese = ${mese.inizio}::date and member_id = ${memberId}`
    me = { posizione: io?.posizione ?? null, su: ordinata.length, punti: mio?.punteggio ?? 0 }
  }
  return {
    ok: true,
    mese,
    versione: VERSIONE_INFORMATIVA_CLASSIFICA,
    maggiorenne: adulto,
    consenso: c ? { versione: c.versione, accettato_il: new Date(c.accettato_il).toISOString() } : null,
    nome_pubblico: nomePubblico(scheda?.nome, scheda?.cognome),
    partecipanti: conta?.n ?? 0,
    profilo: c ? { motto: c.motto, mostra_foto: c.mostra_foto } : null,
    me,
  }
}

const senzaConsenso = (req: Request) =>
  rispostaJson(req, 403, { ok: false, consenso: false, errore: t('Per vedere la classifica devi prima entrarci.', 'To see the leaderboard you need to join it first.') })
const soloAdulti = (req: Request) => rispostaJson(req, 403, { ok: false, errore: t('La classifica è riservata ai maggiorenni.', 'The leaderboard is for members aged 18 and over.') })

async function stato(req: Request, memberId: number) {
  return rispostaJson(req, 200, await costruisciStato(memberId))
}

async function consenso(req: Request, memberId: number, corpo: Record<string, unknown>) {
  if (corpo.versione !== VERSIONE_INFORMATIVA_CLASSIFICA) {
    return rispostaJson(req, 400, { ok: false, errore: t('Il testo del consenso è cambiato: riapri la classifica e rileggilo.', 'The consent text has changed: reopen the leaderboard and read it again.') })
  }
  if (!maggiorenne(await schedaDi(memberId))) return soloAdulti(req)
  const motto = validaMotto(corpo.motto)
  if (!motto.ok) return rispostaJson(req, 422, { ok: false, errore: motto.errore })
  const [prima] = await sql<{ rimossa_dallo_staff: boolean }[]>`select rimossa_dallo_staff from public.athlon_classifica_consensi where member_id = ${memberId}`
  if (prima?.rimossa_dallo_staff) return rispostaJson(req, 403, { ok: false, errore: t('Non è possibile partecipare alla classifica.', 'It isn’t possible to take part in the leaderboard.') })
  const mostraFoto = corpo.mostra_foto === true
  await sql.begin(async (tx) => {
    await tx`
      insert into public.athlon_classifica_consensi as c (member_id, versione, accettato_il, revocato_il, mostra_foto, motto, aggiornato_il)
      values (${memberId}, ${VERSIONE_INFORMATIVA_CLASSIFICA}, now(), null, ${mostraFoto}, ${motto.motto}, now())
      on conflict (member_id) do update set
        versione = excluded.versione, accettato_il = now(), revocato_il = null, mostra_foto = excluded.mostra_foto, aggiornato_il = now(),
        -- Se la persona rientra con un motto diverso, la decisione dello staff sul motto di prima non vale per il nuovo.
        motto_nascosto = case when c.motto is distinct from excluded.motto then false else c.motto_nascosto end,
        motto = excluded.motto`
    await tx`insert into public.athlon_classifica_consensi_log (member_id, azione, versione) values (${memberId}, 'consenso', ${VERSIONE_INFORMATIVA_CLASSIFICA})`
  })
  // Chi entra si vede subito: si ricalcola la sua riga senza aspettare il giro della notte.
  await sql`select public.athlon_classifica_ricalcola(null::date, ${memberId}::bigint)`
  return await stato(req, memberId)
}

async function profilo(req: Request, memberId: number, corpo: Record<string, unknown>) {
  if (!(await consensoVivo(memberId))) return senzaConsenso(req)
  if (typeof corpo.mostra_foto !== 'boolean') return rispostaJson(req, 400, { ok: false, errore: t('Manca la scelta sulla foto.', 'The photo choice is missing.') })
  const motto = validaMotto(corpo.motto)
  if (!motto.ok) return rispostaJson(req, 422, { ok: false, errore: motto.errore })
  await sql`
    update public.athlon_classifica_consensi set
      motto_nascosto = case when motto is distinct from ${motto.motto} then false else motto_nascosto end,
      motto = ${motto.motto}, mostra_foto = ${corpo.mostra_foto}, aggiornato_il = now()
     where member_id = ${memberId} and revocato_il is null`
  return await stato(req, memberId)
}

async function revoca(req: Request, memberId: number) {
  await sql.begin(async (tx) => {
    const uscita = await tx`
      update public.athlon_classifica_consensi
         set revocato_il = now(), motto = null, mostra_foto = false, aggiornato_il = now()
       where member_id = ${memberId} and revocato_il is null
       returning versione`
    if (uscita.length) await tx`insert into public.athlon_classifica_consensi_log (member_id, azione, versione) values (${memberId}, 'revoca', ${uscita[0].versione})`
    // Sparisce subito: la riga del mese (e quelle dei mesi passati) si cancellano, e la vista `dentro` non la include piu'.
    await tx`delete from public.athlon_classifica_mese where member_id = ${memberId}`
  })
  return await stato(req, memberId)
}

async function mese(req: Request, memberId: number) {
  const [scheda, c] = await Promise.all([schedaDi(memberId), consensoVivo(memberId)])
  if (!c) return senzaConsenso(req)
  if (!maggiorenne(scheda)) return soloAdulti(req)
  const m = meseDa(giornoRoma(new Date()))
  const ordinata = await graduatoria(m.inizio)
  const scelte = scegliRighe(ordinata, memberId)
  const ids = scelte.map((r) => r.member_id)
  const dettagli = ids.length
    ? await sql<{ member_id: string; nome: string | null; cognome: string | null; motto: string | null; motto_nascosto: boolean; mostra_foto: boolean; foto_nascosta: boolean }[]>`
        select c.member_id, mm.nome, mm.cognome, c.motto, c.motto_nascosto, c.mostra_foto, c.foto_nascosta
          from public.athlon_classifica_consensi c
          join perfectgym.members mm on mm.id = c.member_id
         where c.member_id in ${sql(ids)}`
    : []
  const perId = new Map(dettagli.map((d) => [Number(d.member_id), d]))
  const righe = await Promise.all(
    scelte.map(async (r) => {
      const d = perId.get(r.member_id)
      const foto = d?.mostra_foto && !d.foto_nascosta ? await fotoFirmataDi(sql, r.member_id) : null
      return rigaPubblica(r, d, foto, memberId)
    }),
  )
  const [agg] = await sql<{ quando: Date | null }[]>`select max(ricalcolata_il) as quando from public.athlon_classifica_mese where mese = ${m.inizio}::date`
  return rispostaJson(req, 200, { ok: true, mese: m, righe, su: ordinata.length, aggiornata_il: agg?.quando ? new Date(agg.quando).toISOString() : null })
}

async function segnala(req: Request, memberId: number, corpo: Record<string, unknown>) {
  const riga = typeof corpo.riga === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(corpo.riga) ? corpo.riga : null
  if (!riga) return rispostaJson(req, 400, { ok: false, errore: t('Non troviamo la riga da segnalare.', 'We can’t find the entry to report.') })
  if (!(await consensoVivo(memberId))) return senzaConsenso(req)
  const m = meseDa(giornoRoma(new Date()))
  const [r] = await sql<{ member_id: string }[]>`
    select x.member_id
      from public.athlon_classifica_mese x
      join public.athlon_classifica_dentro d on d.member_id = x.member_id
     where x.riga_id = ${riga}::uuid and x.mese = ${m.inizio}::date`
  if (!r) return rispostaJson(req, 404, { ok: false, errore: t('Questa riga non c’è più.', 'This entry is no longer there.') })
  if (Number(r.member_id) === memberId) return rispostaJson(req, 400, { ok: false, errore: t('Non puoi segnalare la tua riga.', 'You can’t report your own entry.') })
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from public.athlon_classifica_segnalazioni where segnalata_da = ${memberId} and creata_il > now() - interval '1 day'`
  if (n >= SEGNALAZIONI_AL_GIORNO) return rispostaJson(req, 429, { ok: false, errore: t('Hai fatto molte segnalazioni oggi: riprova domani.', 'You’ve made a lot of reports today: please try again tomorrow.') })
  await sql`
    insert into public.athlon_classifica_segnalazioni (mese, riga_member_id, segnalata_da)
    values (${m.inizio}::date, ${Number(r.member_id)}, ${memberId})
    on conflict (mese, riga_member_id, segnalata_da) do nothing`
  return rispostaJson(req, 200, { ok: true })
}

Deno.serve(conLingua(async (req) => {
  const chiuso = cancello(req)
  if (chiuso) return chiuso

  try {
    const sessione = await utentePortale(req)
    if (!sessione) return rispostaJson(req, 401, { ok: false, errore: t('Sessione scaduta: entra di nuovo.', 'Your session has expired: please sign in again.') })
    if (!(await ammessoAlPortale(sessione))) return rispostaJson(req, 403, { ok: false, errore: t('Questo indirizzo non è fra i tester del laboratorio.', 'This address isn’t on the app’s tester list.') })

    const corpo = await leggiCorpo(req)
    // La classifica espone dati di una persona ad altre persone: in vista cliente nessuna azione passa, nemmeno la lettura.
    if (vietataInVista(sessione, 'portale-lab-classifica', corpo.azione)) return rispostaJson(req, 403, { ok: false, errore: solaLettura() })

    const [nucleo] = await sql`select titolare from public.metodo_nucleo_da_email(${sessione.email})`
    if (!nucleo?.titolare) return rispostaJson(req, 409, { ok: false, errore: t('Non troviamo una scheda del club con la tua email.', 'We can’t find a club profile with your email.') })
    const memberId = Number(nucleo.titolare)
    await scriviVersioni()

    switch (corpo.azione) {
      case 'stato':
        return await stato(req, memberId)
      case 'consenso':
        return await consenso(req, memberId, corpo)
      case 'profilo':
        return await profilo(req, memberId, corpo)
      case 'revoca':
        return await revoca(req, memberId)
      case 'mese':
        return await mese(req, memberId)
      case 'segnala':
        return await segnala(req, memberId, corpo)
      default:
        return rispostaJson(req, 400, { ok: false, errore: 'Azione sconosciuta.' })
    }
  } catch (e) {
    console.error('portale-lab-classifica:', e)
    return rispostaJson(req, 500, { ok: false, errore: nonRiuscito() })
  }
}))
