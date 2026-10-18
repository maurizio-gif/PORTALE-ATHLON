import { Redirect } from 'expo-router'

import { Dispositivi } from '@/features/lab/dispositivi/Dispositivi'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I dispositivi (Oura, Polar): collegamento, consenso e revoca. Solo con la sessione, e
// aspetta che sia pronta: il ritorno dal fornitore (`?code=…&state=…`) si completa con la
// SESSIONE del socio, quindi prima di leggere l'indirizzo la sessione deve esserci.
export default function PaginaDispositivi() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Dispositivi />
}
