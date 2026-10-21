import { useSyncExternalStore } from 'react'

import { iscriviLingua, lingua, type Lingua } from './lingua'

/** La lingua di adesso, in un componente che si ridisegna quando cambia (sull'app nativa: sul web cambiare lingua ricarica la pagina). */
export function useLingua(): Lingua {
  return useSyncExternalStore(iscriviLingua, lingua, lingua)
}
