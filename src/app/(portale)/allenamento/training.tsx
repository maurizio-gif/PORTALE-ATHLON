import { Redirect } from 'expo-router'

import { SchermataTraining } from '@/features/lab/fit/Training'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health Score -> Il tuo allenamento: l'analisi del Train in profondita'. Solo con la sessione.
export default function PaginaTraining() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataTraining />
}
