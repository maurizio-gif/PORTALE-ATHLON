import { t } from '@/lib/lingua'

// Modulo puro (niente React ne' React Native): lo prova `scripts/prova-posizione-attesa.ts`.

/**
 * Il posto in coda di chi e' in lista d'attesa (10/11/2026, richiesta di Maurizio): solo «Posizione 3», senza dire quante persone ci sono
 * davanti. Il numero lo calcola la funzione (`posizioniInAttesa` in APP-ATHLON); 1 e' il primo. Senza un numero valido (la funzione non
 * l'ha calcolato, o non e' ancora aggiornata) non si dice niente: meglio nessuna riga di un posto inventato.
 */
export function testoPosizione(posizione: number | null | undefined): string | null {
  if (typeof posizione !== 'number' || !Number.isInteger(posizione) || posizione < 1) return null
  return t(`Posizione ${posizione}`, `Position ${posizione}`)
}
