import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { StatoPagamento } from '@/features/lab/StatoPagamento'
import { useSessione } from '@/features/lab/useSessione'

// La pagina di stato di un pagamento, dove torna anche Adyen dopo la 3D Secure
// (lab-pagamenti manda ancora `/lab/pagamenti/<riferimento>`: il reindirizzamento di
// vercel.json lo porta qui, a `/pagamenti/<riferimento>`).
export default function PaginaStatoPagamento() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <StatoPagamento />
}
