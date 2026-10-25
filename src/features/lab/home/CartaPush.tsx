import { useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { invitoPush, leggiRimandoPush, rimandaFinoA, salvaRimandoPush } from '../notifiche/invitoPush'
import { useAppenaAttivate, usePush } from '../notifiche/push'
import { useNotifiche } from '../notifiche/store'

// L'invito ad attivare le notifiche, in Home (25/10/2026, richiesta di Maurizio: «promuovi di piu l'attivazione delle push»).
// Prima l'unico posto era il centro notifiche, che si apre solo dal campanello: chi non lo toccava non lo vedeva mai, e la
// push dei tester non risultava attivata nemmeno sul telefono di chi la voleva.
//
// **Quando compare lo decide `invitoPush` (puro)**: push spenta, o bloccata dal browser. Mai su iPhone senza l'app installata
// (c'e' gia' «Installa l'app», che dice anche che e' l'unico modo di ricevere le notifiche), mai dove e' gia' attiva, dove il
// browser non la sa fare (o l'app e' nativa) o dove il club non l'ha attivata sul server.
// **Si attiva con un tocco di questa carta**, che e' dove il browser vuole il permesso. «Non ora» rimanda di tre giorni.
//
// **Il giro delle push si avvia solo per chi puo' avere le notifiche** (`useNotifiche().attivo`: la funzione ha risposto, quindi
// e' un tester e non e' in vista cliente): per gli altri non parte nemmeno la lettura dello stato dal server.

export function CartaPush() {
  const { attivo } = useNotifiche()
  if (Platform.OS !== 'web' || vistaCorrente() || !attivo) return null
  return <CartaPushViva />
}

function CartaPushViva() {
  const p = usePalette()
  const { stato, occupato, errore, attiva } = usePush()
  const [rimando, setRimando] = useState(leggiRimandoPush)
  // «Notifiche attivate» per qualche secondo, solo se e' stato un tocco di qui (spento → attivo): chi le aveva gia' non legge niente.
  const fatta = useAppenaAttivate(stato)

  if (fatta) {
    return (
      <Entra indice={1}>
        <Messaggio tono="ok" titolo={t('Notifiche attivate', 'Notifications on')}>
          {t('Da ora ti avvisiamo subito, anche con l’app chiusa.', 'From now on we’ll alert you right away, even with the app closed.')}
        </Messaggio>
      </Entra>
    )
  }

  const invito = invitoPush(stato, rimando, Date.now())
  if (!invito) return null

  function nonOra() {
    const fino = rimandaFinoA(Date.now())
    salvaRimandoPush(fino)
    setRimando(fino)
  }

  const sbloccare = invito === 'sbloccare'
  return (
    <Entra indice={1}>
      <Carta style={[stili.carta, { borderColor: FUOCO[1] }]}>
        <View style={stili.riga}>
          <View style={[stili.bollino, { backgroundColor: FUOCO[1] }]}>
            <Icona nome="campanello" size={22} colore="#fff" />
          </View>
          <View style={stili.testi}>
            <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
              {sbloccare ? t('Le notifiche sono bloccate', 'Notifications are blocked') : t('Non perderti le novità del club', 'Don’t miss the club’s news')}
            </Text>
            <Text style={[stili.testo, { color: p.testoSecondario }]}>
              {sbloccare
                ? t('Così ti perdi le novità del club. Per riceverle consenti le notifiche a questo sito dalle impostazioni del browser, poi torna qui.', 'That way you miss the club’s news. To get them, allow notifications for this site in your browser settings, then come back here.')
                : t('Attiva le notifiche: ti avvisiamo subito di novità, eventi e comunicazioni del club, anche con l’app chiusa. Basta un tocco.', 'Turn on notifications: we’ll alert you right away about club news, events and updates, even with the app closed. It takes one tap.')}
            </Text>
          </View>
        </View>
        {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
        {sbloccare ? null : <Pulsante testo={t('Attiva le notifiche', 'Turn on notifications')} icona="campanello" inCorso={occupato} onPress={() => void attiva()} />}
        <Pulsante testo={t('Non ora', 'Not now')} variante="fantasma" piccolo pieno={false} onPress={nonOra} />
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  carta: { gap: spazio.tre, borderWidth: 1.5 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 18, lineHeight: 22, letterSpacing: -0.4 },
  testo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
