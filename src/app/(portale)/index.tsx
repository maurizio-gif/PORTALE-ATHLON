import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { Accesso } from '@/features/lab/Accesso'
import { AreaRiservata } from '@/features/lab/AreaRiservata'
import { useSessione } from '@/features/lab/useSessione'

// Il laboratorio (binario B, docs/piano-fase-1.md): accesso con codice via
// email per i tester, poi la loro area riservata in sola lettura.
export default function Laboratorio() {
  const sessione = useSessione()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Accesso />
  return <AreaRiservata email={sessione.user.email ?? ''} />
}
