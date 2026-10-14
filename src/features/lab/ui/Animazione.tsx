import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

// L'animazione di un esercizio fatta di fotogrammi: tutti montati uno sopra
// l'altro (cosi' non lampeggia mentre carica) e se ne mostra uno alla volta,
// nell'ordine di `sequenza`. Con «riduci movimento» acceso resta fermo sul primo.
// Con `dissolvenza` i fotogrammi sfumano l'uno nell'altro (per le foto, che
// sono solo due).

/** Sul web i file stanno sotto la radice del sito; nell'app si prendono dal portale pubblicato. */
const BASE = Platform.OS === 'web' ? '' : 'https://app.athlonroma.it'

export function Animazione({
  fotogrammi,
  sequenza,
  durataMs,
  dissolvenza = false,
  riempi = false,
  etichetta,
  style,
}: {
  /** Riempie il riquadro tagliando i bordi (le foto); senza, l'immagine intera (le illustrazioni). */
  riempi?: boolean
  fotogrammi: string[]
  sequenza?: number[]
  durataMs: number
  dissolvenza?: boolean
  etichetta: string
  style?: StyleProp<ViewStyle>
}) {
  const ordine = sequenza ?? fotogrammi.map((_, i) => i)
  const [passo, setPasso] = useState(0)
  const [fermo, setFermo] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setFermo).catch(() => undefined)
    const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setFermo)
    return () => s.remove()
  }, [])

  useEffect(() => {
    setPasso(0)
    if (fermo || ordine.length < 2) return
    const t = setInterval(() => setPasso((x) => (x + 1) % ordine.length), durataMs)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fermo, durataMs, fotogrammi.join('|')])

  const visibile = ordine[passo] ?? 0
  return (
    <View style={[stili.cornice, style]} accessibilityRole="image" accessibilityLabel={etichetta}>
      {fotogrammi.map((f, i) => (
        <Image
          key={f}
          source={{ uri: BASE + f }}
          style={[StyleSheet.absoluteFill, { opacity: i === visibile ? 1 : 0 }, dissolvenza && Platform.OS === 'web' ? ({ transition: 'opacity 450ms ease' } as object) : null]}
          contentFit={riempi ? 'cover' : 'contain'}
          cachePolicy="memory-disk"
        />
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  cornice: { width: '100%', aspectRatio: 1, overflow: 'hidden' },
})
