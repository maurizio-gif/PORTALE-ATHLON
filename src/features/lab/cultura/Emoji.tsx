import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'

import { tinta } from '@/theme'

// Le illustrazioni di «Capire il cibo» (01/11/2026): emoji a colori, che su ogni telefono e sul web hanno il disegno
// del sistema (niente foto da caricare, niente diritti da pagare, e seguono il tema chiaro e scuro). Sono decorazione:
// ai lettori di schermo non si leggono (il testo accanto dice tutto).

export function Emoji({ e, size = 28, style }: { e: string; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text aria-hidden accessible={false} style={[{ fontSize: size, lineHeight: Math.round(size * 1.2), textAlign: 'center' }, style]}>
      {e}
    </Text>
  )
}

const OMBRA: TextStyle = { textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 7 }

/** Tre illustrazioni messe in gruppo, una grande e due piu' piccole inclinate: l'angolo di una tessera o di un'apertura. */
export function Grappolo({ emoji, scala = 1 }: { emoji: readonly string[]; scala?: number }) {
  const s = (n: number) => Math.round(n * scala)
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: s(132), height: s(118) }}>
      <View style={{ position: 'absolute', right: s(-6), bottom: s(-4), width: s(96), height: s(96), borderRadius: s(48), backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <View style={{ position: 'absolute', right: s(2), bottom: s(0), transform: [{ rotate: '8deg' }] }}>
        <Emoji e={emoji[0]} size={s(64)} style={OMBRA} />
      </View>
      <View style={{ position: 'absolute', left: s(0), top: s(4), transform: [{ rotate: '-14deg' }] }}>
        <Emoji e={emoji[1]} size={s(42)} style={OMBRA} />
      </View>
      <View style={{ position: 'absolute', left: s(22), bottom: s(2), transform: [{ rotate: '10deg' }] }}>
        <Emoji e={emoji[2]} size={s(36)} style={OMBRA} />
      </View>
    </View>
  )
}

/** Due cerchi chiari sul fondo di una carta a colori: danno profondita'. Sta dentro un contenitore con `overflow: hidden`. */
export function Cerchi() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', right: -56, top: -66, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.1)' }} />
      <View style={{ position: 'absolute', left: -46, bottom: -58, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.07)' }} />
    </View>
  )
}

/** Un'emoji in un quadrato tondeggiante tinto del suo colore: al posto del puntino negli elenchi. */
export function Bolla({ emoji, colore, size = 38 }: { emoji: string; colore: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: tinta(colore, 0.2), alignItems: 'center', justifyContent: 'center' }}>
      <Emoji e={emoji} size={size * 0.54} />
    </View>
  )
}
