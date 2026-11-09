import { Redirect, useLocalSearchParams } from 'expo-router'

import { FiloRichiesta } from '@/features/lab/assistenza/Filo'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Una richiesta al team: solo con la sessione, e un id che e' quello di una richiesta; altrimenti all'elenco.
export default function PaginaRichiesta() {
  const sessione = useSessione()
  const { id } = useLocalSearchParams<{ id: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  if (typeof id !== 'string' || !UUID.test(id)) return <Redirect href="/assistenza" />
  return <FiloRichiesta id={id} />
}
