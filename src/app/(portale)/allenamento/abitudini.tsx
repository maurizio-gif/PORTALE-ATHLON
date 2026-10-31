import { Redirect } from 'expo-router'

import { SchermataAbitudini } from '@/features/lab/fit/PersonalizzaAbitudini'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Le tue abitudini: si sceglie cosa seguire, con la soglia, i giorni a settimana e l'eventuale sfida di 30 giorni. Solo con la sessione.
export default function PaginaAbitudini() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataAbitudini />
}
