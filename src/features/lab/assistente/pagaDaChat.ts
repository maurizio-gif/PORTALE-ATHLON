import type { AzioneAssistente } from '@/api/assistente'

// «Voglio pagare una rata scaduta» dall'assistente (30/10/2026, richiesta di Maurizio). L'assistente **propone** il pagamento e la persona lo fa **con un tocco**:
// niente parte da solo. Qui la parte pura: come si riconosce nella risposta della funzione la proposta di pagare le quote scadute.
//
// **Non e' una destinazione**, come `prenota-lezione`: e' un pulsante che apre una carta nella chat invece di navigare. La funzione la manda come
// `{ destinazione: 'paga-quote', parametri: {}, etichetta: 'Paga la quota · 21,00 €' }`: **nessun importo nei parametri** (l'etichetta lo dice, ma e' solo testo: la carta
// rilegge le quote dal server, e `salda` non addebita niente se il totale non e' quello mostrato). Contratto: `docs/assistente-prenota.md`.

export const AZIONE_PAGA = 'paga-quote'

export type ProponePagamento = { etichetta: string }

export function pagaDaAzione(a: Pick<AzioneAssistente, 'destinazione' | 'etichetta'>): ProponePagamento | null {
  if (a.destinazione !== AZIONE_PAGA) return null
  return { etichetta: a.etichetta.trim().slice(0, 60) || 'Paga' }
}
