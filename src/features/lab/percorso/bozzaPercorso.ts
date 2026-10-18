import type { PercorsoBozza, SchedeLezioni } from '@/api/percorso'

// Il percorso che il tutor ha composto (o che il socio sta modificando) passa dalla schermata che lo produce
// (`Questionario.tsx`, o «Modifica» del percorso salvato) all'editor (`EditorPercorso.tsx`): sta qui, in
// memoria, e mai sul disco, come la bozza di un piano (`schede/bozza.ts`). Si legge senza svuotarla (React in
// sviluppo monta due volte) e si butta quando il percorso e' salvato o una nuova richiesta ricomincia.
//
// **Il questionario non passa di qui**: le limitazioni sono dati sulla salute, restano nello stato della
// schermata che le ha chieste e arrivano al tutor, e basta.

export type BozzaInMemoria = {
  bozza: PercorsoBozza
  /** Le schede delle lezioni usate (barre, descrizione): servono agli effetti, che si ricalcolano mentre si modifica. */
  schede: SchedeLezioni
  /** Cosa il tutor ha dovuto allargare o non ha trovato: si dice sopra l'editor. */
  avvisi: string[]
  /** `tutor`: scritta adesso dal tutor, non e' ancora di nessuno; `modifica`: il percorso salvato, che si cambia. */
  modo: 'tutor' | 'modifica'
}

let corrente: BozzaInMemoria | null = null

export function mettiBozzaPercorso(b: BozzaInMemoria) {
  corrente = b
}

export function leggiBozzaPercorso(): BozzaInMemoria | null {
  return corrente
}

export function scartaBozzaPercorso() {
  corrente = null
}
