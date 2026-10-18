import { Redirect } from 'expo-router'

import { Questionario } from '@/features/lab/percorso/Questionario'
import { PERCORSO_IN_STANDBY } from '@/features/lab/percorso/standby'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il questionario del Percorso Athlon e l'attesa del tutor. Solo con la sessione.
export default function PaginaPercorsoNuovo() {
  const sessione = useSessione()
  // In standby (`percorso/standby.ts`) un vecchio link porta ai consigli.
  if (PERCORSO_IN_STANDBY) return <Redirect href="/allenamento/consigli" />
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Questionario />
}
