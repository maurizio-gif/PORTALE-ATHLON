import { CRM_URL, SUPABASE_URL } from '@/config'

import type { Calendario, GiornoPrenotabile } from './appuntamenti'
import { t } from '@/lib/lingua'

// I moduli di Club Life nell'app: chi e' dentro scrive il suo, e l'app manda la
// stessa richiesta che manda il sito. Le rotte sono le stesse (il CRM per gli
// appuntamenti, le funzioni `sito-*` per il resto) e rispondono a chiunque,
// con l'origine dell'app sul web (`app.athlonroma.it`) o senza origine su iOS e
// Android: quindi qui non si autentica niente, e a decidere cosa fidarsi di
// quello che arriva sono le rotte, che ricontrollano ogni campo.
//
// Nessun consenso viene dichiarato per conto di chi scrive: un campo omesso non
// tocca la scheda su PerfectGym, uno dichiarato si'.

export type Esito<T = unknown> = ({ ok: true } & T) | { ok: false; errore: string; slotOccupato?: boolean }

const ERRORE_RETE = t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.')

async function chiama(url: string, init: RequestInit): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(url, init)
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: ERRORE_RETE } }
  }
}

const postJson = (url: string, corpo: unknown): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> =>
  chiama(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), keepalive: true })

// ---------------------------------------------------------------------------
// Gli appuntamenti telefonici: il desk e il Direttore Tecnico del nuoto, che
// sono due calendari diversi perche' sono due persone diverse.

const RADICE: Record<Calendario, string> = {
  desk: '/api/prenotazioni',
  nuoto: '/api/appuntamenti-nuoto',
}

/** Gli orari liberi, giorno per giorno. Mai in cache: un appuntamento preso un istante prima deve togliere il suo slot. */
export async function orariLiberi(calendario: Calendario): Promise<Esito<{ durataMinuti: number; giorni: GiornoPrenotabile[] }>> {
  const r = await chiama(`${CRM_URL}${RADICE[calendario]}/slot`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (r.ok && Array.isArray(r.dati.giorni)) return { ok: true, durataMinuti: Number(r.dati.durataMinuti ?? 10), giorni: r.dati.giorni }
  return { ok: false, errore: r.dati.errore ?? t('Non riusciamo a leggere gli orari disponibili. Riprova fra poco.', 'We can’t load the available times. Try again shortly.') }
}

export type DatiChiamata = {
  data: string
  ora: string
  email: string
  nome: string
  cognome: string
  telefono: string
}

/** L'appuntamento col desk: l'oggetto e' cio' che rende utile la chiamata. */
export async function prenotaDesk(d: DatiChiamata & { oggetto: string }): Promise<Esito<{ data: string; ora: string }>> {
  const r = await postJson(`${CRM_URL}${RADICE.desk}`, { ...d, pagina: '/club-life', origine: 'app', cta: 'club-life-modulo' })
  if (r.ok && r.dati.ok) return { ok: true, data: String(r.dati.data ?? d.data), ora: String(r.dati.ora ?? d.ora) }
  return { ok: false, errore: r.dati.errore ?? t('Non riusciamo a registrare l’appuntamento. Riprova fra poco.', 'We can’t register the appointment. Try again shortly.'), slotOccupato: r.dati.slotOccupato === true }
}

/** L'appuntamento col Direttore Tecnico: il bambino di cui si parla e il motivo, in due parole. */
export async function prenotaNuoto(
  d: DatiChiamata & { minore: { nome: string; cognome: string }; motivo: string },
): Promise<Esito<{ data: string; ora: string }>> {
  const r = await postJson(`${CRM_URL}${RADICE.nuoto}`, { ...d, pagina: '/club-life', origine: 'app', cta: 'club-life-modulo' })
  if (r.ok && r.dati.ok) return { ok: true, data: String(r.dati.data ?? d.data), ora: String(r.dati.ora ?? d.ora) }
  return { ok: false, errore: r.dati.errore ?? t('Non riusciamo a registrare l’appuntamento. Riprova fra poco.', 'We can’t register the appointment. Try again shortly.'), slotOccupato: r.dati.slotOccupato === true }
}

// ---------------------------------------------------------------------------
// Scrivere al club: lo stesso «Scrivici» dell'Help Desk del sito.

export async function scriviAlClub(d: {
  email: string
  nome: string
  cognome: string
  numero: string | null
  messaggio: string
  argomento: string
}): Promise<Esito> {
  const r = await postJson(`${SUPABASE_URL}/functions/v1/sito-help-desk`, {
    email: d.email,
    message: d.messaggio,
    firstName: d.nome,
    lastName: d.cognome,
    ...(d.numero ? { userNumber: d.numero } : {}),
    // L'argomento dice al desk di cosa si tratta senza farlo indovinare dal testo: e' una delle chiavi di `TOPIC_LABELS` di `sito-help-desk`.
    topic: d.argomento,
    pagina: '/club-life',
    origine: 'app-club-life',
  })
  if (r.ok) return { ok: true }
  return { ok: false, errore: r.dati.errore ?? r.dati.message ?? t('Non siamo riusciti a inviare il messaggio. Riprova fra qualche minuto.', 'We couldn’t send the message. Try again in a few minutes.') }
}

// ---------------------------------------------------------------------------
// Il cambio abbonamento: lo riceve `sito-cambio-abbonamento`, che legge il
// contratto in corso su PerfectGym e avvisa il desk.

export async function richiediCambioAbbonamento(d: { email: string; decorrenza: string; abbonamento: string; richiesteExtra: string }): Promise<Esito> {
  const r = await postJson(`${SUPABASE_URL}/functions/v1/sito-cambio-abbonamento`, { ...d, pagina: '/club-life' })
  if (r.ok && r.dati.ok) return { ok: true }
  return { ok: false, errore: r.dati.errore ?? t('Non siamo riusciti a inviare la richiesta. Riprova fra qualche minuto.', 'We couldn’t send the request. Try again in a few minutes.') }
}

// ---------------------------------------------------------------------------
// Gli eventi per bambini che si prenotano da un link: il CRM manda l'email, e il
// link dentro si apre nell'app (`/r/<token>`).

export async function richiediLinkEvento(slug: string, email: string): Promise<Esito> {
  const r = await postJson(`${CRM_URL}/api/eventi/richiesta`, { email, evento: slug })
  if (r.ok && r.dati.ok) return { ok: true }
  return { ok: false, errore: r.dati.errore ?? t('Non siamo riusciti a inviare il link. Riprova fra qualche minuto.', 'We couldn’t send the link. Try again in a few minutes.') }
}
