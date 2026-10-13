import { ActivityIndicator, Linking, View } from 'react-native'
import { router } from 'expo-router'

import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { paginaEventoSito } from '@/lib/eventi'
import { useColori } from '@/theme'

// Le schermate comuni a ogni link: in caricamento, scaduto, guasto.

export function InCaricamento({ testo = 'Un attimo…' }: { testo?: string }) {
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
    <Pagina titolo="Questo link non è più valido">
      <Testo variante="attenuato">
        I link che ti mandiamo per email valgono qualche giorno, e quelli degli eventi si chiudono quando l’evento è passato. Chiedine uno
        nuovo: basta la tua email.
      </Testo>
      <Bottone testo="Link per il metodo di pagamento" onPress={() => router.replace('/richiesta/metodo-pagamento')} />
      <Bottone testo="Vai agli eventi" variante="contorno" onPress={() => Linking.openURL(paginaEventoSito())} />
    </Pagina>
  )
}

// Il link di un appuntamento non scade: se non vale piu', l'appuntamento e'
// stato cancellato dal desk (o il link e' stato copiato male).
export function AppuntamentoNonTrovato() {
  return (
    <Pagina titolo="Questo link non è più valido">
      <Testo variante="attenuato">
        Può succedere se l’appuntamento è già stato annullato. Scrivici a desk@athlonroma.it e sistemiamo in due minuti, oppure prenota una
        nuova chiamata dal sito.
      </Testo>
      <Bottone testo="Prenota una chiamata" onPress={() => Linking.openURL('https://www.athlonroma.it/prenota-chiamata/')} />
    </Pagina>
  )
}

export function Guasto({ titolo, testo, onRiprova }: { titolo: string; testo: string; onRiprova?: () => void }) {
  return (
    <Pagina titolo={titolo}>
      <Testo variante="attenuato">{testo}</Testo>
      {onRiprova ? <Bottone testo="Riprova" variante="contorno" onPress={onRiprova} /> : null}
    </Pagina>
  )
}
