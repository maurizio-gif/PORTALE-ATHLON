import { fase, rallenta } from '../avvio/tempi'

// L'animazione di Pacman sul codice di accesso (07/11/2026, da un video di riferimento «OTP animation»): quando il codice e' completo
// Pacman compare sulla prima casella e le mangia una a una, da sinistra a destra, mentre l'app verifica il codice; se il codice e'
// giusto chiude la bocca, diventa un cerchio verde, va al centro e si disegna la spunta, con un anello e qualche scintilla.
//
// **Questo file e' fisica e geometria pure** (niente React, come `avvio/tempi.ts` e `lib/totem.ts`): ogni cosa e' una funzione del tempo
// `ms` (da quando e' partita la verifica) e di `okAt` (a che punto il server ha detto «si'»), cosi' si prova a qualunque istante.
// `CodicePacman.tsx` ci mette l'orologio e il disegno.
//
// Le tappe, in ms dall'inizio della verifica:
//    0-140   Pacman compare sulla prima casella (cresce da 0)
//   60-...   corre fino all'ultima, `perCasella` ms per casella; le caselle si dissolvono al suo passaggio
//   dopo     se il server non ha ancora risposto, resta sull'ultima casella a masticare e a «pulsare»
// E, dal momento in cui il server dice «si'» (ma mai prima che Pacman sia arrivato), con `u` ms dall'inizio:
//    0-200   la bocca si chiude e il colore passa dall'arancio al verde
//  100-450   il cerchio va al centro della riga e si ingrandisce
//  280-560   la spunta si disegna
//  300-850   l'anello si apre e le scintilla volano via
//      650   «fatto»: si puo' entrare (il resto della dissolvenza lo copre l'app che si apre)
//
// **Costo**: da quando il codice e' completo all'ingresso passano almeno `corsa + pausa + fatto` ≈ 550 + 60 + 650 ≈ 1,3 s con otto cifre,
// anche se il server risponde in un attimo. Le costanti sono qui sotto: per accorciare, `perCasella` e `fatto`.

export const TEMPI = {
  appare: 140,
  parte: 60,
  perCasella: 70,
  pausa: 60,
  chiude: 200,
  volaDa: 100,
  vola: 350,
  spuntaDa: 280,
  spunta: 280,
  festaDa: 300,
  anello: 500,
  scintille: 550,
  fatto: 650,
} as const

/** Il rettangolo di una casella nella riga (le coordinate di `onLayout`). */
export type Misura = { x: number; w: number; h: number }

export type Scintilla = { dx: number; dy: number; dimensione: number; quadrata: boolean; tono: 0 | 1 | 2; giro: number }

export type Scena = {
  /** Pacman (e poi il cerchio verde) si disegna? Falso finche' le caselle non sono misurate. */
  visibile: boolean
  /** Il centro, nelle coordinate della riga (y = meta' dell'altezza delle caselle). */
  x: number
  y: number
  /** Il raggio, gia' moltiplicato per la comparsa e per il «pulsare» dell'attesa. */
  r: number
  /** Mezza apertura della bocca, in radianti: 0 = cerchio intero. */
  mezza: number
  /** 0 = arancio, 1 = verde. */
  verde: number
  /** Quanto della spunta e' disegnato, da 0 a 1. */
  spunta: number
  /** L'anello: da 0 a 1 (0 = non c'e' ancora, 1 = svanito). */
  anello: number
  /** Le scintille: da 0 a 1 (0 = non sono partite, 1 = svanite). */
  scintille: number
  /** Per ogni casella: 0 = intera, 1 = mangiata. */
  mangiata: number[]
  /** Ms dall'inizio del «si'» (cioe' dalla chiusura della bocca), o null se il server non ha ancora risposto. */
  u: number | null
  /** La spunta e' al suo posto: l'app puo' entrare. */
  fatto: boolean
}

/** Il momento in cui Pacman arriva all'ultima casella, in ms dall'inizio. */
export function fineCorsa(n: number): number {
  return TEMPI.parte + TEMPI.perCasella * Math.max(0, n - 1)
}

/** Mezza apertura della bocca mentre mastica: da circa 5 a circa 35 gradi, a 4 battiti al secondo. */
export function bocca(ms: number): number {
  return 0.09 + 0.52 * (0.5 - 0.5 * Math.cos((ms * 2 * Math.PI) / 230))
}

/** Le scintille: posizione finale (rispetto al centro), grandezza e forma. Fisse, cosi' la festa e' sempre uguale (come le bolle dell'accesso). */
export const SCINTILLE: Scintilla[] = Array.from({ length: 16 }, (_, i) => {
  // Un generatore con seme fisso: nessun Math.random (la scena deve essere funzione del tempo).
  const a = Math.sin((i + 1) * 12.9898) * 43758.5453
  const b = Math.sin((i + 1) * 78.233) * 12345.6789
  const ca = a - Math.floor(a)
  const cb = b - Math.floor(b)
  const angolo = (i / 16) * Math.PI * 2 + (ca - 0.5) * 0.35
  const distanza = 30 + cb * 30
  return {
    dx: Math.cos(angolo) * distanza,
    dy: Math.sin(angolo) * distanza,
    dimensione: 2 + ca * 2.6,
    quadrata: i % 3 === 1,
    tono: (i % 3) as 0 | 1 | 2,
    giro: (cb - 0.5) * 120,
  }
})

/** La lunghezza della spunta disegnata con `spuntaPercorso` (serve al tratteggio che la «disegna»). */
export const spuntaLunghezza = (r: number) => r * 1.289

/** La spunta, centrata in (cx, cy), grande in proporzione al raggio. */
export function spuntaPercorso(cx: number, cy: number, r: number): string {
  return `M ${cx - 0.42 * r} ${cy + 0.02 * r} L ${cx - 0.12 * r} ${cy + 0.34 * r} L ${cx + 0.44 * r} ${cy - 0.3 * r}`
}

/** Pacman che guarda a destra con la bocca aperta di `mezza` radianti (0 = un cerchio intero). */
export function pacmanPercorso(cx: number, cy: number, r: number, mezza: number): string {
  if (mezza < 0.004) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
  }
  const x = cx + r * Math.cos(mezza)
  const dy = r * Math.sin(mezza)
  return `M ${cx} ${cy} L ${x} ${cy - dy} A ${r} ${r} 0 1 0 ${x} ${cy + dy} Z`
}

const VUOTA = (n: number): Scena => ({ visibile: false, x: 0, y: 0, r: 0, mezza: 0, verde: 0, spunta: 0, anello: 0, scintille: 0, mangiata: Array<number>(n).fill(0), u: null, fatto: false })

/**
 * La scena a `ms` ms dall'inizio della verifica. `okAt` e' il momento (nello stesso orologio) in cui il server ha detto «si'», o null.
 * `misure` sono le caselle: se mancano, la scena e' vuota ma il tempo del «fatto» corre lo stesso (l'entrata non dipende dal disegno).
 */
export function scena(ms: number, okAt: number | null, misure: Misura[], n: number): Scena {
  const inizioOk = okAt === null ? null : Math.max(okAt, fineCorsa(n) + TEMPI.pausa)
  const u = inizioOk === null ? null : ms - inizioOk
  const fatto = u !== null && u >= TEMPI.fatto
  const base = VUOTA(n)
  if (misure.length < n || n < 1) return { ...base, u: u !== null && u >= 0 ? u : null, fatto }

  const prima = misure[0]
  const ultima = misure[n - 1]
  const centro = (i: number) => misure[i].x + misure[i].w / 2
  const y = prima.h / 2
  const r0 = Math.min(prima.h * 0.5, prima.w * 0.62)

  // La corsa: da sinistra a destra, a velocita' costante.
  const apparizione = rallenta(fase(ms, 0, TEMPI.appare))
  const corsa = fase(ms, TEMPI.parte, fineCorsa(n) - TEMPI.parte)
  const xCorsa = centro(0) + (centro(n - 1) - centro(0)) * corsa

  // Una casella e' mangiata quando la bocca di Pacman (il suo fronte) le passa sopra. Mai prima che Pacman sia comparso.
  const fronte = xCorsa + r0 * apparizione * 0.7
  const mangiata = misure.slice(0, n).map((m, i) => Math.min(rallenta(fase(fronte, centro(i) - m.w * 0.35, m.w * 0.5)), apparizione))

  // In attesa del server, Pacman resta sull'ultima casella e «pulsa» appena.
  const attesa = corsa >= 1 && u === null ? 1 + 0.06 * Math.sin((ms - fineCorsa(n)) / 120) : 1

  if (u === null || u < 0) {
    return { ...base, visibile: true, x: xCorsa, y, r: r0 * apparizione * attesa, mezza: bocca(ms), mangiata }
  }

  // Il «si'»: la bocca si chiude, il verde sale, il cerchio va al centro della riga, si disegna la spunta, parte la festa.
  const chiusa = rallenta(fase(u, 0, TEMPI.chiude))
  const volo = rallenta(fase(u, TEMPI.volaDa, TEMPI.vola))
  const centroRiga = (prima.x + ultima.x + ultima.w) / 2
  return {
    visibile: true,
    x: centro(n - 1) + (centroRiga - centro(n - 1)) * volo,
    y,
    r: r0 * (1 + 0.35 * volo),
    mezza: bocca(ms) * (1 - chiusa),
    verde: chiusa,
    spunta: rallenta(fase(u, TEMPI.spuntaDa, TEMPI.spunta)),
    anello: fase(u, TEMPI.festaDa, TEMPI.anello),
    scintille: fase(u, TEMPI.festaDa, TEMPI.scintille),
    mangiata,
    u,
    fatto,
  }
}
