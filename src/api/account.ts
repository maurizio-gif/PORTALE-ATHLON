import { funzione } from '@/api/lab'
import { t } from '@/lib/lingua'

// L'eliminazione dell'account dall'app (02/11/2026, richiesta di Maurizio; Apple 5.1.1(v) e Google Play la chiedono). Funzione `portale-lab-account`
// di APP-ATHLON (stato, elimina). **E' un'anonimizzazione**: si cancellano i dati che l'app ha raccolto e si chiude l'accesso; contratti, pagamenti e
// scheda del club restano, e chi torna con la stessa email ritrova la stessa scheda (nessuna seconda prova). L'app non decide niente: chi e', cosa si
// cancella e la parola da scrivere per confermare sono della funzione.

/** La parola da scrivere per confermare: la stessa che controlla la funzione. */
export const PAROLA_CONFERMA = 'ELIMINA'

export type StatoAccount = { ok: true; email: string; contrattiAttivi: number } | { ok: false; errore: string }
export type EsitoEliminazione = { ok: true } | { ok: false; errore: string }

const GUASTO = () => t('Non riusciamo a completare adesso. Riprova fra qualche minuto.', 'We can’t complete this right now. Try again in a few minutes.')
const NON_ATTIVO = () => t('L’eliminazione dell’account non è ancora attiva: scrivici e ti aiutiamo.', 'Account deletion isn’t active yet: write to us and we’ll help.')

export async function statoAccount(): Promise<StatoAccount> {
  const { ok, stato, dati } = await funzione('portale-lab-account', { azione: 'stato' })
  if (!ok) return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO() : GUASTO()) }
  return { ok: true, email: String(dati.email ?? ''), contrattiAttivi: Number(dati.contratti_attivi) || 0 }
}

/** Cancella i dati dell'app e chiude l'accesso. Dopo il «sì» la sessione non vale piu': chi chiama deve uscire. */
export async function eliminaAccount(conferma: string): Promise<EsitoEliminazione> {
  const { ok, stato, dati } = await funzione('portale-lab-account', { azione: 'elimina', conferma })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO() : GUASTO()) }
}
