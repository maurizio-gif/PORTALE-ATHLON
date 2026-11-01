import { Redirect } from 'expo-router'

import { SchermataRespiro } from '@/features/lab/respiro/SessioneRespiro'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Respiro: una pausa guidata da 1 a 5 minuti, a richiesta. Solo con la sessione.
export default function PaginaRespiro() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataRespiro />
}
