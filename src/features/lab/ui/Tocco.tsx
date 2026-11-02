import * as Haptics from 'expo-haptics'
import type { ReactNode } from 'react'
import { Platform, Pressable, type AccessibilityRole, type Insets, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { useRiduciMovimento } from './movimento'

// Tutto quello che si tocca nel laboratorio: si abbassa un poco sotto il dito,
// con una molla, e sul telefono da' un colpetto. E' quello che fa sembrare
// un'app un'app.
//
// Sul computer (02/11/2026) risponde anche al puntatore: passandoci sopra si solleva di un soffio (`sollevaInHover`), cosi'
// si capisce che e' un comando prima di premerlo. Con «riduci movimento» (`movimento.ts`) ne' la molla ne' l'hover si muovono.
// `hitSlop` allarga la zona che prende il tocco senza allargare il disegno: per i comandi piccoli (le bandiere, il tema, un
// testo-link) che devono restare compatti ma arrivare ai 44 punti di un dito.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const MOLLA = { damping: 18, stiffness: 320, mass: 0.6 }

/** Dove deve stare la scala: sotto il dito si abbassa a `scala`; col solo puntatore sopra si alza di poco, in proporzione; altrimenti 1. */
function bersaglio(premuto: boolean, sopra: boolean, scala: number): number {
  return premuto ? scala : sopra ? 1 + (1 - scala) * 0.4 : 1
}

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
  hitSlop,
  sollevaInHover = true,
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
  stato?: { selected?: boolean; checked?: boolean; disabled?: boolean; busy?: boolean; expanded?: boolean }
  /** Quanto allargare la zona del tocco oltre il disegno, in punti (uguale sui quattro lati, o lato per lato). */
  hitSlop?: number | Insets
  /** Sul web, col puntatore sopra, si solleva di un soffio. Falso per quello che non deve muoversi (una riga di elenco larga). */
  sollevaInHover?: boolean
}) {
  const s = useSharedValue(1)
  const fermo = useRiduciMovimento()
  // Lo stato del dito e del puntatore sta in due valori condivisi: ognuno dei quattro eventi li aggiorna e rimette la scala dove deve stare.
  const premuto = useSharedValue(false)
  const sopra = useSharedValue(false)
  const animato = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }))
  const hover = Platform.OS === 'web' && sollevaInHover
  return (
    <AnimatedPressable
      accessibilityRole={ruolo}
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: spento, ...stato }}
      // Sul web `accessibilityState` non arriva al DOM: per un radio o una casella (`stato.checked`) si scrive `aria-checked`, che e' valido per quei ruoli.
      aria-checked={stato?.checked}
      disabled={spento || !onPress}
      hitSlop={hitSlop}
      onPressIn={() => {
        premuto.value = true
        if (!fermo) s.value = withSpring(bersaglio(premuto.value, hover && sopra.value, scala), MOLLA)
      }}
      onPressOut={() => {
        premuto.value = false
        if (!fermo) s.value = withSpring(bersaglio(premuto.value, hover && sopra.value, scala), MOLLA)
      }}
      onHoverIn={() => {
        sopra.value = true
        if (!fermo) s.value = withSpring(bersaglio(premuto.value, hover && sopra.value, scala), MOLLA)
      }}
      onHoverOut={() => {
        sopra.value = false
        if (!fermo) s.value = withSpring(bersaglio(premuto.value, hover && sopra.value, scala), MOLLA)
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
