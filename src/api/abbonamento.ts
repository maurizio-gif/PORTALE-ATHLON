import { Platform } from 'react-native'

import { funzione, type SessioneAdyen } from '@/api/lab'
import { canaleNativo, sdkAdyen } from '@/lib/adyenNativo'
import { t } from '@/lib/lingua'
import { ordinaPiani } from '@/lib/ordinePiani'

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
  /**
   * Ha un Guest Pass in corso (29/10/2026): l'abbonamento parte il giorno dopo la fine della prova, la data non si sceglie
   * (`inizio_min` = `inizio_max`) e la quota di attivazione non e' dovuta. `fine` e' l'ultimo giorno della prova.
   */
  da_guest_pass?: { fine: string } | null
}

/** Un contratto firmato e non ancora pagato: si riprende da qui, senza rifirmare. */
export type DaPagare = {
  numero: string
  member_id: number
  nome: string | null
  piano: string
  importi: ImportiContratto
  errore: string | null
  /**
   * Il contratto e' del nostro sistema (12/11/2026, i corsi bambini; poi gli adulti): un conto nuovo non si scrive qui, si autorizza sulla pagina di
   * GoCardless (Drop-in sul web, browser integrato nell'app installata). Un server vecchio non lo manda: il modulo IBAN di prima.
   */
  conto_su_gocardless?: boolean
}

export type StatoAbbonamento = {
  da_pagare: DaPagare | null
  /** Tutti i contratti firmati e non pagati del nucleo (piu' figli iscritti insieme). Un server vecchio non lo manda. */
  da_pagare_tutti?: DaPagare[]
  persone: PersonaAbbonamento[]
  piani: PianoAbbonamento[]
  quota_attivazione: number
  sospensione_prezzo: number
  giorni_max: number
  metodi: { carta: { id: number; finale: string | null; scadenza: string | null } | null; conto: { id: number; finale: string | null } | null }
}

export async function statoAbbonamento(): Promise<{ ok: true; stato: StatoAbbonamento } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'stato' })
  if (ok) {
    const stato = dati as unknown as StatoAbbonamento
    // Prima il Premium, poi lo Smart (03/11/2026): l'ordine si decide qui, per tutte le schermate che elencano i piani.
    return { ok: true, stato: { ...stato, piani: ordinaPiani(stato.piani ?? []) } }
  }
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
  /** Con un credito sul conto c'e' una voce **negativa** con `credito: true`: e' quello che si scala (10/11/2026). `totale_oggi` e' gia' al netto. */
  oggi: { label: string; importo: number; nota?: string; credito?: true }[]
  totale_oggi: number
  prossimi: { data: string; label: string; importo: number }[]
  ricorrenza: { dal: string; importo: number; ogni: 'mese' | 'anno'; nota: string } | null
  /** Le quote di `prossimi` sono di listino: il credito che avanza le scala in ordine. Il totale dell'impegno e' al netto. */
  totale_impegno: number
  /** Il credito che la persona ha sul conto (saldo positivo di PerfectGym) e come si usa. Assente se non ce n'e'. */
  credito?: { disponibile: number; oggi: number; sulle_quote: number; resto: number }
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
  /** Un conto nuovo per un contratto del nostro sistema: l'IBAN si scrive sulla pagina di GoCardless, qui niente. */
  | { metodo: 'conto'; su_gocardless: true }

export type SceltaAbbonamento = {
  member_id: number
  piano_id: number
  data_inizio: string
  /** Cambio senza disdetta: il contratto che si sta cambiando. La data la sceglie il socio fra domani e 30 giorni; il vecchio finisce il giorno prima (la decide e la ricontrolla il server). */
  cambio_contract_id?: number
}

/** Cosa serve per il cambio di un abbonamento (`cambio_stato`): se si puo', le date fisse e i metodi di pagamento gia' salvati. */
export type StatoCambio = {
  contract_id: number
  member_id: number
  piano: string
  /** La fine naturale del vecchio e il giorno dopo: la data proposta. */
  fine: string
  nuovo_inizio: string
  /** Le date fra cui si sceglie la partenza del nuovo (02/11/2026): da domani a 30 giorni al massimo. Un server vecchio non le manda: e' la sola `nuovo_inizio`. */
  inizio_min?: string
  inizio_max?: string
  ultimo_giorno: string
  metodi: { carta: { id: number; finale: string | null; scadenza: string | null } | null; conto: { id: number; finale: string | null } | null }
}

export async function statoCambioAbbonamento(contractId: number): Promise<{ ok: true; stato: StatoCambio } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'cambio_stato', contract_id: contractId })
  if (ok && dati.consentito) return { ok: true, stato: dati as unknown as StatoCambio }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a preparare il cambio adesso.', 'We can’t set up the change right now.') }
}

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
/** `cambio.da_pagare`: c'e' una quota gia' dovuta da pagare subito (PerfectGym mette a debito il contratto appena creato). Un server vecchio non lo manda. */
export type EsitoFirma = { numero: string; stato: StatoContratto; totale_oggi: number; cambio: { fine_vecchio: string; inizio_nuovo: string; da_pagare?: boolean } | null }

export async function firmaAbbonamento(
  s: SceltaAbbonamento,
  impronta: string,
  consensi: Record<string, boolean>,
  firmaPng: string,
  /** Solo nel cambio: il metodo di pagamento gia' salvato da collegare al nuovo contratto. */
  metodoCambio?: 'carta' | 'conto',
): Promise<{ ok: true; esito: EsitoFirma } | { ok: false; errore: string; serveMetodo?: boolean }> {
  const { ok, dati } = await abbonamento({ azione: 'firma', ...s, dati_confermati: true, impronta, consensi, firma_png: firmaPng, ...(metodoCambio ? { metodo: metodoCambio } : {}) })
  if (ok && dati.numero) {
    const c = dati.cambio && typeof dati.cambio === 'object' ? (dati.cambio as { fine_vecchio?: string; inizio_nuovo?: string; da_pagare?: boolean }) : null
    return {
      ok: true,
      esito: {
        numero: String(dati.numero),
        stato: dati.stato as StatoContratto,
        totale_oggi: Number(dati.totale_oggi ?? 0),
        cambio: c?.fine_vecchio && c.inizio_nuovo ? { fine_vecchio: c.fine_vecchio, inizio_nuovo: c.inizio_nuovo, da_pagare: c.da_pagare === true } : null,
      },
    }
  }
  if (dati.serve_metodo) return { ok: false, serveMetodo: true, errore: dati.errore ?? t('Prima aggiungi o scegli il metodo di pagamento.', 'First add or choose a payment method.') }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a registrare il contratto adesso.', 'We couldn’t register the contract right now.') }
}

/**
 * `flusso`: con il conto e un contratto del nostro sistema, l'id della pagina di GoCardless (BRF…) per aprirla nel Drop-in sul web.
 * `dropIn`: con la carta nuova e un contratto del nostro sistema (13/11/2026), la sessione di Adyen per il modulo dentro l'app (sul web nella
 * pagina, nell'app la finestra nativa), al posto della pagina di Adyen (`url`). Un server di prima non la manda: resta `url`.
 */
export type EsitoPagamento = { numero: string; stato: StatoContratto; url: string | null; flusso?: string | null; dropIn?: (SessioneAdyen & { salva: boolean }) | null }

/**
 * Gli importi del contratto firmato con quello che si paga **adesso** (10/11/2026): il credito sul conto puo' arrivare dopo la firma (il desk lo registra a
 * contratto creato), e il server dice quello che PerfectGym incassera' davvero, con la riga del credito. `null` se non risponde: restano quelli della firma.
 */
export async function importiAdesso(numero: string): Promise<ImportiContratto | null> {
  const { ok, dati } = await abbonamento({ azione: 'dovuto', numero })
  return ok && dati.importi && typeof dati.importi === 'object' ? (dati.importi as ImportiContratto) : null
}

/** Dopo la firma: sceglie il metodo e incassa la prima quota. Si ripete finche' non va a buon fine. */
export async function pagaAbbonamento(numero: string, m: MetodoAbbonamento, ritornoUrl?: string): Promise<{ ok: true; esito: EsitoPagamento } | { ok: false; errore: string }> {
  // `su_gocardless` non va al server: per lui e' un conto senza IBAN e senza `conto_salvato`, cioe' la pagina di GoCardless.
  const corpo = 'su_gocardless' in m ? { metodo: 'conto' as const } : m
  // La carta nuova col modulo di Adyen dentro l'app (13/11/2026), dove c'e' (sul web sempre; nell'app le build con l'SDK): `drop_in` e il canale.
  // Lo stesso test di `pagamentoDisponibile` (`features/lab/adyen`): sul web il modulo c'e' sempre, nell'app solo con l'SDK nella build.
  const conModulo = m.metodo === 'carta' && !m.con_carta && (Platform.OS === 'web' || sdkAdyen() !== null)
  const canale = conModulo ? await canaleNativo('abbonamento', { contratto: numero }) : {}
  const { ok, dati } = await abbonamento({ azione: 'paga', numero, ...corpo, ...(ritornoUrl ? { ritorno_url: ritornoUrl } : {}), ...(conModulo ? { drop_in: true, ...canale } : {}) })
  if (ok && dati.numero) {
    const flusso = typeof dati.flusso === 'string' && /^BRF[0-9A-Z]+$/.test(dati.flusso) ? dati.flusso : null
    const d = dati.drop_in && typeof dati.drop_in === 'object' ? (dati.drop_in as Record<string, any>) : null
    const dropIn =
      d && typeof d.clientKey === 'string' && typeof d.sessione?.id === 'string' && typeof d.sessione?.sessionData === 'string'
        ? {
            riferimento: String(d.riferimento ?? ''),
            clientKey: d.clientKey,
            environment: String(d.environment ?? 'live'),
            sessione: { id: d.sessione.id, sessionData: d.sessione.sessionData },
            ritornoNativo: canale.ritorno_nativo,
            importoCent: typeof d.importo_cent === 'number' ? d.importo_cent : undefined,
            salva: d.salva === true,
          }
        : null
    return { ok: true, esito: { numero: String(dati.numero), stato: dati.stato as StatoContratto, url: typeof dati.url === 'string' ? dati.url : null, flusso, dropIn } }
  }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a completare il pagamento adesso.', 'We couldn’t complete the payment right now.') }
}

export type EsitoContratto = {
  stato: StatoContratto
  pagamento: { ok: boolean; come?: string; in_corso?: boolean; errore?: string } | null
  errore: string | null
  /** Di chi e' e quanto si paga oggi (un server vecchio non lo manda). `conto_su_gocardless`: vedi `DaPagare`. */
  contratto?: { nome: string | null; titolo: string | null; totale_oggi: number; conto_su_gocardless?: boolean }
}

export type EsitoPagaGruppo = { numero: string; ok: boolean; stato?: StatoContratto; errore?: string }

/**
 * Piu' figli iscritti insieme (04/11/2026): un IBAN solo per tutti i contratti. Il server salva il conto su ogni bambino e lo assegna al suo
 * contratto (PerfectGym vuole una fonte per persona) e risponde contratto per contratto. La carta invece si paga un figlio alla volta.
 */
export async function pagaGruppo(
  numeri: string[],
  // `conto_salvato`: il conto gia' salvato (per i contratti del nostro sistema, il mandato GoCardless appena firmato per il primo figlio).
  conto: { iban: string; intestatario: string; via: string; cap: string; citta: string } | { conto_salvato: true },
): Promise<{ ok: true; esiti: EsitoPagaGruppo[] } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'paga_gruppo', numeri, metodo: 'conto', ...conto })
  if (ok && Array.isArray(dati.esiti)) return { ok: true, esiti: dati.esiti as EsitoPagaGruppo[] }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a completare il pagamento adesso.', 'We couldn’t complete the payment right now.') }
}

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
  /** Firmato al desk: l'id del PDF che PerfectGym conserva fra i file della persona (si apre con `apriFilePgm`). Assente con una funzione di prima. */
  documento_pgm?: string | null
  /**
   * Le sospensioni in corso o future (14/11/2026), dalla tabella `sospensioni` (quelle chieste dall'app e quelle importate da PerfectGym;
   * fuori le chiusure del club). `in_corso`: oggi e' dentro il periodo. Assente con una funzione di prima.
   */
  sospensioni?: SospensioneContratto[]
}

export type SospensioneContratto = { dal: string; al: string; tipo: string; in_corso: boolean }

export async function contrattiAbbonamento(): Promise<{ ok: true; contratti: ContrattoElenco[] } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'contratti' })
  if (ok) return { ok: true, contratti: dati.contratti as ContrattoElenco[] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi abbonamenti adesso.', 'We can’t load your memberships right now.') }
}

/**
 * Le sezioni riservate (05/11/2026, richiesta di Maurizio): Athlon Health System e Athlon TV si aprono a chi ha un abbonamento principale attivo
 * (suo: standard, omaggio, Employee, Guest Pass in corso). Se no l'app le mostra in anteprima e, al primo tocco, il modal: con il Guest Pass
 * (`guest_pass`, il prezzo lo dice il server) a chi puo' attivarlo, «Attiva un abbonamento» agli altri. La regola sta nel database
 * (`portale_accesso_riservate`, APP-ATHLON) e le funzioni delle due sezioni la applicano da se'.
 */
export type AccessoRiservate = { attivo: boolean; guest_pass: { prezzo: number } | null }

/** Null se la funzione e' di prima (non conosce `accesso`) o non risponde: le sezioni restano aperte com'erano, e ci pensa il server a rifiutare. */
export async function accessoRiservate(): Promise<AccessoRiservate | null> {
  const { ok, dati } = await abbonamento({ azione: 'accesso' })
  if (!ok || typeof dati.attivo !== 'boolean') return null
  const prezzo = Number(dati.guest_pass?.prezzo)
  return { attivo: dati.attivo, guest_pass: !dati.attivo && Number.isFinite(prezzo) && prezzo > 0 ? { prezzo } : null }
}

/** Il PDF firmato: un indirizzo che vale cinque minuti. */
export async function documentoAbbonamento(numero: string): Promise<{ ok: true; url: string } | { ok: false; errore: string }> {
  const { ok, dati } = await abbonamento({ azione: 'documento', numero })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il documento adesso.', 'We can’t open the document right now.') }
}

// ---------------------------------------------------------------------------
// L'iscrizione a un gruppo dei corsi junior (21/10/2026): stessa firma dell'abbonamento, ma il contratto lo crea PerfectGym
// iscrivendo al gruppo. Il pagamento e l'esito sono quelli di sempre, per numero (`pagaAbbonamento`, `esitoAbbonamento`).

export type SceltaIscrizione = {
  member_id: number
  /** Assente per il mensile del Baby Nuoto (`baby`) e per l'abbonamento PT (`pt`): non hanno un gruppo. */
  group_id?: string | number
  baby?: boolean
  /** L'abbonamento PT (14/11/2026, nota 304 di APP-ATHLON): `piano_id` e' il piano PT, il contratto parte oggi. */
  pt?: boolean
  data_inizio?: string
  /** L'abbonamento scelto, quando il gruppo si vende con piu' di uno (`piani_disponibili`, 12/11/2026). Senza: il primo. */
  piano_id?: number
}

/** Un abbonamento fra cui scegliere all'iscrizione a un gruppo: quota al mese, attivazione e quanto si paga oggi. */
export type PianoDisponibile = { piano_id: number; nome: string; mensile: number; attivazione: number; oggi: number }

export type AnteprimaIscrizione = AnteprimaContratto & {
  /** Le date in cui si puo' cominciare (le lezioni del gruppo da oggi); `data_inizio` e' quella dell'anteprima. */
  inizi: { data: string }[]
  data_inizio: string
  gruppo: { group_id: number; nome: string; giorni: string | null; orario: string | null }
  piano: { piano_id: number; nome: string; mensile: number; attivazione: number }
  /** Gli abbonamenti fra cui scegliere: vuoto (o assente, con la funzione di prima) se il gruppo si vende con uno solo. */
  piani_disponibili?: PianoDisponibile[]
}

export type RispostaIscrizione =
  | { ok: true; anteprima: AnteprimaIscrizione }
  | {
      ok: false
      errore: string
      mancanti?: string[]
      persone_dati?: PersonaDati[]
      /** Anche con i dati da correggere i costi si vedono. */
      importi?: ImportiContratto
      inizi?: { data: string }[]
      data_inizio?: string
      gruppo?: AnteprimaIscrizione['gruppo']
      piano?: AnteprimaIscrizione['piano']
    }

export async function anteprimaIscrizione(s: SceltaIscrizione): Promise<RispostaIscrizione> {
  const { baby, pt, ...resto } = s
  const { ok, dati } = await abbonamento({ azione: pt ? 'pt_anteprima' : baby ? 'baby_anteprima' : 'junior_anteprima', ...resto })
  if (ok) return { ok: true, anteprima: dati as unknown as AnteprimaIscrizione }
  return {
    ok: false,
    errore: dati.errore ?? t('Non riusciamo a preparare il contratto adesso.', 'We can’t prepare the contract right now.'),
    mancanti: Array.isArray(dati.mancanti) ? dati.mancanti : undefined,
    persone_dati: Array.isArray(dati.persone_dati) ? (dati.persone_dati as PersonaDati[]) : undefined,
    importi: dati.importi as ImportiContratto | undefined,
    inizi: Array.isArray(dati.inizi) ? (dati.inizi as { data: string }[]) : undefined,
    data_inizio: typeof dati.data_inizio === 'string' ? dati.data_inizio : undefined,
    gruppo: dati.gruppo as AnteprimaIscrizione['gruppo'] | undefined,
    piano: dati.piano as AnteprimaIscrizione['piano'] | undefined,
  }
}

export async function firmaIscrizione(
  s: SceltaIscrizione & { data_inizio: string },
  impronta: string,
  consensi: Record<string, boolean>,
  firmaPng: string,
): Promise<{ ok: true; esito: EsitoFirma } | { ok: false; errore: string }> {
  const { baby, pt, ...resto } = s
  const { ok, dati } = await abbonamento({ azione: pt ? 'pt_firma' : baby ? 'baby_firma' : 'junior_firma', ...resto, dati_confermati: true, impronta, consensi, firma_png: firmaPng })
  if (ok && dati.numero) return { ok: true, esito: { numero: String(dati.numero), stato: dati.stato as StatoContratto, totale_oggi: Number(dati.totale_oggi ?? 0), cambio: null } }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a registrare il contratto adesso.', 'We couldn’t record the contract right now.') }
}
