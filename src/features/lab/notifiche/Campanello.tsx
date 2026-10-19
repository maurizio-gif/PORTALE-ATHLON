import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { F, FUOCO } from '../ui/tema'
import { Icona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { useNotifiche } from './store'

// Il campanello della Home (20/10/2026): porta al centro notifiche, e il pallino dice quante non sono lette. Non si vede
// finche' la funzione non ha risposto (e non si vede mai in vista cliente, o a chi non e' fra i tester): niente comandi
// che portano a una schermata vuota.

export function Campanello({ colore = '#fff', fondo = 'rgba(255,255,255,0.12)' }: { colore?: string; fondo?: string }) {
  const { attivo, nonLette } = useNotifiche()
  if (!attivo) return null
  return (
    <Tocco
      onPress={() => router.push('/notifiche')}
      etichetta={nonLette > 0 ? `Notifiche: ${nonLette} da leggere` : 'Notifiche'}
      style={[stili.tondo, { backgroundColor: fondo }]}
    >
      <Icona nome="campanello" size={16} colore={colore} />
      {nonLette > 0 ? (
        <View style={stili.pallino} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={stili.numero}>{nonLette > 9 ? '9+' : String(nonLette)}</Text>
        </View>
      ) : null}
    </Tocco>
  )
}

const stili = StyleSheet.create({
  tondo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pallino: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: FUOCO[1], alignItems: 'center', justifyContent: 'center' },
  numero: { color: '#fff', fontFamily: F.extra, fontSize: 10.5, lineHeight: 13 },
})
