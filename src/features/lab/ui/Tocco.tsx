import * as Haptics from 'expo-haptics'
import type { ReactNode } from 'react'
import { Platform, Pressable, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

// Tutto quello che si tocca nel laboratorio: si abbassa un poco sotto il dito,
// con una molla, e sul telefono da' un colpetto. E' quello che fa sembrare
// un'app un'app.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const MOLLA = { damping: 18, stiffness: 320, mass: 0.6 }

export function colpetto(tipo: 'leggero' | 'scelta' | 'ok' | 'errore' = 'leggero') {
  if (Platform.OS === 'web') return
  if (tipo === 'scelta') Haptics.selectionAsync()
  else if (tipo === 'ok') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  else if (tipo === 'errore') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

export function Tocco({
  onPress,
  children,
  style,
  spento = false,
  scala = 0.97,
  vibra = 'leggero',
  ruolo = 'button',
  etichetta,
  stato,
}: {
  onPress?: () => void
  children: ReactNode
  style?: StyleProp<ViewStyle>
  spento?: boolean
  /** Quanto si abbassa sotto il dito. */
  scala?: number
  vibra?: 'leggero' | 'scelta' | null
  ruolo?: AccessibilityRole
  etichetta?: string
  stato?: { selected?: boolean; disabled?: boolean; busy?: boolean }
}) {
  const s = useSharedValue(1)
  const animato = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }))
  return (
    <AnimatedPressable
      accessibilityRole={ruolo}
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: spento, ...stato }}
      disabled={spento || !onPress}
      onPressIn={() => {
        s.value = withSpring(scala, MOLLA)
      }}
      onPressOut={() => {
        s.value = withSpring(1, MOLLA)
      }}
      onPress={() => {
        if (vibra) colpetto(vibra)
        onPress?.()
      }}
      style={[style, animato]}
    >
      {children}
    </AnimatedPressable>
  )
}
