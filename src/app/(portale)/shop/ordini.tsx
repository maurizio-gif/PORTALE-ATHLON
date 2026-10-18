import { Redirect } from 'expo-router'

import { Ordini } from '@/features/lab/shop/Ordini'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I miei ordini dello shop: solo con la sessione.
export default function PaginaOrdini() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Ordini />
}
