import { Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { invitoPushRichiesta } from '../assistenza/richieste'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { useNotifiche } from './store'
import { useAppenaAttivate, usePush } from './push'
import { eNativo } from './pushNativo'

// «Attiva le notifiche per sapere se si libera un posto» (10/11/2026, richiesta di Maurizio, dopo aver spento l'SMS del subentro: «quando l'utente si mette in lista d'attesa, devi
// verificare che abbia le notifiche push attive, se non le ha consiglia di attivarle per essere avvisato e metti direttamente il pulsante per attivarle»).
//
// Chi e' in lista d'attesa aspetta che un posto si liberi, e quando succede il subentro e' immediato: avvisarlo dopo un'ora non serve. Senza l'SMS i canali sono l'email e la notifica
// nell'app, e la notifica arriva fuori dall'app solo con la push. **Compare sotto i pulsanti di una lezione in cui si e' in lista d'attesa** (`AzioniLezione`, quindi nel Calendario, nei
// Consigli, nel Percorso, in Junior e nella chat dell'assistente: ovunque ci si puo' mettere in lista) e sotto «Pagamento ricevuto: sei in lista d'attesa».
//
// **Quando e cosa lo decide `invitoPushRichiesta`** (`assistenza/richieste.ts`, puro: la regola e' la stessa dell'invito di «Scrivi al team», e se cambia la', cambia qui): push spenta, nessun
// dispositivo della persona con le notifiche attive → pulsante «Attiva le notifiche» (un tocco: il permesso va chiesto dentro il tocco); bloccata dal browser o dall'app, o iPhone dal web
// senza l'app sulla schermata Home → il testo dice come fare, senza pulsante (da qui non si puo' fare). **Niente invito** se le notifiche sono gia' attive su questo dispositivo o su un altro del
// nucleo (`dispositivi`: la push segue il nucleo, quindi l'avviso le arriva li'), nel browser senza push, sul totem, dove il club non ha le chiavi sul server, o mentre non si sa ancora.
// Niente per chi non ha le notifiche nell'app (`useNotifiche().attivo` falso) e **niente in vista cliente dal CRM**: attivarle registrerebbe il browser dell'operatore sul cliente.
//
// Attivate dal pulsante, per sei secondi dice «fatto» e poi sparisce (`useAppenaAttivate`). Usa lo stesso `usePush` della carta in Home, quindi le altre carte si aggiornano.

export function InvitoPushAttesa() {
  const { attivo } = useNotifiche()
  if (!attivo || vistaCorrente()) return null
  return <InvitoViva />
}

function InvitoViva() {
  const p = usePalette()
  const { stato, dispositivi, occupato, errore, attiva } = usePush()
  const fatta = useAppenaAttivate(stato)

  if (fatta) {
    return (
      <Messaggio tono="ok" icona="campanello" titolo={t('Notifiche attivate', 'Notifications on')}>
        {t('Ti avvisiamo appena si libera un posto, anche con l’app chiusa.', 'We’ll alert you as soon as a spot opens up, even with the app closed.')}
      </Messaggio>
    )
  }

  const invito = invitoPushRichiesta(stato, dispositivi)
  if (!invito) return null

  return (
    <Messaggio tono="attenzione" icona="campanello" titolo={t('Attiva le notifiche per sapere se si libera un posto', 'Turn on notifications to know if a spot opens up')}>
      <View style={{ gap: spazio.due }}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
          {invito === 'attiva'
            ? t(
                'Se si libera un posto subentri tu. Con le notifiche ti avvisiamo appena succede, anche con l’app chiusa. Basta un tocco.',
                'If a spot opens up, it’s yours. With notifications we alert you as soon as it happens, even with the app closed. It takes one tap.',
              )
            : invito === 'sbloccare'
              ? eNativo
                ? t(
                    'Se si libera un posto subentri tu, ma le notifiche sono bloccate: per essere avvisato apri le Impostazioni del telefono, scegli Athlon Club e consenti le notifiche.',
                    'If a spot opens up, it’s yours, but notifications are blocked: to be alerted, open your phone’s Settings, choose Athlon Club and allow notifications.',
                  )
                : t(
                    'Se si libera un posto subentri tu, ma le notifiche sono bloccate: per essere avvisato consentile a questo sito dalle impostazioni del browser, poi torna qui.',
                    'If a spot opens up, it’s yours, but notifications are blocked: to be alerted, allow them for this site in your browser settings, then come back here.',
                  )
              : t(
                  'Se si libera un posto subentri tu. Su iPhone le notifiche arrivano solo all’app aggiunta alla schermata Home: da Safari tocca «Condividi», poi «Aggiungi alla schermata Home», e riaprila da lì per attivarle.',
                  'If a spot opens up, it’s yours. On iPhone notifications only reach the app added to the Home Screen: in Safari tap “Share”, then “Add to Home Screen”, and reopen it from there to turn them on.',
                )}
        </Text>
        {errore ? <Text style={{ color: p.errore, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 }}>{errore}</Text> : null}
        {invito === 'attiva' ? <Pulsante testo={t('Attiva le notifiche', 'Turn on notifications')} icona="campanello" piccolo inCorso={occupato} onPress={() => void attiva()} /> : null}
      </View>
    </Messaggio>
  )
}
