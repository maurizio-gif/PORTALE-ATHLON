import { useLocalSearchParams } from 'expo-router'

import { AccettaDelega } from '@/features/delega/AccettaDelega'

// La pagina pubblica della delega sui figli (31/10/2026): `https://app.athlonroma.it/delega/<codice>`. Senza accesso e senza la
// cornice dell'app, come /invito/<codice>: il link lo manda un titolare dall'app, e chi lo apre si registra.
export default function PaginaDelega() {
  const { codice } = useLocalSearchParams<{ codice: string }>()
  return <AccettaDelega codice={String(codice ?? '').trim().toLowerCase()} />
}
