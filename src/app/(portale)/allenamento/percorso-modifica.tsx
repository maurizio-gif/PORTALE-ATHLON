import { Redirect } from 'expo-router'

import { EditorPercorso } from '@/features/lab/percorso/EditorPercorso'
import { PERCORSO_IN_STANDBY } from '@/features/lab/percorso/standby'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// L'editor del percorso: la bozza del tutor (`?da=bozza`) o il percorso salvato (`?da=salvato`). Solo con la sessione.
export default function PaginaPercorsoModifica() {
  const sessione = useSessione()
  // In standby (`percorso/standby.ts`) un vecchio link porta ai consigli.
  if (PERCORSO_IN_STANDBY) return <Redirect href="/allenamento/consigli" />
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <EditorPercorso />
}
