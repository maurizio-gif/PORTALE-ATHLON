import { useEffect, useState } from 'react'

import { laMiaArea, type EsitoArea } from '@/api/lab'

import { inMemoria, prendi } from './memoria'

// Le date di nascita del nucleo, per `member_id`, dall'area che la Home ha gia'
// letto (una richiesta sola, condivisa). Servono dove un limite d'eta' decide chi
// si puo' scegliere (il personal training, dai 13 anni) e la risposta della
// funzione non porta la data. Vuota finche' non si sa, e vuota se l'area non si
// legge: chi non ha una data non si esclude, perche' non si sa quanti anni ha.

type Nascite = Map<string, string | null>

function daEsito(esito: EsitoArea | undefined): Nascite {
  const nascite: Nascite = new Map()
  if (esito?.ok && esito.area.trovato) for (const p of esito.area.persone) nascite.set(String(p.member_id), p.data_nascita)
  return nascite
}

/** La data di nascita di ognuno, con la chiave `String(member_id)`. */
export function useNascite(): Nascite {
  const [nascite, setNascite] = useState<Nascite>(() => daEsito(inMemoria<EsitoArea>('area')))
  useEffect(() => {
    if (nascite.size) return
    let vivo = true
    prendi('area', laMiaArea)
      .then((e) => e, () => undefined)
      .then((e) => vivo && setNascite(daEsito(e)))
    return () => {
      vivo = false
    }
  }, [nascite.size])
  return nascite
}
