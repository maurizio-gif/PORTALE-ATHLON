import { Redirect } from 'expo-router'

import { Badge } from '@/features/lab/badge/Badge'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Il tuo badge» (il pass di accesso per il wallet): solo con la sessione, altrimenti all'accesso.
export default function PaginaBadge() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Badge />
}
