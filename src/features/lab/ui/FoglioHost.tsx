import { Fragment, useEffect, useSyncExternalStore } from 'react'

import { hostMontato, iscrivi, leggiVoci, montaHost } from '@/lib/portaleFogli'

// Disegna i fogli con un campo di testo su Android (`Foglio`, prop `tastiera`): a tutto schermo, nella finestra dell'attivita', dove la tastiera
// si fa sentire e il foglio puo' alzarsi. Si monta **una volta sola**, nel layout del portale (`lib/portaleFogli.ts` spiega il perche'). Quello che
// disegna e' il `Foglio` stesso, con `livello`: qui non c'e' niente da decidere.
export function FoglioHost() {
  useEffect(() => montaHost(), [])
  const voci = useSyncExternalStore(iscrivi, leggiVoci)
  return (
    <>
      {voci.map((v) => (
        <Fragment key={v.id}>{v.nodo}</Fragment>
      ))}
    </>
  )
}

/** C'e' un host montato? Un foglio senza host (una pagina fuori dal layout del portale) resta un `Modal`. */
export function useHostFogliMontato(): boolean {
  return useSyncExternalStore(iscrivi, hostMontato)
}
