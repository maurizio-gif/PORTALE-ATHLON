import { funzione } from '@/api/lab'
import { t } from '@/lib/lingua'

// L'abbonamento principale comprato dal portale (portale-abbonamento): chi
// puo' comprarlo, il contratto da leggere, la firma, e l'esito. Prezzi, date e
// importi li calcola il server: qui si mostrano soltanto.

const abbonamento = (corpo: Record<string, unknown>) => funzione('portale-abbonamento', corpo)

export type Formula = 'annuale-rate' | 'annuale-unico' | 'flex'

export type PianoAbbonamento = {
  piano_id: number
  abbonamento: string
  formula: Formula
  etichetta: string
  importo: number
  periodo: string
  totale_impegno: number
  attivita: string[]
  nota: string
  /** Il listino ricco, dal catalogo del sito. */
  badge: string | null
  claim: string | null
  descrizione: string | null
  attivita_dettaglio: { nome: string; testo: string; pagina: string | null }[]
  non_comprende: string[]
  risparmio_vs_flex: number | null
  condizioni: { titolo: string; testo: string }[]
}

export type PersonaAbbonamento = {
  member_id: number
  nome: string | null
  cognome: string | null
  titolare: boolean
  eta: number | null
  puo_comprare: boolean
  motivo: string | null
  /** Chi firma: lui, o il genitore se e' minorenne. */
  firmatario: 'se_stesso' | 'genitore' | null
  inizio_min: string | null
  inizio_max: string | null
}

/** Un contratto firmato e non ancora pagato: si riprende da qui, senza rifirmare. */
export type DaPagare = { numero: string; member_id: number; nome: string | null; piano: string; importi: ImportiContratto; errore: string | null }

export type StatoAbbonamento = {
  da_pagare: DaPagare | null
  persone: PersonaAbbonamento[]
  piani: PianoAbbonamento[]
  quota_attivazione: number
  sospensione_prezzo: number
  giorni_max: number
  metodi: { carta: { id: number; finale: string | null; scadenza: string | null } | null; conto: { id: number; finale: string | null } | null }
}

export async function statoAbbonamento(): Promise<{ ok: true; stato: StatoAbbonamento } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'stato' })
  if (ok) return { ok: true, stato: dati as unknown as StatoAbbonamento }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere gli abbonamenti adesso.', 'We can’t load the memberships right now.') }
}

/** I blocchi del documento, come li compone il server: si disegnano, non si interpretano. */
export type Blocco =
  | { t: 'titolo'; testo: string }
  | { t: 'sottotitolo'; testo: string }
  | { t: 'sezione'; testo: string }
  | { t: 'p'; testo: string }
  | { t: 'elenco'; voci: string[] }
  | { t: 'tabella'; righe: string[][]; intestazione?: string[] }
  | { t: 'clausola'; id: string; titolo: string; testo: string; specifica: boolean }
  | { t: 'salto' }

export type ConsensoContratto = { chiave: string; perfectgym_id: number; obbligatorio: boolean; preselezionato: boolean; testo: string }

/** Quello che si paga e quando: oggi alla firma, poi ogni quota con la sua data. */
export type CalendarioPagamenti = {
  oggi: { label: string; importo: number; nota?: string }[]
  totale_oggi: number
  prossimi: { data: string; label: string; importo: number }[]
  ricorrenza: { dal: string; importo: number; ogni: 'mese' | 'anno'; nota: string } | null
  totale_impegno: number
}

export type ImportiContratto = {
  formula: Formula
  importo: number
  quota_attivazione: number
  quota_attivazione_non_dovuta: boolean
  totale_alla_firma: number
  calendario: CalendarioPagamenti
  fine_impegno: string
  ultimo_giorno_disdetta: string
  rinnovo_dal: string
}

/** I dati che finiscono nel contratto: la persona li conferma prima di firmare. */
export type DatiContraente = {
  nome: string
  cognome: string
  data_nascita: string | null
  codice_fiscale: string | null
  /** Ha dichiarato di essere residente all'estero e senza codice fiscale italiano. */
  senza_codice_fiscale?: boolean
  /** Il Paese di residenza (codice ISO) di chi e' residente all'estero. */
  paese?: string | null
  residenza: string | null
  email: string
  telefono: string | null
}

/** Chi ha dati nel contratto e li puo' correggere da qui: il contraente e, se e' minorenne, il genitore che firma. */
export type PersonaDati = {
  member_id: number
  ruolo: 'contraente' | 'genitore'
  nome: string
  cognome: string
  data_nascita: string | null
  codice_fiscale: string | null
  senza_codice_fiscale?: boolean
  /** Il Paese (codice ISO) dichiarato da chi e' residente all'estero. */
  paese?: string | null
  telefono: string | null
  /** `paese`: quello dell'indirizzo; senza, e' l'Italia. */
  indirizzo: { via: string | null; cap: string | null; citta: string | null; paese?: string | null } | null
}

export type AnteprimaContratto = {
  persone_dati: PersonaDati[]
  documento: { numero: string; titolo: string; blocchi: Blocco[] }
  consensi: ConsensoContratto[]
  importi: ImportiContratto
  firmatario: 'se_stesso' | 'genitore'
  contraente: DatiContraente
  genitore: { nome: string; cognome: string } | null
  impronta: string
}

/**
 * Come si paga, DOPO la firma: la carta (salvata o no), o il conto (salvato, o
 * un IBAN nuovo col suo mandato). Il contratto non dice con cosa si paga.
 */
export type MetodoAbbonamento =
  | { metodo: 'carta'; con_carta: boolean }
  | { metodo: 'conto'; conto_salvato: true }
  | { metodo: 'conto'; iban: string; intestatario: string; via: string; cap: string; citta: string }

export type SceltaAbbonamento = { member_id: number; piano_id: number; data_inizio: string }

export async function anteprimaAbbonamento(
  s: SceltaAbbonamento,
): Promise<{ ok: true; anteprima: AnteprimaContratto } | { ok: false; errore: string; mancanti?: string[]; persone_dati?: PersonaDati[] }> {
  const { ok, dati } = await abbonamento({ azione: 'anteprima', ...s })
  if (ok) return { ok: true, anteprima: dati as unknown as AnteprimaContratto }
  return {
    ok: false,
    errore: dati.errore ?? t('Non riusciamo a preparare il contratto adesso.', 'We can’t prepare the contract right now.'),
    mancanti: Array.isArray(dati.mancanti) ? dati.mancanti : undefined,
    persone_dati: Array.isArray(dati.persone_dati) ? (dati.persone_dati as PersonaDati[]) : undefined,
  }
}

/**
 * Le correzioni ai dati del contratto: solo i campi che cambiano. Nome, cognome e nascita si cambiano dal club.
 * Residente all'estero: `senza_codice_fiscale` + `paese` (obbligatorio), senza `codice_fiscale`.
 * `indirizzo.paese` e' il Paese dell'indirizzo, Italia compresa ('IT': il CAP ha cinque cifre).
 */
export type CambiDati = {
  codice_fiscale?: string
  senza_codice_fiscale?: boolean
  paese?: string
  telefono?: string
  indirizzo?: { via: string; cap: string; citta: string; paese?: string }
}

export async function salvaDatiAbbonamento(memberId: number, cambi: CambiDati): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'salva_dati', member_id: memberId, ...cambi })
  return ok ? { ok: true } : { ok: false, errore: dati.errore ?? t('Non siamo riusciti a salvare i dati adesso.', 'We couldn’t save your details right now.') }
}

export type StatoContratto = 'firmato' | 'contratto_creato' | 'completato' | 'errore'
export type EsitoFirma = { numero: string; stato: StatoContratto; totale_oggi: number }

export async function firmaAbbonamento(
  s: SceltaAbbonamento,
  impronta: string,
  consensi: Record<string, boolean>,
  firmaPng: string,
): Promise<{ ok: true; esito: EsitoFirma } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'firma', ...s, dati_confermati: true, impronta, consensi, firma_png: firmaPng })
  if (ok && dati.numero) return { ok: true, esito: { numero: String(dati.numero), stato: dati.stato as StatoContratto, totale_oggi: Number(dati.totale_oggi ?? 0) } }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a registrare il contratto adesso.', 'We couldn’t register the contract right now.') }
}

export type EsitoPagamento = { numero: string; stato: StatoContratto; url: string | null }

/** Dopo la firma: sceglie il metodo e incassa la prima quota. Si ripete finche' non va a buon fine. */
export async function pagaAbbonamento(numero: string, m: MetodoAbbonamento): Promise<{ ok: true; esito: EsitoPagamento } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'paga', numero, ...m })
  if (ok && dati.numero) return { ok: true, esito: { numero: String(dati.numero), stato: dati.stato as StatoContratto, url: typeof dati.url === 'string' ? dati.url : null } }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a completare il pagamento adesso.', 'We couldn’t complete the payment right now.') }
}

export type EsitoContratto = { stato: StatoContratto; pagamento: { ok: boolean; come?: string; in_corso?: boolean; errore?: string } | null; errore: string | null }

export async function esitoAbbonamento(numero: string): Promise<{ ok: true; esito: EsitoContratto } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'esito', numero })
  if (ok) return { ok: true, esito: dati as unknown as EsitoContratto }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il contratto adesso.', 'We can’t check the contract right now.') }
}

/** Il riepilogo dei costi della scelta, calcolato dal server: si aggiorna a ogni cambio di piano o di data. */
export async function riepilogoAbbonamento(s: SceltaAbbonamento): Promise<{ ok: true; importi: ImportiContratto } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'riepilogo', ...s })
  if (ok) return { ok: true, importi: dati.importi as ImportiContratto }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a calcolare i costi adesso.', 'We can’t calculate the costs right now.') }
}

export type AddebitoContratto = { tipo: string; descrizione: string | null; scadenza: string | null; importo: number; da_pagare: number; stato: 'pagato' | 'da_pagare' | 'annullato' }
export type PagamentoContratto = { data: string; importo: number; rimborso: boolean }

/** Un abbonamento della famiglia, in corso o passato, con le sue date, i suoi addebiti e i pagamenti ricevuti. */
export type ContrattoElenco = {
  contract_id: number
  member_id: number
  persona: string | null
  piano: string
  /** Lo stato di PerfectGym: Current, NotStarted, Freezed, Ended… */
  stato: string | null
  in_vigore: boolean
  categoria: 'principale' | 'aggiuntivo' | 'junior'
  data_firma: string | null
  data_inizio: string | null
  data_fine: string | null
  si_rinnova: boolean
  /** Quando e' stato disdetto, se lo e'. */
  data_disdetta: string | null
  canone: number | null
  addebiti: AddebitoContratto[]
  pagamenti: PagamentoContratto[]
  totali: { addebitato: number; pagato: number; da_pagare: number }
  /** Se l'ha firmato da qui: il numero e se c'e' il PDF. */
  firmato: { numero: string; firmato_il: string; pdf: boolean } | null
}

export async function contrattiAbbonamento(): Promise<{ ok: true; contratti: ContrattoElenco[] } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'contratti' })
  if (ok) return { ok: true, contratti: dati.contratti as ContrattoElenco[] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi abbonamenti adesso.', 'We can’t load your memberships right now.') }
}

/** Il PDF firmato: un indirizzo che vale cinque minuti. */
export async function documentoAbbonamento(numero: string): Promise<{ ok: true; url: string } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'documento', numero })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il documento adesso.', 'We can’t open the document right now.') }
}
