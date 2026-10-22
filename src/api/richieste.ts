import { CRM_URL } from '@/config'
import { t } from '@/lib/lingua'

// Le richieste via email (binario A del piano): la persona scrive l'email, il
// club le manda un link, la procedura si conclude dal link.
//
// In questa prima tappa si chiamano le rotte che il CRM ha gia' e che usa
// anche il sito: rispondono sempre `ok`, che l'email sia di un socio o no,
// per non rivelare chi e' iscritto. Quando arrivera' `portale-richiesta`
// (Edge Function) cambiera' solo l'indirizzo qui sotto.

export type EsitoRichiesta = { ok: true } | { ok: false; errore: string }

export type TipoRichiesta = 'metodo_pagamento'

const ROTTE: Record<TipoRichiesta, string> = {
  metodo_pagamento: '/api/metodo-pagamento/richiesta',
}

export async function inviaRichiesta(tipo: TipoRichiesta, email: string): Promise<EsitoRichiesta> {
  try {
    const risposta = await fetch(CRM_URL + ROTTE[tipo], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const corpo = (await risposta.json().catch(() => null)) as { ok?: boolean; errore?: string } | null
    if (risposta.ok && corpo?.ok) return { ok: true }
    return { ok: false, errore: corpo?.errore || t('Non siamo riusciti a inviare la richiesta. Riprova tra poco.', 'We couldn’t send the request. Try again shortly.') }
  } catch {
    return { ok: false, errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') }
  }
}

export function emailValida(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}
