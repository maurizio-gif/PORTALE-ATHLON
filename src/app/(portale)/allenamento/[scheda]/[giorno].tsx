import { Redirect } from 'expo-router'

import { Seduta } from '@/features/lab/schede/Seduta'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La seduta: il registro delle serie e il timer del recupero. Solo con la sessione.
export default function PaginaSeduta() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Seduta />
}
