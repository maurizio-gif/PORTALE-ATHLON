import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import type { Ordine } from '@/api/shop'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { F, usePalette } from '../ui/tema'
import { SegnapostoFoto } from './SegnapostoFoto'

// Le righe di un ordine (foto, nome, le risposte al questionario, quanti, quanto) e il totale: le usano la pagina dell'esito e i miei ordini.
export function RigheOrdine({ ordine }: { ordine: Ordine }) {
  const p = usePalette()
  return (
    <View>
      {/* La chiave porta anche la posizione: due kit per due atleti sono due righe dello stesso articolo. */}
      {ordine.righe.map((r, i) => (
        <View key={`${r.product_id}-${i}`} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
          <View style={[stili.miniatura, { backgroundColor: p.incavo }]}>{r.foto ? <Image source={{ uri: r.foto }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <SegnapostoFoto size={20} />}</View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
              {r.quantita > 1 ? `${r.quantita} × ` : ''}
              {r.nome}
            </Text>
            {r.scelte_testo.length ? (
              <Text style={[stili.scelte, { color: p.testoSecondario }]}>{r.scelte_testo.map((x) => `${x.etichetta}: ${x.valore}`).join(' · ')}</Text>
            ) : null}
          </View>
          <Text style={[stili.prezzo, { color: p.testo }]}>{euro(Math.round(r.prezzo * 100) * r.quantita / 100)}</Text>
        </View>
      ))}
      <View style={[stili.riga, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea, justifyContent: 'space-between' }]}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.bold, fontSize: 15 }}>{t('Totale', 'Total')}</Text>
        <Text style={[stili.totale, { color: p.testo }]}>{euro(ordine.totale)}</Text>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre - 2 },
  miniatura: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden' },
  nome: { fontFamily: F.semi, fontSize: 14.5, lineHeight: 19 },
  scelte: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  prezzo: { fontFamily: F.bold, fontSize: 14.5 },
  totale: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
})
