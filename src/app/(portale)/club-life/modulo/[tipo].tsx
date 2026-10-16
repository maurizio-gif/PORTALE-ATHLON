import { Redirect, useLocalSearchParams } from 'expo-router'

import { Appuntamento } from '@/features/lab/clublife/moduli/Appuntamento'
import { CambioAbbonamento } from '@/features/lab/clublife/moduli/CambioAbbonamento'
import { ScriviAlClub } from '@/features/lab/clublife/moduli/ScriviAlClub'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// I moduli di Club Life, in nativo e gia' precompilati: l'appuntamento col desk e
// col Direttore Tecnico, il cambio abbonamento, «scrivi al club». Il tipo e' lo
// stesso che il sito mette nel blocco `modulo` delle schede. Il metodo di
// pagamento non e' qui: ha la sua schermata (`/metodo-pagamento`). Solo con la
// sessione.
export default function PaginaModulo() {
  const sessione = useSessione()
  const { tipo, oggetto, argomento } = useLocalSearchParams<{ tipo: string; oggetto?: string; argomento?: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/" />
  const email = sessione.user.email
  switch (tipo) {
    case 'appuntamento':
      return <Appuntamento calendario="desk" emailAccesso={email} oggettoIniziale={oggetto ?? ''} />
    case 'appuntamento-nuoto':
      return <Appuntamento calendario="nuoto" emailAccesso={email} />
    case 'cambio-abbonamento':
      return <CambioAbbonamento emailAccesso={email} />
    case 'scrivi':
      return <ScriviAlClub emailAccesso={email} argomentoIniziale={argomento ?? ''} />
    case 'metodo-pagamento':
      return <Redirect href="/metodo-pagamento" />
    default:
      return <Redirect href="/club-life" />
  }
}
