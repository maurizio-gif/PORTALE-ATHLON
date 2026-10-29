import { Redirect } from 'expo-router'

import { SchermataClassifica } from '@/features/lab/classifica/Classifica'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Classifica del mese: si apre dalla carta dell'Athlon Health Score. Solo con la sessione.
export default function PaginaClassifica() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataClassifica />
}
