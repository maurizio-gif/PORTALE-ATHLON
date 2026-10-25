import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, FUOCO } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { useNotifiche } from '../notifiche/store'

// «Hai N notifiche da leggere», in Home (25/10/2026, richiesta di Maurizio: «rendi piu visibile la sezione notifiche»). Il centro
// notifiche si apriva solo dal campanello, piccolo e nell'angolo della testata: chi non lo notava non sapeva che il club gli
// avesse scritto. Questa carta c'e' **solo quando c'e' qualcosa da leggere**, e sparisce da sola quando le non lette sono a zero:
// una carta fissa che dice «nessuna notifica» sarebbe rumore. L'arancio pieno e' di proposito: e' la sola carta della Home di
// questo colore, e dice «il club ti ha scritto».
//
// Il numero e' quello del campanello (`useNotifiche().nonLette`, dal server). Mai in vista cliente, e non prima che la funzione
// abbia risposto (`attivo`): per chi non e' fra i tester le notifiche non esistono.

export function CartaNotifiche() {
  const { attivo, nonLette } = useNotifiche()
  if (vistaCorrente() || !attivo || nonLette <= 0) return null
  const titolo = nonLette === 1 ? t('Hai 1 notifica da leggere', 'You have 1 unread notification') : t(`Hai ${nonLette} notifiche da leggere`, `You have ${nonLette} unread notifications`)
  return (
    <Entra indice={1}>
      <Carta onPress={() => router.push('/notifiche')} style={stili.carta}>
        <View style={stili.riga} accessibilityRole="link" accessibilityLabel={`${titolo}. ${t('Apri le notifiche del club.', 'Open the club’s notifications.')}`}>
          <View style={stili.bollino}>
            <Icona nome="campanello" size={22} colore="#fff" />
            <View style={stili.numero}>
              <Text style={stili.numeroTesto}>{nonLette > 9 ? '9+' : String(nonLette)}</Text>
            </View>
          </View>
          <View style={stili.testi}>
            <Text style={stili.titolo}>{titolo}</Text>
            <Text style={stili.sotto}>{t('Le comunicazioni del club per te, tutte in un posto.', 'The club’s messages for you, all in one place.')}</Text>
          </View>
          <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.85)" />
        </View>
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  carta: { backgroundColor: FUOCO[1], borderColor: FUOCO[2] },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  numero: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  numeroTesto: { color: FUOCO[2], fontFamily: F.extra, fontSize: 11.5, lineHeight: 14 },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 19, lineHeight: 23, letterSpacing: -0.5, color: '#FFFFFF' },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.88)' },
})
