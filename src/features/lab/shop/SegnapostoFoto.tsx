import { StyleSheet, View } from 'react-native'

import { Icona } from '../ui/Icona'
import { usePalette } from '../ui/tema'

// Il posto della foto di un articolo che non ce l'ha ancora (19/10/2026). La segreteria carica le foto dal CRM e un
// articolo si puo' mettere in vetrina anche prima: chi compra vede questo, un sacchetto su fondo neutro, al posto
// dell'immagine. Riempie il riquadro che lo contiene (che ha gia' il suo sfondo e la sua forma), senza testo: non e'
// un errore e non c'e' niente da dire alla persona.
export function SegnapostoFoto({ size = 32 }: { size?: number }) {
  const p = usePalette()
  return (
    <View style={[StyleSheet.absoluteFill, stili.centro]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icona nome="sacchetto" size={size} colore={p.testoTerzo} />
    </View>
  )
}

const stili = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
})
