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
