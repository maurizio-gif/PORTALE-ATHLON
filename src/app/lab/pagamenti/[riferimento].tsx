import { Redirect } from 'expo-router'

import { InCaricamento } from '@/features/link/Stati'
import { StatoPagamento } from '@/features/lab/StatoPagamento'
import { useSessione } from '@/features/lab/useSessione'

// La pagina di stato di un pagamento, dove torna anche Adyen dopo la 3D Secure
// (lab-pagamenti: returnUrl = <portale>/lab/pagamenti/<riferimento>).
export default function PaginaStatoPagamento() {
  const sessione = useSessione()
  if (sessione === undefined) return <InCaricamento />
  if (!sessione) return <Redirect href="/lab" />
  return <StatoPagamento />
}
