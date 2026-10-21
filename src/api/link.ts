import { SUPABASE_URL } from '@/config'
import { intestazioneLingua } from '@/lib/lingua'

// I link che il club manda per email (`/r/<token>`): ogni chiamata va alla
// funzione `portale-link`, che risolve il token e sa di che operazione si
// tratta. E' pubblica come le funzioni del sito: la credenziale e' il token.

export type RispostaLink = { ok: boolean; stato: number; dati: Record<string, any> }

export async function chiamaLink(token: string, azione: string, corpo: Record<string, unknown> = {}): Promise<RispostaLink> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify({ token, azione, ...corpo }),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: 'Connessione non riuscita. Controlla la rete e riprova.' } }
  }
}
