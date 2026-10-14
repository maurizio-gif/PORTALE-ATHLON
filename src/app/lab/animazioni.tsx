import { Redirect } from 'expo-router'

import { AnteprimaAnimazioni } from '@/features/lab/AnteprimaAnimazioni'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La prova delle animazioni degli esercizi, per scegliere la libreria. Solo con la sessione.
export default function PaginaAnimazioni() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <AnteprimaAnimazioni />
}
