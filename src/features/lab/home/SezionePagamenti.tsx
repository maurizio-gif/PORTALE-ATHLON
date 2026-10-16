import { router } from 'expo-router'
import { View } from 'react-native'

import { spazio } from '@/theme'

import { RiepilogoPagamenti } from '../pagamenti/Movimenti'
import { Carta, Entra, Riga } from '../ui/kit'

// La sezione Pagamenti della Home: da saldare, prossimi pagamenti, effettuati
// (con «Storico completo»), e il metodo di pagamento degli abbonamenti.

export function SezionePagamenti() {
  return (
    <View style={{ gap: spazio.quattro }}>
      <RiepilogoPagamenti />
      <Entra indice={0}>
        <Carta style={{ paddingVertical: spazio.uno }}>
          <Riga
            prima
            icona="carta"
            tono="accento"
            titolo="Aggiorna il metodo di pagamento"
            sotto="Conto corrente (IBAN) o carta, per te e per la tua famiglia"
            onPress={() => router.push('/metodo-pagamento')}
          />
        </Carta>
      </Entra>
    </View>
  )
}
