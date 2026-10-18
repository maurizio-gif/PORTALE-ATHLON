// Gli aiuti del tempo per l'avvio animato (Avvio.tsx): ogni cosa che si muove e' una funzione
// pura del tempo `t` (in millisecondi dall'inizio), cosi' la stessa animazione si puo' guardare
// a qualunque istante senza stato nascosto.

export const limita = (x: number, minimo = 0, massimo = 1) => Math.min(massimo, Math.max(minimo, x))

/** Quanto e' avanzato un movimento che parte a `inizio` e dura `durata`: da 0 a 1. */
export const fase = (t: number, inizio: number, durata: number) => limita((t - inizio) / durata)

/** Parte veloce e rallenta (ease-out cubico). */
export const rallenta = (x: number) => 1 - Math.pow(1 - x, 3)

/** Come `rallenta` ma piu' netto: per le cose che «scattano». */
export const scatta = (x: number) => 1 - Math.pow(1 - x, 5)

/** Supera il traguardo e torna indietro (ease-out-back): le cose che si incastrano. */
export const rimbalzo = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** Un picco attorno a `centro`, largo `larghezza` ms: da 0 a 1 e di nuovo a 0 (un battito, un lampo). */
export const impulso = (t: number, centro: number, larghezza: number) => Math.exp(-Math.pow((t - centro) / larghezza, 2))

/** Un generatore di numeri a caso sempre uguale a ogni partenza: scintille e polvere stanno dove devono, senza sorprese. */
export function casuale(seme: number): () => number {
  let s = seme >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Un colore fra due (esadecimali #RRGGBB), a `x` da 0 a 1. */
export function mescola(da: string, a: string, x: number): string {
  const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [r1, g1, b1] = c(da)
  const [r2, g2, b2] = c(a)
  const m = (u: number, v: number) => Math.round(u + (v - u) * x)
  return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`
}
