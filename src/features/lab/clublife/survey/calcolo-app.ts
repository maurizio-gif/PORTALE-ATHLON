import { mediaVoti, type Voto } from './calcolo'
import { CAPITOLI_APP, DOMANDE_GENERALI, MAX_PRIORITA, MAX_VOCI, PROBLEMI, SOGLIA_PROBLEMI, type CapitoloApp } from './dati-app'

// Cosa parte verso il server dalla survey dell'app. **Modulo puro** (niente React): si prova con `npx tsx scripts/prova-survey-app.ts`.
//
// Il server (`sito-valutazioni/sondaggio`) conosce solo `{ id, voto }` con `voto` da 1 a 5 o `null`, al piu' dodici voci per invio,
// e una nota fino a 1000 caratteri. Tutto il resto — chi usa cosa, cosa non convince, cosa va migliorato per primo — sta dentro quei
// tre contenitori, e le regole sono queste (vedi la testata di `dati-app.ts`):
//   - capitolo: una voce per ogni funzione **usata**, col voto o `null`; le funzioni non usate non ci sono;
//   - riga finale: le domande generali (voto o `null`) e un `non-usa-<capitolo>` per ogni capitolo dichiarato inutilizzato;
//   - nota: prima le righe strutturate (quel che non convince), poi le parole della persona, **sempre in italiano nella parte
//     strutturata** (la legge il club) e mai tagliate: se manca spazio si lasciano cadere le righe strutturate, non il testo scritto.

export const MAX_NOTA = 1000

/** Quello che la persona ha messo insieme in un capitolo, finche' non lo invia. */
export type BozzaCapitolo = {
  /** Gli id delle funzioni che dice di usare. */
  usate: string[]
  voti: Record<string, number>
  /** Per funzione, gli id dei motivi per cui non convince (`PROBLEMI`). */
  problemi: Record<string, string[]>
  nota: string
}

export const BOZZA_VUOTA: BozzaCapitolo = { usate: [], voti: {}, problemi: {}, nota: '' }

/** Quello che la persona ha messo insieme nel giudizio finale. */
export type BozzaFinale = {
  voti: Record<string, number>
  nps: number | null
  /** Gli id dei capitoli da migliorare per primi, al piu' `MAX_PRIORITA`. */
  priorita: string[]
  nota: string
}

export const FINALE_VUOTO: BozzaFinale = { voti: {}, nps: null, priorita: [], nota: '' }

function votoValido(v: number | undefined): number | null {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : null
}

/**
 * Le voci di un capitolo: una per ogni funzione usata, **nell'ordine del capitolo** (non in quello dei tocchi: l'ordine e' lo stesso per
 * tutti e le righe si confrontano), col voto o `null` se non l'ha dato. Un id che non e' del capitolo non passa.
 */
export function righeCapitolo(cap: CapitoloApp, bozza: BozzaCapitolo): Voto[] {
  return cap.funzioni.filter((f) => bozza.usate.includes(f.id)).map((f) => ({ id: f.id, voto: votoValido(bozza.voti[f.id]) }))
}

/** La media di un capitolo, come la ricalcola il server (le sole stelle date, due decimali); `null` se non ce n'e' nemmeno una. */
export function mediaCapitolo(cap: CapitoloApp, bozza: BozzaCapitolo): number | null {
  return mediaVoti(righeCapitolo(cap, bozza))
}

/** Aggiunge le righe strutturate davanti al testo libero, nei limiti di `MAX_NOTA`. */
function componiNota(strutturate: string[], libero: string): string {
  const testo = libero.trim().slice(0, MAX_NOTA)
  // Il testo scritto dalla persona ha la precedenza: le righe strutturate prendono lo spazio che avanza, una alla volta, e quella che non ci sta cade.
  let spazio = MAX_NOTA - testo.length - (testo ? 1 : 0)
  const scelte: string[] = []
  for (const riga of strutturate) {
    const costo = riga.length + (scelte.length ? 1 : 0)
    if (costo > spazio) break
    scelte.push(riga)
    spazio -= costo
  }
  return [...scelte, testo].filter(Boolean).join('\n')
}

/**
 * La nota di un capitolo: per ogni funzione usata e votata fino a `SOGLIA_PROBLEMI` con almeno un motivo scelto, una riga
 * `Prenotare una lezione 2/5: confusa, lenta.`, poi il testo libero. Sempre in italiano nella parte strutturata.
 */
export function notaCapitolo(cap: CapitoloApp, bozza: BozzaCapitolo): string {
  const righe: string[] = []
  for (const f of cap.funzioni) {
    if (!bozza.usate.includes(f.id)) continue
    const voto = votoValido(bozza.voti[f.id])
    if (voto === null || voto > SOGLIA_PROBLEMI) continue
    const brevi = PROBLEMI.filter((p) => (bozza.problemi[f.id] ?? []).includes(p.id)).map((p) => p.breve)
    if (!brevi.length) continue
    righe.push(`${f.nome.it} ${voto}/5: ${brevi.join(', ')}.`)
  }
  return componiNota(righe, bozza.nota)
}

/** I capitoli che si possono dichiarare «non uso niente», nell'ordine dei capitoli. */
export function nonUsati(ids: string[]): CapitoloApp[] {
  return CAPITOLI_APP.filter((c) => ids.includes(c.id))
}

/**
 * Le voci della riga finale: le domande generali nell'ordine (col voto o `null`), poi un `non-usa-<capitolo>` con `voto: null` per ogni
 * capitolo dichiarato inutilizzato. Le prime stanno davanti perche' il server, se sforasse, taglia dalla coda.
 */
export function righeFinale(bozza: BozzaFinale, nonUsa: string[]): Voto[] {
  const generali = DOMANDE_GENERALI.map((q) => ({ id: q.id, voto: votoValido(bozza.voti[q.id]) }))
  const marcatori = nonUsati(nonUsa).map((c) => ({ id: `non-usa-${c.id}`, voto: null }))
  return [...generali, ...marcatori]
}

/** La nota della riga finale: «Da migliorare per primo: …» (in italiano) e poi il testo libero. */
export function notaFinale(bozza: BozzaFinale): string {
  const titoli = CAPITOLI_APP.filter((c) => bozza.priorita.includes(c.id))
    .slice(0, MAX_PRIORITA)
    .map((c) => c.titolo.it)
  return componiNota(titoli.length ? [`Da migliorare per primo: ${titoli.join(' · ')}.`] : [], bozza.nota)
}

/** Quanti capitoli sono «finiti» per la persona: inviati, o dichiarati inutilizzati. */
export function capitoliFatti(inviati: Record<string, true>, nonUsa: Record<string, true>): number {
  return CAPITOLI_APP.filter((c) => inviati[c.id] || nonUsa[c.id]).length
}

/** Il prossimo capitolo da fare dopo `corrente`: il primo che non e' inviato ne' dichiarato inutilizzato, a partire dal successivo e girando in tondo. `null` se sono tutti fatti. */
export function prossimoCapitolo(corrente: string, inviati: Record<string, true>, nonUsa: Record<string, true>): CapitoloApp | null {
  const n = CAPITOLI_APP.length
  const da = CAPITOLI_APP.findIndex((c) => c.id === corrente)
  for (let k = 1; k <= n; k++) {
    const c = CAPITOLI_APP[(da + k + n) % n]
    if (c.id !== corrente && !inviati[c.id] && !nonUsa[c.id]) return c
  }
  return null
}

/** Il numero massimo di voci che una riga puo' avere, per le prove: la piu' lunga fra i capitoli e la finale. */
export function vociMassime(): { capitolo: number; finale: number } {
  return { capitolo: Math.max(...CAPITOLI_APP.map((c) => c.funzioni.length)), finale: DOMANDE_GENERALI.length + CAPITOLI_APP.length }
}

export { MAX_VOCI }
