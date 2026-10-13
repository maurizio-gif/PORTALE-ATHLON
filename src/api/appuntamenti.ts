import { CRM_URL } from '@/config'

// Gli appuntamenti telefonici col desk e col Direttore Tecnico del nuoto, dal
// link nell'email di conferma (`/r/<uuid>.<firma>`). Il token e' firmato dal
// CRM, e sono le sue rotte a verificarlo e a leggere il calendario:
// `/api/prenotazioni/[token]` (desk) e `/api/appuntamenti-nuoto/[token]`
// (Direttore Tecnico). Il link non dice quale dei due: si prova il desk, poi
// il nuoto. Le firme sono diverse, quindi un token apre al massimo uno dei due.

export type GiornoPrenotabile = { data: string; etichetta: string; giornoSettimana: number; slot: string[] }

export type Appuntamento = { data: string; ora: string; stato: string; nome: string; oggetto: string; durataMinuti: number }

export type Calendario = 'desk' | 'nuoto'

const ROTTE: Record<Calendario, string> = {
  desk: '/api/prenotazioni',
  nuoto: '/api/appuntamenti-nuoto',
}

/** La forma di un token di appuntamento: l'id della voce e la firma. */
export function eTokenAppuntamento(token: string): boolean {
  return /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{20,64}$/i.test(token)
}

export type Letto =
  | { ok: true; calendario: Calendario; appuntamento: Appuntamento; giorni: GiornoPrenotabile[] }
  | { ok: false; scaduto: boolean }

async function leggiDa(calendario: Calendario, token: string): Promise<Letto> {
  const r = await fetch(`${CRM_URL}${ROTTE[calendario]}/${token}`, { headers: { Accept: 'application/json' } })
  if (r.status === 404) return { ok: false, scaduto: true }
  if (!r.ok) return { ok: false, scaduto: false }
  const dati = (await r.json()) as { appuntamento: Appuntamento; giorni: GiornoPrenotabile[] }
  return { ok: true, calendario, appuntamento: dati.appuntamento, giorni: dati.giorni ?? [] }
}

export async function leggiAppuntamento(token: string): Promise<Letto> {
  try {
    const desk = await leggiDa('desk', token)
    if (desk.ok || !desk.scaduto) return desk
    return await leggiDa('nuoto', token)
  } catch {
    return { ok: false, scaduto: false }
  }
}

export async function giorniLiberi(calendario: Calendario, token: string): Promise<GiornoPrenotabile[] | null> {
  const letto = await leggiDa(calendario, token).catch(() => null)
  return letto?.ok ? letto.giorni : null
}

export type EsitoModifica = { ok: true } | { ok: false; errore: string; slotOccupato?: boolean }

export async function spostaAppuntamento(calendario: Calendario, token: string, scelto: { data: string; ora: string }): Promise<EsitoModifica> {
  try {
    const r = await fetch(`${CRM_URL}${ROTTE[calendario]}/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scelto),
    })
    const corpo = (await r.json().catch(() => ({}))) as { errore?: string; slotOccupato?: boolean }
    if (r.ok) return { ok: true }
    return { ok: false, errore: corpo.errore ?? 'Non riusciamo a spostare l’appuntamento. Riprova fra poco.', slotOccupato: corpo.slotOccupato }
  } catch {
    return { ok: false, errore: 'Non riusciamo a spostare l’appuntamento. Riprova fra poco.' }
  }
}

export async function annullaAppuntamento(calendario: Calendario, token: string): Promise<EsitoModifica> {
  try {
    const r = await fetch(`${CRM_URL}${ROTTE[calendario]}/${token}`, { method: 'DELETE' })
    if (r.ok) return { ok: true }
  } catch {
    // sotto
  }
  return { ok: false, errore: 'Non riusciamo ad annullare adesso. Riprova fra poco o scrivici a desk@athlonroma.it.' }
}
