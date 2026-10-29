import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { statoClassifica, type StatoClassifica } from '@/api/classifica'

import { inMemoria, prendi, ricorda } from '../memoria'

// Lo stato della classifica del mese (29/10/2026): se c'e', se la persona e' dentro, la sua posizione. Parte dalla memoria del laboratorio e si
// **rilegge a ogni ritorno sulla schermata** (la posizione cambia, e si puo' entrare o uscire dalla sua schermata). **Dove la funzione non c'e'
// ancora (404), in vista cliente dello staff e per i minorenni la classifica non si mostra**: `visibile` e' falso e il punteggio resta com'e'.

export const CHIAVE_CLASSIFICA = 'classifica:stato'

export type Classifica = {
  /** null finche' non si sa. */
  stato: StatoClassifica | null
  /** La classifica si offre: la funzione c'e', non e' la vista cliente e la persona e' maggiorenne. */
  visibile: boolean
  /** Dopo un'azione che ha gia' lo stato nuovo in mano (entrare, uscire, salvare il motto): la schermata si aggiorna senza rileggere. */
  imposta: (s: StatoClassifica) => void
  ricarica: () => void
}

export function useClassifica(vista: boolean): Classifica {
  const [stato, setStato] = useState<StatoClassifica | null>(() => (vista ? null : (inMemoria<StatoClassifica>(CHIAVE_CLASSIFICA) ?? null)))
  const [disponibile, setDisponibile] = useState(true)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  const leggi = useCallback(async () => {
    const r = await prendi(CHIAVE_CLASSIFICA, statoClassifica)
    if (!vivo.current) return
    if (r.ok) {
      setDisponibile(true)
      setStato(r)
    } else if (!r.disponibile) setDisponibile(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!vista) leggi()
    }, [vista, leggi]),
  )

  const imposta = useCallback((s: StatoClassifica) => {
    ricorda(CHIAVE_CLASSIFICA, { ok: true, ...s })
    setStato(s)
  }, [])

  return { stato, visibile: !vista && disponibile && !!stato && stato.maggiorenne, imposta, ricarica: leggi }
}
