import { Redirect } from 'expo-router'

import { Test } from '@/features/lab/schede/Test'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il test dei massimali. Solo con la sessione.
export default function PaginaTest() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Test />
}
