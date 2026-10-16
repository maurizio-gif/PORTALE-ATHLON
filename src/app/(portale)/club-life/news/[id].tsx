import { Redirect } from 'expo-router'

import { NewsDettaglio } from '@/features/lab/clublife/Dettaglio'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Una news di Club Life. Solo con la sessione.
export default function Pagina() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <NewsDettaglio emailAccesso={sessione.user.email} />
}
