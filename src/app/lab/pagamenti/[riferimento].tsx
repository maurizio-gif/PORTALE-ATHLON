import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { StatoPagamento } from '@/features/lab/StatoPagamento'
import { useSessione } from '@/features/lab/useSessione'

// La pagina di stato di un pagamento, dove torna anche Adyen dopo la 3D Secure
// (lab-pagamenti: returnUrl = <portale>/lab/pagamenti/<riferimento>).
export default function PaginaStatoPagamento() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <StatoPagamento />
}
