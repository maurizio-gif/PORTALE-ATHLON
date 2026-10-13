import { Redirect } from 'expo-router'

import { InCaricamento } from '@/features/link/Stati'
import { Calendario } from '@/features/lab/Calendario'
import { useSessione } from '@/features/lab/useSessione'

// Il calendario del laboratorio: solo con la sessione, altrimenti all'accesso.
export default function PaginaCalendario() {
  const sessione = useSessione()
  if (sessione === undefined) return <InCaricamento />
  if (!sessione) return <Redirect href="/lab" />
  return <Calendario />
}
