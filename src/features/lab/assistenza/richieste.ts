import type { CanaleTicket, RichiestaTeam } from '@/api/assistente'

// Le richieste al team nell'app (08/11/2026, richiesta di Maurizio: «vorrei rispondere sempre in app; l'utente quando apre un ticket decide se vuole la risposta in app o via email»).
// Chi scrive al team dall'assistente sceglie dove vuole la risposta; con «nell'app» la trova qui, nel filo della sua richiesta, e puo' riscrivere. Il server e' `portale-lab-assistente`
// (azioni `ticket`, `ticket_elenco`, `ticket_leggi`, `ticket_scrivi`), il CRM risponde sul canale scelto. Qui la parte pura: come si chiama lo stato di una richiesta, quante risposte
// aspettano, cosa si puo' scrivere. Modulo puro (niente React ne' React Native): si prova con `node --experimental-strip-types`.

/** Dove si risponde quando la persona non sceglie altro: nell'app. E' il motivo per cui questa funzione esiste. */
export const CANALE_PREDEFINITO: CanaleTicket = 'app'

/** Quanto puo' scrivere la persona in un messaggio (lo stesso tetto della funzione e della carta «Scrivi al team»). */
export const MESSAGGIO_RICHIESTA_MAX = 1000

export type ChiaveStato = 'nuova-risposta' | 'in-attesa' | 'risposto' | 'chiusa'

/**
 * Come si dice a che punto e' una richiesta, in una sola parola: una risposta da leggere vince su tutto (e' la ragione per cui la persona apre l'elenco), poi chiusa, poi il team
 * ha risposto (e si aspetta lei), altrimenti si aspetta il team.
 */
export function chiaveStato(r: Pick<RichiestaTeam, 'stato' | 'non_lette'>): ChiaveStato {
  if (r.non_lette > 0) return 'nuova-risposta'
  if (r.stato === 'chiuso') return 'chiusa'
  if (r.stato === 'risposto') return 'risposto'
  return 'in-attesa'
}

/** Le risposte del team che la persona non ha ancora letto, in tutte le richieste. */
export function totaleNonLette(richieste: readonly Pick<RichiestaTeam, 'non_lette'>[]): number {
  return richieste.reduce((somma, r) => somma + Math.max(0, r.non_lette || 0), 0)
}

/** Le richieste che aspettano la persona prima (risposte da leggere), poi per ultima attivita'. Non tocca l'ordine di chi arriva gia' ordinato per data: e' stabile. */
export function ordinaRichieste<T extends Pick<RichiestaTeam, 'non_lette' | 'aggiornato_il'>>(richieste: readonly T[]): T[] {
  return [...richieste].sort((a, b) => {
    const da = (b.non_lette > 0 ? 1 : 0) - (a.non_lette > 0 ? 1 : 0)
    if (da !== 0) return da
    return Date.parse(b.aggiornato_il) - Date.parse(a.aggiornato_il)
  })
}

/** Cosa non va in un messaggio da mandare nel filo, o niente. */
export function controllaMessaggio(testo: string): 'vuoto' | 'lungo' | null {
  const t = testo.trim()
  if (!t) return 'vuoto'
  if (t.length > MESSAGGIO_RICHIESTA_MAX) return 'lungo'
  return null
}

/**
 * Il canale che vale per una richiesta appena inviata: **quello che il server ha registrato**, non quello chiesto. Una funzione di prima ignora la scelta e fa un ticket per email;
 * dire «ti rispondiamo nell'app» a chi avra' un'email sarebbe una promessa non mantenuta.
 */
export function canaleRegistrato(chiesto: CanaleTicket, registrato: CanaleTicket): { canale: CanaleTicket; scelta_ignorata: boolean } {
  return { canale: registrato, scelta_ignorata: chiesto !== registrato }
}
