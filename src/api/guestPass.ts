import { SUPABASE_URL } from '@/config'
import { supabase } from '@/lib/supabase'

// Il Guest Pass dal link (in prova, solo per i tester del laboratorio): la
// richiesta con l'email (Edge Function `guest-pass`), e dal laboratorio la
// richiesta per un famigliare. Il resto si fa dal link /r/<codice>
// (portale-link → guest-pass).

export type StatoVerifica = 'non_disponibile' | 'non_idoneo' | 'socio' | 'registrazione'

/** I dati di chi si registra: quelli di AddGuestMember, coi consensi. */
export type DatiRegistrazione = {
  nome: string
  cognome: string
  cellulare: string
  nascita: string
  codice_fiscale: string
  via: string
  cap: string
  citta: string
  privacy: boolean
  marketing: boolean
}

async function chiama(corpo: Record<string, unknown>, token?: string): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/guest-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: 'Connessione non riuscita. Controlla la rete e riprova.' } }
  }
}

export async function verificaGuestPass(email: string): Promise<{ ok: true; stato: StatoVerifica; motivo: string | null } | { ok: false; errore: string }> {
  const { ok, dati } = await chiama({ azione: 'verifica', email })
  if (ok) return { ok: true, stato: dati.stato, motivo: dati.motivo ?? null }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a controllare l’email adesso.' }
}

export async function richiediGuestPass(email: string, dati?: DatiRegistrazione): Promise<{ ok: true } | { ok: false; errore: string }> {
  const r = await chiama({ azione: 'richiedi', email, ...(dati ? { dati } : {}) })
  if (r.ok) return { ok: true }
  return { ok: false, errore: r.dati.errore ?? 'Non siamo riusciti a mandarti il link adesso.' }
}

/** Dal laboratorio: il Guest Pass per un famigliare, col link al tester. */
export async function labRichiediGuestPass(memberId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, errore: 'Sessione scaduta: entra di nuovo.' }
  const r = await chiama({ azione: 'lab_richiedi', member_id: memberId }, token)
  if (r.ok) return { ok: true }
  return { ok: false, errore: r.dati.errore ?? 'Non siamo riusciti a mandarti il link adesso.' }
}
