import { Redirect } from 'expo-router'

import { EliminaAccount } from '@/features/lab/account/EliminaAccount'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Elimina account»: dal Profilo. Solo con la sessione.
export default function PaginaEliminaAccount() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <EliminaAccount />
}
