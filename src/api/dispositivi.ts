import { funzione } from './lab'
import { t } from '@/lib/lingua'

// I dispositivi personali (19/10/2026): la funzione portale-lab-dispositivi di APP-ATHLON.
// **Dal 29/10/2026 i dispositivi arrivano solo da Apple Salute e, quando ci sara', da Health Connect** (richiesta di Maurizio:
// un collegamento diretto per ogni marchio e' troppo per l'app di una palestra). Oura e Polar con OAuth non si offrono piu':
// `collega`, `completaCollegamento`, `scollega` e `aggiornaDispositivi` sono stati tolti da qui, e la funzione le ha ancora (resta
// com'e' finche' non si decide di toglierla: chi si era collegato in prova ha ancora i suoi dati, che si leggono come prima).
// Ogni azione fuori da `stato` e `consenso` vuole il consenso all'informativa: senza, la funzione risponde 403 con `consenso: false`.

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string; senzaConsenso?: boolean }

/** I collegamenti diretti che la funzione conosce ancora (solo per chi si era collegato in prova: l'app non ne offre di nuovi). */
export type IdFornitore = 'oura' | 'polar'

export type Fornitore = { id: IdFornitore; nome: string; disponibile: boolean }

export type Collegamento = {
  fornitore: IdFornitore
  /** 'da_riautorizzare': il fornitore ha tolto l'accesso, va ricollegato. */
  stato: 'attivo' | 'da_riautorizzare'
  collegato_il: string | null
  ultimo_sync_il: string | null
  ultimo_errore: string | null
}

/** Il recupero com'e' per il fornitore: Oura «prontezza» 0-100, Polar «Nightly Recharge» 1-6. */
export type ScalaRecupero = 'oura_prontezza' | 'polar_recharge'

/** Da dove viene il riassunto di un giorno: un fornitore, o «manuale» (il sonno che il socio scrive, 20/10/2026). */
export type FonteGiorno = IdFornitore | 'manuale' | 'apple_salute' | 'google_salute'

export type GiornoDispositivo = {
  fornitore: FonteGiorno
  /** AAAA-MM-GG, il giorno del risveglio. */
  data: string
  sonno_punteggio: number | null
  sonno_minuti: number | null
  /** Solo il sonno scritto a mano: «HH:MM», a che ora e' andato a dormire e a che ora si e' svegliato. Null altrimenti. */
  sonno_a_letto?: string | null
  sonno_sveglia?: string | null
  sonno_profondo_minuti: number | null
  sonno_rem_minuti: number | null
  recupero_valore: number | null
  recupero_scala: ScalaRecupero | null
  /** Il battito piu' basso della notte, in battiti al minuto. */
  fc_notte: number | null
  /** La variabilita' del battito (HRV), in millisecondi. */
  hrv_ms: number | null
  passi: number | null
  calorie_attive: number | null
  origine?: string | null
}

export type AllenamentoDispositivo = {
  id: string
  fornitore: IdFornitore | 'apple_salute' | 'google_salute' | 'manuale'
  inizio: string
  durata_minuti: number
  /** Da quale app o dispositivo arriva (Apple Salute fa da hub: «Oura», «Apple Watch»…). Null per i dati scritti a mano. */
  origine?: string | null
  /** Solo per quelli scritti a mano. */
  intensita?: 'leggera' | 'media' | 'intensa' | null
  /** Lo sport come lo scrive il fornitore, in minuscolo («running»). */
  sport: string | null
  calorie: number | null
  fc_media: number | null
  fc_max: number | null
}

export type DatiDispositivi = { collegamenti: Collegamento[]; giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] }

export type StatoDispositivi = {
  versione: string
  consenso: { versione: string; accettato_il: string } | null
  maggiorenne: boolean
  fornitori: Fornitore[]
  collegamenti: Collegamento[]
}

const chiama = (corpo: Record<string, unknown>) => funzione('portale-lab-dispositivi', corpo)

function errore(dati: Record<string, any>, ripiego: string) {
  return { ok: false as const, errore: (dati.errore as string) ?? ripiego, senzaConsenso: dati.consenso === false }
}

const dei = (dati: Record<string, any>): DatiDispositivi => ({ collegamenti: dati.collegamenti ?? [], giorni: dati.giorni ?? [], allenamenti: dati.allenamenti ?? [] })

export async function statoDispositivi(): Promise<Esito<StatoDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'stato' })
  if (ok) return { ok: true, versione: dati.versione, consenso: dati.consenso ?? null, maggiorenne: !!dati.maggiorenne, fornitori: dati.fornitori ?? [], collegamenti: dati.collegamenti ?? [] }
  return errore(dati, t('Non riusciamo a leggere i tuoi dispositivi adesso.', 'We can’t load your devices right now.'))
}

export async function daiConsensoDispositivi(versione: string): Promise<Esito<{ consenso: { versione: string; accettato_il: string } }>> {
  const { ok, dati } = await chiama({ azione: 'consenso', versione })
  if (ok) return { ok: true, consenso: dati.consenso }
  return errore(dati, t('Non siamo riusciti a registrare il consenso. Riprova.', 'We couldn’t record your consent. Try again.'))
}

/** Scollega tutti i dispositivi e cancella i dati: la revoca del consenso. */
export async function revocaConsensoDispositivi(): Promise<Esito<object>> {
  const { ok, dati } = await chiama({ azione: 'revoca' })
  if (ok) return { ok: true }
  return errore(dati, t('Non siamo riusciti a revocare il consenso. Riprova.', 'We couldn’t withdraw your consent. Try again.'))
}

export async function datiDispositivi(): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'dati' })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, t('Non riusciamo a leggere i dati dei dispositivi adesso.', 'We can’t load your device data right now.'))
}

/**
 * Il sonno di una notte scritto a mano (20/10/2026): per chi non ha un dispositivo, e per le notti in cui non lo
 * porta. `data` e' il giorno del risveglio (AAAA-MM-GG, fino a 30 giorni fa); `ore` sono a che ora e' andato a
 * dormire e a che ora si e' svegliato («HH:MM»: la durata la calcola la funzione), `null` toglie la notte.
 * Risponde con i dati aggiornati, come le altre scritture: la schermata si aggiorna da quella.
 */
export async function salvaSonno(data: string, ore: { letto: string; sveglia: string } | null): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'sonno', data, letto: ore ? ore.letto : null, sveglia: ore ? ore.sveglia : null })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, t('Non siamo riusciti a salvare adesso. Riprova.', 'We couldn’t save right now. Try again.'))
}

/**
 * Apple Salute (27/10/2026): l'iPhone legge da HealthKit passi, sonno e allenamenti e li manda qui; il server li
 * controlla e li scrive. Non c'e' un collegamento presso un fornitore: sono dati che spinge il telefono.
 */
export type GiornoDaSalute = {
  data: string
  passi: number | null
  sonno_minuti: number | null
  sonno_profondo_minuti?: number | null
  sonno_rem_minuti?: number | null
  fc_notte?: number | null
  hrv_ms?: number | null
  calorie_attive?: number | null
  origine?: string | null
}
export type AllenamentoDaSalute = { inizio: string; fine: string; tipo: string; calorie: number | null; fc_media?: number | null; fc_max?: number | null; origine?: string | null }

export async function importaSalute(
  lettura: { giorni: GiornoDaSalute[]; allenamenti: AllenamentoDaSalute[] },
  /** Da quale app Salute del telefono arrivano (31/10/2026: Health Connect su Android). La funzione di prima non conosce `fonte` e scrive «apple_salute». */
  fonte: 'apple_salute' | 'google_salute' = 'apple_salute',
): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'importa', fonte, giorni: lettura.giorni, allenamenti: lettura.allenamenti })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, t('Non siamo riusciti a leggere i dati di Salute adesso. Riprova.', 'We couldn’t read your Health data right now. Try again.'))
}

/** L'id di uno sport dell'elenco (`elencoSport`): minuscolo, cifre e trattino basso. La funzione ricontrolla la forma. */
export type SportManuale = string
export type IntensitaManuale = 'leggera' | 'media' | 'intensa'

/** Un allenamento scritto a mano (28/10/2026): una pedalata all'aperto, una corsa senza orologio. Le calorie le stima l'app, la funzione le controlla. */
export async function aggiungiAllenamento(a: { inizio: string; durata_minuti: number; sport: SportManuale; intensita: IntensitaManuale; calorie: number | null; fc_media: number | null }): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'allenamento_aggiungi', ...a })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, t('Non siamo riusciti a salvare l’allenamento. Riprova.', 'We couldn’t save the workout. Try again.'))
}

export async function eliminaAllenamento(id: string): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'allenamento_elimina', id })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, t('Non siamo riusciti a togliere l’allenamento. Riprova.', 'We couldn’t remove the workout. Try again.'))
}

/** Toglie i dati di Apple Salute dal club (quelli sul telefono restano dove sono). */
export async function scollegaSalute(): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'scollega_salute' })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, t('Non siamo riusciti a scollegare Apple Salute. Riprova.', 'We couldn’t disconnect Apple Health. Try again.'))
}
