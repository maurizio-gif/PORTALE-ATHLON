import { StyleSheet, View } from 'react-native'

import { tinta } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'

// Le illustrazioni di «Capire il cibo» (01/11/2026): le icone dell'app, non emoji (richiesta di Maurizio: niente
// emoji) e non foto (non ce ne sono, ne' diritti per usarne). Sono le stesse SF Symbols e Material Symbols del resto
// dell'app: seguono il tema chiaro e scuro e non dipendono dal telefono. Decorazione: ai lettori di schermo non si leggono.

/** Tre icone messe in gruppo, una grande e due piu' piccole: l'angolo di una tessera o di un'apertura. */
export function Grappolo({ icone, scala = 1 }: { icone: readonly [NomeIcona, NomeIcona, NomeIcona]; scala?: number }) {
  const s = (n: number) => Math.round(n * scala)
  const tondo = (d: number, alfa: number) => ({ width: s(d), height: s(d), borderRadius: s(d) / 2, backgroundColor: `rgba(255,255,255,${alfa})`, alignItems: 'center' as const, justifyContent: 'center' as const })
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: s(132), height: s(118) }}>
      <View style={[{ position: 'absolute', right: s(-4), bottom: s(-4) }, tondo(96, 0.24)]}>
        <Icona nome={icone[0]} size={s(50)} colore="#fff" />
      </View>
      <View style={[{ position: 'absolute', left: s(2), top: s(2) }, tondo(48, 0.2)]}>
        <Icona nome={icone[1]} size={s(24)} colore="#fff" />
      </View>
      <View style={[{ position: 'absolute', left: s(30), bottom: s(0) }, tondo(40, 0.16)]}>
        <Icona nome={icone[2]} size={s(20)} colore="#fff" />
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

/** Un'icona in un quadrato tondeggiante tinto del suo colore: al posto del puntino negli elenchi. */
export function Bolla({ icona, colore, size = 38 }: { icona: NomeIcona; colore: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: tinta(colore, 0.18), alignItems: 'center', justifyContent: 'center' }}>
      <Icona nome={icona} size={size * 0.5} colore={colore} />
    </View>
  )
}
