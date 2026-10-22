import { ActivityIndicator, Linking, View } from 'react-native'
import { router } from 'expo-router'

import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { paginaEventoSito } from '@/lib/eventi'
import { useColori } from '@/theme'
import { t } from '@/lib/lingua'

// Le schermate comuni a ogni link: in caricamento, scaduto, guasto.

export function InCaricamento({ testo = t('Un attimo…', 'Just a moment…') }: { testo?: string }) {
  const c = useColori()
  return (
    <Pagina titolo={testo} indietro={false}>
      <View style={{ alignItems: 'flex-start' }}>
        <ActivityIndicator color={c.accento} />
      </View>
    </Pagina>
  )
}

// Sconosciuto o scaduto sono la stessa risposta, e la strada per chiederne
// uno nuovo. Il token non dice di che link si trattava: si offrono le strade.
export function LinkScaduto() {
  return (
    <Pagina titolo={t('Questo link non è più valido', 'This link is no longer valid')}>
      <Testo variante="attenuato">
        {t(
          'I link che ti mandiamo per email valgono qualche giorno, e quelli degli eventi si chiudono quando l’evento è passato. Chiedine uno nuovo: basta la tua email. Se ti serviva per caricare il certificato medico, scrivici a desk@athlonroma.it e te ne mandiamo uno nuovo.',
          'The links we email you are valid for a few days, and event links close once the event is over. Ask for a new one: all you need is your email. If you needed it to upload your medical certificate, write to us at desk@athlonroma.it and we’ll send you a new one.',
        )}
      </Testo>
      <Bottone testo={t('Link per il metodo di pagamento', 'Link for the payment method')} onPress={() => router.replace('/richiesta/metodo-pagamento')} />
      <Bottone testo={t('Vai agli eventi', 'Go to events')} variante="contorno" onPress={() => Linking.openURL(paginaEventoSito())} />
    </Pagina>
  )
}

// Il link del Guest Pass vale 30 giorni dalla richiesta, e poi il pass non si
// attiva piu' (14/10/2026): qui non si offre un link nuovo, perche' non c'e'.
export function GuestPassScaduto() {
  return (
    <Pagina titolo={t('Il Guest Pass non è più attivabile', 'The Guest Pass can no longer be activated')}>
      <Testo variante="attenuato">
        {t(
          'Il link per attivarlo valeva 30 giorni dalla richiesta, ed è scaduto. Se vuoi venire a provare il club, scrivici a desk@athlonroma.it o passa in reception.',
          'The link to activate it was valid for 30 days from your request, and it has expired. If you’d like to come and try the club, write to us at desk@athlonroma.it or stop by reception.',
        )}
      </Testo>
      <Bottone testo={t('Vai al sito di Athlon', 'Go to the Athlon website')} onPress={() => Linking.openURL('https://www.athlonroma.it/')} />
    </Pagina>
  )
}

// Il link di un appuntamento non scade: se non vale piu', l'appuntamento e'
// stato cancellato dal desk (o il link e' stato copiato male).
export function AppuntamentoNonTrovato() {
  return (
    <Pagina titolo={t('Questo link non è più valido', 'This link is no longer valid')}>
      <Testo variante="attenuato">
        {t(
          'Può succedere se l’appuntamento è già stato annullato. Scrivici a desk@athlonroma.it e sistemiamo in due minuti, oppure prenota una nuova chiamata dal sito.',
          'This can happen if the appointment has already been canceled. Write to us at desk@athlonroma.it and we’ll sort it out in two minutes, or book a new call from the website.',
        )}
      </Testo>
      <Bottone testo={t('Prenota una chiamata', 'Book a call')} onPress={() => Linking.openURL('https://www.athlonroma.it/prenota-chiamata/')} />
    </Pagina>
  )
}

export function Guasto({ titolo, testo, onRiprova }: { titolo: string; testo: string; onRiprova?: () => void }) {
  return (
    <Pagina titolo={titolo}>
      <Testo variante="attenuato">{testo}</Testo>
      {onRiprova ? <Bottone testo={t('Riprova', 'Try again')} variante="contorno" onPress={onRiprova} /> : null}
    </Pagina>
  )
}
