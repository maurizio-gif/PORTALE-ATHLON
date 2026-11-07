import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

import { Misura, pacmanPercorso, SCINTILLE, scena, type Scena, spuntaLunghezza, spuntaPercorso } from './pacman'
import { rallenta } from '../avvio/tempi'
import { colpetto } from './Tocco'
import { usePalette } from './tema'

// Il disegno e l'orologio dell'animazione di Pacman sul codice (la fisica e i tempi stanno in `pacman.ts`).
// Come ogni movimento continuo dell'app non usa Reanimated (vedi `avvio/Avvio.tsx`: sul web non e' provato): un orologio
// `requestAnimationFrame` scrive il tempo in uno stato, e la scena si ricalcola da li'. Gira solo mentre c'e' qualcosa da muovere.

export type StatoCodice = 'scrivi' | 'verifica' | 'ok'

/** Quanto spazio, sopra, sotto e ai lati della riga delle caselle, ha il disegno: Pacman e il cerchio ingrandito sono piu' larghi di una casella, e le scintille volano fuori dalla riga. */
export const MARGINE = 44

/**
 * L'orologio e la scena del codice. `stato`: `scrivi` (si sta scrivendo, niente), `verifica` (il codice e' partito: Pacman mangia le
 * caselle), `ok` (il server ha detto «si'»: il cerchio verde e la spunta). `onFinita` parte **una volta** quando la spunta e' al suo posto:
 * da li' la pagina d'accesso lascia entrare (`entrata.ts`). Con `ridotto` («riduci movimento») non si muove niente: `onFinita` parte subito.
 */
export function useScenaCodice(stato: StatoCodice, n: number, misure: Misura[], ridotto: boolean, onFinita?: () => void): Scena {
  const attivo = stato !== 'scrivi' && !ridotto
  const [ms, setMs] = useState(0)
  const msRef = useRef(0)
  msRef.current = ms
  const okAt = useRef<number | null>(null)
  const fine = useRef(onFinita)
  fine.current = onFinita
  const chiamata = useRef(false)
  const vibrato = useRef(false)

  // L'orologio: riparte da zero a ogni nuova verifica e si ferma quando non serve.
  useEffect(() => {
    if (!attivo) {
      okAt.current = null
      msRef.current = 0
      setMs(0)
      return
    }
    okAt.current = null
    msRef.current = 0
    setMs(0)
    const partenza = Date.now()
    let id = 0
    const giro = () => {
      const t = Date.now() - partenza
      msRef.current = t
      setMs(t)
      id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    return () => cancelAnimationFrame(id)
  }, [attivo])

  // Il momento del «si'», sull'orologio della verifica.
  useEffect(() => {
    if (stato === 'ok' && okAt.current === null) okAt.current = msRef.current
    if (stato !== 'ok') {
      chiamata.current = false
      vibrato.current = false
    }
  }, [stato])

  // «Riduci movimento»: niente da guardare, il «si'» vale subito.
  useEffect(() => {
    if (stato === 'ok' && ridotto && !chiamata.current) {
      chiamata.current = true
      colpetto('ok')
      fine.current?.()
    }
  }, [stato, ridotto])

  const sc = scena(ms, okAt.current, misure, n)

  // Il colpetto quando compare la spunta, e «fatto» una volta sola.
  useEffect(() => {
    if (ridotto || stato !== 'ok') return
    if (sc.u !== null && sc.u >= 0 && !vibrato.current) {
      vibrato.current = true
      colpetto('ok')
    }
    if (sc.fatto && !chiamata.current) {
      chiamata.current = true
      fine.current?.()
    }
  })

  return sc
}

/** Il disegno: Pacman, poi il cerchio verde con la spunta, l'anello e le scintille. Sopra le caselle, non riceve tocchi. */
export function PacmanSopra({ scena: sc, larghezza, altezza }: { scena: Scena; larghezza: number; altezza: number }) {
  const p = usePalette()
  if (!sc.visibile || sc.r <= 0.2 || larghezza <= 0) return null
  const cx = sc.x + MARGINE
  const cy = sc.y + MARGINE
  const verdi = [p.ok, '#7BE6A8', '#FFFFFF'] as const
  const L = spuntaLunghezza(sc.r)
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -MARGINE, top: -MARGINE, width: larghezza + MARGINE * 2, height: altezza + MARGINE * 2 }}>
      <Svg width={larghezza + MARGINE * 2} height={altezza + MARGINE * 2}>
        {/* L'alone: un cerchio morbido dietro Pacman, arancio e poi verde */}
        <Circle cx={cx} cy={cy} r={sc.r * 1.35} fill={p.accento} opacity={0.14 * (1 - sc.verde)} />
        <Circle cx={cx} cy={cy} r={sc.r * 1.35} fill={p.ok} opacity={0.18 * sc.verde} />
        <Path d={pacmanPercorso(cx, cy, sc.r, sc.mezza)} fill={p.accento} opacity={1 - sc.verde} />
        <Path d={pacmanPercorso(cx, cy, sc.r, sc.mezza)} fill={p.ok} opacity={sc.verde} />
        {sc.spunta > 0.02 ? (
          <Path
            d={spuntaPercorso(cx, cy, sc.r)}
            stroke={p.scuro ? '#0B2A15' : '#FFFFFF'}
            strokeWidth={Math.max(2.6, sc.r * 0.15)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${L} ${L}`}
            strokeDashoffset={L * (1 - sc.spunta)}
          />
        ) : null}
        {sc.anello > 0 && sc.anello < 1 ? <Circle cx={cx} cy={cy} r={sc.r * (1.05 + 0.9 * rallenta(sc.anello))} stroke={p.ok} strokeWidth={2} fill="none" opacity={0.8 * (1 - sc.anello)} /> : null}
        {sc.scintille > 0 && sc.scintille < 1
          ? SCINTILLE.map((s, i) => {
              const k = rallenta(sc.scintille)
              const x = cx + s.dx * k
              const y = cy + s.dy * k
              const d = s.dimensione * (1 - 0.45 * sc.scintille)
              const colore = verdi[s.tono]
              const opacita = 1 - sc.scintille * sc.scintille
              return s.quadrata ? (
                <Rect key={i} x={x - d} y={y - d} width={d * 2} height={d * 2} fill={colore} opacity={opacita} transform={`rotate(${s.giro * k} ${x} ${y})`} />
              ) : (
                <Circle key={i} cx={x} cy={y} r={d} fill={colore} opacity={opacita} />
              )
            })
          : null}
      </Svg>
    </View>
  )
}
