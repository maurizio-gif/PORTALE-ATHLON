import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { GuestPassLab } from '@/features/lab/GuestPassLab'
import { useSessione } from '@/features/lab/useSessione'

// Il Guest Pass nuovo, in prova: solo con la sessione del laboratorio.
export default function PaginaGuestPassLab() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <GuestPassLab email={sessione.user.email ?? ''} />
}
