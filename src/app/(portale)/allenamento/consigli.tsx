import { Redirect } from 'expo-router'

import { Consigli } from '@/features/lab/consigli/Consigli'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I consigli di Athlon: i tipi di lezione che fanno per te, le alternative, e — se li chiedi — sala e nuoto. Solo con la sessione.
export default function PaginaConsigli() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Consigli />
}
