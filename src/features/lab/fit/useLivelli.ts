import { useEffect, useMemo, useRef, useState } from 'react'

import { registraSettimane, registroLivelli, type StatoRegistro } from '@/api/livelli'

import { oggiRoma } from '../alimentazione/conti'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { inMemoria, prendi, ricorda } from '../memoria'
import type { Punteggio } from './calcoloPunteggio'
import { daRegistrare, lunediDi, lunediFiniti, puntiSettimana, statoLivelli, type StatoLivelli } from './calcoloLivelli'
import type { DatiFit } from './useFit'

// I livelli dell'Athlon Health Score (20/10/2026) dai dati che Fit e Relax gia' leggono e dal registro del server:
//   1. si legge il registro (portale-lab-livelli, `stato`): i punti delle settimane gia' contate;
//   2. col punteggio pronto (tutti i dati sono arrivati) si calcolano i punti delle ultime 4 settimane FINITE e, se
//      sono di piu' di quelli registrati, si mandano (`registra`): una volta per apertura, e mai la settimana in corso;
//   3. dal registro si ricava il livello (livelli.ts, puro).
// **Dove la funzione non c'e' ancora, o in vista cliente, i livelli non si mostrano** e il punteggio resta com'e'.
// Il registro e' solo in memoria come ogni dato del laboratorio (il server e' la fonte).

const CHIAVE = 'livelli:registro'

export type Livelli = {
  /** null finche' non si sa. */
  stato: StatoLivelli | null
  /** false: la funzione non c'e' (ancora) o siamo in vista cliente: niente da mostrare. */
  disponibile: boolean
}

export function useLivelli(fit: DatiFit, disp: Dispositivi, punteggio: Punteggio | null): Livelli {
  const [registro, setRegistro] = useState<StatoRegistro | null>(() => inMemoria<{ ok: true } & StatoRegistro>(CHIAVE) ?? null)
  const [disponibile, setDisponibile] = useState(true)
  const inviato = useRef(false)
  const vista = fit.vista

  // 1. Il registro.
  useEffect(() => {
    if (vista) return
    let vivo = true
    prendi(CHIAVE, registroLivelli).then((r) => {
      if (!vivo) return
      if (r.ok) setRegistro(r)
      else if (!r.disponibile) setDisponibile(false)
    })
    return () => {
      vivo = false
    }
  }, [vista])

  // I punti delle ultime settimane finite, dalle stesse fonti del punteggio (e solo dove ci sono i consensi).
  const calcolate = useMemo(() => {
    if (!punteggio || !fit.sessioni) return null
    const oggi = oggiRoma()
    const food = fit.food?.consenso && fit.diario && fit.food.maggiorenne && !fit.food.profilo?.nascondi_numeri ? { diario: fit.diario, senzaColazione: fit.food.profilo?.questionario.colazione === 'mai' } : null
    const giorni = disp.stato?.ok && disp.stato.consenso && disp.stato.maggiorenne ? (disp.dati?.giorni ?? null) : null
    return {
      finite: lunediFiniti(oggi).map((l) => puntiSettimana(l, fit.sessioni!, food, giorni)),
      inCorso: puntiSettimana(lunediDi(oggi), fit.sessioni, food, giorni),
    }
  }, [punteggio, fit.sessioni, fit.food, fit.diario, disp.stato, disp.dati])

  // 2. Si registra quello che e' nuovo, una volta per apertura.
  useEffect(() => {
    if (vista || !registro || !calcolate || inviato.current || !disponibile) return
    inviato.current = true
    const nuove = daRegistrare(calcolate.finite, registro.settimane)
    if (!nuove.length) return
    registraSettimane(nuove).then((r) => {
      if (r.ok) {
        ricorda(CHIAVE, r)
        setRegistro(r)
      } else if (!r.disponibile) setDisponibile(false)
    })
  }, [vista, registro, calcolate, disponibile])

  // 3. Il livello.
  const stato = useMemo(() => {
    if (vista || !registro || !calcolate) return null
    return statoLivelli(registro.settimane, punteggio, calcolate.inCorso)
  }, [vista, registro, calcolate, punteggio])

  return { stato, disponibile: disponibile && !vista }
}
