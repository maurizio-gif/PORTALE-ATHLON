import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { usePush } from './push'

// «Ricevi le notifiche sul telefono» (20/10/2026), in cima al centro notifiche: attiva o spegne la push di questo dispositivo.
// Chi non le attiva non perde niente: ogni notifica del club arriva comunque nell'app, come finestra e nel centro. La push
// serve a sapere subito che c'e' qualcosa anche con l'app chiusa.

export function AttivaPush() {
  const p = usePalette()
  const { stato, occupato, errore, dispositivi, attiva, spegni } = usePush()

  // Niente da offrire: nessuna carta (il centro e la finestra funzionano lo stesso).
  if (stato === 'verifica' || stato === 'non_supportato' || stato === 'non_disponibile') return null

  if (stato === 'serve_app_installata') {
    return (
      <Messaggio tono="attenzione" icona="info" titolo="Per le notifiche sul telefono">
        Su iPhone le notifiche arrivano solo all’app aggiunta alla schermata Home: aggiungila da Safari («Condividi», poi «Aggiungi alla schermata Home») e riapri da lì. Intanto
        le trovi qui, nell’app.
      </Messaggio>
    )
  }

  if (stato === 'bloccato') {
    return (
      <Messaggio tono="attenzione" icona="info" titolo="Le notifiche sono bloccate nel browser">
        Hai negato le notifiche a questo sito: per riceverle sul dispositivo consentile dalle impostazioni del browser, poi torna qui. Intanto le trovi in questo elenco.
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
          <Text style={[stili.titolo, { color: p.testo }]}>{attivo ? 'Notifiche attive su questo dispositivo' : 'Ricevi le notifiche sul telefono'}</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {attivo
              ? dispositivi > 1
                ? `Le ricevi su ${dispositivi} dispositivi. Il club ti scrive solo per cose che ti riguardano.`
                : 'Il club ti scrive solo per cose che ti riguardano: una chiusura, un cambio d’orario, una scadenza.'
              : 'Anche con l’app chiusa: una chiusura, un cambio d’orario, una scadenza. Le trovi comunque qui, nell’app.'}
          </Text>
        </View>
      </View>
      {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
      {attivo ? (
        <Pulsante testo="Spegni su questo dispositivo" variante="contorno" piccolo pieno={false} inCorso={occupato} onPress={() => void spegni()} />
      ) : (
        <Pulsante testo="Attiva le notifiche" icona="campanello" inCorso={occupato} onPress={() => void attiva()} />
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
