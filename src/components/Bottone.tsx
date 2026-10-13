import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

import { spazio, useColori } from '@/theme'

export function Bottone({
  testo,
  onPress,
  inCorso = false,
  disabilitato = false,
  variante = 'pieno',
}: {
  testo: string
  onPress: () => void
  inCorso?: boolean
  disabilitato?: boolean
  variante?: 'pieno' | 'contorno'
}) {
  const c = useColori()
  const pieno = variante === 'pieno'
  const spento = disabilitato || inCorso
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: spento, busy: inCorso }}
      disabled={spento}
      onPress={onPress}
      style={({ pressed }) => [
        stili.base,
        pieno ? { backgroundColor: c.accento } : { borderColor: c.bordo, borderWidth: 1 },
        { opacity: spento ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      {inCorso ? (
        <ActivityIndicator color={pieno ? c.suAccento : c.testo} />
      ) : (
        <Text style={[stili.testo, { color: pieno ? c.suAccento : c.testo }]}>{testo}</Text>
      )}
    </Pressable>
  )
}

const stili = StyleSheet.create({
  base: { minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio.tre },
  testo: { fontSize: 16, fontWeight: '700' },
})
