import { useEffect, useState } from 'react'

import type { TipoModulo } from '@/api/clubLife'
import { laMiaArea, type Area, type EsitoArea } from '@/api/lab'
import { etaDa } from '@/lib/eta'

import { inMemoria, prendi } from '../../memoria'

// Cosa ha il nucleo del socio adesso, per decidere a chi si offrono i moduli di
// Club Life che non sono per tutti. Si legge dall'area che la Home ha gia' caricato
// (una richiesta sola, condivisa): nessuna chiamata in piu'. In vista cliente e'
// l'area del cliente, quindi chi guarda dal CRM vede i moduli che vedrebbe lui.

export type ProfiloSocio = {
  /** Nel nucleo c'e' almeno un abbonamento vivo (in corso, sospeso o non ancora iniziato). */
  iscritto: boolean
  /** Un figlio minorenne del nucleo ha un abbonamento vivo, anche se parte piu' avanti. */
  figlioIscritto: boolean
}

const MAGGIORE_ETA = 18

/**
 * Chi e' iscritto, e chi ha un figlio iscritto. Nei contratti vivi dell'area ci sono
 * anche i Guest Pass (il `tipo` lo ricava il database dal nome del piano, e qui non
 * arriva): una prova non e' un'iscrizione, quindi si riconoscono dal nome e si scartano.
 */
export function profiloDa(area: Area): ProfiloSocio {
  if (!area.trovato) return { iscritto: false, figlioIscritto: false }
  const veri = area.contratti.filter((c) => !/guest\s*pass/i.test(c.piano ?? ''))
  const figli = new Set(
    area.persone
      .filter((x) => {
        const anni = etaDa(x.data_nascita)
        return !x.titolare && anni !== null && anni < MAGGIORE_ETA
      })
      .map((x) => x.member_id),
  )
  return { iscritto: veri.length > 0, figlioIscritto: veri.some((c) => figli.has(c.member_id)) }
}

/**
 * Se un modulo e' aperto a questo profilo. La chiamata col desk e' per chi non e'
 * ancora iscritto; l'appuntamento col Direttore Tecnico per chi ha un figlio
 * iscritto o in partenza; gli altri moduli per tutti. Senza profilo (l'area non si
 * e' potuta leggere) i due riservati restano chiusi: meglio uno in meno che uno a
 * chi non puo' usarlo.
 */
export function moduloAperto(tipo: TipoModulo, profilo: ProfiloSocio | null): boolean {
  if (tipo === 'appuntamento') return profilo?.iscritto === false
  if (tipo === 'appuntamento-nuoto') return profilo?.figlioIscritto === true
  return true
}

function daEsito(esito: EsitoArea | undefined): ProfiloSocio | null {
  return esito?.ok ? profiloDa(esito.area) : null
}

/**
 * Il profilo di chi apre l'app: `caricato` e' false finche' non si sa, e `profilo`
 * resta null se anche a lettura finita l'area non c'e' (errore di rete).
 */
export function useProfilo(): { caricato: boolean; profilo: ProfiloSocio | null } {
  const [stato, setStato] = useState<{ caricato: boolean; profilo: ProfiloSocio | null }>(() => {
    const gia = inMemoria<EsitoArea>('area')
    return gia ? { caricato: true, profilo: daEsito(gia) } : { caricato: false, profilo: null }
  })
  useEffect(() => {
    if (stato.caricato) return
    let vivo = true
    prendi('area', laMiaArea)
      .then((e) => e, () => undefined)
      .then((e) => vivo && setStato({ caricato: true, profilo: daEsito(e) }))
    return () => {
      vivo = false
    }
  }, [stato.caricato])
  return stato
}
