import { Redirect } from 'expo-router'

import { DatiFiglio } from '@/features/lab/consensiMinori/DatiFiglio'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «I dati di tuo figlio»: il genitore vede, in sola lettura, i dati sulla salute di un figlio da 13 a 17 anni per cui ha dato il consenso. Solo con la sessione.
export default function PaginaDatiFiglio() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <DatiFiglio />
}
