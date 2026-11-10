import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { useNotifiche } from '../notifiche/store'
import { useAppenaAttivate, usePush } from '../notifiche/push'
import { eNativo } from '../notifiche/pushNativo'
import { invitoPushRichiesta } from './richieste'

// «Attiva le notifiche per sapere quando risponde» (10/11/2026, richiesta di Maurizio: «quando ci mandano una richiesta d'assistenza, e vedi che non hanno le notifiche push attivate,
// fargli apparire un messaggio per attivare le notifiche push per essere avvisato»). La risposta del team arriva nell'app, e senza la push la persona la trova solo riaprendola.
//
// **Compare dove la persona sta aspettando**: sotto «Fatto» appena inviata la richiesta, e in cima al filo di una richiesta ancora senza risposta. Quando decide `invitoPushRichiesta` (puro):
// push spenta, bloccata o iPhone senza app installata, e nessun altro dispositivo della persona con le notifiche attive. Con un tocco si attiva (il permesso va chiesto dentro il tocco);
// attivate, per qualche secondo dice «fatto» e poi la carta sparisce da sola. Non c'e' «non ora»: e' un invito legato a questa richiesta, non una carta fissa come quella della Home.
// Niente per chi non ha le notifiche nell'app (`useNotifiche().attivo`): la funzione non ha risposto, e la push non e' una cosa che possiamo offrire.

export function InvitoPushRichiesta() {
  const { attivo } = useNotifiche()
  if (!attivo) return null
  return <InvitoViva />
}

function InvitoViva() {
  const p = usePalette()
  const { stato, dispositivi, occupato, errore, attiva } = usePush()
  const fatta = useAppenaAttivate(stato)

  if (fatta) {
    return (
      <Messaggio tono="ok" titolo={t('Notifiche attivate', 'Notifications on')}>
        {t('Ti avvisiamo appena il team risponde, anche con l’app chiusa.', 'We’ll alert you as soon as the team replies, even with the app closed.')}
      </Messaggio>
    )
  }

  const invito = invitoPushRichiesta(stato, dispositivi)
  if (!invito) return null

  return (
    <Carta style={[stili.carta, { borderColor: FUOCO[1] }]}>
      <View style={stili.riga}>
        <View style={[stili.bollino, { backgroundColor: FUOCO[1] }]}>
          <Icona nome="campanello" size={20} colore="#fff" />
        </View>
        <View style={stili.testi}>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {t('Attiva le notifiche per sapere quando risponde', 'Turn on notifications to know when we reply')}
          </Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {invito === 'attiva'
              ? t('Il team ti risponde qui, nell’app. Con le notifiche ti avvisiamo appena arriva la risposta, anche con l’app chiusa. Basta un tocco.', 'The team replies here, in the app. With notifications we alert you as soon as the reply arrives, even with the app closed. It takes one tap.')
              : invito === 'sbloccare'
                ? eNativo
                  ? t('Il team ti risponde qui, nell’app, ma le notifiche sono bloccate: per essere avvisato apri le Impostazioni del telefono, scegli Athlon Club e consenti le notifiche.', 'The team replies here, in the app, but notifications are blocked: to be alerted, open your phone’s Settings, choose Athlon Club and allow notifications.')
                  : t('Il team ti risponde qui, nell’app, ma le notifiche sono bloccate: per essere avvisato consentile a questo sito dalle impostazioni del browser, poi torna qui.', 'The team replies here, in the app, but notifications are blocked: to be alerted, allow them for this site in your browser settings, then come back here.')
                : t('Il team ti risponde qui, nell’app. Su iPhone le notifiche arrivano solo all’app aggiunta alla schermata Home: da Safari tocca «Condividi», poi «Aggiungi alla schermata Home», e riaprila da lì per attivarle.', 'The team replies here, in the app. On iPhone notifications only reach the app added to the Home Screen: in Safari tap “Share”, then “Add to Home Screen”, and reopen it from there to turn them on.')}
          </Text>
        </View>
      </View>
      {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
      {invito === 'attiva' ? <Pulsante testo={t('Attiva le notifiche', 'Turn on notifications')} icona="campanello" inCorso={occupato} onPress={() => void attiva()} /> : null}
    </Carta>
  )
}

const stili = StyleSheet.create({
  carta: { gap: spazio.tre, borderWidth: 1.5 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
