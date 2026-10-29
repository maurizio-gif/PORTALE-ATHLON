import { useSyncExternalStore } from 'react'

import type { AzioneAssistente } from '@/api/assistente'

// La conversazione con l'assistente, in memoria e basta (mai sul disco: sono domande di una persona). Resta finche' l'app e' viva, cosi' chiudere il foglio o
// seguire un pulsante non la perde; **all'uscita dal laboratorio si butta** (`esciDalLaboratorio`, memoria.ts). Il server conserva comunque ogni domanda e
// ogni risposta (CRM, scheda del cliente): qui sta solo quello che serve a mostrare la chat e a mandare l'id della conversazione.

export type Battuta = {
  id: string
  ruolo: 'socio' | 'assistente'
  testo: string
  azioni: AzioneAssistente[]
  /** L'id del messaggio sul server: serve per il voto e per il pulsante toccato. Manca finche' scrive, o se il registro non si e' scritto. */
  messaggioId: string | null
  valutazione: 'su' | 'giu' | null
  /** `scrive`: il testo sta arrivando; `fatto`; `interrotta`: la connessione e' caduta a meta'. */
  stato: 'scrive' | 'fatto' | 'interrotta'
  origine?: 'ai' | 'regole'
}

export type StatoAssistente = {
  battute: Battuta[]
  conversazioneId: string | null
  inCorso: boolean
  /** Cosa non e' riuscito all'ultima domanda (sotto la chat, finche' non si riprova). */
  errore: string | null
  nonAttivo: boolean
}

export const STATO_VUOTO: StatoAssistente = { battute: [], conversazioneId: null, inCorso: false, errore: null, nonAttivo: false }

let stato: StatoAssistente = STATO_VUOTO
const ascoltatori = new Set<() => void>()

export function leggiAssistente(): StatoAssistente {
  return stato
}

/** Cambia lo stato (un'istantanea nuova a ogni cambiamento: `useSyncExternalStore` confronta per riferimento). */
export function impostaAssistente(f: (s: StatoAssistente) => StatoAssistente) {
  stato = f(stato)
  ascoltatori.forEach((a) => a())
}

export function useStatoAssistente(): StatoAssistente {
  return useSyncExternalStore(
    (a) => {
      ascoltatori.add(a)
      return () => ascoltatori.delete(a)
    },
    () => stato,
    () => STATO_VUOTO,
  )
}

/** Si butta tutto: all'uscita dall'app, o per ricominciare. Una domanda ancora in volo, quando arriva, non trova piu' la sua battuta e non scrive niente. */
export function azzeraAssistente() {
  stato = STATO_VUOTO
  ascoltatori.forEach((a) => a())
}
