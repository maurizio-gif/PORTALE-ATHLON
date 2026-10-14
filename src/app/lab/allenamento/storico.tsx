import { Redirect } from 'expo-router'

import { Storico } from '@/features/lab/schede/Storico'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Lo storico degli allenamenti e i progressi. Solo con la sessione.
export default function PaginaStorico() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Storico />
}
