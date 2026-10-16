import { useEffect, useState } from 'react'

import { laMiaArea, type EsitoArea } from '@/api/lab'

import { inMemoria, prendi } from '../memoria'
import { vistaCorrente } from '../vista'

// Chi e', per una pagina del sito aperta dall'app. Club Life e' nativa, ma i
// moduli delle schede dell'Help Desk (l'appuntamento, il metodo di pagamento, il
// cambio abbonamento) per ora restano sul sito, e li' si apre la pagina: con chi
// e' nell'indirizzo il modulo non lo richiede. Il sito sa leggere due parametri
// (scripts/numeroSocio.ts e scripts/emailNota.ts) e li tiene per tutta la visita:
//
// - `UserNumber`, il numero socio di PerfectGym: l'assistente, «contattaci» e il
//   referral lo verificano da soli e non chiedono l'email;
// - `email`: riempie i campi email dei moduli e salta il passo dell'email nella
//   chat.
//
// **In vista cliente niente.** Chi guarda dal CRM e' un operatore che sfoglia
// l'app in sola lettura: la pagina del sito non lo e', e con l'identita' del
// cliente nell'indirizzo la chat e i moduli agirebbero a suo nome.
//
// L'email nell'indirizzo finisce in `page_location` di Google Analytics, e il
// parametro `email` va oscurato la' (Flussi di dati > Oscuramento dati): lo stesso
// obbligo dei link delle newsletter.

export type ChiEntra = { numero?: string | null; email?: string | null }

/**
 * Un indirizzo del sito, con chi e' se lo sappiamo. L'ancora resta in fondo,
 * dov'era. Composto a mano e non con `new URL()`: su iOS e Android l'URL di React
 * Native e' parziale, e `searchParams` non e' detto che ci sia.
 */
export function conChiE(indirizzo: string, { numero, email }: ChiEntra): string {
  const parametri: string[] = []
  // Solo cifre, come il sito: qualunque altra cosa non e' un numero socio.
  const n = (numero ?? '').trim()
  if (/^\d{3,}$/.test(n)) parametri.push(`UserNumber=${n}`)
  const e = (email ?? '').trim().toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) parametri.push(`email=${encodeURIComponent(e)}`)
  if (!parametri.length) return indirizzo
  const i = indirizzo.indexOf('#')
  const base = i < 0 ? indirizzo : indirizzo.slice(0, i)
  const ancora = i < 0 ? '' : indirizzo.slice(i)
  return `${base}${base.includes('?') ? '&' : '?'}${parametri.join('&')}${ancora}`
}

/** Chi e', dall'area gia' letta dalla Home; se non c'e', dall'accesso. */
function chiDa(esito: EsitoArea | undefined, emailAccesso?: string | null): ChiEntra {
  if (vistaCorrente()) return {}
  const area = esito?.ok ? esito.area : null
  if (area?.trovato) {
    const titolare = area.persone.find((p) => p.member_id === area.titolare) ?? area.persone.find((p) => p.titolare)
    return { numero: titolare?.numero, email: titolare?.email || area.email || emailAccesso }
  }
  return { email: area?.email || emailAccesso }
}

/**
 * Chi e', o `null` finche' non si sa. Quasi sempre e' gia' pronto: l'area la ha
 * letta la Home. Se non lo e', la chiede (una richiesta sola, condivisa), e in
 * ogni caso anche un errore finisce con una risposta: la pagina si apre lo
 * stesso, solo senza sapere chi e'.
 */
export function useChiE(emailAccesso?: string | null): ChiEntra | null {
  const [chi, setChi] = useState<ChiEntra | null>(() => {
    const gia = inMemoria<EsitoArea>('area')
    return gia ? chiDa(gia, emailAccesso) : null
  })
  useEffect(() => {
    if (chi) return
    let vivo = true
    prendi('area', laMiaArea)
      .then((e) => e, () => undefined)
      .then((e) => vivo && setChi(chiDa(e, emailAccesso)))
    return () => {
      vivo = false
    }
  }, [chi, emailAccesso])
  return chi
}
