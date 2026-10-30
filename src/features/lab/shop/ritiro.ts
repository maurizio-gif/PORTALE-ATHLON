import type { Ordine } from '@/api/shop'

// Il ritiro in segreteria con il codice QR (30/10/2026). Il QR porta l'identificativo dell'ordine con un prefisso, e basta: niente nome, niente
// email, niente importi. **Non e' una chiave**: chi lo legge in segreteria trova l'ordine, e quello che consegna lo decide il CRM (un ordine
// gia' ritirato resta ritirato). Modulo puro: si prova con `node --experimental-strip-types`.

export const PREFISSO_RITIRO = 'ATHLON-ORDINE:'

/** Il testo del QR di un ordine. */
export const testoRitiro = (ordineId: string): string => `${PREFISSO_RITIRO}${ordineId}`

/** Le prime otto lettere e cifre dell'identificativo, in maiuscolo: il codice che si detta a voce se il QR non si legge. */
export function codiceBreve(ordineId: string): string {
  return ordineId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()
}

/** Il QR serve solo per un ordine pagato e non ancora ritirato. */
export const daRitirare = (o: Pick<Ordine, 'stato' | 'consegnato_il'>): boolean => o.stato === 'pagato' && !o.consegnato_il
