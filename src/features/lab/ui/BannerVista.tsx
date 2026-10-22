import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'

import { esciDallaVista, vistaCorrente } from '../vista'
import { Icona } from './Icona'
import { F } from './tema'
import { Tocco } from './Tocco'

// La striscia in cima quando si guarda l'app come un cliente (vista.ts): dice
// di chi e', che e' sola lettura, e riporta all'app di sempre. E' l'unica cosa
// che la vista aggiunge: tutto il resto e' l'app com'e'. Resta fuori dal tema
// chiaro/scuro di proposito - e' un avviso di servizio, e deve vedersi uguale
// su ogni schermata.
export function BannerVista() {
  const email = vistaCorrente()
  if (!email) return null
  return (
    <View style={stili.striscia} accessibilityRole="alert">
      <Icona nome="persona" size={16} colore="#fff" />
      <View style={{ flex: 1 }}>
        <Text style={stili.forte} numberOfLines={1}>
          {t('Vista cliente · solo lettura', 'Client view · read only')}
        </Text>
        <Text style={stili.testo} numberOfLines={1}>
          {email}
        </Text>
      </View>
      <Tocco onPress={esciDallaVista} etichetta={t('Esci dalla vista cliente', 'Leave client view')} scala={0.94} style={stili.esci}>
        <Text style={stili.esciTesto}>{t('Esci', 'Leave')}</Text>
      </Tocco>
    </View>
  )
}

const stili = StyleSheet.create({
  striscia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2F6BFF',
  },
  testo: { color: 'rgba(255,255,255,0.88)', fontFamily: F.medio, fontSize: 12 },
  forte: { color: '#fff', fontFamily: F.extra, fontSize: 13 },
  esci: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  esciTesto: { color: '#fff', fontFamily: F.bold, fontSize: 13 },
})
