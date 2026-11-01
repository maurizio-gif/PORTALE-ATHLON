import { funzione } from '@/api/lab'
import { t } from '@/lib/lingua'

// I consensi del genitore per i dati sulla salute di un figlio da 13 a 17 anni (01/11/2026, decisione di Maurizio): una pagina sola,
// nella sezione Famiglia, dove il genitore concede **tutti i consensi insieme o uno alla volta**, e li revoca uno alla volta.
// Funzione `portale-lab-consensi-minori` di APP-ATHLON (stato, concedi, revoca). L'app non decide niente: chi puo' dare il consenso
// (il titolare, per un figlio per relazione diretta su PerfectGym, da 13 a 17 anni compiuti), la versione dell'informativa e la
// registrazione sono della funzione. **Qui si registra il consenso e basta**: le funzioni del figlio non lo leggono ancora.

export type AmbitoMinore = 'food' | 'recover' | 'corpo' | 'piani_ai'
/** Gli ambiti, nell'ordine in cui si mostrano. Stessa lista di `AMBITI_MINORI` della funzione. */
export const AMBITI: AmbitoMinore[] = ['food', 'recover', 'corpo', 'piani_ai']

export type StatoAmbito = {
  /** Dato alla versione corrente dell'informativa. */
  attivo: boolean
  /** Dato a una versione vecchia dell'informativa: non vale, il genitore lo rinnova. */
  da_rinnovare: boolean
  dato_il: string | null
}

export type FiglioConsensi = { member_id: number; nome: string; consensi: Record<AmbitoMinore, StatoAmbito> }

export type StatoConsensiMinori = { ok: true; versione: string; figli: FiglioConsensi[] } | { ok: false; errore: string }

const GUASTO = () => t('Non riusciamo a leggere i consensi adesso. Riprova fra qualche minuto.', 'We can’t load the consents right now. Try again in a few minutes.')
const NON_ATTIVO = () => t('I consensi per i figli non sono ancora attivi: riprova fra qualche giorno.', 'Consents for your children aren’t active yet: try again in a few days.')

function ambitoDa(v: unknown): StatoAmbito {
  const o = (v ?? {}) as Record<string, unknown>
  return { attivo: o.attivo === true, da_rinnovare: o.da_rinnovare === true, dato_il: typeof o.dato_il === 'string' ? o.dato_il : null }
}

function consensiDa(v: unknown): Record<AmbitoMinore, StatoAmbito> {
  const o = (v ?? {}) as Record<string, unknown>
  return { food: ambitoDa(o.food), recover: ambitoDa(o.recover), corpo: ambitoDa(o.corpo), piani_ai: ambitoDa(o.piani_ai) }
}

export async function statoConsensiMinori(): Promise<StatoConsensiMinori> {
  const { ok, stato, dati } = await funzione('portale-lab-consensi-minori', { azione: 'stato' })
  if (!ok) return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO() : GUASTO()) }
  const figli = Array.isArray(dati.figli) ? dati.figli : []
  return {
    ok: true,
    versione: String(dati.versione ?? ''),
    figli: figli.map((f: Record<string, unknown>) => ({ member_id: Number(f.member_id), nome: String(f.nome ?? ''), consensi: consensiDa(f.consensi) })),
  }
}

export type EsitoConsenso = { ok: true; consensi: Record<AmbitoMinore, StatoAmbito> } | { ok: false; errore: string }

const NON_SALVATO = () => t('Non siamo riusciti a salvare adesso. Riprova fra qualche minuto.', 'We couldn’t save right now. Try again in a few minutes.')

/** Concede uno o piu' consensi, dopo la presa visione dell'informativa. */
export async function concediConsensi(memberId: number, ambiti: AmbitoMinore[]): Promise<EsitoConsenso> {
  const { ok, stato, dati } = await funzione('portale-lab-consensi-minori', { azione: 'concedi', member_id: memberId, ambiti, informativa: true })
  if (ok) return { ok: true, consensi: consensiDa(dati.consensi) }
  return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO() : NON_SALVATO()) }
}

/** Revoca uno o piu' consensi. */
export async function revocaConsensi(memberId: number, ambiti: AmbitoMinore[]): Promise<EsitoConsenso> {
  const { ok, stato, dati } = await funzione('portale-lab-consensi-minori', { azione: 'revoca', member_id: memberId, ambiti })
  if (ok) return { ok: true, consensi: consensiDa(dati.consensi) }
  return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO() : NON_SALVATO()) }
}
