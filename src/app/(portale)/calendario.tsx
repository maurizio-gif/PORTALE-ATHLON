import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { Calendario } from '@/features/lab/Calendario'
import { useSessione } from '@/features/lab/useSessione'

// Il calendario del laboratorio: solo con la sessione, altrimenti all'accesso.
export default function PaginaCalendario() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Calendario />
}
