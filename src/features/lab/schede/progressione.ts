import type { EsercizioScheda, SchedaLab } from '@/api/lab'
import { t } from '@/lib/lingua'

// La progressione a cicli di un piano proprio (31/10/2026, richiesta di Maurizio: «piani pluri-settimanali con scarico»). **Il piano resta quello di base**: qui si
// ricavano i numeri di ogni settimana, e si applicano **quando il piano si guarda o si fa** (`Scheda.tsx`, `Seduta.tsx`), mai in quello che si modifica (l'editor legge
// il piano grezzo). Il server tiene solo la durata del ciclo e il giorno in cui e' cominciato (`schede.progressione_*`).
//
// Un ciclo dura da 3 a 8 settimane (di partenza 4): **le prime sono di carico, l'ultima e' di scarico**, e poi il ciclo ricomincia da capo (con i massimali del test
// che nel frattempo si sono aggiornati, le stesse percentuali danno carichi nuovi).
//  - **Settimane di carico**: le percentuali del massimale salgono di qualche punto, da +0 nella prima a **+5 nell'ultima** di carico (`incrementoCarico`). Le serie e le
//    ripetizioni restano quelle del piano. **Dove un esercizio non ha una percentuale (a corpo libero, o col carico scritto a parole) non cambia niente**: non si inventa
//    un numero. Se il piano non ne ha nessuna lo si dice, prima di attivare.
//  - **Settimana di scarico**: le serie scendono al 60% (arrotondate, almeno una) e le percentuali al 90% (almeno il 20%): meno volume e carichi piu' leggeri, per
//    recuperare. Vale per tutti gli esercizi con serie.
// Sono numeri nostri e prudenti, **da far validare al Direttore Tecnico** (vedi `CLAUDE.md`). Descrive e propone: non e' un parere medico e non sostituisce un istruttore.
// **I limiti della durata hanno una copia sul server** (`_shared/schede/progressione.ts`): si cambiano insieme.
// Puro: tutto dipende da `oggi` (il giorno di Roma, «AAAA-MM-GG»), che passa chi chiama.

export const SETTIMANE_MIN = 3
export const SETTIMANE_MAX = 8
export const SETTIMANE_PREDEFINITE = 4
/** Di quanti punti di percentuale sale il carico, al massimo, nell'ultima settimana di carico. */
export const PUNTI_MASSIMI = 5
/** Nella settimana di scarico: la quota di serie e la quota di carico che restano. */
export const QUOTA_SERIE_SCARICO = 0.6
export const QUOTA_CARICO_SCARICO = 0.9
export const PERCENTUALE_MINIMA = 20

export type Progressione = { settimane: number; inizio: string }

export type SettimanaCiclo = {
  /** Il ciclo in cui siamo (1 il primo). */
  ciclo: number
  /** La settimana del ciclo, da 1 a `di`. */
  numero: number
  di: number
  scarico: boolean
  /** I punti di percentuale che si aggiungono ai carichi (0 nella prima, e in scarico). */
  punti: number
  /** Il primo e l'ultimo giorno di questa settimana. */
  dal: string
  al: string
}

const GIORNO_MS = 86_400_000
const giorniFra = (da: string, a: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${da}T12:00:00Z`)) / GIORNO_MS)
const piuGiorni = (g: string, n: number) => new Date(Date.parse(`${g}T12:00:00Z`) + n * GIORNO_MS).toISOString().slice(0, 10)

/** Durata valida di un ciclo. */
export const durataValida = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= SETTIMANE_MIN && n <= SETTIMANE_MAX

/**
 * Di quanti punti salgono le percentuali nella settimana `numero` (da 1) di un ciclo di `di`: le settimane di carico sono tutte tranne l'ultima, e il carico sale in
 * linea retta da 0 a `PUNTI_MASSIMI`. 4 settimane: +0, +3, +5, poi scarico. In scarico non si somma niente (c'e' la riduzione).
 */
export function incrementoCarico(numero: number, di: number): number {
  const carico = di - 1
  if (numero >= di || carico <= 1) return 0
  return Math.round((PUNTI_MASSIMI * (numero - 1)) / (carico - 1))
}

/** In che settimana del ciclo si e' `oggi`. Il ciclo ricomincia da solo; un `oggi` prima dell'inizio vale la prima settimana. */
export function settimanaDi(p: Progressione, oggi: string): SettimanaCiclo {
  const trascorsi = Math.max(0, Math.floor(giorniFra(p.inizio, oggi) / 7))
  const numero = (trascorsi % p.settimane) + 1
  const dal = piuGiorni(p.inizio, trascorsi * 7)
  return { ciclo: Math.floor(trascorsi / p.settimane) + 1, numero, di: p.settimane, scarico: numero === p.settimane, punti: incrementoCarico(numero, p.settimane), dal, al: piuGiorni(dal, 6) }
}

/** L'esercizio com'e' in questa settimana (una copia: l'originale non si tocca). Le serie e i carichi senza percentuale restano quelli del piano nelle settimane di carico. */
export function esercizioDellaSettimana(e: EsercizioScheda, s: Pick<SettimanaCiclo, 'scarico' | 'punti'>): EsercizioScheda {
  if (s.scarico) {
    return {
      ...e,
      serie: Math.max(1, Math.round(e.serie * QUOTA_SERIE_SCARICO)),
      percentuale: e.percentuale ? Math.max(PERCENTUALE_MINIMA, Math.round(e.percentuale * QUOTA_CARICO_SCARICO)) : e.percentuale,
    }
  }
  if (!s.punti || !e.percentuale) return e
  return { ...e, percentuale: Math.min(100, e.percentuale + s.punti) }
}

/**
 * Il piano com'e' questa settimana, e in che settimana siamo. Senza progressione (o per un piano di nuoto, che non ha carichi) e' il piano com'e', senza settimana.
 * Una copia: l'editor e la memoria tengono il piano di base.
 */
export function applicaProgressione(scheda: SchedaLab, oggi: string): { scheda: SchedaLab; settimana: SettimanaCiclo | null } {
  const p = scheda.progressione
  if (!p || scheda.ambiente === 'vasca' || !durataValida(p.settimane) || !/^\d{4}-\d{2}-\d{2}$/.test(p.inizio)) return { scheda, settimana: null }
  const settimana = settimanaDi(p, oggi)
  if (!settimana.scarico && !settimana.punti) return { scheda, settimana }
  return { scheda: { ...scheda, giorni: scheda.giorni.map((g) => ({ ...g, esercizi: g.esercizi.map((e) => esercizioDellaSettimana(e, settimana)) })) }, settimana }
}

/** Il piano ha almeno un esercizio con la percentuale del massimale: senza, le settimane di carico non cambiano niente. */
export const haPercentuali = (scheda: Pick<SchedaLab, 'giorni'>): boolean => scheda.giorni.some((g) => g.esercizi.some((e) => !!e.percentuale))

export type VoceCiclo = { numero: number; tipo: 'base' | 'carico' | 'scarico'; punti: number }

/** Le settimane di un ciclo di `di`, per far vedere cosa cambia prima di attivarlo. */
export function vociDelCiclo(di: number): VoceCiclo[] {
  return Array.from({ length: di }, (_, i) => {
    const numero = i + 1
    const punti = incrementoCarico(numero, di)
    return { numero, punti, tipo: numero === di ? 'scarico' : punti === 0 ? 'base' : 'carico' }
  })
}

// I testi.

export function frase(v: Pick<VoceCiclo, 'tipo' | 'punti'>): string {
  if (v.tipo === 'scarico') return t('Scarico: meno serie e carichi più leggeri, per recuperare', 'Deload: fewer sets and lighter loads, to recover')
  if (v.tipo === 'base') return t('Carichi del piano', 'Loads as in the plan')
  return t(`Carichi un po’ più alti (+${v.punti} punti di percentuale)`, `Slightly heavier loads (+${v.punti} percentage points)`)
}

export function etichettaSettimana(s: SettimanaCiclo): string {
  return s.scarico ? t(`Settimana ${s.numero} di ${s.di} · scarico`, `Week ${s.numero} of ${s.di} · deload`) : t(`Settimana ${s.numero} di ${s.di}`, `Week ${s.numero} of ${s.di}`)
}

/** Cosa cambia questa settimana, in una frase. */
export function fraseSettimana(s: SettimanaCiclo, conPercentuali: boolean): string {
  if (s.scarico) return t('È la settimana di scarico: meno serie e carichi più leggeri. Serve a recuperare, e la settimana dopo si riparte.', 'It’s the deload week: fewer sets and lighter loads. It’s there to help you recover, and next week you start again.')
  if (!s.punti) return t('Si parte dai carichi del piano.', 'You start from the plan’s loads.')
  return conPercentuali
    ? t(`I carichi in percentuale sono un po’ più alti di quelli del piano (+${s.punti} punti). Dove non c’è una percentuale, resta quello che hai scritto.`, `The percentage loads are a bit heavier than the plan’s (+${s.punti} points). Where there’s no percentage, it stays as you wrote it.`)
    : t('Questo piano non ha carichi in percentuale: le settimane di carico non cambiano i numeri, quella di scarico sì.', 'This plan has no percentage loads: the loading weeks don’t change the numbers, the deload week does.')
}
