import { SUPABASE_URL } from '@/config'
import { supabase } from '@/lib/supabase'

// Il Guest Pass dal link (in prova): prima l'email, poi i dati (nome, cognome,
// cellulare e la privacy, sempre) con la Edge Function `guest-pass`, e dal laboratorio la
// richiesta per un famigliare. Il resto si fa dal link /r/<codice>
// (portale-link → guest-pass).

/** Chi e' per PerfectGym: nessuno (diventera' un Lead), un Lead, un Guest o un Member. */
export type TipoVerifica = 'nuovo' | 'lead' | 'guest' | 'member'

/** I dati del secondo passo: sempre, gia' compilati per chi il club conosce. */
export type DatiContatto = {
  nome: string
  cognome: string
  cellulare: string
  privacy: boolean
  marketing: boolean
}

export type EsitoVerifica =
  | { ok: true; idoneo: false; motivo: string | null }
  | { ok: true; idoneo: true; tipo: TipoVerifica; persona: { nome: string | null; cognome: string | null; telefono: string | null } | null }
  | { ok: false; errore: string }

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

export async function verificaGuestPass(email: string): Promise<EsitoVerifica> {
  const { ok, dati } = await chiama({ azione: 'verifica', email })
  if (!ok) return { ok: false, errore: dati.errore ?? 'Non riusciamo a controllare l’email adesso.' }
  if (dati.stato === 'non_idoneo' || dati.stato === 'non_disponibile') return { ok: true, idoneo: false, motivo: dati.motivo ?? null }
  return { ok: true, idoneo: true, tipo: (dati.tipo ?? 'nuovo') as TipoVerifica, persona: dati.persona ?? null }
}

export async function richiediGuestPass(
  email: string,
  dati: DatiContatto,
): Promise<{ ok: true } | { ok: false; nonIdoneo: boolean; errore: string }> {
  const r = await chiama({ azione: 'richiedi', email, dati })
  if (r.ok) return { ok: true }
  return { ok: false, nonIdoneo: r.dati.non_idoneo === true, errore: r.dati.errore ?? 'Non siamo riusciti a mandarti il link adesso.' }
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
