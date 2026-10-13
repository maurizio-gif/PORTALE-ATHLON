import { SUPABASE_URL } from '@/config'
import { supabase } from '@/lib/supabase'

// Il laboratorio (binario B): login proprio, fuori da PerfectGym, solo per i
// tester (tabella portale_lab_tester nel database).
//
// Il codice lo manda la funzione `portale-accesso` dalla coda delle email del
// club; qui si verifica con Supabase Auth, e da li' in poi il portale ha una
// sessione vera, con il suo JWT. Funziona uguale sul web e nell'app.

export async function chiediCodice(email: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-accesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const dati = (await r.json().catch(() => null)) as { ok?: boolean; errore?: string } | null
    if (r.ok && dati?.ok) return { ok: true }
    return { ok: false, errore: dati?.errore || 'Non siamo riusciti a mandarti il codice. Riprova tra poco.' }
  } catch {
    return { ok: false, errore: 'Connessione non riuscita. Controlla la rete e riprova.' }
  }
}

export async function entra(email: string, codice: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const token = codice.replace(/\D/g, '')
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (!error) return { ok: true }
  if (/expired|invalid/i.test(error.message)) return { ok: false, errore: 'Codice sbagliato o scaduto. Controlla l’ultima email che ti abbiamo mandato.' }
  return { ok: false, errore: 'Non siamo riusciti a farti entrare. Riprova tra poco.' }
}

export async function esci() {
  await supabase.auth.signOut()
}

export type PersonaArea = {
  member_id: number
  nome: string | null
  cognome: string | null
  numero: string | null
  data_nascita: string | null
  titolare: boolean
  email: string | null
  telefono: string | null
}

export type ContrattoArea = {
  contract_id: number
  member_id: number
  piano: string | null
  stato: string | null
  data_firma: string | null
  data_inizio: string | null
  data_fine: string | null
  rinnovo_automatico: boolean | null
  canone: number | null
  metodo: unknown
}

export type CertificatoArea = { member_id: number; scadenza: string | null; tipo: string | null; stato: string | null }

export type Area =
  | { trovato: false; email: string }
  | { trovato: true; email: string; titolare: number; persone: PersonaArea[]; contratti: ContrattoArea[]; certificati: CertificatoArea[] }

export type EsitoArea = { ok: true; area: Area } | { ok: false; nonAmmesso: boolean; errore: string }

/** L'area riservata: la legge `portale_la_mia_area()` dal mirror di PerfectGym, solo per chi e' fra i tester. */
export async function laMiaArea(): Promise<EsitoArea> {
  const { data, error } = await supabase.rpc('portale_la_mia_area')
  if (!error) return { ok: true, area: data as Area }
  const nonAmmesso = error.code === '42501'
  return {
    ok: false,
    nonAmmesso,
    errore: nonAmmesso ? 'Questo indirizzo non è fra i tester del laboratorio.' : 'Non riusciamo a leggere i tuoi dati adesso. Riprova tra poco.',
  }
}

// ---------------------------------------------------------------------------
// Il calendario (tappa 4): lezioni vere di PerfectGym, prenotazioni vere.

export type Lezione = {
  class_id: number
  inizio: string
  fine: string
  nome: string
  /** La macrocategoria di PerfectGym: Corsi Fitness, Group Reformer, Aqua Fitness, … */
  categoria: string
  istruttore: string | null
  posti: number
  iscritti: number
  liberi: number
  iniziata: boolean
  /** Se la prenotazione non e' ancora aperta: da quando (ISO). Si apre tre giorni prima. */
  prenotabile_dal: string | null
  prenotazione: { booking_id: number; attesa: boolean } | null
  /** La chiave della sua scheda in `Giorno.schede`, se il sito ne ha una. */
  scheda: string | null
}

/** La scheda di una lezione, da https://www.athlonroma.it/lezioni.json (la stessa del planning del sito). */
export type SchedaLezione = {
  nome: string
  /** HTML semplice: <b> e <br>. */
  descrizione: string
  video: string | null
  inizioVideo: number | null
  foto: string | null
  fuoco: string | null
  caratteristiche: { l: string; v: number }[]
}

export type PersonaCalendario = { member_id: number; nome: string | null; cognome: string | null; titolare: boolean }

export type Giorno = {
  persone: PersonaCalendario[]
  giorni: string[]
  data: string
  member_id: number
  prenotazioni_lette: boolean
  lezioni: Lezione[]
  schede: Record<string, SchedaLezione>
}

/** Una funzione del laboratorio, con la sessione del tester. */
async function funzione(nome: string, corpo: Record<string, unknown>): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, stato: 401, dati: { errore: 'Sessione scaduta: entra di nuovo.' } }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: 'Connessione non riuscita. Controlla la rete e riprova.' } }
  }
}

const calendario = (corpo: Record<string, unknown>) => funzione('portale-lab-calendario', corpo)

export async function leggiGiorno(data?: string, memberId?: number): Promise<{ ok: true; giorno: Giorno } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'giorno', data, member_id: memberId })
  if (ok) return { ok: true, giorno: dati as unknown as Giorno }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere il calendario adesso.' }
}

/** Il prodotto PerfectGym che apre la prenotazione di una lezione, per chi non ce l'ha compreso. */
export type ProdottoLezione = { product_id: number; nome: string; prezzo: number | null }

export async function prenotaLezione(
  classId: number,
  memberId: number,
): Promise<{ ok: true; esito: 'prenotato' | 'attesa'; booking_id: number | null } | { ok: false; errore: string; prodotto?: ProdottoLezione }> {
  const { ok, dati } = await calendario({ azione: 'prenota', class_id: classId, member_id: memberId })
  if (ok) return { ok: true, esito: dati.esito, booking_id: dati.booking_id ?? null }
  // Manca il prodotto (niente abbonamento che comprenda la lezione): si puo' comprare.
  if (dati.da_pagare && dati.prodotto) return { ok: false, errore: dati.errore ?? 'Questa lezione non è compresa nel tuo abbonamento.', prodotto: dati.prodotto }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a prenotare adesso.' }
}

/** Il link di pagamento di PerfectGym per il prodotto della lezione; dopo il pagamento si torna al calendario con ?acquisto=<id>. */
export async function acquistaLezione(classId: number, memberId: number): Promise<{ ok: true; url: string } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'acquista', class_id: classId, member_id: memberId })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il pagamento adesso.' }
}

export type EsitoAcquisto = { stato: 'avviato' | 'prenotato' | 'attesa' | 'errore'; errore: string | null; class_id: number; member_id: number }

export async function esitoAcquistoLezione(acquistoId: string): Promise<{ ok: true; esito: EsitoAcquisto } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'esito_acquisto', acquisto_id: acquistoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoAcquisto }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il pagamento adesso.' }
}

export async function disdiciLezione(classId: number, memberId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'disdici', class_id: classId, member_id: memberId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a disdire adesso.' }
}

// ---------------------------------------------------------------------------
// I pagamenti (tappa 4b): Adyen diretto, soldi veri, tetto di 5 euro. Il lavoro
// con Adyen lo fa `lab-pagamenti` nel CRM; `portale-lab-pagamenti` controlla
// solo chi chiama e che l'abbonamento sia suo.

export type PianoLab = { id: string; nome: string; importo_cent: number; rate_totali: number; intervallo_giorni: number }

export type StatoPagamentoLab = 'creato' | 'in_attesa' | 'in_verifica' | 'autorizzato' | 'rifiutato' | 'errore' | 'annullato' | 'scaduto' | 'abbandonato'
export type StatoAbbonamentoLab = 'in_attesa' | 'attivo' | 'insoluto' | 'completato' | 'chiuso'

/** Gli addebiti che aspettano ancora un esito: le pagine si aggiornano da sole. */
export const STATI_IN_CORSO: StatoPagamentoLab[] = ['creato', 'in_attesa', 'in_verifica']

export type PagamentoLab = {
  riferimento: string
  numero_rata: number
  tentativo: number
  importo_cent: number
  stato: StatoPagamentoLab
  esito: string | null
  motivo: string | null
  creato_il: string
  aggiornato_il: string
}

export type AbbonamentoLab = {
  id: string
  creato_il: string
  piano: string
  importo_cent: number
  rate_totali: number
  intervallo_giorni: number
  prossima_il: string | null
  stato: StatoAbbonamentoLab
  metodo: string | null
  ultime_quattro: string | null
  scadenza_carta: string | null
  segnalazione: string | null
  pagamenti: PagamentoLab[]
}

/** Un pagamento visto dalla sua pagina di stato. */
export type StatoDelPagamento = {
  riferimento: string
  numero_rata: number
  tentativo: number
  importo_cent: number
  stato: StatoPagamentoLab
  esito: string | null
  motivo: string | null
  abbonamento_id: string
  piano: string
  stato_abbonamento: StatoAbbonamentoLab
  rate_totali: number
  prossima_il: string | null
  metodo: string | null
  ultime_quattro: string | null
}

/** Quello che serve al Drop-in di Adyen per aprire il pagamento. */
export type SessioneAdyen = {
  riferimento: string
  clientKey: string
  environment: string
  sessione: { id: string; sessionData: string }
}

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string }

const pagamenti = (corpo: Record<string, unknown>) => funzione('portale-lab-pagamenti', corpo)

export async function elencoPagamenti(): Promise<Esito<{ piani: PianoLab[]; abbonamenti: AbbonamentoLab[] }>> {
  const { ok, dati } = await pagamenti({ azione: 'elenco' })
  if (ok) return { ok: true, piani: dati.piani, abbonamenti: dati.abbonamenti }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i pagamenti adesso.' }
}

export async function avviaPagamento(pianoId: string): Promise<Esito<SessioneAdyen>> {
  const { ok, dati } = await pagamenti({ azione: 'checkout', piano_id: pianoId })
  if (ok) return { ok: true, riferimento: dati.riferimento, clientKey: dati.clientKey, environment: dati.environment, sessione: dati.sessione }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti ad aprire il pagamento adesso.' }
}

export async function statoPagamento(riferimento: string): Promise<Esito<{ pagamento: StatoDelPagamento }>> {
  const { ok, dati } = await pagamenti({ azione: 'stato', riferimento })
  if (ok) return { ok: true, pagamento: dati.pagamento }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere il pagamento adesso.' }
}

/** Chiede ad Adyen, dal server, come e' andata la sessione: il browser non fa fede. */
export async function esitoPagamento(riferimento: string, sessioneId: string, risultato: string): Promise<Esito<{ adyen_status: string | null }>> {
  const { ok, dati } = await pagamenti({ azione: 'esito', riferimento, sessione_id: sessioneId, risultato })
  if (ok) return { ok: true, adyen_status: dati.adyen_status ?? null }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il pagamento adesso.' }
}

export async function configurazioneAdyen(): Promise<Esito<{ clientKey: string; environment: string }>> {
  const { ok, dati } = await pagamenti({ azione: 'config' })
  if (ok) return { ok: true, clientKey: dati.clientKey, environment: dati.environment }
  return { ok: false, errore: dati.errore ?? 'Configurazione di Adyen non disponibile.' }
}

export async function addebitaRata(abbonamentoId: string): Promise<Esito<{ rata: number; esito: string | null; motivo: string | null }>> {
  const { ok, dati } = await pagamenti({ azione: 'addebita', abbonamento_id: abbonamentoId })
  if (ok) return { ok: true, rata: dati.rata, esito: dati.esito ?? null, motivo: dati.motivo ?? null }
  return { ok: false, errore: dati.errore ?? 'Addebito non riuscito.' }
}

export async function chiudiAbbonamento(abbonamentoId: string): Promise<Esito<object>> {
  const { ok, dati } = await pagamenti({ azione: 'chiudi', abbonamento_id: abbonamentoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a chiuderlo adesso.' }
}
