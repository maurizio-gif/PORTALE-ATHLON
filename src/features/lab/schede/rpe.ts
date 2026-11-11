import { t } from '@/lib/lingua'

// L'RPE di una serie (11/11/2026): lo sforzo percepito, da 0 a 10. Facoltativo, per chi si allena gia' da un po'.
//
// Puro (a parte le due lingue): lo usa `Seduta.tsx` e lo prova `scripts/prova-rpe.ts`. La scala e' quella che si usa in sala pesi, legata
// alle **ripetizioni che restavano** (10 = nessuna, 9 = una, 8 = due…): e' il modo in cui un numero «a sensazione» diventa uguale per tutti.
// Si salva un numero intero; il server (`portale-lab-schede`, colonna `allenamento_serie.rpe`) accetta anche i mezzi punti, che l'app oggi non scrive.

export const RPE_MINIMO = 0
export const RPE_MASSIMO = 10
export const RPE_VALORI: number[] = Array.from({ length: RPE_MASSIMO - RPE_MINIMO + 1 }, (_, i) => RPE_MINIMO + i)

/** Un RPE scritto o arrivato dal server: un numero da 0 a 10, altrimenti null (anche per una stringa vuota: `Number('')` sarebbe 0, cioe' «nessuno sforzo»). */
export function rpeValido(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= RPE_MINIMO && n <= RPE_MASSIMO ? n : null
}

/** Che cosa vuol dire un valore, in una riga: «Dura: ne avevi ancora 2». */
export function descriviRpe(v: number): string {
  if (v >= 10) return t('Massimo: non ne facevi un’altra', 'Maximum: you couldn’t do another')
  if (v >= 9) return t('Molto dura: ne avevi ancora 1', 'Very hard: 1 rep left')
  if (v >= 8) return t('Dura: ne avevi ancora 2', 'Hard: 2 reps left')
  if (v >= 7) return t('Impegnativa: ne avevi ancora 3', 'Challenging: 3 reps left')
  if (v >= 6) return t('Media: ne avevi ancora 4', 'Moderate: 4 reps left')
  if (v >= 5) return t('Media: ne avevi ancora 5 o più', 'Moderate: 5 or more reps left')
  if (v >= 3) return t('Leggera: da riscaldamento', 'Light: warm-up effort')
  if (v >= 1) return t('Molto leggera', 'Very light')
  return t('Nessuno sforzo', 'No effort')
}

/** «RPE 8», o «RPE 8,5». */
export function etichettaRpe(v: number): string {
  return `RPE ${String(v).replace('.', t(',', '.'))}`
}
