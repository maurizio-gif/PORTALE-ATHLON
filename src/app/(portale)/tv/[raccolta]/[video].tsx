import { Redirect } from 'expo-router'

import { Lettore } from '@/features/lab/tv/Lettore'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il lettore di un video di Athlon TV. Solo con la sessione.
export default function PaginaLettore() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Lettore />
}
