import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

import { F, usePalette } from '../ui/tema'

// La ruota dell'Athlon Health System (richiesta del club, 19/10/2026): tre frecce
// che si rincorrono in cerchio, Train, Food e Relax. Nessuna viene prima: e' un
// equilibrio che gira. Le frecce stanno in un livello che ruota piano; le
// etichette seguono la loro freccia ma restano diritte (si spostano, non
// ruotano), o in basso si leggerebbero capovolte. La rotazione e' una
// trasformazione della View, non una proprieta' animata dell'SVG (che sul web
// non e' provata, vedi ContatoreCalorie). Con «riduci movimento» la ruota e' ferma.

const LATO = 220
const C = LATO / 2
const R = 78
const SPESSORE = 20
/** Lo spazio fra una freccia e la successiva, in gradi. */
const VUOTO = 14
/** Un giro intero, in millisecondi: lento, si nota senza distrarre. */
const GIRO = 24000

export const SPICCHI = [
  { nome: 'Train', colore: '#FF5701' },
  { nome: 'Food', colore: '#18A957' },
  { nome: 'Relax', colore: '#14B8A6' },
] as const

const rad = (g: number) => ((g - 90) * Math.PI) / 180
const punto = (g: number, r = R) => [C + r * Math.cos(rad(g)), C + r * Math.sin(rad(g))] as const

/** Una freccia: l'arco da `da` ad `a` gradi (in senso orario, 0 in alto) e la punta alla fine. */
function freccia(da: number, a: number): { arco: string; punta: string } {
  const testa = 12 // gradi che occupa la punta
  const fine = a - testa
  const [x0, y0] = punto(da)
  const [x1, y1] = punto(fine)
  const arco = `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`
  const [ex, ey] = punto(fine, R + SPESSORE * 0.9)
  const [ix, iy] = punto(fine, R - SPESSORE * 0.9)
  const [px, py] = punto(a)
  return { arco, punta: `M ${ex} ${ey} L ${px} ${py} L ${ix} ${iy} Z` }
}

const FRECCE = SPICCHI.map((s, i) => ({ ...s, ...freccia(i * 120 + VUOTO / 2, (i + 1) * 120 - VUOTO / 2), mezzo: i * 120 + 60 }))

function Etichetta({ nome, colore, fondo, mezzo, giro }: { nome: string; colore: string; fondo: string; mezzo: number; giro: SharedValue<number> }) {
  const stile = useAnimatedStyle(() => {
    const g = ((mezzo + giro.value - 90) * Math.PI) / 180
    return { transform: [{ translateX: R * Math.cos(g) }, { translateY: R * Math.sin(g) }] }
  })
  return (
    <Animated.View pointerEvents="none" style={[stili.etichetta, stile]}>
      <View style={[stili.pillola, { borderColor: colore, backgroundColor: fondo }]}>
        <Text style={[stili.nome, { color: colore }]}>{nome}</Text>
      </View>
    </Animated.View>
  )
}

export function RuotaBenessere() {
  const p = usePalette()
  const fermo = useReducedMotion()
  const giro = useSharedValue(0)
  useEffect(() => {
    if (fermo) return
    giro.value = withRepeat(withTiming(360, { duration: GIRO, easing: Easing.linear }), -1, false)
  }, [fermo, giro])
  const rotazione = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }))

  return (
    <View style={stili.ruota} accessibilityRole="image" accessibilityLabel="Train, Food e Relax: tre frecce che si rincorrono in cerchio. Il benessere è il loro equilibrio.">
      <Animated.View style={[StyleSheet.absoluteFill, rotazione]}>
        <Svg width={LATO} height={LATO} viewBox={`0 0 ${LATO} ${LATO}`}>
          {FRECCE.map((f) => (
            <Path key={`a${f.nome}`} d={f.arco} stroke={f.colore} strokeWidth={SPESSORE} fill="none" strokeLinecap="round" />
          ))}
          {FRECCE.map((f) => (
            <Path key={`p${f.nome}`} d={f.punta} fill={f.colore} stroke={f.colore} strokeWidth={2} strokeLinejoin="round" />
          ))}
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={stili.centro}>
        <Text style={[stili.centroTesto, { color: p.testo }]}>Equilibrio</Text>
      </View>
      {FRECCE.map((f) => (
        <Etichetta key={f.nome} nome={f.nome} colore={f.colore} fondo={p.carta} mezzo={f.mezzo} giro={giro} />
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  ruota: { width: LATO, height: LATO, alignSelf: 'center' },
  centro: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centroTesto: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.2 },
  // L'etichetta parte dal centro e la trasformazione la porta sull'arco.
  etichetta: { position: 'absolute', left: C - 40, top: C - 15, width: 80, height: 30, alignItems: 'center', justifyContent: 'center' },
  pillola: { borderRadius: 999, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 3 },
  nome: { fontFamily: F.extra, fontSize: 13 },
})
