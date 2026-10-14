import { Redirect } from 'expo-router'

import { Schede } from '@/features/lab/schede/Schede'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Allenamento: le schede del socio, l'agente AI, gli ultimi allenamenti. Solo con la sessione.
export default function PaginaAllenamento() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <Schede />
}
