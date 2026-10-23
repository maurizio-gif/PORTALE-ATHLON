import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { t } from '@/lib/lingua'

import { usePalette } from '../ui/tema'

// L'anello in alto a destra del questionario a passi: si chiude man mano che si risponde (22/10/2026, dall'idea delle app che chiedono
// una cosa per schermata). Va dal passo di prima a quello di adesso in poco meno di mezzo secondo; con «riduci movimento» salta
// al valore. Una `View` con un `Svg` fermo, senza proprieta' animate di Reanimated sull'SVG (sul web non sono provate: vedi il
// contatore delle calorie): il valore passa da `requestAnimationFrame`.

export function AnelloPassi({ fatti, totali, size = 46 }: { fatti: number; totali: number; size?: number }) {
  const p = usePalette()
  const fermo = useReducedMotion()
  const traguardo = Math.max(0, Math.min(1, totali > 0 ? fatti / totali : 0))
  const [v, setV] = useState(traguardo)
  const corrente = useRef(traguardo)

  useEffect(() => {
    if (fermo) {
      corrente.current = traguardo
      setV(traguardo)
      return
    }
    const da = corrente.current
    const inizio = Date.now()
    let id = 0
    const giro = () => {
      const x = Math.min(1, (Date.now() - inizio) / 420)
      const lento = 1 - Math.pow(1 - x, 3)
      corrente.current = da + (traguardo - da) * lento
      setV(corrente.current)
      if (x < 1) id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    return () => cancelAnimationFrame(id)
  }, [traguardo, fermo])

  const spessore = 5
  const raggio = (size - spessore) / 2
  const giro = 2 * Math.PI * raggio
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t(`Passo ${fatti} di ${totali}`, `Step ${fatti} of ${totali}`)}
      accessibilityValue={{ min: 0, max: totali, now: fatti }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={raggio} stroke={p.incavo} strokeWidth={spessore} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={raggio}
          stroke={p.accento}
          strokeWidth={spessore}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${giro} ${giro}`}
          strokeDashoffset={giro * (1 - v)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  )
}
