import { Redirect } from 'expo-router'

import { SchermataPunteggio } from '@/features/lab/fit/Punteggio'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Athlon Health Score: il punteggio da 0 a 100 e come e' fatto. Solo con la sessione.
export default function PaginaPunteggio() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataPunteggio />
}
