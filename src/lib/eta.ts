// L'eta' di una persona dalla data di nascita di PerfectGym («AAAA-MM-GG»).

/** Il personal training e' dai 13 anni compiuti. */
export const ETA_MINIMA_PERSONAL = 13

/** L'abbonamento adulti e' dai 13 anni compiuti (dai 13 ai 17 firma il genitore). */
export const ETA_MINIMA_ABBONAMENTO = 13

/** Dai 18 anni un abbonamento si compra dal proprio account: da quello di un familiare si compra solo per chi ha da 13 a 17 anni (04/11/2026). */
export const ETA_ADULTO = 18

/** Dall'account di qualcuno si puo' comprare un abbonamento per lui? Se stessi sempre; un familiare solo da 13 a 17 anni compiuti. */
export function acquistabileDaQuestoAccount(titolare: boolean, anni: number | null): boolean {
  if (titolare) return true
  return anni !== null && anni >= ETA_MINIMA_ABBONAMENTO && anni < ETA_ADULTO
}

/** L'eta' in anni compiuti; null se la data manca o non si legge. */
export function etaDa(nascita: string | null | undefined, oggi: Date = new Date()): number | null {
  const m = String(nascita ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  let anni = oggi.getFullYear() - Number(m[1])
  const mese = oggi.getMonth() + 1
  if (mese < Number(m[2]) || (mese === Number(m[2]) && oggi.getDate() < Number(m[3]))) anni--
  return anni
}
