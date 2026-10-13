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
}

export type Colori = typeof chiaro

export function useColori(): Colori {
  return useColorScheme() === 'dark' ? scuro : chiaro
}

export const spazio = { uno: 4, due: 8, tre: 16, quattro: 24, cinque: 32 } as const
