import { Redirect, router, useLocalSearchParams } from 'expo-router'

import { RitornoCarta } from '@/features/metodo-pagamento/RitornoCarta'
import { CorniceLab } from '@/features/lab/metodo/MetodoPagamento'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { useSessione } from '@/features/lab/useSessione'

// Il ritorno dalla pagina della carta per le richieste aperte dall'app
// (portale-link manda qui il gateway): la stessa conferma del link per email,
// dentro il laboratorio, e alla fine si torna al metodo di pagamento.
export default function PaginaCartaFatto() {
  const sessione = useSessione()
  const params = useLocalSearchParams<{ token: string }>()
  if (sessione === undefined) return <SchermataInArrivo />
  if (!sessione) return <Redirect href="/lab" />
  return <RitornoCarta token={String(params.token ?? '')} params={params} Cornice={CorniceLab} onIndietro={() => router.replace('/lab/metodo-pagamento')} />
}
