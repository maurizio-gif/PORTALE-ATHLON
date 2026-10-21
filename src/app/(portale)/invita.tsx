import { Redirect } from 'expo-router'

import { Invita } from '@/features/lab/invita/Invita'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Invita un amico»: solo con la sessione, altrimenti all'accesso.
export default function PaginaInvita() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Invita />
}
