import { useSyncExternalStore } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'

// «Riduci movimento» (02/11/2026): chi lo chiede al sistema (iOS, Android) o al browser (`prefers-reduced-motion`) non vede
// le animazioni di contorno: il bagliore della testata che respira, l'icona della barra che salta, l'hover che solleva.
// Le animazioni che portano un'informazione (una barra che si riempie, l'avvio) decidono da sole; questo gancio e' per
// quelle che danno solo vita all'interfaccia, e che senza non si perde niente.

let valore: boolean | null = null
const ascoltatori = new Set<() => void>()

function avvia() {
  if (valore !== null) return
  valore = false
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    valore = m.matches
    m.addEventListener?.('change', (e) => {
      valore = e.matches
      ascoltatori.forEach((f) => f())
    })
    return
  }
  AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      valore = v
      ascoltatori.forEach((f) => f())
    })
    .catch(() => undefined)
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
    valore = v
    ascoltatori.forEach((f) => f())
  })
}

function iscrivi(f: () => void) {
  const g = () => f()
  ascoltatori.add(g)
  return () => {
    ascoltatori.delete(g)
  }
}

function leggi(): boolean {
  avvia()
  return valore ?? false
}

/** Vero se la persona ha chiesto meno movimento: le animazioni di contorno restano ferme. */
export function useRiduciMovimento(): boolean {
  return useSyncExternalStore(iscrivi, leggi, leggi)
}
