import { Redirect, useLocalSearchParams } from 'expo-router'

import { StoricoPagamenti } from '@/features/lab/pagamenti/Movimenti'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Lo storico dei pagamenti veri e quelli futuri. Solo con la sessione.
export default function PaginaStoricoPagamenti() {
  const sessione = useSessione()
  const { vista } = useLocalSearchParams<{ vista?: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <StoricoPagamenti vistaIniziale={vista === 'futuri' ? 'futuri' : 'effettuati'} />
}
