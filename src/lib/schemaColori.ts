import { useSyncExternalStore } from 'react'
import { Appearance, Platform, useColorScheme, useWindowDimensions } from 'react-native'

import './localStorage'

// Il tema chiaro o scuro dell'app. E' il solo posto dove si decide: `useColori` (theme.ts) e `usePalette` (lab/ui/tema.ts) lo leggono da qui,
// e nessun altro file chiede a React Native il tema del dispositivo.
//
// **Di partenza («Automatico»)** (20/10/2026, richiesta di Maurizio): sul computer sempre chiaro, sul telefono quello del sistema.
// **La persona puo' scegliere** (02/11/2026, richiesta di Maurizio: «far scegliere il tema all'utente se e' light o dark», web e app): **Automatico, Chiaro o Scuro**.
// Una scelta esplicita vale **ovunque**, anche sul computer. Si ricorda sul dispositivo (`localStorage`: sul web quello del browser, sull'app nativa
// quello di expo-sqlite, come la lingua in `lingua.ts`) e non va sul server. Sull'app nativa si dice anche al sistema (`Appearance.setColorScheme`), cosi' la barra di stato e
// i componenti nativi seguono; sul web si segna `data-tema` sulla pagina e il colore della barra del browser (`theme-color`), e `public/index.html` li rimette da solo prima che parta il
// codice, cosi' non c'e' il lampo del tema sbagliato.

export type SceltaTema = 'automatico' | 'chiaro' | 'scuro'

const CHIAVE = 'athlon_tema'
const SCELTE: SceltaTema[] = ['automatico', 'chiaro', 'scuro']

/**
 * Oltre questa larghezza si e' su un computer (o un tablet di traverso), la stessa soglia con cui le schermate passano
 * alle colonne larghe (`LARGO` in `components/Pagina.tsx`, che la riesporta). **Va cambiata anche in `public/index.html`**
 * (i colori prima che parta il codice) e in `public/offline.html`.
 */
export const LARGO = 900

let scelta: SceltaTema | null = null
const ascoltatori = new Set<() => void>()

/** La scelta ricordata, o «automatico». Si legge alla prima domanda: sul nativo `localStorage` arriva da expo-sqlite. */
export function sceltaTema(): SceltaTema {
  if (scelta === null) {
    let v: string | null = null
    try {
      v = globalThis.localStorage?.getItem(CHIAVE) ?? null
    } catch {
      // senza memoria si parte dall'automatico
    }
    scelta = SCELTE.includes(v as SceltaTema) ? (v as SceltaTema) : 'automatico'
    applicaAlSistema(scelta)
  }
  return scelta
}

/** Dice al sistema (nativo) o alla pagina (web) quale tema c'e', cosi' barra di stato e componenti nativi seguono. */
function applicaAlSistema(v: SceltaTema) {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return
    const radice = document.documentElement
    if (v === 'automatico') radice.removeAttribute('data-tema')
    else radice.setAttribute('data-tema', v)
    return
  }
  try {
    Appearance.setColorScheme?.(v === 'automatico' ? 'unspecified' : v === 'scuro' ? 'dark' : 'light')
  } catch {
    // un sistema che non lo sa fare: resta quello suo, e l'app segue comunque la scelta
  }
}

/** Il colore della barra del browser quando la scelta e' esplicita (`<meta name="theme-color">`); con l'automatico tornano quelli di `index.html`. */
function coloreBarraWeb(v: SceltaTema) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return
  const id = 'athlon-theme-color'
  let m = document.getElementById(id) as HTMLMetaElement | null
  if (v === 'automatico') {
    m?.remove()
    return
  }
  if (!m) {
    m = document.createElement('meta')
    m.id = id
    m.name = 'theme-color'
    document.head.appendChild(m)
  }
  m.content = v === 'scuro' ? '#050506' : '#E4E5EA'
}

export function impostaTema(v: SceltaTema) {
  scelta = v
  try {
    globalThis.localStorage?.setItem(CHIAVE, v)
  } catch {
    // la scelta vale finche' l'app e' aperta
  }
  applicaAlSistema(v)
  coloreBarraWeb(v)
  ascoltatori.forEach((f) => f())
}

function iscrivi(f: () => void) {
  ascoltatori.add(f)
  return () => {
    ascoltatori.delete(f)
  }
}

/** La scelta di adesso, in un componente che si ridisegna quando cambia. */
export function useSceltaTema(): SceltaTema {
  return useSyncExternalStore(iscrivi, sceltaTema, sceltaTema)
}

/** `'dark'` o `'light'`: la scelta della persona se c'e'; con l'automatico `'dark'` solo sul telefono (o nell'app nativa) con il sistema in scuro, sul web largo sempre `'light'`. */
export function useSchemaColori(): 'light' | 'dark' {
  const sistema = useColorScheme()
  const { width } = useWindowDimensions()
  const voluta = useSceltaTema()
  if (voluta === 'chiaro') return 'light'
  if (voluta === 'scuro') return 'dark'
  if (Platform.OS === 'web' && width >= LARGO) return 'light'
  return sistema === 'dark' ? 'dark' : 'light'
}
