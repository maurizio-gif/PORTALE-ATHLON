import { useLocalSearchParams } from 'expo-router'

import { ConfermaDelega } from '@/features/delega/ConfermaDelega'

// Il link nell'email della delega (31/10/2026): `https://app.athlonroma.it/delega/conferma/<token>`. Senza accesso e senza la cornice dell'app.
export default function PaginaConfermaDelega() {
  const { token } = useLocalSearchParams<{ token: string }>()
  return <ConfermaDelega token={String(token ?? '').trim()} />
}
