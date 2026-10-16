import { Redirect } from 'expo-router'

import { SchedaDettaglio } from '@/features/lab/clublife/Dettaglio'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Una scheda dell'Help Desk (l'id ha la cartella dell'area: generali/certificato-medico). Solo con la sessione.
export default function Pagina() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchedaDettaglio emailAccesso={sessione.user.email} />
}
