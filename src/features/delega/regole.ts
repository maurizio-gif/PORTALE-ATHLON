// Le regole della pagina pubblica della delega (31/10/2026), pure: si provano con `node --experimental-strip-types`.
// Qui solo quello che si vede subito (maggiorenne, campi pieni); il resto lo ricontrolla `delega-invito` (APP-ATHLON).

import type { CampoDelega } from '@/api/delega'

export type DatiConferma = Record<CampoDelega, string>

/** Gli anni compiuti al giorno `al` («AAAA-MM-GG»), da una data di nascita «AAAA-MM-GG»; null se non sono date. */
export function anniAl(nascita: string, al: string): number | null {
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascita)
  const o = /^(\d{4})-(\d{2})-(\d{2})$/.exec(al)
  if (!n || !o) return null
  const [a, m, g] = [Number(n[1]), Number(n[2]), Number(n[3])]
  const [oa, om, og] = [Number(o[1]), Number(o[2]), Number(o[3])]
  return oa - a - (om < m || (om === m && og < g) ? 1 : 0)
}

export function maggiorenne(nascita: string, oggi: string): boolean {
  const a = anniAl(nascita, oggi)
  return a != null && a >= 18
}

/** Dei dati che la conferma chiede (`campi`, li decide la funzione), quali sono ancora vuoti, nell'ordine della pagina. */
export function mancantiConferma(campi: CampoDelega[], d: DatiConferma): CampoDelega[] {
  return (['nome', 'cognome', 'telefono', 'nascita'] as CampoDelega[]).filter((c) => {
    if (!campi.includes(c)) return false
    // Il cellulare e' vuoto finche' non si scrive il numero (la tendina del prefisso da sola non conta); sotto 8 cifre con il prefisso non e' un cellulare.
    if (c === 'telefono') return d.telefono.replace(/\D/g, '').length < 8
    return !d[c].trim()
  })
}
