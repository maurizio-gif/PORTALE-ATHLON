import { Redirect } from 'expo-router'

import { SchermataRilascio } from '@/features/lab/rilascio/SessioneRilascio'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Foam roller: 5, 10 o 15 minuti di rilascio sul rullo, a richiesta. Solo con la sessione.
export default function PaginaRilascio() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataRilascio />
}
