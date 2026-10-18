import { Redirect } from 'expo-router'

import { Importa } from '@/features/lab/schede/Importa'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// L'importazione di una scheda da una foto o da un PDF. Solo con la sessione.
export default function PaginaImporta() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Importa />
}
