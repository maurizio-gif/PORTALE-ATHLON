import { Redirect } from 'expo-router'

import { ElencoRichieste } from '@/features/lab/assistenza/Elenco'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Le richieste al team: solo con la sessione, altrimenti all'accesso.
export default function PaginaRichieste() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <ElencoRichieste />
}
