import type { BozzaScheda } from '@/api/lab'

// Il piano letto da un file o scritto dall'agente AI passa dalla schermata che lo produce (`Importa.tsx`,
// `Agente.tsx`) all'editor (19/10/2026): sta qui, in memoria, e mai sul disco. Si legge senza svuotarla (React in
// sviluppo monta due volte) e si butta quando il piano e' salvato o una nuova richiesta ricomincia.

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
