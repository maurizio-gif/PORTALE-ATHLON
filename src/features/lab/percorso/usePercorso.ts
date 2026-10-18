import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { statoPercorso, type StatoPercorso } from '@/api/percorso'

import { inMemoria, prendi, ricorda } from '../memoria'
import { vistaCorrente } from '../vista'
import { CHIAVE_STATO_PERCORSO } from './comune'

// Lo stato del Percorso Athlon: il percorso attivo, quante richieste restano al tutor, se il socio e'
// maggiorenne e quali lezioni gli spettano (una stima). Dalla memoria del laboratorio, con la stessa chiave
// per tutte le schermate: si apre subito con l'ultimo dato e, a ogni ritorno, si rilegge.

export type Stato = { ok: true } & StatoPercorso

export type ErrorePercorso = { messaggio: string; /** La funzione non c'e' ancora (404) o il tutor non e' acceso (503): si dice che il Percorso non e' ancora attivo. */ nonAttivo: boolean }

/** Le settimane lette in questa sessione: dopo una modifica si buttano tutte, o la schermata mostrerebbe la settimana vecchia. */
const settimaneLette = new Set<string>()
export const ricordaSettimana = (chiave: string) => settimaneLette.add(chiave)

/** Dopo aver salvato, tolto o cambiato il percorso: la memoria non vale piu'. */
export function invalidaPercorso() {
  ricorda(CHIAVE_STATO_PERCORSO, undefined)
  for (const k of settimaneLette) ricorda(k, undefined)
  settimaneLette.clear()
}

export function usePercorso() {
  const vista = !!vistaCorrente()
  const [stato, setStato] = useState<Stato | null>(() => inMemoria<Stato>(CHIAVE_STATO_PERCORSO) ?? null)
  const [errore, setErrore] = useState<ErrorePercorso | null>(null)

  const ricarica = useCallback(async () => {
    const r = await prendi(CHIAVE_STATO_PERCORSO, statoPercorso)
    if (r.ok) {
      setStato(r)
      setErrore(null)
    } else {
      setErrore({ messaggio: r.errore, nonAttivo: r.stato === 404 || r.stato === 503 })
    }
  }, [])

  // A ogni ritorno si rilegge: un percorso appena salvato o tolto deve vedersi tornando indietro.
  useFocusEffect(
    useCallback(() => {
      setStato(inMemoria<Stato>(CHIAVE_STATO_PERCORSO) ?? null)
      ricarica()
    }, [ricarica]),
  )

  return { stato, errore, ricarica, vista }
}
