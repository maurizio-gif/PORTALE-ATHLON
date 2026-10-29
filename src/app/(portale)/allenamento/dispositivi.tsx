import { Redirect } from 'expo-router'

import { Dispositivi } from '@/features/lab/dispositivi/Dispositivi'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I dispositivi (Apple Salute e, quando ci sara', Health Connect): consenso, attivazione, guida a collegare il proprio dispositivo e
// revoca. Solo con la sessione, e aspetta che sia pronta (`?attiva=apple` parte solo con la sessione del socio).
export default function PaginaDispositivi() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  return <Dispositivi />
}
