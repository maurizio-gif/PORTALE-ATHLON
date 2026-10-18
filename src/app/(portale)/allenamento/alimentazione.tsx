import { Redirect } from 'expo-router'

import { Alimentazione } from '@/features/lab/alimentazione/Alimentazione'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// L'alimentazione: educazione alimentare, dietro il consenso all'informativa. Solo con la sessione.
export default function PaginaAlimentazione() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Alimentazione />
}
