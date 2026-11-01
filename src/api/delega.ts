import { SUPABASE_URL } from '@/config'
import { funzione } from '@/api/lab'
import { intestazioneLingua, t } from '@/lib/lingua'

// La delega sui figli a un altro adulto (31/10/2026, richiesta di Maurizio): il titolare del nucleo manda un link, la persona che lo
// apre si registra (nome, cognome, email, cellulare, data di nascita) e da quel momento vede e gestisce i figli come lui.
// Due funzioni di APP-ATHLON, il contratto e' in `docs/delega-nucleo.md`:
//   - `portale-lab-delega` (con la sessione del titolare): `stato`, `crea`, `revoca`;
//   - `delega-invito` (pubblica, senza sessione): `leggi` e `accetta` (il modulo, che manda l'email) per /delega/<codice>; `conferma_leggi` e
//     `conferma` per /delega/conferma/<token>, il link nell'email: **solo la conferma dalla propria casella abbina la persona**.
// L'app non decide niente: chi puo' dare una delega, quanti link, la scadenza, i controlli sulle anagrafiche e cosa si scrive su
// PerfectGym sono della funzione.

export type DelegaAttiva = {
  id: string
  /** Nome e iniziale del cognome, mai l'email («Laura R.»). */
  nome: string
  /** Nome e cognome interi («Laura Rossi»): chi da' la delega sa a chi l'ha data. Una funzione di prima non lo manda (resta `nome`). */
  nome_completo?: string
  dal: string
}

export type LinkDelega = {
  id: string
  link: string
  /** Qualcuno ha compilato il modulo e deve ancora confermare dalla sua email: il link non e' ancora usato. */
  in_attesa: boolean
  scade_il: string
  oggetto: string
  messaggio: string
}

export type StatoDelega =
  | { ok: true; idoneo: false; motivo: string }
  | {
      ok: true
      idoneo: true
      /** I nomi dei figli su cui si da' la delega (solo il nome, per dire a chi si da' l'accesso). */
      figli: string[]
      /** Quante deleghe si possono avere insieme: la dice la funzione. */
      massimo: number
      /** Quanti giorni vale un link: lo dice la funzione. */
      giorni: number
      attive: DelegaAttiva[]
      /** Il link ancora aperto (non scaduto, non usato), se c'e'. */
      aperto: LinkDelega | null
    }
  | { ok: false; errore: string }

const GUASTO = t('Non riusciamo a preparare la delega adesso. Riprova fra qualche minuto.', 'We can’t set up the delegation right now. Try again in a few minutes.')
const NON_ATTIVO = t('La delega ad un altro adulto non è ancora attiva: riprova fra qualche giorno.', 'Delegating to another adult isn’t active yet: try again in a few days.')

function linkDa(d: Record<string, any> | null | undefined): LinkDelega | null {
  if (!d || typeof d.link !== 'string' || !d.link) return null
  return {
    id: String(d.id),
    link: d.link,
    in_attesa: d.in_attesa === true,
    scade_il: String(d.scade_il ?? ''),
    oggetto: String(d.oggetto ?? t('Ti do accesso ai miei figli su Athlon', 'I’m giving you access to my kids on Athlon')),
    messaggio: String(d.messaggio ?? d.link),
  }
}

export async function statoDelega(): Promise<StatoDelega> {
  const { ok, stato, dati } = await funzione('portale-lab-delega', { azione: 'stato' })
  if (!ok) return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO : GUASTO) }
  if (!dati.idoneo) return { ok: true, idoneo: false, motivo: String(dati.motivo ?? '') }
  return {
    ok: true,
    idoneo: true,
    figli: Array.isArray(dati.figli) ? dati.figli.map(String) : [],
    massimo: Number(dati.massimo ?? 2),
    giorni: Number(dati.giorni ?? 7),
    attive: Array.isArray(dati.attive) ? (dati.attive as DelegaAttiva[]) : [],
    aperto: linkDa(dati.aperto),
  }
}

/** Un link nuovo, valido per una persona sola. Se ce n'era uno aperto la funzione lo toglie: e' sempre uno solo. */
export async function creaLinkDelega(): Promise<{ ok: true; link: LinkDelega } | { ok: false; errore: string }> {
  const { ok, stato, dati } = await funzione('portale-lab-delega', { azione: 'crea' })
  const l = ok ? linkDa(dati) : null
  if (l) return { ok: true, link: l }
  return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO : GUASTO) }
}

/** Toglie un link aperto o una delega attiva: dopo, la persona non vede piu' i figli. */
export async function revocaDelega(id: string, cosa: 'link' | 'delega'): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await funzione('portale-lab-delega', { azione: 'revoca', id, cosa })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a toglierla adesso. Riprova fra qualche minuto.', 'We couldn’t remove it right now. Try again in a few minutes.') }
}

// ---------------------------------------------------------------------------------------------------------------------
// La pagina pubblica: chi apre il link
// ---------------------------------------------------------------------------------------------------------------------

async function chiamaPubblica(corpo: Record<string, unknown>): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/delega-invito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') } }
  }
}

export type InvitoDelega = { valido: boolean; nome: string | null; figli: number }

/** Chi ti da' la delega (solo il primo nome) e se il link vale ancora. Senza sessione. */
export async function leggiInvitoDelega(codice: string): Promise<InvitoDelega> {
  const r = await chiamaPubblica({ azione: 'leggi', codice })
  return { valido: r.ok && r.dati.valido === true, nome: r.dati.nome ? String(r.dati.nome) : null, figli: Number(r.dati.figli ?? 0) }
}

/**
 * Chi apre il link scrive **solo l'email** e accetta la privacy (01/11/2026, come ogni registrazione dell'app: se e' gia' al club non si
 * chiedono dati). **Non e' ancora fatta**: la funzione ricontrolla il link e manda un'email a quell'indirizzo con il link per terminare
 * (`/delega/conferma/<token>`). **La risposta e' sempre la stessa**, che la persona sia gia' al club o no: la pagina non deve dire chi e'
 * iscritto. I dati che mancano si chiedono dopo, dal link dell'email. Il link della delega non si consuma qui (un errore di battitura
 * nell'email si corregge rifacendo il passo); si consuma alla conferma. `scaduto` dice che il link non vale piu'.
 */
export async function richiediConfermaDelega(
  codice: string,
  email: string,
  privacy: boolean,
): Promise<{ ok: true } | { ok: false; errore: string; scaduto: boolean }> {
  const r = await chiamaPubblica({ azione: 'accetta', codice, email: email.trim().toLowerCase(), privacy })
  if (r.ok) return { ok: true }
  return {
    ok: false,
    errore: r.dati.errore ?? t('Non siamo riusciti a mandarti l’email adesso. Riprova fra qualche minuto.', 'We couldn’t send you the email right now. Try again in a few minutes.'),
    scaduto: r.dati.scaduto === true,
  }
}

/** I dati che la conferma puo' chiedere: li decide la funzione dalla scheda che c'e' (`campi`), la pagina mostra solo quelli. */
export type CampoDelega = 'nome' | 'cognome' | 'nascita' | 'telefono'
export type DatiConferma = Partial<Record<CampoDelega, string>>

export type AnteprimaConferma = { valido: boolean; nome: string | null; delegato: string | null; campi: CampoDelega[] }

const CAMPI: CampoDelega[] = ['nome', 'cognome', 'nascita', 'telefono']
/** I campi che la funzione chiede, ricontrollati; se la risposta e' sporca si chiede tutto (la funzione ricontrolla alla conferma). */
function campiDa(v: unknown): CampoDelega[] {
  return Array.isArray(v) ? CAMPI.filter((c) => v.includes(c)) : [...CAMPI]
}

/** La pagina del link nell'email: chi ti da' la delega, il tuo nome se c'e' gia' una scheda e **quali dati servono** (spesso nessuno). Non conferma niente. */
export async function leggiConfermaDelega(token: string): Promise<AnteprimaConferma> {
  const r = await chiamaPubblica({ azione: 'conferma_leggi', token })
  return { valido: r.ok && r.dati.valido === true, nome: r.dati.nome ? String(r.dati.nome) : null, delegato: r.dati.delegato ? String(r.dati.delegato) : null, campi: campiDa(r.dati.campi) }
}

/**
 * Il tocco su «Conferma»: **qui** si abbina. Se la persona e' gia' al club (stessa email) la scheda che c'e' si usa com'e', senza
 * riscriverla; se e' nuova la funzione la crea su PerfectGym come Guest. Poi la collega al titolare e ai figli. Il link della delega
 * si consuma adesso. Un tocco e non l'apertura della pagina: i programmi che controllano i link delle email non devono confermare al posto suo.
 */
export async function confermaDelega(
  token: string,
  dati: DatiConferma = {},
): Promise<{ ok: true; nome: string } | { ok: false; errore: string; serve: CampoDelega[] | null }> {
  const r = await chiamaPubblica({ azione: 'conferma', token, ...dati })
  if (r.ok) return { ok: true, nome: String(r.dati.nome ?? '') }
  return {
    ok: false,
    errore: r.dati.errore ?? t('Non siamo riusciti a completare adesso. Riprova fra qualche minuto.', 'We couldn’t complete this right now. Try again in a few minutes.'),
    // Se la funzione dice quali dati mancano (e non e' stato scritto niente) la pagina li mostra; altrimenti e' un errore e basta.
    serve: Array.isArray(r.dati.serve) ? campiDa(r.dati.serve) : null,
  }
}
