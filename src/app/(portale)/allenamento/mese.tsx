import { Redirect } from 'expo-router'

import { SchermataMese } from '@/features/lab/fit/Mese'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Athlon Health System -> Il tuo mese: il riepilogo del mese di Train, da condividere. Solo con la sessione.
export default function PaginaMese() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <SchermataMese />
}
