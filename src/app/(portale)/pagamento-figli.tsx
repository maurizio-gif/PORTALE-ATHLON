import { Redirect } from 'expo-router'

import { PagamentoFigli } from '@/features/lab/junior/PagamentoFigli'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il pagamento delle iscrizioni di piu' figli (04/11/2026), anche al ritorno dalla pagina della carta: solo con la sessione.
export default function PaginaPagamentoFigli() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <PagamentoFigli />
}
