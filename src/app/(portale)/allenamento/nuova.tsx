import { Redirect } from 'expo-router'

import { EditorScheda } from '@/features/lab/schede/EditorScheda'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La scheda che il socio scrive da solo (`/allenamento/nuova`), o che ha letto da un file
// (`?da=bozza`), o che modifica (`?id=`). Solo con la sessione.
export default function PaginaNuovaScheda() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <EditorScheda />
}
