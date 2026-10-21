import { Redirect } from 'expo-router'

import { EventoDettaglio } from '@/features/lab/clublife/Dettaglio'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Un evento di Club Life. Solo con la sessione.
export default function Pagina() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <EventoDettaglio />
}
