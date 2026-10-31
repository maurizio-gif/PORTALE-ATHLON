import { Redirect } from 'expo-router'

import { SchermataSettimana } from '@/features/lab/fit/Settimana'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> La tua settimana: il riepilogo della settimana di Train, da condividere. Solo con la sessione.
export default function PaginaSettimana() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataSettimana />
}
