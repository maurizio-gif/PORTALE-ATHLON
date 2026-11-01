import { Redirect } from 'expo-router'

import { ConsensiMinori } from '@/features/lab/consensiMinori/ConsensiMinori'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// «Consensi per i tuoi figli»: il genitore decide, un'area alla volta, i dati sulla salute di un figlio da 13 a 17 anni. Solo con la sessione.
export default function PaginaConsensiMinori() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <ConsensiMinori />
}
