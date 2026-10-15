import { useLocalSearchParams } from 'expo-router'

import { RitornoCarta } from '@/features/metodo-pagamento/RitornoCarta'

// Il ritorno dalla pagina della carta per il link dell'email: la conferma e'
// in features/metodo-pagamento/RitornoCarta (la stessa dell'app).
export default function PaginaRitornoCarta() {
  const params = useLocalSearchParams<{ token: string }>()
  return <RitornoCarta token={String(params.token ?? '')} params={params} />
}
