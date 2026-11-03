import { useLocalSearchParams } from 'expo-router'

import { EntraDalSito } from '@/features/entra/EntraDalSito'

// Il link dell'email di «Prenota» sul sito (04/11/2026): `https://app.athlonroma.it/entra?d=prenota&a=…#th=<token>`. Fuori dal gruppo `(portale)`:
// senza accesso e senza la cornice dell'app, come la conferma della delega. Non sta sotto `/r/` di proposito (quel prefisso apre l'app nativa, e un
// token nel frammento va aperto dal browser). La destinazione e' una lista chiusa (`features/entra/destinazioni.ts`).
export default function PaginaEntra() {
  const { d, a } = useLocalSearchParams<{ d?: string; a?: string }>()
  return <EntraDalSito d={String(d ?? '')} attivita={typeof a === 'string' ? a : undefined} />
}
