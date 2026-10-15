import { Redirect } from 'expo-router'

import { Abbonamento } from '@/features/lab/Abbonamento'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// L'abbonamento principale del laboratorio: solo con la sessione, altrimenti all'accesso.
export default function PaginaAbbonamento() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Abbonamento />
}
