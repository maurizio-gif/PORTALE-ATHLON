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
}: {
  spuntata: boolean
  onCambia: () => void
  children: ReactNode
  /** Con bordo, come le righe degli abbonamenti; senza, come il consenso. */
  riquadro?: boolean
  /** Il testo per gli screen reader, se `children` non e' solo testo. */
  etichetta?: string
}) {
  const c = useColori()
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: spuntata }}
      accessibilityLabel={etichetta}
      onPress={onCambia}
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
  riga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre },
  quadrato: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  segno: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  testo: { flex: 1, minWidth: 0 },
})
