import { useColorScheme } from 'react-native'

import { tinta, useColori, type Colori, type Tono } from '@/theme'

// Il tema del laboratorio, sul modello dei kit delle app fitness (Sandow, UI8):
// grigi antracite, l'arancio del club come colore forte, un blu come secondo,
// schede bianche molto tonde su un fondo grigio chiaro, e una scheda scura
// («carbone») per le cose che contano. Il carattere e' Plus Jakarta Sans,
// geometrico, con i numeri grandi in extra-bold.

export const F = {
  extra: 'PlusJakartaSans_800ExtraBold',
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medio: 'PlusJakartaSans_500Medium',
  normale: 'PlusJakartaSans_400Regular',
} as const

export type Palette = Colori & {
  scuro: boolean
  /** Il fondo dello schermo, sotto le schede. */
  fondo: string
  /** Una scheda. */
  carta: string
  /** Una scheda dentro una scheda, un campo, un bottone grigio. */
  incavo: string
  /** La scheda scura, uguale nei due temi. */
  carbone: string
  /** Il secondo colore forte. */
  blu: string
  linea: string
  testoTerzo: string
  vetro: string
  ombra: string
}

export function usePalette(): Palette {
  const c = useColori()
  const scuro = useColorScheme() === 'dark'
  return {
    ...c,
    scuro,
    testo: scuro ? '#F4F4F5' : '#121316',
    testoSecondario: scuro ? '#A1A3AA' : '#62646B',
    // Fondo e schede ben distinti (14/10/2026): con due grigi vicini le
    // schede delle lezioni si perdevano nel fondo.
    fondo: scuro ? '#050506' : '#E4E5EA',
    carta: scuro ? '#1D1E22' : '#FFFFFF',
    incavo: scuro ? '#2A2B31' : '#EEEFF2',
    carbone: scuro ? '#222327' : '#17181B',
    blu: scuro ? '#5B8CFF' : '#2F6BFF',
    linea: scuro ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,20,0.08)',
    testoTerzo: scuro ? '#6E717A' : '#9A9CA3',
    vetro: scuro ? 'rgba(28,29,33,0.82)' : 'rgba(255,255,255,0.86)',
    ombra: scuro ? '0 12px 32px rgba(0,0,0,0.6)' : '0 12px 32px rgba(18,19,22,0.1)',
  }
}

/** L'arancio del club, da chiaro a bruciato. */
export const FUOCO = ['#FF8A2B', '#FF5701', '#E84300'] as const
/** Il blu, per il secondo riquadro forte. */
export const MARE = ['#5C8DFF', '#2F6BFF', '#1F4FD8'] as const
/** Le schede scure. */
export const NOTTE = ['#2B2C31', '#18191C', '#101113'] as const

export type ToniTutti = Tono | 'accento' | 'blu' | 'neutro'

/** Il fondo leggero di un tono, per icone e pillole. */
export function velo(p: Palette, tono: ToniTutti, alfa = 0.14): string {
  if (tono === 'neutro') return p.incavo
  return tinta(coloreTono(p, tono), alfa)
}

export function coloreTono(p: Palette, tono: ToniTutti): string {
  if (tono === 'neutro') return p.testoSecondario
  if (tono === 'accento') return p.accento
  if (tono === 'blu') return p.blu
  return p[tono]
}

export const raggio = { piccolo: 14, medio: 20, grande: 28, pillola: 999 } as const
