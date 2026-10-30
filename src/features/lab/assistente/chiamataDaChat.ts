import type { AzioneAssistente } from '@/api/assistente'

// La telefonata col desk dall'assistente (31/10/2026, richiesta di Maurizio: «l'assistente ti propone l'appuntamento telefonico, e in chat si apre l'appuntamento telefonico»). Come sul sito, la
// proposta c'e' solo per chi **non e' iscritto** (chi ha un abbonamento in vigore fa assistenza e, per parlare con una persona, usa «Scrivi al team»): lo decide la funzione dal profilo
// (`profilo.ts` di APP-ATHLON), l'app mostra quello che arriva. Una volta per conversazione.
//
// **Non e' una destinazione**, come `prenota-lezione`, `paga-quote` e `scrivi-team`: la funzione la manda come `{ destinazione: 'prenota-chiamata', parametri: {}, etichetta: 'Prenota una chiamata' }`
// e apre, **nella chat**, il calendario del desk (lo stesso modulo di Club Life: giorno, orario, di cosa parlare). Niente parte da solo: l'orario lo sceglie e lo conferma la persona.

export const AZIONE_CHIAMATA = 'prenota-chiamata'

export type ProponeChiamata = { etichetta: string }

export function chiamataDaAzione(a: Pick<AzioneAssistente, 'destinazione' | 'etichetta'>): ProponeChiamata | null {
  if (a.destinazione !== AZIONE_CHIAMATA) return null
  return { etichetta: a.etichetta.trim().slice(0, 60) || 'Prenota una chiamata' }
}
