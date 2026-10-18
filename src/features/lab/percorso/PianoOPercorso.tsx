import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { F, usePalette } from '../ui/tema'

/** Le due righe che dicono cos'e' un piano e cos'e' un percorso: sono la prima cosa da capire. */
export function PianoOPercorso() {
  const p = usePalette()
  return (
    <View style={[stili.differenza, { backgroundColor: p.incavo }]}>
      <View style={stili.differenzaRiga}>
        <Icona nome="peso" size={18} colore={p.blu} />
        <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>
          <Text style={{ fontFamily: F.extra }}>Il piano di allenamento </Text>
          sono gli esercizi di un allenamento in sala, o le sedute da fare in vasca: serie, ripetizioni, carichi, distanze.
        </Text>
      </View>
      <View style={stili.differenzaRiga}>
        <Icona nome="calendario" size={18} colore={p.accento} />
        <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>
          <Text style={{ fontFamily: F.extra }}>Il percorso </Text>
          è la tua settimana intera: sala, cardio, lezioni e acqua, insieme. Usa i tuoi piani come tappe di sala e di vasca.
        </Text>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  differenza: { borderRadius: 20, padding: spazio.tre + 2, gap: spazio.tre },
  differenzaRiga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2 },
})
