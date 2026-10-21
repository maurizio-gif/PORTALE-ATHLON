import { Redirect } from 'expo-router'

import { Junior } from '@/features/lab/junior/Junior'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La sezione Junior: solo con la sessione, altrimenti all'accesso.
export default function PaginaJunior() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Junior />
}
