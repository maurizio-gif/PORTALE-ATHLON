import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio, stileTono, useColori, type Tono } from '@/theme'

// Un riquadro colorato: errore da correggere, esito, attenzione.
export function Avviso({ tono = 'errore', children }: { tono?: Tono; children: ReactNode }) {
  const c = useColori()
  return (
    <View accessibilityRole={tono === 'errore' ? 'alert' : undefined} style={[stili.riquadro, stileTono(c, tono)]}>
      {typeof children === 'string' ? <Text style={[stili.testo, { color: c.testo }]}>{children}</Text> : children}
    </View>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderRadius: 10, paddingVertical: spazio.due + 2, paddingHorizontal: spazio.tre },
  testo: { fontSize: 14, lineHeight: 21 },
})
