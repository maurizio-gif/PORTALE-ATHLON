import { StyleSheet, Text, View } from 'react-native'

import type { SessoCalcolo } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

/**
 * Uomo o donna, per la formula: due pulsanti uguali, e quello scelto pieno. Era in `schede/Calorie.tsx` (la sceglieva solo la
 * stima di una scheda); dal 29/10/2026 sta qui perche' il sesso e' uno dei tre dati obbligatori di Athlon Health System e si
 * sceglie anche da «Il tuo corpo».
 */
export function SceltaSesso({ sesso, onScegli, inCorso }: { sesso: SessoCalcolo; onScegli: (s: 'm' | 'f') => void; inCorso: boolean }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', gap: spazio.due }}>
      {(
        [
          ['m', t('Uomo', 'Male')],
          ['f', t('Donna', 'Female')],
        ] as const
      ).map(([v, testo]) => {
        const scelto = sesso === v
        return (
          <Tocco
            key={v}
            vibra="scelta"
            stato={{ selected: scelto, disabled: inCorso }}
            onPress={() => !inCorso && onScegli(v)}
            etichetta={t(`Calcola come ${testo.toLowerCase()}`, `Calculate as ${testo.toLowerCase()}`)}
            style={[stili.scelta, { backgroundColor: scelto ? p.testo : p.carta, borderColor: scelto ? p.testo : p.linea }]}
          >
            <Text style={{ color: scelto ? p.fondo : p.testo, fontFamily: F.extra, fontSize: 15 }}>{testo}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  scelta: { flex: 1, minHeight: 48, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
})
