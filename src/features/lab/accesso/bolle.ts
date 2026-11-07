// Le bolle dell'apertura dell'accesso (07/11/2026): la fisica, senza React e senza React Native, cosi' si prova con
// `node --experimental-strip-types` (come `lib/totem.ts`). Il disegno sta in `Bolle.tsx`.
//
// Ogni bolla e' una molla verso il suo posto di riposo (`hx`, `hy`), il dito o il mouse la scosta, e fra loro non si
// sovrappongono. Le unita' sono i pixel dello schermo; i raggi in `DEFINIZIONI` valgono a 390 px di larghezza e si
// scalano con `unita()`.

export type Forma = 'etichetta' | 'vuota' | 'nuoto' | 'pesi' | 'yoga' | 'spinning' | 'junior' | 'calendario' | 'cuore' | 'tessera' | 'fulmine'
export type Tono = 'fuoco' | 'mare' | 'bianco'

export type Bolla = {
  indice: number
  forma: Forma
  tono: Tono | null
  /** Il raggio a 390 px, prima di `unita()`. */
  r: number
  /** Il posto di riposo come scostamento dal centro dell'ammasso, da -1 a 1. */
  ox: number
  oy: number
  /** Il posto di riposo in pixel (`disposizione`). */
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  /** La scala: 0 prima di comparire, 1 a riposo, un poco di piu' nello scoppio. */
  s: number
  /** Lo sfasamento del galleggiamento. */
  f: number
  /** Quanto aspetta, in secondi, prima di comparire. */
  ritardo: number
}

export type Misure = {
  larghezza: number
  altezza: number
  /** Schermo largo (da `LARGO`, 900 px): testi a sinistra, bolle a destra. */
  largo: boolean
}

export type Puntatore = { x: number; y: number; attivo: boolean }

// La prima e' quella con la scritta al centro; poi le attivita' e le funzioni dell'app; infine le bolle vuote, piccole.
export const DEFINIZIONI: { forma: Forma; r: number; tono: Tono | null }[] = [
  { forma: 'etichetta', r: 40, tono: null },
  { forma: 'nuoto', r: 35, tono: 'mare' },
  { forma: 'pesi', r: 30, tono: 'fuoco' },
  { forma: 'yoga', r: 27, tono: 'bianco' },
  { forma: 'spinning', r: 31, tono: 'fuoco' },
  { forma: 'junior', r: 26, tono: 'bianco' },
  { forma: 'calendario', r: 29, tono: 'mare' },
  { forma: 'cuore', r: 24, tono: 'fuoco' },
  { forma: 'tessera', r: 25, tono: 'bianco' },
  { forma: 'fulmine', r: 22, tono: 'fuoco' },
  ...[17, 13, 11, 9, 15, 10, 8, 12, 7, 14].map((r) => ({ forma: 'vuota' as const, r, tono: null })),
]

/** La molla e lo smorzamento: periodo di circa un secondo e mezzo, con un piccolo rimbalzo. */
const K = 16
const C = 6
/** Quanto forte il dito scosta una bolla, e da che distanza (a 390 px). */
const SPINTA = 3200
const RAGGIO_DITO = 88
/** Quanto possono entrare l'una nell'altra: quasi per niente. */
const CONTATTO = 0.97

/** Un generatore di numeri sempre uguale a ogni apertura (mulberry32): la schermata si compone allo stesso modo per tutti. */
export function seme(s: number): () => number {
  let a = s | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function creaBolle(): Bolla[] {
  const rnd = seme(7)
  const n = DEFINIZIONI.length
  return DEFINIZIONI.map((d, i) => {
    // La spirale d'oro: le bolle si distribuiscono in un ammasso largo, senza file ne' buchi.
    const a = i * 2.39996 + (i === 0 ? 0 : (rnd() - 0.5) * 0.5)
    const q = i === 0 ? 0 : Math.sqrt(i / (n - 1))
    return {
      indice: i,
      forma: d.forma,
      tono: d.tono,
      r: d.r,
      ox: Math.cos(a) * q,
      oy: Math.sin(a) * q,
      hx: 0,
      hy: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      s: 0,
      f: rnd() * 6.28,
      ritardo: i * 0.035,
    }
  })
}

/** La scala del disegno: sul telefono segue la larghezza (fino a 430 px) e, sugli schermi bassi, anche l'altezza; sul computer e' fissa. */
export function unita(m: Misure): number {
  if (m.largo) return 1.45
  const dallaAltezza = Math.min(1, Math.max(0.7, m.altezza / 760))
  return (Math.min(m.larghezza, 430) / 390) * 1.2 * dallaAltezza
}

/** I posti di riposo. Sul telefono l'ammasso sta fra il sottotitolo e il pulsante; sul computer, nella colonna di destra. */
export function disposizione(bolle: Bolla[], m: Misure): void {
  let cx: number, cy: number, rx: number, ry: number
  if (m.largo) {
    cx = m.larghezza * 0.72
    cy = m.altezza * 0.5
    rx = Math.min(m.larghezza * 0.24, 400)
    ry = Math.min(m.altezza * 0.34, 300)
  } else {
    cx = m.larghezza * 0.5
    cy = m.altezza * 0.585
    rx = m.larghezza * 0.34 * 1.12
    ry = m.altezza * 0.165 * 1.28
  }
  for (const b of bolle) {
    b.hx = cx + b.ox * rx
    b.hy = cy + b.oy * ry
  }
}

/** Tutte a riposo, ferme e della scala giusta: per chi chiede meno movimento, e dopo un ridimensionamento. */
export function aRiposo(bolle: Bolla[]): void {
  for (const b of bolle) {
    b.x = b.hx
    b.y = b.hy
    b.vx = 0
    b.vy = 0
    b.s = 1
  }
}

/** Lo scoppio dell'apertura: partono tutte dal basso, al centro, e salgono ognuna al suo posto. */
export function scoppio(bolle: Bolla[], m: Misure, rnd: () => number): void {
  const u = unita(m)
  for (const b of bolle) {
    b.x = m.larghezza * 0.5 + (rnd() - 0.5) * 40 * u
    b.y = m.altezza * 0.9
    b.vx = (rnd() - 0.5) * 520 * u
    b.vy = -(520 + rnd() * 520) * u
    b.s = 0
  }
}

/** Entra con un piccolo rimbalzo (easeOutBack ammorbidito). */
export function scalaDiEntrata(q: number): number {
  if (q <= 0) return 0
  if (q >= 1) return 1
  const x = q - 1
  return 1 + 2.2 * x * x * x + 1.2 * x * x
}

/**
 * Un passo di `dt` secondi (al massimo un trentesimo: se il telefono si blocca un attimo, le bolle non esplodono).
 * `t` e' il tempo dall'apertura, in secondi. Con `fermo` («riduci movimento») non si muove niente: il posto di riposo e basta.
 */
export function passo(bolle: Bolla[], m: Misure, t: number, dt: number, dito: Puntatore, fermo: boolean): void {
  if (fermo) {
    aRiposo(bolle)
    return
  }
  const u = unita(m)
  const d0 = Math.min(0.033, Math.max(0, dt))
  for (const b of bolle) {
    const ondaX = Math.sin(t * 0.7 + b.f) * 7 * u
    const ondaY = Math.cos(t * 0.55 + b.f * 1.3) * 9 * u
    let ax = (b.hx + ondaX - b.x) * K - b.vx * C
    let ay = (b.hy + ondaY - b.y) * K - b.vy * C
    if (dito.attivo) {
      const dx = b.x - dito.x
      const dy = b.y - dito.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const R = (RAGGIO_DITO + b.r) * u
      if (d < R && d > 0.001) {
        const f = 1 - d / R
        ax += (dx / d) * f * f * SPINTA * u
        ay += (dy / d) * f * f * SPINTA * u
      }
    }
    b.vx += ax * d0
    b.vy += ay * d0
    b.x += b.vx * d0
    b.y += b.vy * d0
    b.s = scalaDiEntrata((t - b.ritardo) / 0.7)
  }
  // Fra loro non si sovrappongono: ognuna si sposta di meta' dell'incavo.
  const n = bolle.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = bolle[i]
      const c = bolle[j]
      const dx = c.x - a.x
      const dy = c.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const minimo = (a.r + c.r) * u * CONTATTO
      if (d < minimo && d > 0.001) {
        const mezzo = (minimo - d) / 2
        const nx = dx / d
        const ny = dy / d
        a.x -= nx * mezzo
        a.y -= ny * mezzo
        c.x += nx * mezzo
        c.y += ny * mezzo
      }
    }
  }
  // Ai lati non escono dallo schermo.
  for (const b of bolle) {
    const rr = b.r * u * 0.4
    if (b.x < rr) {
      b.x = rr
      b.vx = Math.abs(b.vx) * 0.5
    }
    if (b.x > m.larghezza - rr) {
      b.x = m.larghezza - rr
      b.vx = -Math.abs(b.vx) * 0.5
    }
  }
}

/** Le tre parole della bolla centrale, e quanto e' visibile ognuna al tempo `t` (dissolvenza incrociata, 2,4 s a parola). */
export function visibilitaParola(t: number, k: number, parole: number): number {
  const fase = (t / 2.4) % parole
  let d = Math.abs(fase - (k + 0.5))
  d = Math.min(d, parole - d)
  return Math.max(0, Math.min(1, (0.6 - d) / 0.2))
}
