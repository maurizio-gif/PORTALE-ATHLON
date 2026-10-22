import type { StatoAbbonamentoLab, StatoPagamentoLab } from '@/api/lab'
import { locale, t } from '@/lib/lingua'
import type { Tono } from '@/theme'

// Le parole degli stati, le stesse del Laboratorio pagamenti del CRM
// (lib/laboratorio-pagamenti.ts). Senza tono: un'etichetta neutra.

export const STATO_PAGAMENTO: Record<StatoPagamentoLab, { testo: string; tono?: Tono }> = {
  creato: { testo: t('Avviato', 'Started') },
  in_attesa: { testo: t('Avviato', 'Started'), tono: 'attenzione' },
  in_verifica: { testo: t('In verifica', 'Being checked'), tono: 'attenzione' },
  autorizzato: { testo: t('Pagato', 'Paid'), tono: 'ok' },
  rifiutato: { testo: t('Rifiutato', 'Declined'), tono: 'errore' },
  errore: { testo: t('Errore', 'Error'), tono: 'errore' },
  annullato: { testo: t('Annullato', 'Canceled') },
  scaduto: { testo: t('Da verificare', 'To be checked'), tono: 'attenzione' },
  abbandonato: { testo: t('Non completato', 'Not completed') },
}

export const STATO_ABBONAMENTO: Record<StatoAbbonamentoLab, { testo: string; tono?: Tono }> = {
  in_attesa: { testo: t('In attesa della prima rata', 'Awaiting the first installment'), tono: 'attenzione' },
  attivo: { testo: t('Attivo', 'Active'), tono: 'ok' },
  insoluto: { testo: t('Insoluto', 'Outstanding'), tono: 'errore' },
  completato: { testo: t('Completato', 'Completed') },
  chiuso: { testo: t('Chiuso', 'Closed') },
}

export const euro = (cent: number) => `${(cent / 100).toLocaleString(locale(), { minimumFractionDigits: 2 })} €`

/** «13 ott, 10:22», all'ora di Roma. */
export function quando(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso))
}
