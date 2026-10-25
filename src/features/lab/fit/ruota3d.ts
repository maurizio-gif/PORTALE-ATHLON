// La matematica della ruota in 3D. **Pura**, senza React ne' Reanimated: si prova con
// `node --experimental-strip-types`. Le funzioni portano `'worklet'` perche' le chiama `useAnimatedStyle`
// (sul telefono gira sul thread dell'interfaccia); su web e in un test sono funzioni normali.
//
// Come e' fatta la scena. La ruota e' una pila di dischi piatti (la base, le pareti, la faccia: li disegna
// Ruota.tsx), tutti con la stessa matrice 4x4 con prospettiva, alzati lungo la normale del disco di `h`
// punti. Visto dall'alto, la pila da' spessore e un lato vicino. Tutto e' una funzione del tempo `s`
// (secondi dall'apertura): niente tween che riparte, quindi nessuno scatto, e fermare e riprendere
// l'orologio non lascia salti.
//
// **Simmetrica (25/10/2026, richiesta di Maurizio: «non gira in modo simmetrico»).** La prima versione
// (24/10) faceva respirare l'inclinazione, la faceva precedere di lato e variava la velocita': il disco
// non faceva la stessa cosa a destra e a sinistra. Ora l'inclinazione e' fissa e verticale (la scena e'
// uguale allo specchio, destra e sinistra), il giro e' a velocita' costante, e l'unico moto in piu' e' un
// battito che si ripete **tre volte a giro**, quanto le frecce: ogni 120 gradi la ruota e' identica a
// com'era (`PERIODO_S`). Provato: `proietta` allo specchio, e il periodo di un terzo di giro.
//
// Convenzioni: come CSS e come React Native, matrici a 16 numeri **per colonne** (la traslazione sta in
// 12, 13, 14; la prospettiva in 11), y verso il basso, z verso chi guarda, rotazioni positive in senso
// orario. L'origine e' il centro dello strato.

export type Mat = number[]

/** Una ruota intera, in secondi: abbastanza veloce da essere energica, abbastanza lenta da non stancare. */
export const GIRO_S = 9
/** Ogni quanti secondi la ruota torna identica: un terzo di giro, quanto le frecce. */
export const PERIODO_S = GIRO_S / 3
/** Da quanto lontano guarda l'occhio, in punti. Piu' e' piccolo, piu' la prospettiva e' forte. */
export const PROSPETTIVA = 520
/** L'inclinazione del disco, in gradi (0 = di fronte, 90 = di taglio). Fissa. */
export const INCLINAZIONE = 27
/** Quanto cresce e cala il battito (1,2% della grandezza). */
export const BATTITO = 0.012
/** Quanto dura l'arrivo della ruota (si assesta), in secondi. */
export const ARRIVO_S = 1.4
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

/** Scala e sposta **dopo** la prospettiva (sullo schermo): la ruota intera, che respira e arriva da sotto. */
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
  /** Giro del disco su se' stesso (rotZ), radianti, sempre crescente e a velocita' costante. */
  giro: number
  /** Di quanto la ruota e' sotto il suo posto, in punti: positivo solo durante l'arrivo. */
  quota: number
  /** La grandezza della ruota intera (1 = a riposo; piu' piccola all'arrivo, con il battito sopra). */
  scala: number
  /** Da 0 (appena comparsa) a 1 (assestata). */
  arrivo: number
}

export type Scena = Posa & {
  /** La matrice del disco (strato a quota 0): inclinazione, giro, prospettiva, battito, arrivo. */
  m: Mat
}

/**
 * La posa a `s` secondi dall'apertura. Giro: costante, un giro ogni GIRO_S. Inclinazione: fissa. Battito:
 * tre per giro (1,2%). All'arrivo la ruota parte piu' inclinata, piu' piccola e piu' bassa, gira in piu'
 * di un tratto che si spegne, e si assesta in ARRIVO_S secondi: dopo, e' in posa e il solo moto e' il giro.
 */
export function posaDa(s: number): Posa {
  'worklet'
  const e = arrivo(s)
  const r = 1 - e
  // Il giro in piu' dell'arrivo cresce e rallenta (in senso orario, come le frecce): mai all'indietro.
  const giro = ((360 * s) / GIRO_S + (1 - r * r) * 150) * RAD
  const inclina = (INCLINAZIONE + r * 34) * RAD
  const battito = 1 + BATTITO * e * Math.sin((DUE_PI * s) / PERIODO_S)
  return { inclina, giro, quota: -10 * r, scala: (0.88 + 0.12 * e) * battito, arrivo: e }
}

/** La matrice di una posa: M = schermo · prospettiva · rotX · rotZ. */
export function matriceDa(p: Posa): Mat {
  'worklet'
  return moltiplica(sulloSchermo(p.scala, -p.quota), moltiplica(prospettiva(PROSPETTIVA), moltiplica(rotX(p.inclina), rotZ(p.giro))))
}

export function scenaDa(s: number): Scena {
  'worklet'
  const p = posaDa(s)
  return { inclina: p.inclina, giro: p.giro, quota: p.quota, scala: p.scala, arrivo: p.arrivo, m: matriceDa(p) }
}

// ---------------------------------------------------------------------------
// Colori (si calcolano una volta sola, fuori dalle animazioni)

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
 * Il colore della parete numero `k` di `n`: dal fondo, il colore scurito del 62%, fino a quella sotto la
 * faccia, scurita del 14%. La luce arriva dall'alto, quindi i fianchi sono in ombra.
 */
export function coloreParete(colore: string, k: number, n: number): string {
  const t = n > 1 ? k / (n - 1) : 1
  return mescola(mescola(colore, '#000000', 0.62), mescola(colore, '#000000', 0.14), t)
}
