import type { StatoAbbonamentoLab, StatoPagamentoLab } from '@/api/lab'
import type { Tono } from '@/theme'

// Le parole degli stati, le stesse del Laboratorio pagamenti del CRM
// (lib/laboratorio-pagamenti.ts). Senza tono: un'etichetta neutra.

export const STATO_PAGAMENTO: Record<StatoPagamentoLab, { testo: string; tono?: Tono }> = {
  creato: { testo: 'Avviato' },
  in_attesa: { testo: 'Avviato', tono: 'attenzione' },
  in_verifica: { testo: 'In verifica', tono: 'attenzione' },
  autorizzato: { testo: 'Pagato', tono: 'ok' },
  rifiutato: { testo: 'Rifiutato', tono: 'errore' },
  errore: { testo: 'Errore', tono: 'errore' },
  annullato: { testo: 'Annullato' },
  scaduto: { testo: 'Da verificare', tono: 'attenzione' },
  abbandonato: { testo: 'Non completato' },
}

export const STATO_ABBONAMENTO: Record<StatoAbbonamentoLab, { testo: string; tono?: Tono }> = {
  in_attesa: { testo: 'In attesa della prima rata', tono: 'attenzione' },
  attivo: { testo: 'Attivo', tono: 'ok' },
  insoluto: { testo: 'Insoluto', tono: 'errore' },
  completato: { testo: 'Completato' },
  chiuso: { testo: 'Chiuso' },
}

export const euro = (cent: number) => `${(cent / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`

/** «13 ott, 10:22», all'ora di Roma. */
export function quando(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso))
}
