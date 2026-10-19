// Il ritaglio quadrato della foto del Profilo (20/10/2026), senza nient'altro: e' una funzione pura, e si prova da
// Node (`node --experimental-strip-types`) senza il browser. Chi lo usa e' `fotoProfilo.ts`.

/**
 * Il quadrato da ritagliare da una foto `larghezza × altezza`: il lato corto per intero, e lungo l'altro lato la
 * posizione degli avatar del Profilo (`contentPosition: 30%`): una foto in piedi si ritaglia sopra il centro, una per
 * traverso al centro. Una foto gia' quadrata non si tocca.
 */
export function ritaglioQuadrato(larghezza: number, altezza: number, fuoco = 0.3): { x: number; y: number; lato: number } {
  const lato = Math.min(larghezza, altezza)
  return {
    lato,
    x: larghezza > altezza ? Math.round((larghezza - lato) / 2) : 0,
    y: altezza > larghezza ? Math.round((altezza - lato) * fuoco) : 0,
  }
}
