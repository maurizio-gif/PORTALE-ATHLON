import { funzione } from '@/api/lab'

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

export type StatoAbbonamento = {
  persone: PersonaAbbonamento[]
  piani: PianoAbbonamento[]
  quota_attivazione: number
  giorni_max: number
  metodi: { carta: { id: number; finale: string | null; scadenza: string | null } | null; conto: { id: number; finale: string | null } | null }
}

export async function statoAbbonamento(): Promise<{ ok: true; stato: StatoAbbonamento } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'stato' })
  if (ok) return { ok: true, stato: dati as unknown as StatoAbbonamento }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere gli abbonamenti adesso.' }
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

export type ImportiContratto = {
  formula: Formula
  importo: number
  quota_attivazione: number
  quota_attivazione_non_dovuta: boolean
  totale_alla_firma: number
  fine_impegno: string
  ultimo_giorno_disdetta: string
  rinnovo_dal: string
}

export type AnteprimaContratto = {
  documento: { numero: string; titolo: string; blocchi: Blocco[] }
  consensi: ConsensoContratto[]
  importi: ImportiContratto
  firmatario: 'se_stesso' | 'genitore'
  impronta: string
}

/** Come si paga: la carta (salvata o no), o il conto (salvato, o un IBAN nuovo col suo mandato). */
export type MetodoAbbonamento =
  | { metodo: 'carta'; con_carta: boolean }
  | { metodo: 'conto'; conto_salvato: true }
  | { metodo: 'conto'; iban: string; intestatario: string; via: string; cap: string; citta: string }

export type SceltaAbbonamento = { member_id: number; piano_id: number; data_inizio: string } & MetodoAbbonamento

export async function anteprimaAbbonamento(
  s: SceltaAbbonamento,
): Promise<{ ok: true; anteprima: AnteprimaContratto } | { ok: false; errore: string; mancanti?: string[] }> {
  const { ok, dati } = await abbonamento({ azione: 'anteprima', ...s })
  if (ok) return { ok: true, anteprima: dati as unknown as AnteprimaContratto }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a preparare il contratto adesso.', mancanti: Array.isArray(dati.mancanti) ? dati.mancanti : undefined }
}

export type EsitoFirma = { numero: string; stato: StatoContratto; url: string | null }
export type StatoContratto = 'firmato' | 'contratto_creato' | 'completato' | 'errore'

export async function firmaAbbonamento(
  s: SceltaAbbonamento,
  impronta: string,
  consensi: Record<string, boolean>,
  firmaPng: string,
): Promise<{ ok: true; esito: EsitoFirma } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'firma', ...s, impronta, consensi, firma_png: firmaPng })
  if (ok && dati.numero) return { ok: true, esito: { numero: String(dati.numero), stato: dati.stato as StatoContratto, url: typeof dati.url === 'string' ? dati.url : null } }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti ad attivare l’abbonamento adesso.' }
}

export type EsitoContratto = { stato: StatoContratto; pagamento: { ok: boolean; come?: string; in_corso?: boolean; errore?: string } | null; errore: string | null }

export async function esitoAbbonamento(numero: string): Promise<{ ok: true; esito: EsitoContratto } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'esito', numero })
  if (ok) return { ok: true, esito: dati as unknown as EsitoContratto }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il contratto adesso.' }
}
