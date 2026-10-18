import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import type { Ordine } from '@/api/shop'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { F, usePalette } from '../ui/tema'
import { SegnapostoFoto } from './SegnapostoFoto'

// Le righe di un ordine (foto, nome, quanti, quanto) e il totale: le usano la pagina dell'esito e i miei ordini.
export function RigheOrdine({ ordine }: { ordine: Ordine }) {
  const p = usePalette()
  return (
    <View>
      {ordine.righe.map((r, i) => (
        <View key={r.product_id} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
          <View style={[stili.miniatura, { backgroundColor: p.incavo }]}>{r.foto ? <Image source={{ uri: r.foto }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <SegnapostoFoto size={20} />}</View>
          <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
            {r.quantita > 1 ? `${r.quantita} × ` : ''}
            {r.nome}
          </Text>
          <Text style={[stili.prezzo, { color: p.testo }]}>{euro(Math.round(r.prezzo * 100) * r.quantita / 100)}</Text>
        </View>
      ))}
      <View style={[stili.riga, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea, justifyContent: 'space-between' }]}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.bold, fontSize: 15 }}>Totale</Text>
        <Text style={[stili.totale, { color: p.testo }]}>{euro(ordine.totale)}</Text>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre - 2 },
  miniatura: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden' },
  nome: { flex: 1, fontFamily: F.semi, fontSize: 14.5, lineHeight: 19 },
  prezzo: { fontFamily: F.bold, fontSize: 14.5 },
  totale: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
})
