import { Platform, useColorScheme, useWindowDimensions } from 'react-native'

// Il tema chiaro o scuro dell'app (20/10/2026, richiesta di Maurizio): **sul computer sempre chiaro**, sul telefono
// quello del sistema. E' il solo posto dove si decide: `useColori` (theme.ts) e `usePalette` (lab/ui/tema.ts) lo leggono da qui,
// e nessun altro file chiede a React Native il tema del dispositivo.

/**
 * Oltre questa larghezza si e' su un computer (o un tablet di traverso), la stessa soglia con cui le schermate passano
 * alle colonne larghe (`LARGO` in `components/Pagina.tsx`, che la riesporta). **Va cambiata anche in `public/index.html`**
 * (i colori prima che parta il codice) e in `public/offline.html`.
 */
export const LARGO = 900

/** `'dark'` solo sul telefono (o nell'app nativa) con il sistema in scuro; sul web largo sempre `'light'`. */
export function useSchemaColori(): 'light' | 'dark' {
  const sistema = useColorScheme()
  const { width } = useWindowDimensions()
  if (Platform.OS === 'web' && width >= LARGO) return 'light'
  return sistema === 'dark' ? 'dark' : 'light'
}
