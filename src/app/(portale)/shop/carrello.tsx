import { Redirect } from 'expo-router'

import { Carrello } from '@/features/lab/shop/Carrello'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il carrello dello shop e il pagamento: solo con la sessione.
export default function PaginaCarrello() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Carrello />
}
