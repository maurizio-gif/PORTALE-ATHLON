import type { AzioneAssistente } from '@/api/assistente'

// Le domande di chiarimento dell'assistente (01/11/2026, richiesta di Maurizio: se una richiesta non e' chiara l'assistente chiede «intendevi questo?» e poi procede).
// **La domanda la scrive la funzione** (`chiarimento.ts` di APP-ATHLON), con le opzioni che esistono davvero nei giorni letti dal Calendario, e ogni opzione arriva come
// un pulsante `{ destinazione: 'chiarisci', parametri: { testo }, etichetta }`. Toccarlo **manda `testo` come prossima domanda della persona**: e' una domanda completa («Che lezioni di
// Aqua Fitness ci sono domani?»), quindi il giorno e l'intenzione restano e la risposta e' quella di sempre. Chi preferisce risponde scrivendo («si», «la seconda»): lo capisce la funzione.
//
// **Non e' una destinazione**, come `prenota-lezione`, `paga-quote`, `scrivi-team` e `prenota-chiamata`: non porta altrove, parla. Una forma che non torna non e' un pulsante
// (e un'app di prima, che non lo conosce, non lo disegna: resta la domanda, a cui si risponde scrivendo).

export const AZIONE_CHIARISCI = 'chiarisci'

/** Quanto puo' essere lunga la domanda che il pulsante manda (lo stesso limite del campo della chat, `CARATTERI_MAX`). */
export const DOMANDA_CHIARIMENTO_MAX = 500

export type Chiarisce = { etichetta: string; testo: string }

export function chiarimentoDaAzione(a: Pick<AzioneAssistente, 'destinazione' | 'parametri' | 'etichetta'>): Chiarisce | null {
  if (a.destinazione !== AZIONE_CHIARISCI) return null
  const testo = String(a.parametri?.testo ?? '').trim()
  if (!testo || testo.length > DOMANDA_CHIARIMENTO_MAX) return null
  return { etichetta: a.etichetta.trim().slice(0, 40) || testo.slice(0, 40), testo }
}
