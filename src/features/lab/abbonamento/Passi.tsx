import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// I passi dell'acquisto (16/10/2026): scegli, paga, firma. La firma e' sempre
// l'ultima cosa: prima si configura tutto — abbonamento, data, come si paga —
// e solo alla fine si legge il contratto.

/** «Passo 2 di 3»: dove sei e cosa viene dopo. */
export function Indicatore({ passo, nomi }: { passo: number; nomi: string[] }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }} accessibilityRole="progressbar" accessibilityLabel={`Passo ${passo} di ${nomi.length}: ${nomi[passo - 1]}`}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {nomi.map((n, i) => (
          <View key={n} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < passo ? p.accento : p.linea }} />
        ))}
      </View>
      <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13 }}>
        <Text style={{ color: p.accento, fontFamily: F.extra }}>{`Passo ${passo} di ${nomi.length}`}</Text>
        {`  ·  ${nomi[passo - 1]}`}
      </Text>
    </View>
  )
}

/**
 * Una scelta a esclusione, con il pallino in vista: chi guarda sa subito quale
 * e' selezionata (il solo bordo colorato non bastava: a un test non era chiaro
 * di aver scelto la carta).
 */
export function SchedaScelta({
  attiva,
  etichetta,
  onPress,
  icona,
  titolo,
  sotto,
  destra,
  children,
}: {
  attiva: boolean
  etichetta: string
  onPress: () => void
  icona?: 'carta' | 'banca'
  titolo: string
  sotto?: string
  destra?: ReactNode
  children?: ReactNode
}) {
  const p = usePalette()
  return (
    <Tocco
      vibra="scelta"
      ruolo="radio"
      stato={{ selected: attiva }}
      etichetta={etichetta}
      onPress={onPress}
      scala={0.985}
      style={[stili.scheda, attiva ? { borderColor: p.accento, backgroundColor: p.incavo } : { borderColor: p.linea, backgroundColor: p.carta }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <View style={[stili.pallino, { borderColor: attiva ? p.accento : p.testoTerzo, backgroundColor: attiva ? p.accento : 'transparent' }]}>
          {attiva ? <Icona nome="spunta" size={14} colore="#fff" /> : null}
        </View>
        {icona ? <Icona nome={icona} size={22} colore={attiva ? p.accento : p.testoSecondario} /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 16 }}>{titolo}</Text>
          {sotto ? <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 18 }}>{sotto}</Text> : null}
        </View>
        {destra}
      </View>
      {children}
    </Tocco>
  )
}

const stili = StyleSheet.create({
  scheda: { padding: spazio.tre, borderRadius: 18, borderWidth: 2, gap: spazio.tre },
  pallino: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
