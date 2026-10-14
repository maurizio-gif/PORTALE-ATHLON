import { Redirect } from 'expo-router'

import { Galleria } from '@/features/lab/tv/Galleria'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La galleria di uno showcase di Athlon TV. Solo con la sessione.
export default function PaginaGalleria() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Galleria />
}
