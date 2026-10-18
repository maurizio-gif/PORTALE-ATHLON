import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { datiDispositivi, statoDispositivi, type DatiDispositivi, type StatoDispositivi } from '@/api/dispositivi'

import { inMemoria, prendi, ricorda } from '../memoria'
import { vistaCorrente } from '../vista'

// I dati dei dispositivi (19/10/2026), per l'area Relax di Fit e per la schermata dei
// dispositivi: lo stato (consenso, fornitori disponibili, collegamenti) e, se c'e' il consenso,
// i giorni e gli allenamenti. Dalla memoria del laboratorio: la schermata si apre subito con
// l'ultimo dato e intanto si rilegge, a ogni ritorno. Nella vista cliente dello staff non si
// legge niente: sono dati sulla salute e la funzione li rifiuta.

export const CHIAVE_STATO = 'dispositivi:stato'
export const CHIAVE_DATI = 'dispositivi:dati'

export type EsitoStato = Awaited<ReturnType<typeof statoDispositivi>>
type Dati = { ok: true } & DatiDispositivi

export type Dispositivi = {
  vista: boolean
  /** null finche' non si sa; nella vista cliente resta null. */
  stato: EsitoStato | null
  /** null finche' non arrivano, o senza consenso. */
  dati: DatiDispositivi | null
  /** Per dopo un'azione che ha gia' la risposta in mano (collega, scollega, aggiorna): la schermata si aggiorna senza rileggere. */
  imposta: (dati: DatiDispositivi) => void
  /** Il consenso e' cambiato (accettato o revocato): si rilegge tutto. */
  rileggi: () => void
}

/** I dispositivi che l'app offre: almeno un fornitore disponibile, o un consenso gia' dato (per scollegare, revocare). */
export function relaxAperto(s: EsitoStato | null): boolean {
  if (!s || !s.ok || !s.maggiorenne) return false
  return !!s.consenso || s.fornitori.some((f) => f.disponibile)
}

export function useDispositivi(): Dispositivi {
  const vista = !!vistaCorrente()
  const [stato, setStato] = useState<EsitoStato | null>(() => (vista ? null : (inMemoria<EsitoStato>(CHIAVE_STATO) ?? null)))
  const [dati, setDati] = useState<DatiDispositivi | null>(() => (vista ? null : (inMemoria<Dati>(CHIAVE_DATI) ?? null)))
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  /** Rilegge lo stato e, col consenso, i dati. `fresco`: senza la memoria e senza aspettare un'altra richiesta (dopo un consenso, una revoca). */
  const leggi = useCallback(async (fresco: boolean) => {
    const s = await (fresco ? statoDispositivi() : prendi(CHIAVE_STATO, statoDispositivi))
    if (!vivo.current) return
    if (fresco && s.ok) ricorda(CHIAVE_STATO, s)
    setStato(s)
    if (s.ok && s.consenso) {
      const d = await (fresco ? datiDispositivi() : prendi(CHIAVE_DATI, datiDispositivi))
      if (!vivo.current) return
      if (d.ok) {
        if (fresco) ricorda<Dati>(CHIAVE_DATI, d)
        setDati(d)
      }
    } else {
      setDati(null)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!vista) leggi(false)
    }, [vista, leggi]),
  )

  const imposta = useCallback((d: DatiDispositivi) => {
    ricorda<Dati>(CHIAVE_DATI, { ok: true, ...d })
    setDati(d)
    setStato((s) => {
      if (!s?.ok) return s
      const nuovo = { ...s, collegamenti: d.collegamenti }
      ricorda(CHIAVE_STATO, nuovo)
      return nuovo
    })
  }, [])

  const rileggi = useCallback(() => {
    if (!vista) leggi(true)
  }, [vista, leggi])

  return { vista, stato, dati: stato?.ok && stato.consenso ? dati : null, imposta, rileggi }
}
