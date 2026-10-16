import { useEffect, useState } from 'react'

import { laMiaArea, type EsitoArea } from '@/api/lab'
import { CLUB_LIFE_URL } from '@/config'

import { inMemoria, prendi } from '../memoria'
import { vistaCorrente } from '../vista'

// L'indirizzo di Club Life con dentro chi e'. Il sito sa leggere due parametri
// (scripts/numeroSocio.ts e scripts/emailNota.ts) e li tiene per tutta la visita:
//
// - `UserNumber`, il numero socio di PerfectGym: l'assistente, «contattaci» e il
//   referral lo verificano da soli e non chiedono l'email;
// - `email`: riempie il modulo dell'Help Desk e salta il passo dell'email nella
//   chat. Va con il numero perche' il modulo dell'assistenza, che e' il motivo per
//   cui si apre Club Life, un campo email lo ha comunque da riempire.
//
// **In vista cliente niente.** Chi guarda dal CRM e' un operatore che sfoglia
// l'app in sola lettura: la pagina del sito non lo e', e con l'identita' del
// cliente nell'indirizzo la chat e i moduli agirebbero a suo nome.
//
// L'email nell'indirizzo finisce in `page_location` di Google Analytics, e il
// parametro `email` va oscurato la' (Flussi di dati > Oscuramento dati): lo stesso
// obbligo dei link delle newsletter.

export type ChiEntra = { numero?: string | null; email?: string | null }

/** L'indirizzo di Club Life, con chi e' se lo sappiamo. */
export function indirizzoClubLife({ numero, email }: ChiEntra): string {
  const url = new URL(CLUB_LIFE_URL)
  // Solo cifre, come il sito: qualunque altra cosa non e' un numero socio.
  const n = (numero ?? '').trim()
  if (/^\d{3,}$/.test(n)) url.searchParams.set('UserNumber', n)
  const e = (email ?? '').trim().toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) url.searchParams.set('email', e)
  return url.toString()
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
 * L'indirizzo da aprire, o `null` finche' non si sa chi e'. Quasi sempre e' gia'
 * pronto: l'area la ha letta la Home. Se non lo e', la chiede (una richiesta sola,
 * condivisa), e in ogni caso anche un errore finisce con un indirizzo: la pagina si
 * apre lo stesso, solo senza sapere chi e'.
 */
export function useIndirizzoClubLife(emailAccesso?: string | null): string | null {
  const [indirizzo, setIndirizzo] = useState<string | null>(() => {
    const gia = inMemoria<EsitoArea>('area')
    return gia ? indirizzoClubLife(chiDa(gia, emailAccesso)) : null
  })
  useEffect(() => {
    if (indirizzo) return
    let vivo = true
    prendi('area', laMiaArea)
      .then((e) => e, () => undefined)
      .then((e) => vivo && setIndirizzo(indirizzoClubLife(chiDa(e, emailAccesso))))
    return () => {
      vivo = false
    }
  }, [indirizzo, emailAccesso])
  return indirizzo
}
