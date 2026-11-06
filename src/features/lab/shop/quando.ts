import { locale } from '@/lib/lingua'

// Le date dello shop, a Roma: l'ordine, il ritiro, la chiusura di un preordine. Il giorno com'e' scritto in italiano o in inglese.

const FUSO = 'Europe/Rome'

/** «6 novembre 2026». */
export function giorno(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSO })
}

/** «20 novembre 2026 alle ore 23:59»; se l'ora e' mezzanotte (una data e basta) solo il giorno. */
export function giornoEOra(iso: string): string {
  const d = new Date(iso)
  const ora = d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
  if (/^0?0[:.]00$/.test(ora)) return giorno(iso)
  return d.toLocaleString(locale(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: FUSO })
}

/** Il giorno dell'addebito sul conto (`2026-11-12`, senza fuso): «12 novembre». */
export function giornoCorto(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
}
