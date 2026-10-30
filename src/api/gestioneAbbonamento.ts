import { funzione } from '@/api/lab'
import { SUPABASE_URL } from '@/config'
import { vistaCorrente } from '@/features/lab/vista'
import { t } from '@/lib/lingua'

// «Gestisci abbonamento» (30/10/2026): sospendere e disdire un abbonamento dall'app.
// Funzione `portale-gestione-abbonamento` (APP-ATHLON). Date, termini, prezzi, rate
// rimaste e fine contratto li calcola il server: qui si mostrano soltanto. La
// funzione e' in sola lettura per `stato` e le due anteprime; il resto scrive su
// PerfectGym e in vista cliente risponde 403.

const gestione = (corpo: Record<string, unknown>) => funzione('portale-gestione-abbonamento', corpo)

export type Formula = 'annuale-unico' | 'annuale-rate' | 'mensile' | 'altro'

/** Come si disdice: col rinnovo spento (`rinnovo`), a fine mese (`mensile`), il giorno prima del prossimo addebito di un annuale senza fine (`annuale`), o non si puo' piu' da qui. */
export type ModoDisdetta = 'rinnovo' | 'mensile' | 'annuale' | 'oltre_termine' | 'gia_disdetto'

/** Si paga una volta l'anno (`paymentInterval` del piano su PerfectGym, 12 mesi)? Il Flex e le rate mensili no. */
export const pagaAnnuale = (x: { ciclo_mesi?: number | null }): boolean => (x.ciclo_mesi ?? 0) >= 12

export type DisdettaStato = { modo: ModoDisdetta; fine: string | null; ultimo_giorno?: string | null }

/** La finestra del cambio senza disdetta (da 30 a 10 giorni prima della fine dell'impegno), calcolata dal server. */
export type FinestraCambio =
  | { stato: 'aperta' | 'non_ancora' | 'chiusa'; fine: string; apre_il: string; ultimo_giorno: string; nuovo_inizio: string; chiusura_vecchio: 'spegni_rinnovo' | 'metti_fine' | 'nessuna' }
  | { stato: 'non_calcolabile'; motivo: string }

export type UpgradeContratto = { possibile: boolean; motivo: 'massimo' | null; rango: number }

/**
 * La gerarchia dell'upgrade, dal piu' alto: Premium soluzione unica (4), Premium rateizzato (3), Smart soluzione unica (2), Smart rateizzato (1);
 * gli altri (vecchi annuali, Flex) valgono 0. Stessa regola di `_shared/cambio-abbonamento.ts` di APP-ATHLON: si cambia nei due posti.
 */
export function rangoAbbonamento(nome: string | null | undefined, soluzioneUnica: boolean): number {
  const n = String(nome ?? '')
  const livello = /premium/i.test(n) ? 3 : /smart/i.test(n) ? 1 : 0
  return livello === 0 ? 0 : livello + (soluzioneUnica ? 1 : 0)
}

export type ContrattoGestione = {
  contract_id: number
  member_id: number
  persona: string | null
  piano: string
  formula: Formula
  stato: string | null
  data_inizio: string | null
  data_fine: string | null
  canone: number | null
  si_rinnova: boolean
  /** Ogni quanti mesi si paga (12 = annuale), e la prossima quota. Con una funzione di prima non ci sono. */
  ciclo_mesi?: number | null
  prossimo_addebito?: string | null
  gestibile: boolean
  /** Perche' non e' gestibile: `guest_pass`, `a_zero`, `aggiuntivo`, `junior`, `non_in_vigore`, `altro`. */
  motivo: string | null
  guest_pass: { fine: string | null } | null
  azioni?: {
    sospendi: { disponibile: boolean }
    cambia: { disponibile: boolean; motivo?: string; finestra?: FinestraCambio; upgrade?: UpgradeContratto }
    disdici: DisdettaStato
  }
}

export async function statoGestione(): Promise<{ ok: true; contratti: ContrattoGestione[] } | { ok: false; errore: string }> {
  const { ok, dati } = await gestione({ azione: 'stato' })
  if (ok) return { ok: true, contratti: (dati.contratti ?? []) as ContrattoGestione[] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere l’abbonamento adesso.', 'We can’t load the membership right now.') }
}

// --- Disdetta -------------------------------------------------------------

// I motivi ricorrenti nelle cancellazioni dei contratti di Athlon (`pgm_contratti.motivo_annullamento`, i `CancelReasons` di PerfectGym), raggruppati.
// Stesse chiavi di `MOTIVI_DISDETTA` in `_shared/gestione-abbonamento.ts` di APP-ATHLON.
export const MOTIVI_DISDETTA = ['tempo', 'trasferimento', 'non_uso', 'altra_struttura', 'salute', 'costo', 'attivita', 'altro'] as const
export type MotivoDisdetta = (typeof MOTIVI_DISDETTA)[number]

export type AnteprimaDisdetta = {
  contract_id: number
  piano: string
  formula: Formula
  canone: number | null
  ciclo_mesi?: number | null
  modo: ModoDisdetta
  fine: string | null
  ultimo_giorno: string | null
  rate: { quante: number; totale: number }
  motivi: string[]
  /** Si rimanda alla conferma: se cambia qualcosa nel frattempo il server non scrive. */
  impronta: string
}

export type EsitoGestione<T> = { ok: true; dati: T } | { ok: false; errore: string; cambiato?: boolean; oltreTermine?: boolean; giaDisdetto?: boolean }

function errore<T>(dati: Record<string, any>, ripiego: string): EsitoGestione<T> {
  return { ok: false, errore: dati.errore ?? ripiego, cambiato: dati.cambiato === true, oltreTermine: dati.oltre_termine === true, giaDisdetto: dati.gia_disdetto === true }
}

export async function anteprimaDisdetta(contractId: number): Promise<EsitoGestione<AnteprimaDisdetta>> {
  const { ok, dati } = await gestione({ azione: 'disdici_anteprima', contract_id: contractId })
  if (ok) return { ok: true, dati: dati as unknown as AnteprimaDisdetta }
  return errore(dati, t('Non riusciamo a leggere la disdetta adesso.', 'We can’t load the cancellation right now.'))
}

export async function disdici(contractId: number, impronta: string, motivo: MotivoDisdetta, commento: string): Promise<EsitoGestione<{ modo: ModoDisdetta; fine: string | null; confermata: boolean }>> {
  const { ok, dati } = await gestione({ azione: 'disdici', contract_id: contractId, impronta, motivo, commento })
  if (ok) return { ok: true, dati: { modo: dati.modo, fine: dati.fine ?? null, confermata: dati.confermata === true } }
  return errore(dati, t('Non siamo riusciti a registrare la disdetta adesso. Riprova fra qualche minuto.', 'We couldn’t record the cancellation right now. Try again in a few minutes.'))
}

// --- Sospensione ----------------------------------------------------------

export type OpzioneSospensione = { freeze_type_id: number; nome: string; costo: number; gratuita: boolean; rimaste_anno: number | null }

export type MeseSospendibile = {
  primo: string
  ultimo: string
  ultimo_giorno_richiesta: string
  richiedibile: boolean
  /** `troppo_tardi`, `gia_sospeso`, `oltre_la_fine`, `nessuna_opzione`. */
  motivo_no: string | null
  opzioni: OpzioneSospensione[]
  scadenza_stimata: string | null
}

export type MetodoPagamento = { tipo: 'carta' | 'conto' | 'altro'; finale: string | null; scade: string | null }

export type SospensioneProgrammata = { freeze_id: number; dal: string; al: string; annullabile: boolean; ultimo_giorno_annullo: string; credito: number | null }

export type AnteprimaSospensione = {
  contract_id: number
  piano: string
  data_fine: string | null
  oggi: string
  metodo_pagamento: MetodoPagamento | null
  mesi: MeseSospendibile[]
  future: SospensioneProgrammata[]
}

export async function anteprimaSospensione(contractId: number): Promise<EsitoGestione<AnteprimaSospensione>> {
  const { ok, dati } = await gestione({ azione: 'sospendi_anteprima', contract_id: contractId })
  if (ok) return { ok: true, dati: dati as unknown as AnteprimaSospensione }
  return errore(dati, t('Non riusciamo a leggere le sospensioni adesso.', 'We can’t load the suspension options right now.'))
}

export async function sospendi(contractId: number, primo: string, freezeTypeId: number, costo: number): Promise<EsitoGestione<{ dal: string; al: string; costo: number; scadenza: string | null; scadenzaLetta: boolean }>> {
  const { ok, dati } = await gestione({ azione: 'sospendi', contract_id: contractId, primo, freeze_type_id: freezeTypeId, costo })
  if (ok) return { ok: true, dati: { dal: dati.dal, al: dati.al, costo: Number(dati.costo ?? 0), scadenza: dati.scadenza ?? null, scadenzaLetta: dati.scadenza_letta === true } }
  return errore(dati, t('Non siamo riusciti a sospendere adesso. Riprova fra qualche minuto.', 'We couldn’t suspend right now. Try again in a few minutes.'))
}

export async function annullaSospensione(contractId: number, freezeId: number): Promise<EsitoGestione<{ credito: number | null }>> {
  const { ok, dati } = await gestione({ azione: 'sospendi_annulla', contract_id: contractId, freeze_id: freezeId })
  if (ok) return { ok: true, dati: { credito: dati.credito ?? null } }
  return errore(dati, t('Non siamo riusciti ad annullare la sospensione adesso. Riprova fra qualche minuto.', 'We couldn’t cancel the suspension right now. Try again in a few minutes.'))
}

// --- Upgrade --------------------------------------------------------------

/**
 * La richiesta di upgrade arriva alla segreteria con lo stesso modulo del sito (`sito-cambio-abbonamento`: la riga in
 * `richieste_cambio_abbonamento` e l'avviso a desk@, che risponde con il conteggio del credito residuo). In vista cliente non si manda.
 */
export async function richiediUpgrade(d: { email: string; abbonamento: string; decorrenza: string; note: string }): Promise<EsitoGestione<Record<string, never>>> {
  if (vistaCorrente()) return { ok: false, errore: t('In vista cliente non si possono mandare richieste.', 'You can’t send requests in client view.') }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/sito-cambio-abbonamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: d.email, abbonamento: d.abbonamento, decorrenza: d.decorrenza, richiesteExtra: d.note, pagina: 'app/gestisci-abbonamento' }),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as { ok?: boolean; errore?: string }
    if (r.ok && dati.ok) return { ok: true, dati: {} }
    return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a mandare la richiesta adesso. Riprova fra qualche minuto.', 'We couldn’t send the request right now. Try again in a few minutes.') }
  } catch {
    return { ok: false, errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') }
  }
}
