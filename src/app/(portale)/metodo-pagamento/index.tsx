import { Redirect } from 'expo-router'

import { MetodoPagamento } from '@/features/lab/metodo/MetodoPagamento'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il metodo di pagamento degli abbonamenti (IBAN o carta). Solo con la sessione.
export default function PaginaMetodoPagamento() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <MetodoPagamento />
}
