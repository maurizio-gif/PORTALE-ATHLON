import { t } from '@/lib/lingua'

import { SchedeInArrivo } from './kit'
import { Schermata } from './Schermata'

/** Una schermata che sta arrivando: il titolo e le schede che pulsano. */
export function SchermataInArrivo({ titolo = t('Un attimo…', 'One moment…'), sopratitolo }: { titolo?: string; sopratitolo?: string }) {
  return (
    <Schermata titolo={titolo} sopratitolo={sopratitolo}>
      <SchedeInArrivo />
    </Schermata>
  )
}
