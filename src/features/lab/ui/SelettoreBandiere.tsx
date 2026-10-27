import { StyleSheet, Text, View } from 'react-native'

import { impostaLingua, t, type Lingua } from '@/lib/lingua'
import { useLingua } from '@/lib/lingua-react'

import { Tocco } from './Tocco'

// Il selettore della lingua nella testata della Home (27/10/2026, richiesta di Maurizio): due bandiere, una sola scelta.
// Sta fra la data e il campanello, sullo scuro della testata. Cambiare lingua ricarica l'app (`impostaLingua`).
// E' lo stesso comando della pagina d'accesso e del Profilo (`SceltaLingua`), in forma compatta.

const VOCI: { lingua: Lingua; bandiera: string; nome: string }[] = [
  { lingua: 'it', bandiera: '🇮🇹', nome: 'Italiano' },
  { lingua: 'en', bandiera: '🇬🇧', nome: 'English' },
]

export function SelettoreBandiere() {
  const attuale = useLingua()
  return (
    <View style={stili.fila} accessibilityRole="radiogroup" accessibilityLabel={t('Lingua dell’app', 'App language')}>
      {VOCI.map((v) => {
        const scelta = v.lingua === attuale
        return (
          <Tocco
            key={v.lingua}
            ruolo="radio"
            etichetta={v.nome}
            stato={{ selected: scelta }}
            vibra={scelta ? null : 'scelta'}
            onPress={() => {
              if (!scelta) impostaLingua(v.lingua)
            }}
            style={[stili.bandiera, scelta && stili.scelta]}
          >
            <Text style={[stili.emoji, !scelta && { opacity: 0.45 }]}>{v.bandiera}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  bandiera: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  scelta: { backgroundColor: 'rgba(255,255,255,0.22)' },
  emoji: { fontSize: 17, lineHeight: 22 },
})
