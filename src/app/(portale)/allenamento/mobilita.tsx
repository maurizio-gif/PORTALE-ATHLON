import { Redirect } from 'expo-router'

import { SchermataMobilita } from '@/features/lab/fit/SessioneMobilita'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Sessione di mobilita': 5, 10 o 15 minuti di mobilita' e stretching guidati, a richiesta. Solo con la sessione.
export default function PaginaMobilita() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataMobilita />
}
