import { funzione } from '@/api/lab'
import { codiceFiscaleValido } from '@/lib/codiceFiscale'
import { t } from '@/lib/lingua'

// Il soggetto pagatore sulle ricevute (05/11/2026, richiesta di Maurizio): il genitore dice chi risulta
// come pagatore (nome, cognome, codice fiscale) sulle ricevute di un figlio minorenne, per la detrazione.
// Il lavoro lo fa `portale-lab-pagatore` (repo APP-ATHLON, sezione «Il soggetto pagatore sulle ricevute»):
//  - per le ricevute FUTURE e' una preferenza per bambino, che l'emissione legge;
//  - per le PASSATE (l'anno solare precedente) si rifa il PDF: una versione nuova per le ricevute nostre,
//    una copia con lo stesso numero per quelle vecchie di PerfectGym (senza progressivo dell'Agenzia delle
//    Entrate, senza tessera ASI e senza IVA, perche' sulle vecchie non c'erano). Il PDF vecchio resta.
// Il genitore ne risponde: serve la dichiarazione, e il server registra chi, quando e cosa ha accettato.

export type Scelta = { nome: string; cognome: string; cf: string | null }
export type FiglioPagatore = { member_id: number; nome: string | null; cognome: string | null; scelta: Scelta | null }
export type StatoPagatore = {
  titolare: { member_id: number; nome: string | null; cognome: string | null; cf: string | null } | null
  figli: FiglioPagatore[]
  /** Gli anni delle ricevute che si possono rifare: oggi solo l'anno solare precedente. */
  anni: number[]
  /** Il testo che il genitore accetta, nella lingua dell'app (quello che fa fede e' l'italiano, registrato dal server). */
  dichiarazione: string
}

export type Candidato = { transazione_id: number; importo: number; ora: string }
export type RicevutaModificabile = {
  /** `s<ricevuta di PerfectGym>` per le vecchie, `n<pagamento>` per le nostre: la chiave con cui si chiede la ristampa. */
  chiave: string
  tipo: 'nostra' | 'storica'
  numero: string
  /** «AAAA-MM-GG» */
  data: string
  anno: number
  member_id: number
  persona: string | null
  importo: number | null
  /** Piu' pagamenti lo stesso giorno: la persona sceglie quale, dall'importo. */
  da_scegliere: boolean
  candidati: Candidato[]
  pagatore: { versione: number; nome: string; cf: string | null } | null
}

export type EsitoRistampa = {
  fatte: number
  invariate: number
  errori: { chiave: string; errore: string }[]
  risultati: { chiave: string; documento_id: string; versione: number }[]
}

const pagatore = (corpo: Record<string, unknown>) => funzione('portale-lab-pagatore', corpo)
const nonRiuscito = (d: Record<string, any>) => d.errore ?? t('Non riusciamo a completare adesso. Riprova fra qualche minuto.', 'We can’t complete this right now. Please try again in a few minutes.')

export async function statoPagatore(): Promise<{ ok: true; stato: StatoPagatore } | { ok: false; errore: string }> {
  const { ok, dati } = await pagatore({ azione: 'stato' })
  return ok ? { ok: true, stato: dati as unknown as StatoPagatore } : { ok: false, errore: nonRiuscito(dati) }
}

export type DatiPagatore = { nome: string; cognome: string; codice_fiscale: string }

export async function impostaPagatore(
  d: DatiPagatore & { intestatari: number[]; origine: 'metodo_pagamento' | 'contratto' | 'documenti' },
): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await pagatore({ azione: 'imposta', ...d, dichiarazione: true })
  return ok ? { ok: true } : { ok: false, errore: nonRiuscito(dati) }
}

export async function ricevuteModificabili(): Promise<{ ok: true; anni: number[]; ricevute: RicevutaModificabile[] } | { ok: false; errore: string }> {
  const { ok, dati } = await pagatore({ azione: 'elenco' })
  return ok ? { ok: true, anni: (dati.anni ?? []) as number[], ricevute: (dati.ricevute ?? []) as RicevutaModificabile[] } : { ok: false, errore: nonRiuscito(dati) }
}

/** Al massimo 25 per volta (il server le rifa una a una): chi chiama le divide. */
export const MAX_PER_CHIAMATA = 25

export async function ristampaRicevute(
  d: DatiPagatore & { ricevute: string[]; scelte: Record<string, number>; anchePerIlFuturo: boolean },
): Promise<{ ok: true; esito: EsitoRistampa } | { ok: false; errore: string }> {
  const { ok, dati } = await pagatore({
    azione: 'ristampa',
    ricevute: d.ricevute,
    scelte: d.scelte,
    nome: d.nome,
    cognome: d.cognome,
    codice_fiscale: d.codice_fiscale,
    anche_per_il_futuro: d.anchePerIlFuturo,
    dichiarazione: true,
  })
  return ok ? { ok: true, esito: dati as unknown as EsitoRistampa } : { ok: false, errore: nonRiuscito(dati) }
}

// ---------------------------------------------------------------------------
// I dati scritti dal genitore, controllati qui per dirlo subito; il server controlla di nuovo e decide.

export const pulisciCf = (cf: string) => cf.toUpperCase().replace(/\s/g, '')

/** Cosa non va in nome, cognome e codice fiscale, o null se vanno bene. */
export function erroreDatiPagatore(d: DatiPagatore): string | null {
  if (!d.nome.trim() || !d.cognome.trim()) return t('Scrivi nome e cognome di chi ha pagato.', 'Enter the first and last name of the person who paid.')
  if (!codiceFiscaleValido(pulisciCf(d.codice_fiscale))) return t('Controlla il codice fiscale: non risulta valido.', 'Check the tax code: it doesn’t look valid.')
  return null
}
