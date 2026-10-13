import { useEffect, useRef } from 'react'

import type { SessioneAdyen } from '@/api/lab'

// Il modulo di pagamento di Adyen (Drop-in) sul web, dal CDN con controllo di
// integrita': la stessa versione fissa del CRM (app/dashboard/laboratorio-
// pagamenti/adyen-sdk.ts). Cambiare versione vuol dire ricalcolare gli hash.
// Nell'app nativa c'e' adyen.tsx, che rimanda al web.

const VERSIONE = '6.46.0'
const CDN = `https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/${VERSIONE}`
const HASH_JS = 'sha384-BWFAwV8ndpuOuMAiAu2fKA0Vj2lSBNRCVBKIV2K7G6hRT7+0CaXiFYZxkDgfwY7r'
const HASH_CSS = 'sha384-iqhFsakyeWB88YbaGEhZMvY6gJnakKalS52WEM1jya1sN8udUMNyKpfouOSmYVy/'

type AdyenWeb = {
  AdyenCheckout: (cfg: any) => Promise<any>
  Dropin: new (checkout: any, cfg?: any) => { mount: (el: HTMLElement) => void; unmount: () => void }
}

export const pagamentoDisponibile = true

function caricaSdk(): Promise<AdyenWeb> {
  const w = window as unknown as { AdyenWeb?: AdyenWeb }
  if (w.AdyenWeb) return Promise.resolve(w.AdyenWeb)
  return new Promise((risolvi, rifiuta) => {
    if (!document.querySelector('link[data-adyen-sdk]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = `${CDN}/adyen.css`
      css.integrity = HASH_CSS
      css.crossOrigin = 'anonymous'
      css.setAttribute('data-adyen-sdk', '1')
      document.head.appendChild(css)
    }
    const js = document.createElement('script')
    js.src = `${CDN}/adyen.js`
    js.integrity = HASH_JS
    js.crossOrigin = 'anonymous'
    js.onload = () => (w.AdyenWeb ? risolvi(w.AdyenWeb) : rifiuta(new Error('Il modulo di pagamento non si è caricato.')))
    js.onerror = () => rifiuta(new Error('Non riusciamo a scaricare il modulo di pagamento. Controlla la rete e riprova.'))
    document.head.appendChild(js)
  })
}

/**
 * Il Drop-in montato su una sessione. Qualunque esito racconti il browser si
 * chiama `onFine`: la pagina di stato lo verifica dal server.
 */
export function DropIn({
  sessione,
  onFine,
  onErrore,
}: {
  sessione: SessioneAdyen
  onFine: (sessionResult: string | null) => void
  onErrore: (messaggio: string) => void
}) {
  const contenitore = useRef<HTMLDivElement>(null)
  // Le funzioni cambiano a ogni render: il Drop-in si monta una volta sola.
  const richiami = useRef({ onFine, onErrore })
  richiami.current = { onFine, onErrore }

  useEffect(() => {
    const el = contenitore.current
    if (!el) return
    let attivo = true
    let dropin: { unmount: () => void } | null = null
    const fine = (r: { sessionResult?: string } | undefined) => {
      if (attivo) richiami.current.onFine(r?.sessionResult ? String(r.sessionResult) : null)
    }
    ;(async () => {
      try {
        const { AdyenCheckout, Dropin } = await caricaSdk()
        const checkout = await AdyenCheckout({
          environment: sessione.environment,
          clientKey: sessione.clientKey,
          countryCode: 'IT',
          locale: 'it-IT',
          session: { id: sessione.sessione.id, sessionData: sessione.sessione.sessionData },
          analytics: { enabled: false },
          onPaymentCompleted: fine,
          onPaymentFailed: fine,
          onError: (e: { message?: string }) => {
            if (attivo) richiami.current.onErrore(e?.message ?? 'Errore del modulo di pagamento.')
          },
        })
        if (!attivo) return
        const d = new Dropin(checkout, { openFirstPaymentMethod: true, showStoredPaymentMethods: false })
        d.mount(el)
        dropin = d
      } catch (e) {
        if (attivo) richiami.current.onErrore(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      attivo = false
      try {
        dropin?.unmount()
      } catch {
        // gia' smontato
      }
    }
  }, [sessione])

  // Il modulo di Adyen e' chiaro anche col tema scuro: gli si da' un fondo suo.
  return <div ref={contenitore} style={{ background: '#fff', color: '#1a1a1a', borderRadius: 12, padding: 12 }} />
}

/**
 * Il ritorno dalla 3D Secure: Adyen riporta qui con `sessionId` e
 * `redirectResult`, e il risultato va consegnato ad Adyen (submitDetails),
 * altrimenti il pagamento non si completa. Risolve con il risultato della sessione.
 */
export async function riprendiDopoRedirect(cfg: { clientKey: string; environment: string; sessionId: string; redirectResult: string }): Promise<string | null> {
  const { AdyenCheckout } = await caricaSdk()
  return new Promise((risolvi, rifiuta) => {
    const fine = (r: { sessionResult?: string } | undefined) => risolvi(r?.sessionResult ? String(r.sessionResult) : null)
    // Se Adyen non richiama entro 20 secondi si va avanti lo stesso: lo stato
    // della pagina segue comunque il webhook.
    setTimeout(() => risolvi(null), 20000)
    AdyenCheckout({
      environment: cfg.environment,
      clientKey: cfg.clientKey,
      countryCode: 'IT',
      locale: 'it-IT',
      session: { id: cfg.sessionId },
      analytics: { enabled: false },
      onPaymentCompleted: fine,
      onPaymentFailed: fine,
      onError: (e: { message?: string }) => rifiuta(new Error(e?.message ?? 'Errore nel riprendere il pagamento.')),
    })
      .then((checkout) => checkout.submitDetails({ details: { redirectResult: cfg.redirectResult } }))
      .catch(rifiuta)
  })
}
