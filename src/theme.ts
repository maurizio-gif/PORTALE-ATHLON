import { useColorScheme } from 'react-native'

// I colori del club: l'arancio e' quello delle email e del CRM (#FF5701).
const chiaro = {
  sfondo: '#FFFFFF',
  superficie: '#F5F5F6',
  testo: '#1A1A1A',
  testoSecondario: '#5F6368',
  bordo: '#E2E3E6',
  accento: '#FF5701',
  suAccento: '#FFFFFF',
  errore: '#B3261E',
  ok: '#16803C',
  attenzione: '#C27800',
}

const scuro: typeof chiaro = {
  sfondo: '#111214',
  superficie: '#1D1F22',
  testo: '#F2F2F3',
  testoSecondario: '#A9ADB3',
  bordo: '#2E3135',
  accento: '#FF6A1F',
  suAccento: '#FFFFFF',
  errore: '#F2B8B5',
  ok: '#6DD58C',
  attenzione: '#F2B84B',
}

export type Colori = typeof chiaro

export function useColori(): Colori {
  return useColorScheme() === 'dark' ? scuro : chiaro
}

export const spazio = { uno: 4, due: 8, tre: 16, quattro: 24, cinque: 32 } as const

// I riquadri colorati (esiti, metodo attuale): fondo e bordo trasparenti sul
// colore del tono, cosi' si leggono uguali col tema chiaro e con quello scuro.
export type Tono = 'ok' | 'attenzione' | 'errore'

export function tinta(colore: string, alfa: number): string {
  const h = colore.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alfa})`
}

export function stileTono(c: Colori, tono: Tono) {
  return { backgroundColor: tinta(c[tono], 0.16), borderColor: tinta(c[tono], 0.45), borderWidth: 1 }
}
