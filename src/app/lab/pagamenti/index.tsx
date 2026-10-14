import { Redirect } from 'expo-router'

import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { Pagamenti } from '@/features/lab/Pagamenti'
import { useSessione } from '@/features/lab/useSessione'

// I pagamenti di prova del laboratorio: solo con la sessione, altrimenti all'accesso.
export default function PaginaPagamenti() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Pagamenti />
}
