// La parte pura del campo firma dell'app nativa (08/11/2026): il disegno del tratto, quando una firma conta e se il PNG
// che esce e' uno che il server accetta. Niente React Native qui, cosi' si prova da Node (`scripts/prova-firma.ts`).
// Il campo vero, con il dito, e' in `FirmaPad.tsx`; sul web lo fa un <canvas> (`FirmaPad.web.tsx`).

export type Punto = { x: number; y: number }

/**
 * Quanto deve essere lungo, in punti, quello che si e' disegnato perche' sia una firma e non un tocco. Sul web si contano
 * 24 eventi del puntatore; sul telefono il numero di eventi dipende dal telefono, quindi si misura la strada fatta dal dito.
 */
export const LUNGHEZZA_MINIMA = 80

/** Sotto questa distanza dal punto di prima il dito e' fermo: un punto in piu' farebbe solo un percorso piu' lungo. */
const DISTANZA_MINIMA = 1

/** Come il server (`portale-abbonamento`, `proposta_firma`, `junior_firma`): base64 pulito, ne' vuoto ne' enorme. */
export const PNG_MIN = 200
export const PNG_MAX = 400_000

const un = (v: number) => Math.round(v * 10) / 10

export function distanza(a: Punto, b: Punto): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** La strada fatta dal dito lungo un tratto. */
export function lunghezza(punti: readonly Punto[]): number {
  let somma = 0
  for (let i = 1; i < punti.length; i++) somma += distanza(punti[i - 1], punti[i])
  return somma
}

/** Si aggiunge il punto solo se il dito si e' mosso davvero; il primo punto di un tratto c'e' sempre. */
export function contaPunto(ultimo: Punto | undefined, nuovo: Punto): boolean {
  return !ultimo || distanza(ultimo, nuovo) >= DISTANZA_MINIMA
}

/** Il punto, dentro la zona di firma: un dito che esce dal bordo non disegna fuori dal foglio. */
export function dentro(p: Punto, larghezza: number, altezza: number): Punto {
  return { x: Math.min(Math.max(p.x, 0), larghezza), y: Math.min(Math.max(p.y, 0), altezza) }
}

/**
 * Un tratto come `d` di un <Path>. Una curva liscia (quadratiche fra i punti medi) e non una spezzata: con le righe dritte una
 * firma fatta in fretta viene a scalini. Un punto solo e' un tocco: un segmento di un decimo di punto, che con la punta tonda
 * e' un pallino (il puntino della i). Non di lunghezza zero: un segmento che non va da nessuna parte non e' detto che il
 * disegno nativo lo renda, e a un decimo si vede la stessa cosa.
 */
export function percorso(punti: readonly Punto[]): string {
  const n = punti.length
  if (n === 0) return ''
  const p0 = punti[0]
  if (n === 1) return `M${un(p0.x)} ${un(p0.y)}L${un(p0.x + 0.1)} ${un(p0.y)}`
  if (n === 2) return `M${un(p0.x)} ${un(p0.y)}L${un(punti[1].x)} ${un(punti[1].y)}`
  let d = `M${un(p0.x)} ${un(p0.y)}`
  for (let i = 1; i < n - 1; i++) {
    const a = punti[i]
    const b = punti[i + 1]
    d += `Q${un(a.x)} ${un(a.y)} ${un((a.x + b.x) / 2)} ${un((a.y + b.y) / 2)}`
  }
  const u = punti[n - 1]
  return `${d}L${un(u.x)} ${un(u.y)}`
}

/** La firma c'e' se la strada fatta, su tutti i tratti, arriva al minimo. */
export function firmaSufficiente(tratti: readonly (readonly Punto[])[]): boolean {
  let somma = 0
  for (const t of tratti) {
    somma += lunghezza(t)
    if (somma >= LUNGHEZZA_MINIMA) return true
  }
  return false
}

/** Il base64 come lo vuole il server: senza il prefisso `data:` e senza a capo (iOS puo' metterne). */
export function pulisciPng(b64: string): string {
  return b64.replace(/^data:image\/png;base64,/, '').replace(/\s+/g, '')
}

export type EsitoPng = 'ok' | 'vuoto' | 'non_png' | 'troppo_grande'

/** Quello che il server controlla, piu' la firma di un PNG vero: meglio saperlo qui che dopo la richiesta. */
export function controllaPng(b64: string): EsitoPng {
  if (b64.length < PNG_MIN || !/^[A-Za-z0-9+/=]+$/.test(b64)) return 'vuoto'
  // I primi otto byte di un PNG sono sempre 89 50 4E 47 0D 0A 1A 0A: in base64 cominciano cosi'.
  if (!b64.startsWith('iVBORw0KGgo')) return 'non_png'
  if (b64.length > PNG_MAX) return 'troppo_grande'
  return 'ok'
}
