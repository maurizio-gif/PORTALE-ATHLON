import { Redirect } from 'expo-router'

import { Percorso } from '@/features/lab/percorso/Percorso'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il Percorso Athlon: la settimana a tappe composta dal tutor. Solo con la sessione.
export default function PaginaPercorso() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Percorso />
}
