import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'

import { Richiamo } from '../profilo/Richiamo'
import { F, FUOCO } from '../ui/tema'
import { Icona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { useNotifiche } from './store'

// Il campanello della Home (20/10/2026): porta al centro notifiche, e il pallino dice quante non sono lette. Non si vede
// finche' la funzione non ha risposto (e non si vede mai in vista cliente, o a chi non e' fra i tester): niente comandi
// che portano a una schermata vuota.
//
// **Piu' visibile dal 25/10/2026** (richiesta di Maurizio): 40 punti e non 32, e con notifiche da leggere diventa arancio
// pieno, con il numero in un pallino bianco e lo stesso anello che pulsa dell'invito per la foto (tre raffiche e poi sta
// fermo: `Richiamo`, che con «riduci movimento» non c'e'). Senza non lette e' com'era, solo piu' grande. L'anello riparte a ogni
// apertura della Home e, perche' non ricominci a ogni numero che cambia, e' legato a «ci sono non lette», non al conteggio.

const DIAMETRO = 40

export function Campanello({ colore = '#fff', fondo = 'rgba(255,255,255,0.12)' }: { colore?: string; fondo?: string }) {
  const { attivo, nonLette } = useNotifiche()
  if (!attivo) return null
  const daLeggere = nonLette > 0
  return (
    <Tocco
      onPress={() => router.push('/notifiche')}
      etichetta={daLeggere ? t(`Notifiche: ${nonLette} da leggere`, `Notifications: ${nonLette} unread`) : t('Notifiche', 'Notifications')}
      style={[stili.tondo, { backgroundColor: daLeggere ? FUOCO[1] : fondo }]}
    >
      <Icona nome="campanello" size={20} colore={colore} />
      {daLeggere ? (
        <>
          <Richiamo raggio={DIAMETRO / 2} colore={FUOCO[0]} ingrandimento={1.45} />
          <View style={stili.pallino} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={stili.numero}>{nonLette > 9 ? '9+' : String(nonLette)}</Text>
          </View>
        </>
      ) : null}
    </Tocco>
  )
}

const stili = StyleSheet.create({
  tondo: { width: DIAMETRO, height: DIAMETRO, borderRadius: DIAMETRO / 2, alignItems: 'center', justifyContent: 'center' },
  pallino: { position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  numero: { color: FUOCO[2], fontFamily: F.extra, fontSize: 11, lineHeight: 14 },
})
