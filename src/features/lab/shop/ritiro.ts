import type { Ordine } from '@/api/shop'

// Il ritiro in segreteria (30/10/2026, cambiato l'11/11/2026). Il codice e' il **numero dell'ordine**, grande, da dire o da mostrare: la segreteria lo cerca nel CRM o trova
// l'ordine nella scheda della persona. Non e' una chiave: chi lo conosce trova l'ordine, e quello che consegna lo decide il CRM (un ordine gia' ritirato resta ritirato).
// Il QR che c'era prima (`ATHLON-ORDINE:<id>`) e' stato tolto: serviva un lettore da banco, e il club non ne ha. Modulo puro: si prova con `npx tsx scripts/prova-ritiro.ts`.

/** Le prime otto lettere e cifre dell'identificativo, in maiuscolo: il codice di un ordine che non ha un numero (una funzione di prima non lo manda). */
export function codiceBreve(ordineId: string): string {
  return ordineId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()
}

/** Il codice da dire in segreteria: il numero dell'ordine, e per un ordine senza numero le otto lettere. Vuoto se non c'e' ne' l'uno ne' le altre. */
export function codiceRitiro(o: Pick<Ordine, 'numero' | 'ordine_id'>): string {
  return o.numero != null && Number.isInteger(o.numero) && o.numero > 0 ? String(o.numero) : codiceBreve(o.ordine_id)
}

/**
 * Il codice serve solo quando la merce e' **pronta** in segreteria (06/11/2026): per un preordine non c'e' ancora niente da ritirare, e per un ordine gia' ritirato
 * non c'e' piu'. Lo dice `stato_ritiro` (`pronto`), che per la pronta consegna e' tale subito dopo il pagamento.
 */
export const daRitirare = (o: Pick<Ordine, 'stato' | 'consegnato_il' | 'stato_ritiro'>): boolean => o.stato === 'pagato' && o.stato_ritiro === 'pronto' && !o.consegnato_il
