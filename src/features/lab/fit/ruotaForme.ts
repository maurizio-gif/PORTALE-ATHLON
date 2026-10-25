// La forma delle frecce della ruota (25/10/2026, richiesta di Maurizio: «piu' moderno ed energico»).
// **Pura**, senza React ne' SVG: si prova con `node --experimental-strip-types`.
//
// Ogni freccia e' una cometa: la coda comincia sottile e sfuma nel nulla, il corpo si allarga fino
// alla testa e la testa e' una punta netta, piu' larga del corpo (le alette). La direzione del moto si
// legge da sola, perche' la coda sta dietro e la punta davanti. Il disegno e' un solo poligono per
// freccia (niente pezzi da cucire: nessuna cucitura quando lo si sfuma), e la sfumatura la da' un
// gradiente lineare lungo la corda dell'arco (`catena`), che per un arco di meno di 180 gradi
// cresce sempre dalla coda alla testa.
//
// Gli angoli sono in gradi, 0 in alto e in senso orario, come nel resto della ruota.

export type Punto = readonly [number, number]

export type OpzioniFreccia = {
  /** Il centro della ruota (il disegno e' quadrato: centro, centro). */
  centro: number
  /** Il raggio dell'asse della freccia. */
  raggio: number
  /** La larghezza piena del corpo, vicino alla testa. */
  larghezza: number
  /** La larghezza all'inizio della coda, in parti della piena (0..1). */
  coda: number
  /** Dove comincia la coda. */
  da: number
  /** Dove sta la punta. */
  a: number
  /** Quanti gradi occupa la testa. */
  testa: number
  /** Quanto la testa e' piu' larga del corpo (1 = uguale). */
  alette: number
  /** Quanti tratti ha ogni lato del corpo (piu' tratti, curva piu' liscia). */
  campioni?: number
}

export type Freccia = {
  /** Il poligono pieno della freccia, per `<Path d>`. */
  corpo: string
  /** L'asse (arco di cerchio, dalla coda alla base della testa), per contorni e luci. */
  asse: string
  /** La corda dell'asse: da dove a dove va il gradiente. */
  catena: { x1: number; y1: number; x2: number; y2: number }
  /** La punta. */
  punta: Punto
  /** Dove finisce il corpo e comincia la testa, in gradi. */
  base: number
  /** I vertici del poligono, per le prove. */
  vertici: Punto[]
}

const RAD = Math.PI / 180

/** Il punto a `gradi` (0 in alto, in senso orario) sul cerchio di raggio `r` intorno a `centro`. */
export function puntoSuCerchio(centro: number, r: number, gradi: number): Punto {
  const a = (gradi - 90) * RAD
  return [centro + r * Math.cos(a), centro + r * Math.sin(a)]
}

/** Quanto e' larga la freccia a `u` (0 = inizio coda, 1 = base della testa), in parti della larghezza piena. */
export function profiloCoda(u: number, coda: number): number {
  const x = u < 0 ? 0 : u > 1 ? 1 : u
  // Cresce in fretta all'inizio e si assesta: la coda e' una punta che si apre, non un cuneo rigido.
  return coda + (1 - coda) * (1 - Math.pow(1 - x, 1.6))
}

const n2 = (x: number) => x.toFixed(2)

/** Un arco di cerchio da `da` ad `a` gradi (in senso orario), per `<Path d>`: aloni, riflessi, tracce. */
export function arco(centro: number, raggio: number, da: number, a: number): string {
  const [x0, y0] = puntoSuCerchio(centro, raggio, da)
  const [x1, y1] = puntoSuCerchio(centro, raggio, a)
  return `M ${n2(x0)} ${n2(y0)} A ${n2(raggio)} ${n2(raggio)} 0 ${a - da > 180 ? 1 : 0} 1 ${n2(x1)} ${n2(y1)}`
}

export function costruisciFreccia(o: OpzioniFreccia): Freccia {
  const N = o.campioni ?? 26
  const base = o.a - o.testa
  const lungo = base - o.da
  const sopra: Punto[] = []
  const sotto: Punto[] = []
  for (let k = 0; k <= N; k++) {
    const u = k / N
    const g = o.da + lungo * u
    const mezza = 0.5 * o.larghezza * profiloCoda(u, o.coda)
    sopra.push(puntoSuCerchio(o.centro, o.raggio + mezza, g))
    sotto.push(puntoSuCerchio(o.centro, o.raggio - mezza, g))
  }
  const ala = 0.5 * o.larghezza * o.alette
  const alaFuori = puntoSuCerchio(o.centro, o.raggio + ala, base)
  const punta = puntoSuCerchio(o.centro, o.raggio, o.a)
  const alaDentro = puntoSuCerchio(o.centro, o.raggio - ala, base)
  const vertici: Punto[] = [...sopra, alaFuori, punta, alaDentro, ...sotto.slice().reverse()]
  const corpo = vertici.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${n2(x)} ${n2(y)}`).join(' ') + ' Z'
  const [x0, y0] = puntoSuCerchio(o.centro, o.raggio, o.da)
  const [x1, y1] = puntoSuCerchio(o.centro, o.raggio, base)
  const asse = arco(o.centro, o.raggio, o.da, base)
  return { corpo, asse, catena: { x1: x0, y1: y0, x2: x1, y2: y1 }, punta, base, vertici }
}
