import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg'

import { F, usePalette } from '../ui/tema'
import { dataMinima, numero, type Punto } from './calcoli'

// L'andamento di una metrica: la linea, l'area sotto in sfumatura, i punti,
// il valore piu' alto e piu' basso a sinistra e le date in basso.

const ALTEZZA = 180
const MARGINE = { sopra: 16, sotto: 26, sinistra: 40, destra: 14 }

export function Grafico({ punti, unita, colore }: { punti: Punto[]; unita: string; colore?: string }) {
  const p = usePalette()
  const [larghezza, setLarghezza] = useState(0)
  const tinta = colore ?? p.accento

  const valori = punti.map((x) => x.valore)
  const minimo = Math.min(...valori)
  const massimo = Math.max(...valori)
  // Un po' d'aria sopra e sotto; con un solo valore (o tutti uguali) la linea sta a meta'.
  const scarto = massimo - minimo || Math.max(1, Math.abs(massimo) * 0.05)
  const basso = minimo - scarto * 0.2
  const alto = massimo + scarto * 0.2

  const w = Math.max(0, larghezza - MARGINE.sinistra - MARGINE.destra)
  const h = ALTEZZA - MARGINE.sopra - MARGINE.sotto
  // I punti in ordine di tempo, distanziati per data: due misurazioni vicine restano vicine.
  const t0 = new Date(punti[0]?.data ?? 0).getTime()
  const t1 = new Date(punti[punti.length - 1]?.data ?? 0).getTime()
  const x = (d: string) => MARGINE.sinistra + (t1 > t0 ? ((new Date(d).getTime() - t0) / (t1 - t0)) * w : w / 2)
  const y = (v: number) => MARGINE.sopra + (1 - (v - basso) / (alto - basso)) * h

  const xy = punti.map((q) => [x(q.data), y(q.valore)] as const)
  const linea = xy.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ')
  const area = xy.length > 1 ? `${linea} L${xy[xy.length - 1][0].toFixed(1)},${MARGINE.sopra + h} L${xy[0][0].toFixed(1)},${MARGINE.sopra + h} Z` : ''
  const ultimo = xy[xy.length - 1]

  return (
    <View onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} style={{ height: ALTEZZA }} accessibilityLabel={`Andamento: da ${numero(valori[0])} a ${numero(valori[valori.length - 1])} ${unita}`}>
      {larghezza > 0 && punti.length ? (
        <>
          <Svg width={larghezza} height={ALTEZZA}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={tinta} stopOpacity={0.28} />
                <Stop offset="1" stopColor={tinta} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[massimo, minimo].map((v, i) => (
              <Line key={i} x1={MARGINE.sinistra} x2={larghezza - MARGINE.destra} y1={y(v)} y2={y(v)} stroke={p.linea} strokeWidth={1} strokeDasharray="4 5" />
            ))}
            {area ? <Path d={area} fill="url(#area)" /> : null}
            {xy.length > 1 ? <Path d={linea} stroke={tinta} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {xy.map(([a, b], i) => (
              <Circle key={i} cx={a} cy={b} r={i === xy.length - 1 ? 6 : 3.5} fill={i === xy.length - 1 ? tinta : p.carta} stroke={tinta} strokeWidth={2.5} />
            ))}
            {ultimo ? <Circle cx={ultimo[0]} cy={ultimo[1]} r={11} fill={tinta} opacity={0.18} /> : null}
          </Svg>
          <Text style={[stili.asse, { color: p.testoTerzo, top: y(massimo) - 8 }]}>{numero(massimo)}</Text>
          {massimo !== minimo ? <Text style={[stili.asse, { color: p.testoTerzo, top: y(minimo) - 8 }]}>{numero(minimo)}</Text> : null}
          <Text style={[stili.data, { color: p.testoTerzo, left: MARGINE.sinistra - 4 }]}>{dataMinima(punti[0].data)}</Text>
          {punti.length > 1 ? <Text style={[stili.data, { color: p.testoTerzo, right: MARGINE.destra - 4 }]}>{dataMinima(punti[punti.length - 1].data)}</Text> : null}
        </>
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  asse: { position: 'absolute', left: 0, width: MARGINE.sinistra - 6, textAlign: 'right', fontFamily: F.semi, fontSize: 11 },
  data: { position: 'absolute', bottom: 2, fontFamily: F.semi, fontSize: 11 },
})
