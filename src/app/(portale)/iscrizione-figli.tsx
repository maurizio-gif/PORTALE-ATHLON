import { Redirect } from 'expo-router'

import { IscrizioneFigli } from '@/features/lab/junior/IscrizioneFigli'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// L'iscrizione di piu' figli insieme ai corsi junior (04/11/2026): solo con la sessione, altrimenti all'accesso.
export default function PaginaIscrizioneFigli() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <IscrizioneFigli />
}
