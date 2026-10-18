import { useCallback, useEffect, useState } from 'react'

import { leggiVetrina, type EsitoVetrina, type Vetrina } from '@/api/shop'

import { inMemoria, prendi, ricorda } from '../memoria'

// La vetrina dello shop, con la memoria del laboratorio: la schermata si apre subito con l'ultima letta e
// intanto la rilegge (come i Prodotti della Home). `carica(true)` la rilegge davvero, per dopo un ordine rifiutato:
// un prezzo cambiato o un articolo esaurito si vede solo da una lettura nuova.

export const CHIAVE_VETRINA = 'shop:vetrina'

export function useVetrina() {
  const gia = inMemoria<EsitoVetrina>(CHIAVE_VETRINA)
  const [dati, setDati] = useState<Vetrina | null>(gia?.ok ? gia : null)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async (fresca = false): Promise<EsitoVetrina> => {
    setErrore(null)
    let r: EsitoVetrina
    if (fresca) {
      r = await leggiVetrina()
      if (r.ok) ricorda(CHIAVE_VETRINA, r)
    } else r = await prendi(CHIAVE_VETRINA, leggiVetrina)
    if (r.ok) setDati(r)
    else setErrore(r.errore)
    return r
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  return { dati, errore, carica }
}
