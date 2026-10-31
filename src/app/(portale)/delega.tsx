import { Redirect } from 'expo-router'

import { Delega } from '@/features/lab/delega/Delega'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Un altro adulto sui tuoi figli»: la delega, solo con la sessione, altrimenti all'accesso.
export default function PaginaDelega() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Delega />
}
