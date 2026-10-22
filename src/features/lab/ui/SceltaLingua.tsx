import { StyleSheet, Text, View } from 'react-native'

import { impostaLingua, t, type Lingua } from '@/lib/lingua'
import { useLingua } from '@/lib/lingua-react'

import { F, FUOCO, usePalette } from './tema'
import { Tocco } from './Tocco'

// La scelta della lingua: due pillole, «Italiano» e «English», ognuna scritta nella sua lingua (chi non legge
// l'italiano deve riconoscere la sua). Sta nel Profilo (Account) e in fondo alla pagina d'accesso, dove la
// sceglie chi non e' ancora entrato. Cambiarla ricarica l'app sul web (`impostaLingua`).

const VOCI: { lingua: Lingua; nome: string }[] = [
  { lingua: 'it', nome: 'Italiano' },
  { lingua: 'en', nome: 'English' },
]

export function SceltaLingua({ centrata = false }: { centrata?: boolean }) {
  const p = usePalette()
  const attuale = useLingua()
  return (
    <View style={[stili.fila, centrata && { alignSelf: 'center' }]} accessibilityRole="radiogroup" accessibilityLabel={t('Lingua dell’app', 'App language')}>
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
            style={[stili.pillola, { backgroundColor: scelta ? FUOCO[1] : p.incavo, borderColor: scelta ? FUOCO[1] : p.bordo }]}
          >
            <Text style={[stili.testo, { color: scelta ? '#fff' : p.testo }]}>{v.nome}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pillola: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  testo: { fontSize: 14, fontFamily: F.bold },
})
