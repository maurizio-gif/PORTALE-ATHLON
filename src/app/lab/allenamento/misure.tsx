import { Redirect } from 'expo-router'

import { Misure } from '@/features/lab/dati/Misure'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I dati del corpo e il loro andamento. Solo con la sessione.
export default function PaginaMisure() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Misure />
}
