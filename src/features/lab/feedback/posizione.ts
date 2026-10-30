import { useEffect, useSyncExternalStore } from 'react'

// Dove sta il pulsante «Assistente virtuale» (fino al 30/10/2026 era quello del «Feedback»): in alto a destra, nel posto in cui le schermate mettono il loro comando (il carrello
// dello shop, per esempio). Quasi tutte quel posto lo lasciano libero; quelle che lo usano lo dicono con
// `useSegnaAzioneInAlto` (lo fa `Schermata`, quando riceve `destra`) e il pulsante si sposta di un bottone a sinistra,
// invece di coprirlo. E' un conteggio e non un valore: due schermate nella pila possono dirlo insieme.
//
// **Solo la schermata che si vede lo segna** (chi chiama passa `visibile`): in una pila di schermate quella sotto resta
// montata, e un carrello rimasto sotto spingerebbe il pulsante anche sul calendario, che non ha nessun comando da evitare.

let conteggio = 0
const ascoltatori = new Set<() => void>()

function cambia(delta: number) {
  conteggio = Math.max(0, conteggio + delta)
  ascoltatori.forEach((f) => f())
}

/** La schermata che si vede ha un comando in alto a destra: finche' e' montata e in vista, il pulsante «Assistente virtuale» gli fa posto. */
export function useSegnaAzioneInAlto(presente: boolean, visibile: boolean) {
  const attivo = presente && visibile
  useEffect(() => {
    if (!attivo) return
    cambia(1)
    return () => cambia(-1)
  }, [attivo])
}

function iscrivi(f: () => void) {
  ascoltatori.add(f)
  return () => {
    ascoltatori.delete(f)
  }
}

/** C'e' una schermata in vista con un comando in alto a destra? */
export function useAzioneInAltoPresente(): boolean {
  return useSyncExternalStore(
    iscrivi,
    () => conteggio > 0,
    () => false,
  )
}
