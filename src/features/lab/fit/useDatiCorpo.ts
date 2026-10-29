import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'

import { elencoMisure, leggiAnagrafica, type Anagrafica, type ConsensoCorpo, type Misura, type SessoCalcolo } from '@/api/lab'

import { CHIAVE_MISURE } from '../dati/Misure'
import { inMemoria, prendi } from '../memoria'
import { vistaCorrente } from '../vista'
import { statoDati, type StatoDati } from './calcoloDatiCorpo'

type MisureInMemoria = { ok: true; misure: Misura[]; sesso: SessoCalcolo; consenso?: ConsensoCorpo | null }

/**
 * Se i dati del corpo (altezza, peso, sesso) ci sono. **Si rilegge a ogni ritorno sulla schermata** (`useFocusEffect`): si inseriscono in
 * «Il tuo corpo», e tornando indietro la carta «Da compilare» deve sparire subito, senza aspettare che la schermata si rifaccia da capo
 * (sotto la pila delle schermate resta montata). Parte dalla memoria, cosi' dopo la prima lettura non c'e' attesa.
 */
export function useDatiCorpo(): StatoDati {
  const vista = !!vistaCorrente()
  const [misure, setMisure] = useState<Misura[] | null>(() => inMemoria<MisureInMemoria>(CHIAVE_MISURE)?.misure ?? null)
  const [sesso, setSesso] = useState<SessoCalcolo>(() => inMemoria<MisureInMemoria>(CHIAVE_MISURE)?.sesso ?? null)
  const [consenso, setConsenso] = useState<ConsensoCorpo | null | undefined>(() => inMemoria<MisureInMemoria>(CHIAVE_MISURE)?.consenso)
  const [errore, setErrore] = useState(false)
  const [anagrafica, setAnagrafica] = useState<Anagrafica | null>(() => inMemoria<{ ok: true; anagrafica: Anagrafica }>('anagrafica')?.anagrafica ?? null)
  const [letta, setLetta] = useState(!!anagrafica)

  useFocusEffect(
    useCallback(() => {
      if (vista) return
      let vivo = true
      prendi(CHIAVE_MISURE, elencoMisure).then((r) => {
        if (!vivo) return
        if (r.ok) {
          setMisure(r.misure)
          setSesso(r.sesso)
          setConsenso(r.consenso)
          setErrore(false)
        } else setErrore(true)
      })
      prendi('anagrafica', leggiAnagrafica).then((r) => {
        if (!vivo) return
        if (r.ok) setAnagrafica(r.anagrafica)
        setLetta(true)
      })
      return () => {
        vivo = false
      }
    }, [vista]),
  )

  return useMemo(
    () => statoDati({ vista, misure, sesso, consenso, errore, dataNascita: anagrafica?.data_nascita, anagraficaLetta: letta }),
    [vista, misure, sesso, consenso, errore, anagrafica, letta],
  )
}
