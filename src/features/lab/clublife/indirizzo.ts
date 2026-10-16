import { useEffect, useState } from 'react'

import { laMiaArea, type Area, type EsitoArea } from '@/api/lab'

import { inMemoria, prendi } from '../memoria'
import { vistaCorrente } from '../vista'

// Chi e', per una pagina del sito aperta dall'app. Club Life e' nativa, ma i
// moduli delle schede dell'Help Desk (gli appuntamenti, il cambio abbonamento)
// per ora restano sul sito, e li' si apre la pagina: con chi e' nell'indirizzo il
// modulo non lo richiede. Il metodo di pagamento no, e' una schermata dell'app.
// Il profilo (iscritto, figlio iscritto) decide quali moduli si mostrano: vedi Blocchi. Il sito sa leggere due parametri
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

/**
 * Cosa il nucleo del socio ha adesso, per decidere quali moduli di Club Life gli
 * si mostrano. Si legge dall'area gia' caricata dalla Home: nessuna chiamata in piu'.
 */
export type ProfiloSocio = {
  /** Nel nucleo c'e' almeno un abbonamento vivo (in corso, sospeso o non ancora iniziato). */
  iscritto: boolean
  /** Un figlio minorenne del nucleo ha un abbonamento vivo, anche se parte piu' avanti. */
  figlioIscritto: boolean
}

/** `profilo` e' null se l'area non si e' potuta leggere: nel dubbio i moduli riservati non si mostrano. */
export type ChiEntra = { numero?: string | null; email?: string | null; profilo?: ProfiloSocio | null }

const MAGGIORE_ETA = 18

/** L'eta' in anni compiuti da una data «AAAA-MM-GG»; null se la data manca o non si legge. */
function eta(nascita: string | null | undefined): number | null {
  const m = String(nascita ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const ora = new Date()
  let anni = ora.getFullYear() - Number(m[1])
  if (ora.getMonth() + 1 < Number(m[2]) || (ora.getMonth() + 1 === Number(m[2]) && ora.getDate() < Number(m[3]))) anni--
  return anni
}

/**
 * Chi e' iscritto, e chi ha un figlio iscritto. Nei contratti vivi dell'area ci sono
 * anche i Guest Pass (il `tipo` lo ricava il database dal nome del piano, e qui non
 * arriva): una prova non e' un'iscrizione, quindi si riconoscono dal nome e si scartano.
 */
export function profiloDa(area: Area): ProfiloSocio {
  if (!area.trovato) return { iscritto: false, figlioIscritto: false }
  const veri = area.contratti.filter((c) => !/guest\s*pass/i.test(c.piano ?? ''))
  const figli = new Set(
    area.persone.filter((x) => {
      const anni = eta(x.data_nascita)
      return !x.titolare && anni !== null && anni < MAGGIORE_ETA
    }).map((x) => x.member_id),
  )
  return { iscritto: veri.length > 0, figlioIscritto: veri.some((c) => figli.has(c.member_id)) }
}

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
  const area = esito?.ok ? esito.area : null
  // Il profilo serve anche in vista cliente: chi guarda dal CRM deve vedere i moduli
  // che vedrebbe il cliente. L'identita' no, per la ragione detta in cima.
  const profilo = area ? profiloDa(area) : null
  if (vistaCorrente()) return { profilo }
  if (area?.trovato) {
    const titolare = area.persone.find((p) => p.member_id === area.titolare) ?? area.persone.find((p) => p.titolare)
    return { numero: titolare?.numero, email: titolare?.email || area.email || emailAccesso, profilo }
  }
  return { email: area?.email || emailAccesso, profilo }
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
