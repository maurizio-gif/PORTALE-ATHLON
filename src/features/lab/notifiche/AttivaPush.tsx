import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { usePush } from './push'

// «Attiva le notifiche» (20/10/2026), in cima al centro notifiche: attiva o spegne la push di questo dispositivo.
// Dal 22/10/2026 (richiesta di Maurizio) l'invito **consiglia** di attivarle, quasi come un requisito: e' il modo per restare
// aggiornati su novita', iniziative e comunicazioni del club, anche con l'app chiusa. Attivarle «di default» non si puo': il
// browser (e iOS) accende la push solo dopo un tocco della persona e il suo «Consenti». Ogni notifica arriva comunque anche
// nell'app, come finestra e nel centro; le notifiche di marketing solo a chi ha il consenso della newsletter (lo controlla il
// database), e questo testo non lo cambia.

export function AttivaPush() {
  const p = usePalette()
  const { stato, occupato, errore, dispositivi, attiva, spegni } = usePush()

  // Niente da offrire: nessuna carta (il centro e la finestra funzionano lo stesso).
  if (stato === 'verifica' || stato === 'non_supportato' || stato === 'non_disponibile') return null

  if (stato === 'serve_app_installata') {
    return (
      <Messaggio tono="attenzione" icona="info" titolo={t('Attiva le notifiche per restare aggiornato', 'Turn on notifications to stay up to date')}>
        {t('Per non perderti nessuna novità del club, aggiungi l’app alla schermata Home: su iPhone le notifiche arrivano solo così. Da Safari tocca «Condividi», poi «Aggiungi alla schermata Home», e riaprila da lì per attivarle.', 'So you don’t miss any club news, add the app to your Home Screen: on iPhone that’s the only way notifications arrive. In Safari tap “Share”, then “Add to Home Screen”, and reopen it from there to turn them on.')}
      </Messaggio>
    )
  }

  if (stato === 'bloccato') {
    return (
      <Messaggio tono="attenzione" icona="info" titolo={t('Le notifiche sono bloccate: ti stai perdendo le novità', 'Notifications are blocked: you’re missing out on news')}>
        {t('Ti consigliamo di riattivarle: consenti le notifiche a questo sito dalle impostazioni del browser e torna qui. Così ricevi subito novità, iniziative e comunicazioni del club.', 'We recommend turning them back on: allow notifications for this site in your browser settings and come back here. That way you get club news, initiatives and updates right away.')}
      </Messaggio>
    )
  }

  const attivo = stato === 'attivo'
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.riga}>
        <View style={[stili.bollino, { backgroundColor: attivo ? p.ok : p.incavo }]}>
          <Icona nome="campanello" size={20} colore={attivo ? '#fff' : p.testo} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{attivo ? t('Notifiche attive: sei sempre aggiornato', 'Notifications on: you’re always up to date') : t('Attiva le notifiche: te lo consigliamo', 'Turn on notifications: we recommend it')}</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {attivo
              ? dispositivi > 1
                ? t(`Bene! Le ricevi su ${dispositivi} dispositivi: così resti aggiornato su tutte le nostre novità, le iniziative e le comunicazioni del club.`, `Great! You get them on ${dispositivi} devices, so you stay up to date on all our news, initiatives and club updates.`)
                : t('Bene! Così resti aggiornato su tutte le nostre novità, le iniziative e le comunicazioni del club.', 'Great! This way you stay up to date on all our news, initiatives and club updates.')
              : t('È il modo per restare sempre aggiornato: novità, iniziative, eventi e comunicazioni del club ti arrivano subito sul telefono, anche con l’app chiusa. Senza, rischi di perderti qualcosa.', 'It’s the way to always stay up to date: club news, initiatives, events and updates reach your phone right away, even with the app closed. Without them, you might miss something.')}
          </Text>
        </View>
      </View>
      {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
      {attivo ? (
        <Pulsante testo={t('Spegni su questo dispositivo', 'Turn off on this device')} variante="contorno" piccolo pieno={false} inCorso={occupato} onPress={() => void spegni()} />
      ) : (
        <Pulsante testo={t('Attiva le notifiche', 'Turn on notifications')} icona="campanello" inCorso={occupato} onPress={() => void attiva()} />
      )}
    </Carta>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
