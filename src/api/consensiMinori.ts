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

// I dati del figlio, per il genitore (02/11/2026, decisione di Maurizio): azione `dati` della stessa funzione, **solo lettura** e solo per un
// ambito con il consenso vivo alla versione corrente. Senza consenso la funzione risponde `consenso: false` e nessun dato.

export type VoceDiario = { id: string; data: string; pasto: string | null; nome: string; grammi: number | null; kcal: number | null }
export type GiornoRecover = {
  fornitore: string
  data: string
  sonno_minuti: number | null
  sonno_punteggio: number | null
  sonno_a_letto: string | null
  sonno_sveglia: string | null
  recupero_valore: number | null
  passi: number | null
}
export type AllenamentoRecover = { id: string; inizio: string; durata_minuti: number | null; sport: string | null; calorie: number | null }
export type MisuraFiglio = {
  id: string
  data: string
  altezza_cm: number | null
  peso_kg: number | null
  vita_cm: number | null
  massa_grassa_pct: number | null
  note: string | null
}
export type PianoAi = { id: string; titolo: string; obiettivo: string | null; livello: string | null; giorni: number; aggiornato_il: string }

export type DatiAmbito =
  | { ok: true; consenso: false }
  | { ok: true; consenso: true; ambito: 'food'; voci: VoceDiario[]; giorni: number }
  | { ok: true; consenso: true; ambito: 'recover'; giorni: GiornoRecover[]; allenamenti: AllenamentoRecover[]; giorni_letti: number }
  | { ok: true; consenso: true; ambito: 'corpo'; misure: MisuraFiglio[]; sesso: 'm' | 'f' | null }
  | { ok: true; consenso: true; ambito: 'piani_ai'; piani: PianoAi[] }
  | { ok: false; errore: string }

const NON_LETTI = () => t('Non riusciamo a leggere questi dati adesso. Riprova fra qualche minuto.', 'We can’t load this data right now. Try again in a few minutes.')

const numero = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const testo = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const lista = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])

/** I dati di un ambito del figlio. La funzione ricontrolla tutto (il figlio e' del titolare, l'eta', il consenso): qui si legge e basta. */
export async function datiFiglio(memberId: number, ambito: AmbitoMinore): Promise<DatiAmbito> {
  const { ok, stato, dati } = await funzione('portale-lab-consensi-minori', { azione: 'dati', member_id: memberId, ambito })
  if (!ok) return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO() : NON_LETTI()) }
  if (dati.consenso !== true) return { ok: true, consenso: false }
  if (ambito === 'food') {
    return {
      ok: true,
      consenso: true,
      ambito,
      giorni: Number(dati.giorni) || 30,
      voci: lista(dati.voci).map((r) => ({ id: String(r.id), data: String(r.data).slice(0, 10), pasto: testo(r.pasto), nome: String(r.nome ?? ''), grammi: numero(r.grammi), kcal: numero(r.kcal) })),
    }
  }
  if (ambito === 'recover') {
    return {
      ok: true,
      consenso: true,
      ambito,
      giorni_letti: Number(dati.giorni_letti) || 30,
      giorni: lista(dati.giorni).map((r) => ({
        fornitore: String(r.fornitore ?? ''),
        data: String(r.data).slice(0, 10),
        sonno_minuti: numero(r.sonno_minuti),
        sonno_punteggio: numero(r.sonno_punteggio),
        sonno_a_letto: testo(r.sonno_a_letto),
        sonno_sveglia: testo(r.sonno_sveglia),
        recupero_valore: numero(r.recupero_valore),
        passi: numero(r.passi),
      })),
      allenamenti: lista(dati.allenamenti).map((r) => ({ id: String(r.id), inizio: String(r.inizio ?? ''), durata_minuti: numero(r.durata_minuti), sport: testo(r.sport), calorie: numero(r.calorie) })),
    }
  }
  if (ambito === 'corpo') {
    return {
      ok: true,
      consenso: true,
      ambito,
      sesso: dati.sesso === 'm' || dati.sesso === 'f' ? dati.sesso : null,
      misure: lista(dati.misure).map((r) => ({
        id: String(r.id),
        data: String(r.data).slice(0, 10),
        altezza_cm: numero(r.altezza_cm),
        peso_kg: numero(r.peso_kg),
        vita_cm: numero(r.vita_cm),
        massa_grassa_pct: numero(r.massa_grassa_pct),
        note: testo(r.note),
      })),
    }
  }
  return {
    ok: true,
    consenso: true,
    ambito: 'piani_ai',
    piani: lista(dati.piani).map((r) => ({ id: String(r.id), titolo: String(r.titolo ?? ''), obiettivo: testo(r.obiettivo), livello: testo(r.livello), giorni: Number(r.giorni) || 0, aggiornato_il: String(r.aggiornato_il ?? '') })),
  }
}
