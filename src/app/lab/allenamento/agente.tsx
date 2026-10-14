import { Redirect } from 'expo-router'

import { Agente } from '@/features/lab/schede/Agente'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La scheda chiesta all'agente AI. Solo con la sessione.
export default function PaginaAgente() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Agente />
}
