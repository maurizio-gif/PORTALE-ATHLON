import { useLocalSearchParams } from 'expo-router'

import { EntraDalSito } from '@/features/entra/EntraDalSito'

// Il link dell'email di «Prenota» sul sito (04/11/2026): `https://app.athlonroma.it/entra?d=prenota&a=…#th=<token>`. Fuori dal gruppo `(portale)`:
// senza accesso e senza la cornice dell'app, come la conferma della delega. Non sta sotto `/r/` di proposito (quel prefisso apre l'app nativa, e un
// token nel frammento va aperto dal browser). La destinazione e' una lista chiusa (`features/entra/destinazioni.ts`): `a` e' una categoria
// del Calendario, `g` un giorno (`AAAA-MM-GG`, per gli eventi), `p` un piano (per «Iscriviti» dal listino), `f` un bambino (per la sezione Junior).
export default function PaginaEntra() {
  const { d, a, g, p, f } = useLocalSearchParams<{ d?: string; a?: string; g?: string; p?: string; f?: string }>()
  return (
    <EntraDalSito
      d={String(d ?? '')}
      attivita={typeof a === 'string' ? a : undefined}
      giorno={typeof g === 'string' ? g : undefined}
      piano={typeof p === 'string' ? p : undefined}
      figlio={typeof f === 'string' ? f : undefined}
    />
  )
}
