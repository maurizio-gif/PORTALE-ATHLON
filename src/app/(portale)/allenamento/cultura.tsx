import { Redirect, useLocalSearchParams } from 'expo-router'

import { Cultura } from '@/features/lab/cultura/Cultura'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Capire il cibo»: una lettura di cultura alimentare dell'area Food (`?tema=macros`). Solo con la sessione.
export default function PaginaCultura() {
  const { tema } = useLocalSearchParams<{ tema?: string }>()
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Cultura id={Array.isArray(tema) ? tema[0] : tema} />
}
