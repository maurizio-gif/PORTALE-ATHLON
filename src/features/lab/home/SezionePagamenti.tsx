import { View } from 'react-native'

import type { Area } from '@/api/lab'
import { spazio } from '@/theme'

import { RiepilogoPagamenti } from '../pagamenti/Movimenti'
import { Entra } from '../ui/kit'
import { MetodoPagamento } from './MetodoPagamento'

// La sezione Pagamenti della Home, in due parti che non si mescolano (22/10/2026, richiesta di Maurizio): sopra il
// **metodo di pagamento** (c'e'? qual e'? da dove si cambia), sotto lo **stato dei pagamenti**: da pagare (con il
// pagamento subito), prossimi pagamenti, effettuati con «Storico completo».

export function SezionePagamenti({ area, onAggiorna }: { area: Extract<Area, { trovato: true }>; onAggiorna?: () => void }) {
  return (
    <View style={{ gap: spazio.quattro }}>
      <Entra indice={0}>
        <MetodoPagamento area={area} />
      </Entra>
      <RiepilogoPagamenti onPagato={onAggiorna} />
    </View>
  )
}
