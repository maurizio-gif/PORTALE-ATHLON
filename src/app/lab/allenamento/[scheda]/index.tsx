import { Redirect } from 'expo-router'

import { Scheda } from '@/features/lab/schede/Scheda'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Una scheda di allenamento, giorno per giorno. Solo con la sessione.
export default function PaginaScheda() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Scheda />
}
