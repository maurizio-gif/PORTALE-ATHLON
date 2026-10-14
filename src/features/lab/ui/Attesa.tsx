import { SchedeInArrivo } from './kit'
import { Schermata } from './Schermata'

/** Una schermata del laboratorio che sta arrivando: il titolo e le schede che pulsano. */
export function SchermataInArrivo({ titolo = 'Un attimo…', sopratitolo = 'Laboratorio' }: { titolo?: string; sopratitolo?: string }) {
  return (
    <Schermata titolo={titolo} sopratitolo={sopratitolo}>
      <SchedeInArrivo />
    </Schermata>
  )
}
