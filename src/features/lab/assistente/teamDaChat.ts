import type { AzioneAssistente } from '@/api/assistente'

// «Scrivi al team» dall'assistente (31/10/2026, richiesta di Maurizio: l'assistente fa una prima assistenza e, se non basta, apre un ticket). L'assistente **propone** il pulsante
// (una volta per conversazione, quando la persona e' arrabbiata, insiste dopo un «non e' possibile» o ha un caso suo) e la persona **decide**: la carta dice cosa arriva al team,
// puo' aggiungere due righe, e preme «Invia». Niente parte da solo. Qui la parte pura: come si riconosce nella risposta della funzione.
//
// **Non e' una destinazione**, come `prenota-lezione` e `paga-quote`: apre una carta nella chat. La funzione la manda come
// `{ destinazione: 'scrivi-team', parametri: {}, etichetta: 'Scrivi al team' }`: nessun parametro (la conversazione la sa gia' il server).

export const AZIONE_TEAM = 'scrivi-team'

/** Quanto puo' scrivere la persona (lo stesso tetto della funzione). */
export const MESSAGGIO_TEAM_MAX = 1000

export type ProponeTeam = { etichetta: string }

export function teamDaAzione(a: Pick<AzioneAssistente, 'destinazione' | 'etichetta'>): ProponeTeam | null {
  if (a.destinazione !== AZIONE_TEAM) return null
  return { etichetta: a.etichetta.trim().slice(0, 60) || 'Scrivi al team' }
}
