import type { Affollamento, SlotRicorrente, Tappa } from '@/api/percorso'

import { minutiDaOra } from './comune'
import { controllaTappe, ricalcolaAncorate } from './controllo'

// Una lezione «spesso al completo» e le alternative per la sua tappa, nell'editor (20/10/2026).
//
// **Dice com'e' andata, non come andra'**: i posti di una lezione futura si conoscono solo dopo l'apertura
// della prenotazione, tre giorni prima. Quello che la funzione sa subito e' quante volte, nelle ultime quattro
// settimane, le lezioni di quello stesso slot (stesso tipo, giorno e ora) hanno chiuso con tutti i posti presi
// (`affollamento` del catalogo, `catalogo.ts` della funzione). Da li' un avviso sulla tappa, e due alternative
// con meno attesa. La settimana vera, con i posti di quel giorno, la dice `TappaCarta`.
//
// **Le soglie sono le stesse della funzione** (`spessoCompleta`, `catalogo.ts`): almeno tre lezioni osservate, e
// meta' o piu' chiuse al completo. Sono nostre, non del club: chi le cambia le cambia nei due posti.

const MINIMO_OSSERVATE = 3
const QUOTA_SPESSO_COMPLETA = 0.5

export function spessoCompleta(a: Affollamento | null | undefined): boolean {
  return !!a && a.osservate >= MINIMO_OSSERVATE && a.piene / a.osservate >= QUOTA_SPESSO_COMPLETA
}

/** L'id dello slot ricorrente di una tappa-lezione, com'e' nel catalogo: `<tipo>-<giorno>-<HHMM>`. */
export const idSlotDiTappa = (t: Tappa): string | null => (t.tipo === 'lezione' && t.lezione && t.ora ? `${t.lezione.class_type_id}-${t.giorno}-${t.ora.replace(':', '')}` : null)

export function slotDiTappa(t: Tappa, slot: SlotRicorrente[]): SlotRicorrente | null {
  const id = idSlotDiTappa(t)
  return id ? (slot.find((s) => s.id === id) ?? null) : null
}

/** Una lezione che il socio puo' mettere al posto di quella: lo stesso tipo (un altro giorno o un'altra ora), o una simile. */
export type Suggerimento = { slot: SlotRicorrente; tipo: 'stessa' | 'simile' }

/** Quanto spesso uno slot chiude al completo, da 0 a 1; senza dati un valore di mezzo basso: meglio di uno sempre pieno, non di uno mai pieno. */
const quanto = (s: SlotRicorrente) => (s.affollamento && s.affollamento.osservate >= MINIMO_OSSERVATE ? s.affollamento.piene / s.affollamento.osservate : 0.3)

/** Quanto lo slot dista da quello della tappa, in minuti: un giorno vale ventiquattro ore. */
const distanza = (a: SlotRicorrente, b: SlotRicorrente) => Math.abs(a.giorno - b.giorno) * 24 * 60 + Math.abs((minutiDaOra(a.ora) ?? 0) - (minutiDaOra(b.ora) ?? 0))

/** La tappa-lezione che nascerebbe scegliendo uno slot. */
export function tappaDaSlot(s: SlotRicorrente, ordine: number): Tappa {
  return {
    giorno: s.giorno,
    ordine,
    tipo: 'lezione',
    minuti: s.minuti,
    ora: s.ora,
    ancora: null,
    posizione: null,
    perche: null,
    lezione: { class_type_id: s.class_type_id, nome: s.nome, categoria: s.categoria, scheda: s.scheda, compresa: s.compresa },
  }
}

/**
 * Le alternative a una tappa-lezione spesso al completo: slot del catalogo **che non lo sono** (o di cui non si sa
 * niente), che non si sovrappongono alle altre tappe, non sono gia' nel percorso, e restano fra quello che il
 * socio puo' fare:
 *   - **stessa**: lo stesso tipo di lezione, un altro giorno o un'altra ora;
 *   - **simile**: un altro tipo dello stesso genere, in una categoria compresa nel suo abbonamento (il catalogo
 *     ha gia' tolto le altre, salvo l'interruttore), che non ha scritto fra quelle che evita. In acqua solo la
 *     stessa categoria: il Nuoto Libero non si sostituisce con l'Aqua Fitness.
 * Prima le stesse, poi le simili; dentro, quelle meno spesso piene e poi le piu' vicine.
 *
 * **Il cardio agganciato alla lezione la segue**: si controlla dopo averlo rifatto (`ricalcolaAncorate`), come
 * fara' l'editor scegliendo l'alternativa; e se l'alternativa e' di un altro giorno il cardio resterebbe da solo,
 * quindi quelle non si propongono.
 */
export function alternativePerTappa(t: Tappa, catalogo: SlotRicorrente[], altre: Tappa[], evitate: string[], massimo = 2): Suggerimento[] {
  const mio = slotDiTappa(t, catalogo)
  if (!mio) return []
  const evita = (nome: string) => evitate.map((x) => x.trim().toLowerCase()).filter(Boolean).some((x) => nome.toLowerCase().includes(x))
  const gia = new Set(altre.map(idSlotDiTappa).filter(Boolean))
  const conCardio = altre.some((x) => x.tipo === 'cardio' && x.giorno === t.giorno && x.ancora === t.ordine)
  const prima = new Set(controllaTappe(altre))
  const trovate: (Suggerimento & { ordine: number[] })[] = []
  for (const s of catalogo) {
    if (s.id === mio.id || gia.has(s.id) || spessoCompleta(s.affollamento)) continue
    let tipo: 'stessa' | 'simile'
    if (s.class_type_id === mio.class_type_id) tipo = 'stessa'
    else if (mio.gruppo && s.gruppo === mio.gruppo && (mio.gruppo !== 'acqua' || s.categoria === mio.categoria) && (s.compresa !== false || mio.compresa === false) && !evita(s.nome)) tipo = 'simile'
    else continue
    if (conCardio && s.giorno !== t.giorno) continue
    // La tappa nuova prende il posto della vecchia: stesso `ordine` nello stesso giorno, cosi' le ancore la seguono.
    const nuova = tappaDaSlot(s, s.giorno === t.giorno ? t.ordine : 9999)
    if (controllaTappe(ricalcolaAncorate([...altre, nuova])).some((p) => !prima.has(p) && !/il cardio da solo/.test(p))) continue
    trovate.push({ slot: s, tipo, ordine: [tipo === 'stessa' ? 0 : 1, quanto(s), distanza(s, mio)] })
  }
  trovate.sort((a, b) => a.ordine[0] - b.ordine[0] || a.ordine[1] - b.ordine[1] || a.ordine[2] - b.ordine[2])
  return trovate.slice(0, massimo).map(({ slot, tipo }) => ({ slot, tipo }))
}
