import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { elencoAbitudini, type DatiAbitudini } from '@/api/dispositivi'

import { inMemoria, prendi, ricorda } from '../memoria'
import type { ConfigAbitudini } from './abitudini'

// Le abitudini scelte (31/10/2026): l'elenco e i valori scritti a mano stanno sul server, sotto il consenso dei dispositivi. Dalla memoria del
// laboratorio (si apre subito con l'ultimo dato e intanto si rilegge, a ogni ritorno sulla schermata). **Con una funzione di prima**
// («Azione sconosciuta.») la lettura non va a buon fine: `disponibile` resta falso, `config` e' null e l'app fa come prima (le tre di
// partenza, senza il comando per scegliere). Solo dove c'e' il consenso ai dispositivi: senza, la funzione risponderebbe 403.

export const CHIAVE_ABITUDINI = 'abitudini:scelte'

export type AbitudiniScelte = {
  /** La funzione le conosce e ha risposto: si possono scegliere e salvare. */
  disponibile: boolean
  /** Si e' gia' provato a leggerle (con o senza risposta): finche' e' falso si aspetta, non si dice «non disponibile». */
  caricato: boolean
  /** null finche' non si sa, o se non sono disponibili: chi calcola usa le tre di partenza. */
  config: ConfigAbitudini | null
  massime: number
  /** Dopo un'azione che ha gia' la risposta in mano (salva, togli, registra): la schermata si aggiorna senza rileggere. */
  imposta: (d: DatiAbitudini) => void
}

export function useAbitudiniScelte(attivo: boolean): AbitudiniScelte {
  const [dati, setDati] = useState<DatiAbitudini | null>(() => (attivo ? (inMemoria<DatiAbitudini>(CHIAVE_ABITUDINI) ?? null) : null))
  const [disponibile, setDisponibile] = useState<boolean>(() => attivo && !!inMemoria<DatiAbitudini>(CHIAVE_ABITUDINI))
  const [caricato, setCaricato] = useState<boolean>(() => attivo && !!inMemoria<DatiAbitudini>(CHIAVE_ABITUDINI))
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!attivo) {
        setDati(null)
        setDisponibile(false)
        return
      }
      void prendi(CHIAVE_ABITUDINI, async () => {
        const r = await elencoAbitudini()
        return r.ok ? ({ ok: true, massime: r.massime, scelte: r.scelte, registri: r.registri } as const) : ({ ok: false } as const)
      }).then((r) => {
        if (!vivo.current) return
        setCaricato(true)
        if (r.ok) {
          setDati({ massime: r.massime, scelte: r.scelte, registri: r.registri })
          setDisponibile(true)
        } else {
          setDisponibile(false)
        }
      })
    }, [attivo]),
  )

  const imposta = useCallback((d: DatiAbitudini) => {
    ricorda(CHIAVE_ABITUDINI, { ok: true, ...d })
    setDati(d)
    setDisponibile(true)
  }, [])

  return { disponibile, caricato, config: disponibile && dati ? { scelte: dati.scelte, registri: dati.registri } : null, massime: dati?.massime ?? 5, imposta }
}
