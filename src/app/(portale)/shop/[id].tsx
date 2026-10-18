import { Redirect, useLocalSearchParams } from 'expo-router'

import { Articolo } from '@/features/lab/shop/Articolo'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// La pagina di un articolo dello shop (`/shop/<id del prodotto>`): solo con la sessione.
export default function PaginaArticolo() {
  const sessione = useSessione()
  const { id } = useLocalSearchParams<{ id: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  const numero = Number(id)
  // Un indirizzo che non e' un numero di prodotto non apre niente: si torna alla vetrina.
  if (!Number.isInteger(numero) || numero <= 0) return <Redirect href="/shop" />
  return <Articolo id={numero} />
}
