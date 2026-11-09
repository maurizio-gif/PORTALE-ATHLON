import { t } from '@/lib/lingua'

// Le due piccole cose che le casse dell'app che pagano con Adyen hanno in comune (06/11/2026): le gare (`junior/Gare.tsx`, `CassaGara`) e lo shop
// (`shop/CassaShop.tsx`). Erano dentro `Gare.tsx`; qui sono state spostate senza cambiarle di una virgola, perche' la seconda cassa le usa uguali.
// Il resto della cassa (le chiamate al server, i testi) resta di ognuna: una parola sbagliata in una non deve toccare l'altra.

const MARCHE: Record<string, string> = { visa: 'Visa', mc: 'Mastercard', mastercard: 'Mastercard', amex: 'American Express', maestro: 'Maestro', diners: 'Diners', discover: 'Discover', jcb: 'JCB', cartebancaire: 'Carte Bancaire' }

/** «Visa», «Mastercard»: il nome della marca come lo da' Adyen, scritto per esteso. Una marca che non conosciamo si scrive com'e', con l'iniziale maiuscola. */
export const nomeCarta = (c: { marca: string }): string => MARCHE[c.marca] ?? (c.marca ? c.marca.charAt(0).toUpperCase() + c.marca.slice(1) : t('Carta', 'Card'))

/** Una volta sola per risultato: un ricaricamento non lo consegna due volte. */
export function primaVolta(chiave: string): boolean {
  try {
    if (globalThis.sessionStorage?.getItem(chiave)) return false
    globalThis.sessionStorage?.setItem(chiave, '1')
  } catch {
    // senza sessionStorage si prova comunque
  }
  return true
}
