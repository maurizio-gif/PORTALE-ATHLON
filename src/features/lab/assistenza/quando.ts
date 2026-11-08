import { locale, t } from '@/lib/lingua'

/** «oggi 10:30», «ieri 18:02», «12 ott»: all'ora di Roma. Come il centro notifiche. */
export function quando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const giorno = (x: Date) => x.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const ora = d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  const oggi = new Date()
  if (giorno(d) === giorno(oggi)) return t(`oggi ${ora}`, `today ${ora}`)
  if (giorno(d) === giorno(new Date(oggi.getTime() - 86_400_000))) return t(`ieri ${ora}`, `yesterday ${ora}`)
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
}
