import { Redirect } from 'expo-router'

import { AbbonamentiMiei } from '@/features/lab/AbbonamentiMiei'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il dettaglio dei tuoi abbonamenti: solo con la sessione, altrimenti all'accesso.
export default function PaginaAbbonamenti() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <AbbonamentiMiei />
}
