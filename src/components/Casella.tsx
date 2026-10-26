import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spazio, useColori } from '@/theme'

// Una casella da spuntare con il suo testo accanto: tutto il riquadro e'
// toccabile, perche' dal telefono un quadratino da 18 pixel non lo e'.
export function Casella({
  spuntata,
  onCambia,
  children,
  riquadro = false,
  etichetta,
  bloccata = false,
}: {
  spuntata: boolean
  onCambia: () => void
  children: ReactNode
  /** Con bordo, come le righe degli abbonamenti; senza, come il consenso. */
  riquadro?: boolean
  /** Il testo per gli screen reader, se `children` non e' solo testo. */
  etichetta?: string
  /** Spuntata e non si cambia: un consenso obbligatorio, che chi non vuole dare non firma. */
  bloccata?: boolean
}) {
  const c = useColori()
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: spuntata, disabled: bloccata }}
      accessibilityLabel={etichetta}
      onPress={bloccata ? undefined : onCambia}
      hitSlop={8}
      style={[
        stili.riga,
        riquadro && {
          padding: spazio.tre,
          borderRadius: 12,
          borderWidth: spuntata ? 2 : 1,
          borderColor: spuntata ? c.accento : c.bordo,
          margin: spuntata ? 0 : 1,
        },
      ]}
    >
      <View style={[stili.quadrato, { borderColor: spuntata ? c.accento : c.testoSecondario, backgroundColor: spuntata ? c.accento : 'transparent' }]}>
        {spuntata ? <Text style={[stili.segno, { color: c.suAccento }]}>✓</Text> : null}
      </View>
      <View style={stili.testo}>{children}</View>
    </Pressable>
  )
}

const stili = StyleSheet.create({
  // 48 di altezza minima: il bersaglio di un dito, non quello del quadratino (22) o di una riga di testo.
  riga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, minHeight: 48 },
  quadrato: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  segno: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  testo: { flex: 1, minWidth: 0 },
})
