import { Redirect } from 'expo-router'

import { Iscrizione } from '@/features/lab/junior/Iscrizione'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// L'iscrizione a un gruppo dei corsi junior: solo con la sessione, altrimenti all'accesso.
export default function PaginaIscrizione() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Iscrizione />
}
