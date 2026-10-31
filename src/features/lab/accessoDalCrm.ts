import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'

// L'accesso automatico della vista cliente (31/10/2026). Il pulsante «Vedi come cliente» del CRM non apre
// piu' direttamente il portale: passa da una rotta del CRM che, dopo aver controllato che chi clicca sia
// abilitato (`portale_vista_staff`), genera un token monouso di accesso **per lo stesso indirizzo di chi
// guarda** (mai per il cliente) e rimanda qui con
//
//     /?come=<email del cliente>#th=<token>
//
// Il token sta nel frammento (`#`): non parte verso nessun server, non finisce nei log ne' nel Referer. Qui lo si
// consuma subito: si toglie dall'indirizzo (la cronologia del browser non lo tiene) e si apre la sessione con
// `verifyOtp`. Dopo, tutto e' come prima: `vista.ts` legge `?come=`, e ogni richiesta porta
// `X-Athlon-Come` con la sessione di chi guarda, che il server controlla.
//
// Se il token non vale (gia' usato, scaduto, rete) non succede niente di grave: si resta dove si era e, senza
// una sessione, si vede la pagina di accesso come prima. Solo sul web.
//
// Una promessa sola per pagina: piu' schermate chiedono la sessione insieme, e il frammento lo legge e lo toglie
// la prima; le altre aspettano lo stesso esito (e vedono la sessione gia' aperta).

let inCorso: Promise<void> | null = null

function leggiEToglieToken(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null
  try {
    const frammento = window.location.hash.replace(/^#/, '')
    if (!frammento) return null
    const parametri = new URLSearchParams(frammento)
    const token = parametri.get('th')
    if (token === null) return null
    // Si toglie sempre, anche se il token e' sporco: non deve restare nell'indirizzo.
    parametri.delete('th')
    const resto = parametri.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${resto ? `#${resto}` : ''}`)
    return /^[A-Za-z0-9_-]{16,200}$/.test(token) ? token : null
  } catch {
    return null
  }
}

async function consuma(token: string): Promise<void> {
  // Supabase Auth chiama «email» il tipo del token di un link magico, e «magiclink» e' il nome di prima: si prova l'uno e poi l'altro.
  for (const tipo of ['email', 'magiclink'] as const) {
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: tipo })
      if (!error) return
    } catch {
      // si prova l'altro tipo, poi si lascia la pagina di accesso
    }
  }
}

/** Da chiamare prima di leggere la sessione: se l'indirizzo porta un accesso dal CRM, lo consuma. Non solleva mai. */
export function consumaAccessoDalCrm(): Promise<void> {
  if (!inCorso) {
    const token = leggiEToglieToken()
    inCorso = token ? consuma(token) : Promise.resolve()
  }
  return inCorso
}
