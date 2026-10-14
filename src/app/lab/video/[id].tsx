import { Redirect } from 'expo-router'

import { LettoreVideo } from '@/features/lab/LettoreVideo'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il lettore di un video del club. Solo con la sessione.
export default function PaginaLettore() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <LettoreVideo />
}
