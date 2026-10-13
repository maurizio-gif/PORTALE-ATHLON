import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'

import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
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
// uno nuovo. Oggi i link sono tutti del metodo di pagamento: il giorno che
// arrivano altri tipi, la funzione dira' anche di che tipo era.
export function LinkScaduto() {
  return (
    <Pagina titolo="Questo link non è più valido">
      <Testo variante="attenuato">I link che ti mandiamo per email valgono qualche giorno. Chiedine uno nuovo: basta la tua email.</Testo>
      <Bottone testo="Chiedi un nuovo link" onPress={() => router.replace('/richiesta/metodo-pagamento')} />
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
