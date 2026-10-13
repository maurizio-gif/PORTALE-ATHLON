import type { ReactNode } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { spazio, useColori } from '@/theme'

// Un riquadro da scegliere (un giorno, un orario, un turno): bordo arancione
// quando e' scelto, spento quando non si puo'.
export function Scelta({
  scelta,
  onPress,
  spento = false,
  children,
  etichetta,
  stile,
}: {
  scelta: boolean
  onPress: () => void
  spento?: boolean
  children: ReactNode
  etichetta?: string
  stile?: object
}) {
  const c = useColori()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: scelta, disabled: spento }}
      accessibilityLabel={etichetta}
      disabled={spento}
      onPress={onPress}
      style={({ pressed }) => [
        stili.base,
        {
          borderColor: scelta ? c.accento : c.bordo,
          borderWidth: scelta ? 2 : 1,
          margin: scelta ? 0 : 1,
          backgroundColor: scelta ? c.accento : c.superficie,
          opacity: spento ? 0.45 : pressed ? 0.85 : 1,
        },
        stile,
      ]}
    >
      {children}
    </Pressable>
  )
}

const stili = StyleSheet.create({
  base: { borderRadius: 12, paddingVertical: spazio.due, paddingHorizontal: spazio.tre },
})
