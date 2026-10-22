import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'

import { Icona } from '../ui/Icona'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { useCarrello } from './carrello'

// Il carrello in alto a destra, con quanti pezzi ci sono. Come `BottoneTondo`, col numero in un cerchietto arancio.
export function BottoneCarrello() {
  const p = usePalette()
  const { pezzi } = useCarrello()
  return (
    <Tocco
      onPress={() => router.push('/shop/carrello')}
      etichetta={pezzi ? t(`Carrello, ${pezzi} ${pezzi === 1 ? 'pezzo' : 'pezzi'}`, `Cart, ${pezzi} ${pezzi === 1 ? 'item' : 'items'}`) : t('Carrello vuoto', 'Cart empty')}
      style={[stili.tondo, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}
    >
      <Icona nome="carrello" size={18} colore={p.testo} />
      {pezzi > 0 ? (
        <View style={[stili.numero, { backgroundColor: p.accento }]}>
          <Text style={stili.numeroTesto}>{pezzi > 99 ? '99+' : pezzi}</Text>
        </View>
      ) : null}
    </Tocco>
  )
}

const stili = StyleSheet.create({
  tondo: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  numero: { position: 'absolute', top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numeroTesto: { color: '#fff', fontFamily: F.extra, fontSize: 11.5 },
})
