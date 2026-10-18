import { Redirect, useLocalSearchParams } from 'expo-router'

import { EsitoOrdine } from '@/features/lab/shop/EsitoOrdine'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il ritorno dal pagamento dello shop (`/shop/ordine/<id>`): Adyen riporta qui, e si chiede com'e' andata.
// Con la sessione soltanto: la funzione controlla che l'ordine sia di chi chiede.
export default function PaginaEsitoOrdine() {
  const sessione = useSessione()
  const { id } = useLocalSearchParams<{ id: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return <Redirect href="/shop" />
  return <EsitoOrdine id={id} />
}
