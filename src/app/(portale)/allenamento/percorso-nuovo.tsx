import { Redirect } from 'expo-router'

import { Questionario } from '@/features/lab/percorso/Questionario'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il questionario del Percorso Athlon e l'attesa del tutor. Solo con la sessione.
export default function PaginaPercorsoNuovo() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Questionario />
}
