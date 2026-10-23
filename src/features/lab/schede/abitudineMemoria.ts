import type { AbitudineTrain } from '@/api/lab'

// L'abitudine del socio (quanto viene al club e quando, `AbitudineTrain` di `api/lab.ts`) **solo in memoria, mai sul disco**: la leggono la
// schermata Train (a ogni lettura dell'elenco dei piani) e i Consigli (all'apertura), e la usano le regole del «consigliato»
// (`abitudine.ts`) e il profilo comune (`profiloComune.ts`). Sta in un modulo suo, senza altro dentro, perche' lo importano sia
// `questionario.ts` sia `profiloComune.ts`, che a loro volta si importano. Esce con l'uscita dall'app (`dimenticaProfilo`).

let abitudine: AbitudineTrain | null = null

export const abitudineNota = (): AbitudineTrain | null => abitudine

/** Una funzione che non la manda (o che non ha potuto leggerla) la lascia com'e': null non cancella quella che si sapeva. */
export function ricordaAbitudine(a: AbitudineTrain | null | undefined) {
  if (a) abitudine = a
}

export function dimenticaAbitudine() {
  abitudine = null
}
