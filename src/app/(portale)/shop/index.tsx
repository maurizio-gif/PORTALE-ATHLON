import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { Vetrina } from '@/features/lab/shop/Vetrina'
import { useSessione } from '@/features/lab/useSessione'

// Lo shop del club (articoli e merchandising): solo con la sessione, altrimenti all'accesso.
export default function PaginaShop() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Vetrina />
}
