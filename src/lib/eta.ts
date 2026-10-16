// L'eta' di una persona dalla data di nascita di PerfectGym («AAAA-MM-GG»).

/** Il personal training e' dai 13 anni compiuti. */
export const ETA_MINIMA_PERSONAL = 13

/** L'eta' in anni compiuti; null se la data manca o non si legge. */
export function etaDa(nascita: string | null | undefined, oggi: Date = new Date()): number | null {
  const m = String(nascita ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  let anni = oggi.getFullYear() - Number(m[1])
  const mese = oggi.getMonth() + 1
  if (mese < Number(m[2]) || (mese === Number(m[2]) && oggi.getDate() < Number(m[3]))) anni--
  return anni
}
