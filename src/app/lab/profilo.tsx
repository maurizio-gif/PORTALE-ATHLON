import { Redirect } from 'expo-router'

import { Profilo } from '@/features/lab/Profilo'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il mio profilo: l'anagrafica e i contatti da cambiare. Solo con la sessione.
export default function PaginaProfilo() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Profilo />
}
