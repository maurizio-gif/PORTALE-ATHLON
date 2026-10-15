import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Icona, type NomeIcona } from './Icona'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// Le due facce di «Prenotazioni» (15/10/2026): le lezioni di gruppo e il
// personal training. Due pagine, una sola scheda della barra in basso: questo
// interruttore sta in cima a tutte e due, e si passa dall'una all'altra senza
// accumulare pagine (replace).

const VOCI: { chiave: 'lezioni' | 'personal'; testo: string; icona: NomeIcona; percorso: '/lab/calendario' | '/lab/personal' }[] = [
  { chiave: 'lezioni', testo: 'Lezioni', icona: 'calendario', percorso: '/lab/calendario' },
  { chiave: 'personal', testo: 'Personal', icona: 'persona', percorso: '/lab/personal' },
]

export function SceltaPrenotazioni({ attiva }: { attiva: 'lezioni' | 'personal' }) {
  const p = usePalette()
  return (
    <View style={[stili.binario, { backgroundColor: p.incavo }]} accessibilityRole="tablist">
      {VOCI.map((v) => {
        const qui = v.chiave === attiva
        return (
          <Tocco
            key={v.chiave}
            ruolo="tab"
            vibra="scelta"
            stato={{ selected: qui }}
            etichetta={v.chiave === 'lezioni' ? 'Lezioni di gruppo' : 'Personal training'}
            onPress={() => !qui && router.replace(v.percorso)}
            style={[stili.voce, qui && { backgroundColor: p.carta, boxShadow: p.scuro ? '0 4px 14px rgba(0,0,0,0.45)' : '0 4px 14px rgba(20,20,40,0.10)' }]}
          >
            <Icona nome={v.icona} size={16} colore={qui ? p.accento : p.testoSecondario} />
            <Text style={{ color: qui ? p.testo : p.testoSecondario, fontFamily: qui ? F.extra : F.semi, fontSize: 15 }}>{v.testo}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  binario: { flexDirection: 'row', borderRadius: 18, padding: 4, gap: 4 },
  voce: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 14 },
})
