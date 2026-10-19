import { Redirect } from 'expo-router'

import { CentroNotifiche } from '@/features/lab/notifiche/Centro'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il centro notifiche: solo con la sessione, altrimenti all'accesso.
export default function PaginaNotifiche() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <CentroNotifiche />
}
