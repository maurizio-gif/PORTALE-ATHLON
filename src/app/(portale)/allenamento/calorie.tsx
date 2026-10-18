import { Redirect } from 'expo-router'

import { ContatoreCalorie } from '@/features/lab/schede/ContatoreCalorie'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il contatore delle calorie: schede chiuse e lezioni con la presenza. Solo con la sessione.
export default function PaginaCalorie() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <ContatoreCalorie />
}
