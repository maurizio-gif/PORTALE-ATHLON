import type { AbitudineTrain } from '@/api/lab'
import { locale, t } from '../../../lib/lingua'

// Le regole del «consigliato» che nascono da quanto il socio viene davvero al club (22/10/2026). **Puro** (niente React, niente rete): si prova
// con `LC_ALL=it_IT.UTF-8 npx tsx` (`t()` fuori da un browser sceglie l'inglese). L'abitudine la calcola la funzione dagli ingressi al
// tornello e dalle presenze alle lezioni; qui si legge soltanto, e **non cancella mai una scelta della persona**: da' un «consigliato»
// piu' onesto e, se la scelta e' molto piu' alta di quello che fa oggi, una frase leggera. Chi non ha ancora un'abitudine
// (`affidabile` falso: e' arrivato da meno di tre settimane) o con una funzione di prima trova le regole di sempre.
//
// Le parole non dipendono dal genere («risultano 8 giorni», non «sei venuto»): non lo sappiamo.

const utile = (a: AbitudineTrain | null | undefined): a is AbitudineTrain & { volte_sostenibili: number } => !!a && a.affidabile && a.volte_sostenibili !== null

/**
 * I giorni di sala a settimana da consigliare: **mai piu' di quanti se ne possono sostenere** (un giorno in piu' di quanti se ne fanno oggi), mai
 * meno di due. Non alza mai quello che dicono le risposte (minuti, intensita', livello): chi viene molto non e' spinto a venire di piu'.
 */
export function giorniSalaConsigliati(base: number, a: AbitudineTrain | null | undefined): number {
  if (!utile(a)) return base
  return Math.max(2, Math.min(base, a.volte_sostenibili))
}

/** I giorni a settimana in parole: «1,2» in italiano, «1.2» in inglese; un intero senza decimali. */
export function numeroGiorni(n: number): string {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(n)
}

/**
 * Una riga che dice cosa risulta, con le cifre vere: «Nelle ultime quattro settimane risultano 8 giorni al club (ingressi o lezioni), circa 2 a
 * settimana.» Null se l'abitudine non c'e' o non e' ancora una media affidabile.
 */
export function testoAbitudine(a: AbitudineTrain | null | undefined): string | null {
  if (!a || !a.affidabile) return null
  if (a.giorni_28 === 0) return t('Nelle ultime quattro settimane non risultano ingressi né lezioni.', 'Over the last four weeks there are no entries or classes on record.')
  const giorni = a.giorni_28
  return t(
    `Nelle ultime quattro settimane ${giorni === 1 ? 'risulta 1 giorno' : `risultano ${giorni} giorni`} al club (ingressi o lezioni), circa ${numeroGiorni(a.giorni_a_settimana)} a settimana.`,
    `Over the last four weeks you were at the club on ${giorni === 1 ? '1 day' : `${giorni} days`} (entries or classes), about ${numeroGiorni(a.giorni_a_settimana)} a week.`,
  )
}

/**
 * Una frase leggera quando la scelta supera di due o piu' quello che si fa oggi. **Non blocca niente** e non dice cosa e' giusto: dice che e' un salto
 * e che si puo' salire un po' alla volta. Le cifre vere stanno nella riga accanto (`testoAbitudine`), che si mostra sempre insieme: qui non si ripetono.
 * Null se la scelta e' vicina all'abitudine o se l'abitudine non c'e'.
 */
export function notaSalto(scelti: number, a: AbitudineTrain | null | undefined): string | null {
  if (!utile(a) || scelti < a.volte_sostenibili + 2) return null
  return t(
    `Partire da ${scelti} è un bel salto rispetto a quanto vieni oggi. Puoi farlo; se vuoi, sali un po’ alla volta.`,
    `Starting at ${scelti} is a big jump from where you are today. You can do it; if you like, build up gradually.`,
  )
}

/** Quante volte a settimana consigliare ai Consigli (le volte al club, lezioni comprese): un giorno in piu' di quanti se ne fanno oggi. Null se non si sa. */
export const volteConsigliate = (a: AbitudineTrain | null | undefined): number | null => (utile(a) ? a.volte_sostenibili : null)

/** Il numero di volte a settimana scelte e' molto piu' alto di quanto si fa oggi (due o piu' sopra il consigliato). */
export const moltoSopra = (scelte: number, a: AbitudineTrain | null | undefined): boolean => utile(a) && scelte >= a.volte_sostenibili + 2
