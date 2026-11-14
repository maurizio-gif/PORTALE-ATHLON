import type { ReactNode } from 'react'

// Dove si disegnano i fogli con un campo di testo su Android (14/11/2026). Parte pura, senza React: l'elenco dei fogli aperti e se c'e' chi li disegna.
//
// **Perche' esiste.** Un `Modal` e' una finestra a parte, e su Android 16 (`targetSdk` 36) quando la tastiera compare l'unica finestra che lo viene a
// sapere (`Keyboard`, `keyboardDidShow`) e' quella dell'attivita', non quella del `Modal`: il foglio non puo' alzarsi, e la tastiera copre il campo (note
// 182 e 236). Un foglio che sta nella finestra dell'attivita' invece lo sa. Ma deve stare **alla radice** (a tutto schermo, sopra la barra delle
// schede), non dentro la schermata che lo apre: per questo il foglio manda qui quello che deve disegnare, e `FoglioHost`, montato una volta sola nel
// layout del portale, lo disegna.
//
// Chi non trova un host montato (le pagine fuori dal layout del portale) ricade sul `Modal` di sempre: un foglio che non si vede e' peggio di uno
// coperto a meta' dalla tastiera.

export type VoceHost = { id: string; nodo: ReactNode }

let voci: readonly VoceHost[] = []
let host = 0
const ascolti = new Set<() => void>()
const emetti = () => {
  for (const a of ascolti) a()
}

/** Per `useSyncExternalStore`: chi si iscrive viene avvisato a ogni cambio; la funzione che ritorna toglie l'iscrizione. */
export function iscrivi(a: () => void): () => void {
  ascolti.add(a)
  return () => {
    ascolti.delete(a)
  }
}

/** I fogli da disegnare, dal piu' vecchio al piu' recente (l'ultimo sta sopra). Lo stesso oggetto finche' non cambia niente. */
export function leggiVoci(): readonly VoceHost[] {
  return voci
}

/** C'e' un host montato che disegna i fogli? */
export function hostMontato(): boolean {
  return host > 0
}

/** L'host si annuncia quando si monta; la funzione che ritorna lo toglie. */
export function montaHost(): () => void {
  host++
  emetti()
  let tolto = false
  return () => {
    if (tolto) return
    tolto = true
    host--
    emetti()
  }
}

/** Mostra (o aggiorna, restando al suo posto nella pila) il foglio `id`. */
export function mettiInHost(id: string, nodo: ReactNode): void {
  const i = voci.findIndex((v) => v.id === id)
  voci = i < 0 ? [...voci, { id, nodo }] : voci.map((v, k) => (k === i ? { id, nodo } : v))
  emetti()
}

/** Toglie il foglio `id`; non fa niente (e non avvisa nessuno) se non c'e'. */
export function togliDalHost(id: string): void {
  if (!voci.some((v) => v.id === id)) return
  voci = voci.filter((v) => v.id !== id)
  emetti()
}
