import { InCaricamento } from '@/features/link/Stati'
import { Accesso } from '@/features/lab/Accesso'
import { AreaRiservata } from '@/features/lab/AreaRiservata'
import { useSessione } from '@/features/lab/useSessione'

// Il laboratorio (binario B, docs/piano-fase-1.md): accesso con codice via
// email per i tester, poi la loro area riservata in sola lettura.
export default function Laboratorio() {
  const sessione = useSessione()
  if (sessione === undefined) return <InCaricamento />
  if (!sessione) return <Accesso />
  return <AreaRiservata email={sessione.user.email ?? ''} />
}
