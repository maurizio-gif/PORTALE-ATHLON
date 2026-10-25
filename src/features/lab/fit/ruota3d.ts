// La matematica della ruota in 3D (24/10/2026, richiesta di Maurizio: «un'animazione piu' fluida e
// tridimensionale»). **Pura**, senza React ne' Reanimated: si prova con `node --experimental-strip-types`.
// Le funzioni portano `'worklet'` perche' le chiama `useAnimatedStyle` (sul telefono gira sul thread
// dell'interfaccia); su web e in un test sono funzioni normali.
//
// Come e' fatta la scena. Ogni freccia e' un tubo: una pila di strati identici (`ruota3d` non li disegna,
// lo fa Ruota.tsx), ognuno piu' stretto e piu' chiaro di quello sotto, come le curve di livello di una
// cupola. Ogni strato e' un disco piatto a cui si da' una **matrice 4x4 con la prospettiva**: stessa
// inclinazione per tutti, ma alzato lungo la normale del disco di `h` punti. Visto dall'alto, la pila
// da' spessore, il lato vicino, il lato lontano e l'ombra che si riempie. Niente nasce da un tween che
// riparte: tutto e' una funzione del tempo `s` (secondi dall'apertura), quindi nessuno scatto al giro,
// nessun passaggio brusco se l'app rallenta, e fermare e riprendere l'orologio non lascia salti.
//
// Convenzioni: come CSS e come React Native, matrici a 16 numeri **per colonne** (la traslazione sta in
// 12, 13, 14; la prospettiva in 11), y verso il basso, z verso chi guarda, rotazioni positive in senso
// orario. L'origine e' il centro dello strato.

export type Mat = number[]

/** Una ruota intera, in secondi: lenta, si nota senza distrarre. */
export const GIRO_S = 24
/** Da quanto lontano guarda l'occhio, in punti. Piu' e' piccolo, piu' la prospettiva e' forte. */
export const PROSPETTIVA = 560
/** Altezza del dorso della freccia sopra il piano del disco, in punti. */
export const ALTEZZA = 11
/** L'inclinazione di riposo del disco, in gradi (0 = di fronte, 90 = di taglio). */
export const INCLINAZIONE = 31
/** Quanto dura l'arrivo della ruota (la ruota «atterra» e si assesta), in secondi. */
export const ARRIVO_S = 1.7
/** Un istante qualunque dopo l'arrivo: la posa della ruota ferma («riduci movimento»). */
export const POSA_FERMA_S = 4.2

const RAD = Math.PI / 180
const DUE_PI = Math.PI * 2

const limita = (x: number, a: number, b: number) => {
  'worklet'
  return x < a ? a : x > b ? b : x
}

/** L'arrivo: 0 -> 1 in ARRIVO_S, rallentando verso la fine (ease-out cubico). */
export function arrivo(s: number): number {
  'worklet'
  const x = limita(s / ARRIVO_S, 0, 1)
  return 1 - (1 - x) * (1 - x) * (1 - x)
}

// ---------------------------------------------------------------------------
// Matrici 4x4, per colonne

/** a · b. */
export function moltiplica(a: Mat, b: Mat): Mat {
  'worklet'
  const o: number[] = new Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
    }
  }
  return o
}

export function rotX(a: number): Mat {
  'worklet'
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]
}

export function rotY(a: number): Mat {
  'worklet'
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]
}

export function rotZ(a: number): Mat {
  'worklet'
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

/** La prospettiva di CSS `perspective(d)`: w = 1 - z/d. */
export function prospettiva(d: number): Mat {
  'worklet'
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / d, 0, 0, 0, 1]
}

/** Scala e sposta **dopo** la prospettiva (sullo schermo): la ruota intera, che respira e galleggia. */
export function sulloSchermo(k: number, ty: number): Mat {
  'worklet'
  return [k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1, 0, 0, ty, 0, 1]
}

/** Alza uno strato di `h` punti lungo la normale del disco: M · Tz(h). Costa quattro somme. */
export function alzata(m: Mat, h: number): Mat {
  'worklet'
  return [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], m[12] + h * m[8], m[13] + h * m[9], m[14] + h * m[10], m[15] + h * m[11]]
}

/**
 * Dove cade sullo schermo il punto (x, y, z) del disco (x e y dal centro, z lungo la normale), con la
 * matrice del disco: `[x, y, ingrandimento]`. L'ingrandimento e' quello della prospettiva (piu' vicino,
 * piu' grande): serve alle etichette, che restano diritte ma si ingrandiscono e rimpiccioliscono.
 */
export function proietta(m: Mat, x: number, y: number, z: number): [number, number, number] {
  'worklet'
  const w = m[3] * x + m[7] * y + m[11] * z + m[15]
  return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, 1 / w]
}

// ---------------------------------------------------------------------------
// La posa della ruota a un dato istante

export type Posa = {
  /** Inclinazione del disco (rotX), radianti. */
  inclina: number
  /** Rotazione intorno all'asse verticale (rotY), radianti: la precessione. */
  volta: number
  /** Giro del disco su se' stesso (rotZ), radianti, sempre crescente. */
  giro: number
  /** Quanto e' alta la ruota sopra il suo piano d'appoggio, in punti (per l'ombra): negativa all'arrivo. */
  quota: number
  /** Il respiro della ruota intera (1 = a riposo; piu' piccola all'arrivo). */
  scala: number
  /** Da 0 (appena comparsa) a 1 (assestata). */
  arrivo: number
}

export type Scena = Posa & {
  /** La matrice del disco (strato a quota 0): inclinazione, giro, prospettiva, respiro, quota. */
  m: Mat
}

/**
 * Gli angoli a `s` secondi dall'apertura. Rotazione: un giro ogni 24 s con un **respiro di velocita'**
 * (la ruota non gira come un motorino: rallenta e riprende, +-26% in otto secondi, mai all'indietro).
 * Inclinazione: respira fra 21 e 40 gradi e **precede** (il polo del disco gira in un'ellisse in 13 s,
 * poi una seconda onda piu' lenta e con un altro periodo, cosi' il moto non si ripete uguale). Quota:
 * galleggia di 3 punti. All'arrivo la ruota parte piu' inclinata, piu' bassa, piu' piccola e gira piu'
 * in fretta, e si assesta in ARRIVO_S secondi.
 */
export function posaDa(s: number): Posa {
  'worklet'
  const e = arrivo(s)
  const r = 1 - e
  const fase = (s / 13) * DUE_PI
  const inclina = (INCLINAZIONE + 6.5 * Math.sin(fase) + 2.4 * Math.sin((s / 7.3) * DUE_PI + 1.3) + r * 30) * RAD
  const volta = (12 * Math.cos(fase) + 3 * Math.sin((s / 9.1) * DUE_PI)) * RAD
  // Il giro in piu' dell'arrivo cresce e rallenta (in senso orario, come le frecce): all'inizio
  // spinge a ~500 gradi al secondo e si spegne in ARRIVO_S. Mai all'indietro.
  const giro = ((360 * s) / GIRO_S + 5 * Math.sin((s / 8) * DUE_PI) + (1 - r * r) * 150) * RAD
  const quota = 3.2 * Math.sin((s / 5.5) * DUE_PI) - 12 * r
  const scala = (0.9 + 0.1 * e) * (1 + 0.006 * Math.sin((s / 4.6) * DUE_PI + 0.7))
  return { inclina, volta, giro, quota, scala, arrivo: e }
}

/** La matrice di una posa: M = schermo · prospettiva · rotX · rotY · rotZ. */
export function matriceDa(p: Posa): Mat {
  'worklet'
  return moltiplica(sulloSchermo(p.scala, -p.quota), moltiplica(prospettiva(PROSPETTIVA), moltiplica(rotX(p.inclina), moltiplica(rotY(p.volta), rotZ(p.giro)))))
}

export function scenaDa(s: number): Scena {
  'worklet'
  const p = posaDa(s)
  return { inclina: p.inclina, volta: p.volta, giro: p.giro, quota: p.quota, scala: p.scala, arrivo: p.arrivo, m: matriceDa(p) }
}

/** La matrice di riposo (disco inclinato, senza giro, senza respiro): il punto da cui si misura il parallasse. */
export const RIPOSO: Mat = moltiplica(prospettiva(PROSPETTIVA), rotX(INCLINAZIONE * RAD))

// ---------------------------------------------------------------------------
// Gli strati del tubo

/**
 * Lo strato `k` di `n`. `u` e' la quota sul profilo di un cilindro (da -0.8, il fianco in basso, a 0.93,
 * il dorso): la larghezza del tubo a quella quota e' `f = sqrt(1 - u²)`, come in una sezione circolare.
 * `t` va da 0 (in fondo) a 1 (in cima) e dice quanto e' illuminato.
 */
export function profilo(k: number, n: number): { u: number; h: number; f: number; t: number } {
  const t = n > 1 ? k / (n - 1) : 1
  const u = -0.8 + (0.93 + 0.8) * t
  return { u, h: u * ALTEZZA, f: Math.sqrt(1 - u * u), t }
}

const esadecimale = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const aEsadecimale = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((x) => Math.round(limita(x, 0, 255)).toString(16).padStart(2, '0')).join('')

/** Un colore fra `a` e `b` (`#RRGGBB`), con `t` da 0 a 1. */
export function mescola(a: string, b: string, t: number): string {
  const [ar, ag, ab] = esadecimale(a)
  const [br, bg, bb] = esadecimale(b)
  return aEsadecimale(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

/**
 * Il colore di uno strato. Dall'alto si vede soprattutto il dorso, e deve restare il colore del brand:
 * da `t` = 0.74 in giu' c'e' il colore pieno, sopra solo un lampo di luce (24% di bianco in cima), e
 * verso il fondo il colore si scurisce come il fianco di un tubo in ombra (fino al 62% di nero).
 */
export function coloreStrato(colore: string, t: number): string {
  const PIENO = 0.74
  if (t <= PIENO) return mescola(mescola(colore, '#000000', 0.62), colore, Math.pow(t / PIENO, 0.9))
  return mescola(colore, '#FFFFFF', 0.24 * Math.pow((t - PIENO) / (1 - PIENO), 1.1))
}
