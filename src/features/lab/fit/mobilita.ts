import { t } from '@/lib/lingua'

// Le sessioni di mobilita' a richiesta (31/10/2026, richiesta di Maurizio): la persona sceglie su cosa lavorare e quanto tempo ha, e la funzione le dice
// quali esercizi fare (`mobilita_sessione` di `portale-lab-schede`: mobilita' e stretching della libreria, un minuto ciascuno, con i video). Qui sta la parte
// **pura**: le voci da scegliere e il cronometro della sessione, che regge pause, salti e l'app che va in secondo piano senza derive (si prova con `npx tsx`).
// **Le chiavi stanno uguali nella funzione** (`FOCUS`, `MINUTI_SESSIONE`, le zone di `NON_CON_ZONA`): se cambiano, cambiano insieme.

export type FocusMobilita = 'tutto' | 'collo_spalle' | 'schiena' | 'anche_gambe'
export const MINUTI_SESSIONE = [5, 10, 15] as const
export type ZonaFastidio = 'ginocchia' | 'anche' | 'lombare' | 'spalle' | 'cervicale' | 'polsi_gomiti' | 'caviglie'

export const vociFocus = (): { valore: FocusMobilita; testo: string }[] => [
  { valore: 'tutto', testo: t('Tutto il corpo', 'Whole body') },
  { valore: 'collo_spalle', testo: t('Collo e spalle', 'Neck and shoulders') },
  { valore: 'schiena', testo: t('Schiena', 'Back') },
  { valore: 'anche_gambe', testo: t('Anche e gambe', 'Hips and legs') },
]

export const nomeFocus = (f: string): string => vociFocus().find((x) => x.valore === f)?.testo ?? f

export const vociZone = (): { valore: ZonaFastidio; testo: string }[] => [
  { valore: 'cervicale', testo: t('Collo', 'Neck') },
  { valore: 'spalle', testo: t('Spalle', 'Shoulders') },
  { valore: 'polsi_gomiti', testo: t('Polsi e gomiti', 'Wrists and elbows') },
  { valore: 'lombare', testo: t('Zona lombare', 'Lower back') },
  { valore: 'anche', testo: t('Anche', 'Hips') },
  { valore: 'ginocchia', testo: t('Ginocchia', 'Knees') },
  { valore: 'caviglie', testo: t('Caviglie', 'Ankles') },
]

/** Quanti minuti pieni si accreditano per «secondi» di sessione fatta (si arrotonda per difetto: mai un minuto che non c'e' stato). */
export const minutiDaSecondi = (secondi: number): number => Math.max(0, Math.floor(secondi / 60))

// ---------------------------------------------------------------------------------------------------------------------------------
// Il cronometro. Tutto in millisecondi veri (`now` lo passa chi chiama: nessuna chiamata a Date.now() qui dentro), cosi' una scheda in secondo piano o un timer
// in ritardo non cambiano il conto, e si prova senza aspettare. `accPasso` e `accTotale` contano solo il tempo in cui il cronometro ha girato.

export type Crono = {
  /** L'esercizio in corso (0-based). */
  passo: number
  /** Tempo gia' passato sull'esercizio in corso, escluso il tratto che sta girando adesso. */
  accPasso: number
  /** Tempo di sessione fatto, escluso il tratto che sta girando adesso. */
  accTotale: number
  /** Da quando gira il tratto in corso, o null se e' in pausa. */
  ripresoIl: number | null
  finita: boolean
}

export const nuovoCrono = (): Crono => ({ passo: 0, accPasso: 0, accTotale: 0, ripresoIl: null, finita: false })

/** Porta il conto a `now`: se l'esercizio in corso e' finito passa ai successivi (anche piu' d'uno, se e' passato molto tempo), senza deriva. */
export function progredisci(c: Crono, now: number, durate: readonly number[]): Crono {
  let s = c
  if (s.finita || s.ripresoIl === null || !durate.length) return s
  let da: number = s.ripresoIl
  for (;;) {
    const limite = (durate[s.passo] ?? 0) * 1000
    if (s.accPasso + (now - da) < limite) return s
    // L'esercizio e' finito: si conta solo la parte che mancava, e il tratto riparte da dove l'esercizio e' finito (niente deriva).
    const usato = limite - s.accPasso
    const passo = s.passo + 1
    da += usato
    s = { passo, accPasso: 0, accTotale: s.accTotale + usato, ripresoIl: da, finita: false }
    if (passo >= durate.length) return { ...s, passo: durate.length - 1, ripresoIl: null, finita: true }
  }
}

export function avvia(c: Crono, now: number): Crono {
  return c.finita || c.ripresoIl !== null ? c : { ...c, ripresoIl: now }
}

export function ferma(c: Crono, now: number, durate: readonly number[]): Crono {
  const s = progredisci(c, now, durate)
  if (s.ripresoIl === null) return s
  const usato = now - s.ripresoIl
  return { ...s, accPasso: s.accPasso + usato, accTotale: s.accTotale + usato, ripresoIl: null }
}

/** L'esercizio dopo (il tempo che non e' stato fatto non si conta); all'ultimo, la sessione e' finita. */
export function avanti(c: Crono, now: number, durate: readonly number[]): Crono {
  const s = progredisci(c, now, durate)
  if (s.finita) return s
  const fatto = s.ripresoIl === null ? 0 : now - s.ripresoIl
  if (s.passo + 1 >= durate.length) return { passo: s.passo, accPasso: 0, accTotale: s.accTotale + fatto, ripresoIl: null, finita: true }
  return { passo: s.passo + 1, accPasso: 0, accTotale: s.accTotale + fatto, ripresoIl: s.ripresoIl === null ? null : now, finita: false }
}

/** L'esercizio prima, da capo (il tempo gia' fatto resta fatto). Dal primo, ricomincia il primo. */
export function indietro(c: Crono, now: number, durate: readonly number[]): Crono {
  const s = progredisci(c, now, durate)
  const fatto = s.ripresoIl === null ? 0 : now - s.ripresoIl
  return { passo: Math.max(0, s.passo - (s.finita ? 0 : 1)), accPasso: 0, accTotale: s.accTotale + fatto, ripresoIl: s.finita ? null : s.ripresoIl === null ? null : now, finita: false }
}

/** Secondi che mancano alla fine dell'esercizio in corso (interi, per eccesso: «1» finche' non e' proprio finito). */
export function restanti(c: Crono, now: number, durate: readonly number[]): number {
  const s = progredisci(c, now, durate)
  if (s.finita) return 0
  const passato = s.accPasso + (s.ripresoIl === null ? 0 : now - s.ripresoIl)
  return Math.max(0, Math.ceil(((durate[s.passo] ?? 0) * 1000 - passato) / 1000))
}

/** Secondi di sessione fatti finora (interi, per difetto). */
export function secondiFatti(c: Crono, now: number, durate: readonly number[]): number {
  const s = progredisci(c, now, durate)
  return Math.floor((s.accTotale + (s.ripresoIl === null ? 0 : now - s.ripresoIl)) / 1000)
}
