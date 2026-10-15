import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { Personal } from '@/features/lab/Personal'
import { useSessione } from '@/features/lab/useSessione'

// Il personal training del laboratorio: solo con la sessione, altrimenti all'accesso.
export default function PaginaPersonal() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Personal />
}
