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

async function calendario(corpo: Record<string, unknown>): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, stato: 401, dati: { errore: 'Sessione scaduta: entra di nuovo.' } }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-lab-calendario`, {
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

export async function leggiGiorno(data?: string, memberId?: number): Promise<{ ok: true; giorno: Giorno } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'giorno', data, member_id: memberId })
  if (ok) return { ok: true, giorno: dati as unknown as Giorno }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere il calendario adesso.' }
}

export async function prenotaLezione(classId: number, memberId: number): Promise<{ ok: true; esito: 'prenotato' | 'attesa'; booking_id: number | null } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'prenota', class_id: classId, member_id: memberId })
  if (ok) return { ok: true, esito: dati.esito, booking_id: dati.booking_id ?? null }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a prenotare adesso.' }
}

export async function disdiciLezione(classId: number, memberId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'disdici', class_id: classId, member_id: memberId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a disdire adesso.' }
}
