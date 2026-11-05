import type { QuotaPiani } from '@/api/lab'
import type { Quota } from '@/api/percorso'
import { locale, t } from '@/lib/lingua'

// Le quote al mese dell'AI (05/11/2026, richiesta di Maurizio), contate e applicate dalle funzioni: **i piani composti** (sala e
// vasca insieme, tre al mese) e **i Consigli Athlon** (la prima richiesta del mese e due rigenerazioni; modificarli non conta).
// Il mese e' quello del calendario: si riparte il primo, e la funzione manda il giorno (`rinnovo`). Qui solo le parole.
// Quando sono finite si dice cosa si puo' fare intanto, mai di rivolgersi a qualcuno.

/** «dal 1° dicembre» / «from 1 December»; senza il giorno (una funzione di prima), «il mese prossimo». */
export function dalRinnovo(rinnovo: string | undefined): string {
  if (!rinnovo) return t('il mese prossimo', 'next month')
  const mese = new Date(`${rinnovo}T12:00:00Z`).toLocaleDateString(locale(), { month: 'long', timeZone: 'Europe/Rome' })
  return t(`dal 1° ${mese}`, `from 1 ${mese}`)
}

/** Quante richieste restano questo mese (mai sotto zero). */
export const restano = (q: { usate: number; massimo: number }) => Math.max(0, q.massimo - q.usate)

/** La quota dei consigli e' quella nuova, al mese (con una funzione di prima non si dice niente: era in prova). */
export const quotaAlMese = (q: Quota | undefined): q is Quota => !!q && q.periodo === 'mese' && !q.in_prova

/** I consigli: cosa resta questo mese, in una riga. null con una funzione di prima. */
export function testoQuotaConsigli(q: Quota | undefined, giaChiesti: boolean): string | null {
  if (!quotaAlMese(q)) return null
  const rigenerazioni = q.massimo - 1
  const n = restano(q)
  if (!n)
    return t(
      `Questo mese hai già chiesto i consigli e li hai rigenerati ${rigenerazioni} volte. Puoi ancora modificarli; ne potrai chiedere di nuovi ${dalRinnovo(q.rinnovo)}.`,
      `This month you’ve already asked for tips and regenerated them ${rigenerazioni} times. You can still edit them; you can ask for new ones ${dalRinnovo(q.rinnovo)}.`,
    )
  // Ancora nessuna richiesta questo mese: la prima e' gratis, poi le rigenerazioni.
  if (q.usate === 0 && !giaChiesti)
    return t(
      `Ogni mese puoi chiedere i consigli e poi rigenerarli fino a ${rigenerazioni} volte. Modificarli non conta.`,
      `Each month you can ask for tips and then regenerate them up to ${rigenerazioni} times. Editing them doesn’t count.`,
    )
  return n === 1
    ? t('Questo mese puoi rigenerarli ancora una volta. Modificarli non conta.', 'This month you can regenerate them one more time. Editing them doesn’t count.')
    : t(`Questo mese puoi rigenerarli ancora ${n} volte. Modificarli non conta.`, `This month you can regenerate them ${n} more times. Editing them doesn’t count.`)
}

/** I piani: cosa resta questo mese. null in prova (una funzione di prima). */
export function testoQuotaPiani(q: QuotaPiani | undefined): string | null {
  if (!q || q.in_prova) return null
  const n = restano(q)
  if (!n)
    return t(
      `Questo mese hai già composto ${q.massimo} piani: potrai comporne altri ${dalRinnovo(q.rinnovo)}. Intanto puoi modificare i tuoi piani, o scriverne uno a mano.`,
      `You’ve already built ${q.massimo} plans this month: you can build more ${dalRinnovo(q.rinnovo)}. Meanwhile you can edit your plans, or write one yourself.`,
    )
  return n === 1
    ? t(`Questo mese puoi comporre ancora un piano, su ${q.massimo}.`, `This month you can build one more plan, out of ${q.massimo}.`)
    : t(`Questo mese puoi comporre ancora ${n} piani, su ${q.massimo}.`, `This month you can build ${n} more plans, out of ${q.massimo}.`)
}
