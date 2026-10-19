import { Redirect } from 'expo-router'

import { Agente } from '@/features/lab/schede/Agente'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Componi il tuo piano» (era «Crealo con l'aiuto dell'AI»): il questionario che compone la bozza di un piano. Solo con la sessione.
export default function PaginaAgente() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Agente />
}
