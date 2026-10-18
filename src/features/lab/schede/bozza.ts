import type { BozzaScheda } from '@/api/lab'

// La scheda letta da un file passa dalla schermata dell'importazione all'editor (19/10/2026): sta qui, in
// memoria, e mai sul disco. Si legge senza svuotarla (React in sviluppo monta due volte) e si butta quando la
// scheda e' salvata o l'importazione ricomincia.

let corrente: BozzaScheda | null = null

export function mettiBozza(b: BozzaScheda) {
  corrente = b
}

export function leggiBozza(): BozzaScheda | null {
  return corrente
}

export function scartaBozza() {
  corrente = null
}
