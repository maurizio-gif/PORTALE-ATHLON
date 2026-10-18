import { Redirect } from 'expo-router'

import { SchermataBalance } from '@/features/lab/fit/Balance'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Fit -> Balance: le calorie consumate accanto a quelle mangiate. Solo con la sessione.
export default function PaginaBalance() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataBalance />
}
