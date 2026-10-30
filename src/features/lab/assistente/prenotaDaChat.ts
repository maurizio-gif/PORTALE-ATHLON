import type { Lezione } from '@/api/lab'
import type { AzioneAssistente } from '@/api/assistente'

// «Prenotami la lezione…» dall'assistente (30/10/2026, richiesta di Maurizio). L'assistente **propone** una lezione precisa e la persona **conferma con un tocco**:
// niente parte da solo. Qui la parte pura: come si riconosce nella risposta della funzione la proposta di una prenotazione e come si aggiorna la lezione dopo il clic.
//
// **Non e' una destinazione**: le destinazioni (`destinazioni.ts`) sono un elenco chiuso di indirizzi, uguale alla mappa della funzione; questa e' un altro tipo di
// pulsante, che apre una carta nella chat invece di navigare. La funzione la manda come `{ destinazione: 'prenota-lezione', parametri: { class_id, giorno, member_id? }, etichetta }`
// (contratto: `docs/assistente-prenota.md`). Una forma che non torna non e' un pulsante.

export const AZIONE_PRENOTA = 'prenota-lezione'

export type ProponePrenotazione = { classId: number; giorno: string; memberId?: number; etichetta: string }

const GIORNO = /^\d{4}-\d{2}-\d{2}$/
const NUMERO = /^\d{1,12}$/

export function prenotaDaAzione(a: Pick<AzioneAssistente, 'destinazione' | 'parametri' | 'etichetta'>): ProponePrenotazione | null {
  if (a.destinazione !== AZIONE_PRENOTA) return null
  const { class_id, giorno, member_id } = a.parametri ?? {}
  if (!NUMERO.test(String(class_id ?? '')) || !GIORNO.test(String(giorno ?? ''))) return null
  if (member_id !== undefined && !NUMERO.test(String(member_id))) return null
  return { classId: Number(class_id), giorno: String(giorno), ...(member_id === undefined ? {} : { memberId: Number(member_id) }), etichetta: a.etichetta }
}

/** La lezione dopo un clic, come la ritocca il Calendario: prenotata (+1 iscritto), in lista d'attesa (+1 in attesa) o disdetta. */
export function conPrenotazioneLezione(l: Lezione, prenotazione: Lezione['prenotazione'], delta: number, deltaAttesa: number): Lezione {
  return {
    ...l,
    prenotazione,
    iscritti: l.iscritti + delta,
    liberi: Math.max(0, l.liberi - delta),
    ...(l.in_attesa === undefined ? {} : { in_attesa: Math.max(0, l.in_attesa + deltaAttesa) }),
  }
}
