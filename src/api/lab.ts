import { SUPABASE_URL } from '@/config'
import { supabase } from '@/lib/supabase'

// Il laboratorio (binario B): login proprio, fuori da PerfectGym, solo per i
// tester (tabella portale_lab_tester nel database).
//
// Il codice lo manda la funzione `portale-accesso` dalla coda delle email del
// club; qui si verifica con Supabase Auth, e da li' in poi il portale ha una
// sessione vera, con il suo JWT. Funziona uguale sul web e nell'app.

export async function chiediCodice(email: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-accesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const dati = (await r.json().catch(() => null)) as { ok?: boolean; errore?: string } | null
    if (r.ok && dati?.ok) return { ok: true }
    return { ok: false, errore: dati?.errore || 'Non siamo riusciti a mandarti il codice. Riprova tra poco.' }
  } catch {
    return { ok: false, errore: 'Connessione non riuscita. Controlla la rete e riprova.' }
  }
}

export async function entra(email: string, codice: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const token = codice.replace(/\D/g, '')
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (!error) return { ok: true }
  if (/expired|invalid/i.test(error.message)) return { ok: false, errore: 'Codice sbagliato o scaduto. Controlla l’ultima email che ti abbiamo mandato.' }
  return { ok: false, errore: 'Non siamo riusciti a farti entrare. Riprova tra poco.' }
}

export async function esci() {
  await supabase.auth.signOut()
}

export type PersonaArea = {
  member_id: number
  nome: string | null
  cognome: string | null
  numero: string | null
  data_nascita: string | null
  titolare: boolean
  email: string | null
  telefono: string | null
  /** Un pagamento non andato (saldo negativo su PerfectGym), non quando un addebito e' ancora in corso. */
  debito?: { importo: number; dal: string | null } | null
}

export type ContrattoArea = {
  contract_id: number
  member_id: number
  piano: string | null
  stato: string | null
  data_firma: string | null
  data_inizio: string | null
  data_fine: string | null
  rinnovo_automatico: boolean | null
  canone: number | null
  metodo: unknown
}

export type CertificatoArea = { member_id: number; scadenza: string | null; tipo: string | null; stato: string | null }

export type Area =
  | { trovato: false; email: string }
  | { trovato: true; email: string; titolare: number; persone: PersonaArea[]; contratti: ContrattoArea[]; certificati: CertificatoArea[] }

export type EsitoArea = { ok: true; area: Area } | { ok: false; nonAmmesso: boolean; errore: string }

/** L'area riservata: la legge `portale_la_mia_area()` dal mirror di PerfectGym, solo per chi e' fra i tester. */
export async function laMiaArea(): Promise<EsitoArea> {
  const { data, error } = await supabase.rpc('portale_la_mia_area')
  if (!error) return { ok: true, area: data as Area }
  // 42501 e' anche «permission denied»: e' il rifiuto del tester solo col
  // messaggio della funzione, altrimenti e' un errore come gli altri.
  const nonAmmesso = error.code === '42501' && /tester/i.test(error.message)
  if (!nonAmmesso) console.error('portale_la_mia_area:', error.code, error.message)
  return {
    ok: false,
    nonAmmesso,
    errore: nonAmmesso ? 'Questo indirizzo non è fra i tester del laboratorio.' : 'Non riusciamo a leggere i tuoi dati adesso. Riprova tra poco.',
  }
}

// ---------------------------------------------------------------------------
// Il calendario (tappa 4): lezioni vere di PerfectGym, prenotazioni vere.

export type Lezione = {
  class_id: number
  inizio: string
  fine: string
  nome: string
  /** La macrocategoria di PerfectGym: Corsi Fitness, Group Reformer, Aqua Fitness, … */
  categoria: string
  istruttore: string | null
  posti: number
  iscritti: number
  liberi: number
  iniziata: boolean
  /** Se la prenotazione non e' ancora aperta: da quando (ISO). Si apre tre giorni prima. */
  prenotabile_dal: string | null
  prenotazione: { booking_id: number; attesa: boolean } | null
  /**
   * Il limite delle prenotazioni attive della categoria, se e' gia' pieno (tre
   * per Corsi Fitness, Aqua Fitness e Scuola Nuoto Adulti, una per Group
   * Reformer): `messaggio` dice perche' non si prenota, con le lezioni che lo occupano.
   */
  limite?: { categoria: string; massimo: number; messaggio: string; prenotate: { class_id: number; nome: string; inizio: string; attesa: boolean }[] } | null
  /** La chiave della sua scheda in `Giorno.schede`, se il sito ne ha una. */
  scheda: string | null
}

/** La scheda di una lezione, da https://www.athlonroma.it/lezioni.json (la stessa del planning del sito). */
export type SchedaLezione = {
  nome: string
  /** HTML semplice: <b> e <br>. */
  descrizione: string
  video: string | null
  inizioVideo: number | null
  foto: string | null
  fuoco: string | null
  caratteristiche: { l: string; v: number }[]
}

export type PersonaCalendario = { member_id: number; nome: string | null; cognome: string | null; titolare: boolean }

export type Giorno = {
  persone: PersonaCalendario[]
  giorni: string[]
  data: string
  member_id: number
  prenotazioni_lette: boolean
  lezioni: Lezione[]
  schede: Record<string, SchedaLezione>
}

/** Una funzione del laboratorio, con la sessione del tester. */
async function funzione(nome: string, corpo: Record<string, unknown>): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, stato: 401, dati: { errore: 'Sessione scaduta: entra di nuovo.' } }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: 'Connessione non riuscita. Controlla la rete e riprova.' } }
  }
}

const calendario = (corpo: Record<string, unknown>) => funzione('portale-lab-calendario', corpo)

export async function leggiGiorno(data?: string, memberId?: number): Promise<{ ok: true; giorno: Giorno } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'giorno', data, member_id: memberId })
  if (ok) return { ok: true, giorno: dati as unknown as Giorno }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere il calendario adesso.' }
}

/** Il prodotto PerfectGym che apre la prenotazione di una lezione, per chi non ce l'ha compreso. */
export type ProdottoLezione = { product_id: number; nome: string; prezzo: number | null }

/** La carta gia' salvata su PerfectGym: si mostra, e si paga con quella. */
export type CartaSalvata = { id: number; finale: string | null; scadenza: string | null }

/** Cosa serve per comprare l'ingresso: il prodotto, il link gia' aperto e, se c'e', la carta salvata. */
export type DaPagare = { prodotto: ProdottoLezione; url?: string; acquisto_id?: string; carta?: CartaSalvata | null }

export async function prenotaLezione(
  classId: number,
  memberId: number,
): Promise<
  { ok: true; esito: 'prenotato' | 'attesa'; booking_id: number | null } | ({ ok: false; errore: string } & Partial<DaPagare>)
> {
  const { ok, dati } = await calendario({ azione: 'prenota', class_id: classId, member_id: memberId })
  if (ok) return { ok: true, esito: dati.esito, booking_id: dati.booking_id ?? null }
  // Manca il prodotto (niente abbonamento che comprenda la lezione) e PerfectGym
  // lo vende: il link di pagamento e' gia' aperto.
  if (dati.da_pagare && dati.prodotto) {
    return {
      ok: false,
      errore: dati.errore ?? 'Questa lezione non è compresa nel tuo abbonamento.',
      prodotto: dati.prodotto,
      url: typeof dati.url === 'string' ? dati.url : undefined,
      acquisto_id: typeof dati.acquisto_id === 'string' ? dati.acquisto_id : undefined,
      carta: dati.carta ?? null,
    }
  }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a prenotare adesso.' }
}

/** Il link di pagamento di PerfectGym per il prodotto della lezione; dopo il pagamento si torna al calendario con ?acquisto=<id>. */
export async function acquistaLezione(classId: number, memberId: number): Promise<{ ok: true; url: string; acquisto_id: string } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'acquista', class_id: classId, member_id: memberId })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url, acquisto_id: String(dati.acquisto_id ?? '') }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il pagamento adesso.' }
}

/** L'ingresso addebitato sulla carta gia' salvata, senza uscire; l'esito come al ritorno dal pagamento. */
export async function pagaLezioneConCarta(acquistoId: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'paga_con_carta', acquisto_id: acquistoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'La carta non è stata addebitata.' }
}

export type EsitoAcquisto = {
  stato: 'avviato' | 'prenotato' | 'attesa' | 'errore'
  errore: string | null
  class_id: number
  member_id: number
  /** La lezione pagata, per dire cosa e' successo (la lista d'attesa vale per la stessa categoria). */
  lezione?: string | null
  categoria?: string | null
  inizio?: string | null
  giorno?: string | null
}

export async function esitoAcquistoLezione(acquistoId: string): Promise<{ ok: true; esito: EsitoAcquisto } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'esito_acquisto', acquisto_id: acquistoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoAcquisto }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il pagamento adesso.' }
}

export async function disdiciLezione(classId: number, memberId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await calendario({ azione: 'disdici', class_id: classId, member_id: memberId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a disdire adesso.' }
}

// ---------------------------------------------------------------------------
// Il personal training (15/10/2026): le sedute che la persona ha, gli orari
// liberi dei trainer e la prenotazione vera su PerfectGym (portale-lab-personal).
// Come le lezioni: la seduta si scala alla prenotazione, e chi non ne ha la
// compra (salva e paga) e al ritorno si prenota l'orario scelto.

const personal = (corpo: Record<string, unknown>) => funzione('portale-lab-personal', corpo)

/** Le sedute che la persona ha da usare, per tipo (il pacchetto del mese, un omaggio, una seduta comprata). */
export type CreditoPersonal = { definition_id: number; nome: string; minuti: number; product_id: number; quantita: number; scadenza: string | null }
/** La seduta singola che PerfectGym le vende (da socio o per esterni). */
export type AcquistoPersonal = { definition_id: number; nome: string; minuti: number; prodotto: ProdottoLezione }
export type SedutaPersonal = { booking_id: number; definition_id: number; nome: string; inizio: string; fine: string; trainer_id: number; trainer: string | null; completata: boolean }
/**
 * Un trainer di personal: foto e descrizione dalla sua scheda su PerfectGym,
 * col ripiego del sito (/trainer.json), che da' anche frase e specializzazioni.
 */
export type TrainerPersonal = {
  id: number
  nome: string
  foto: string | null
  descrizione: string | null
  descrizione_da: 'perfectgym' | 'sito' | null
  frase: string | null
  gruppi: { titolo: string; voci: string[] }[]
}

export type StatoPersonal = {
  persone: PersonaCalendario[]
  member_id: number
  /** Falso se PerfectGym non ha risposto: sedute e prenotazioni potrebbero mancare. */
  letti: boolean
  crediti: CreditoPersonal[]
  acquisto: AcquistoPersonal | null
  prenotate: SedutaPersonal[]
  trainer: TrainerPersonal[]
  disdetta_ore: number
  /** La carta salvata su PerfectGym, per pagare senza uscire. */
  carta: CartaSalvata | null
  /** L'abbonamento aggiuntivo PT in vendita: solo a chi ha un abbonamento attivo e non ne ha gia' uno PT. */
  pacchetti: PacchettoPersonal[]
  /** Il nome dell'abbonamento PT che la persona ha gia', se ce l'ha. */
  pacchetto_attivo: string | null
  /** I consensi del contratto da accettare per attivarlo. */
  consensi_contratto: { id: number; nome: string; allegato: string | null }[]
}

export type PacchettoPersonal = { piano_id: number; nome: string; sedute: number | null; prezzo_mese: number }

export async function statoPersonal(memberId?: number): Promise<Esito<{ stato: StatoPersonal }>> {
  const { ok, dati } = await personal({ azione: 'stato', member_id: memberId })
  if (ok) return { ok: true, stato: dati as unknown as StatoPersonal }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere il personal training adesso.' }
}

/** Un orario libero: l'istante, l'ora di Roma come la scrive PerfectGym (da rimandare), e il trainer. */
export type OrarioPersonal = { inizio: string; locale: string; trainer_id: number }
export type OrariPersonal = { definition_id: number; minuti: number; giorni: string[]; trainer: TrainerPersonal[]; orari: OrarioPersonal[]; incompleti: boolean }

export async function orariPersonal(memberId: number, definitionId: number): Promise<Esito<{ orari: OrariPersonal }>> {
  const { ok, dati } = await personal({ azione: 'orari', member_id: memberId, definition_id: definitionId })
  if (ok) return { ok: true, orari: dati as unknown as OrariPersonal }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere gli orari dei trainer adesso.' }
}

export type ScelteSeduta = { member_id: number; definition_id: number; trainer_id: number; locale: string }

export async function prenotaPersonal(s: ScelteSeduta): Promise<{ ok: true; booking_id: number } | ({ ok: false; errore: string } & Partial<DaPagare>)> {
  const { ok, dati } = await personal({ azione: 'prenota', ...s })
  if (ok) return { ok: true, booking_id: Number(dati.booking_id ?? 0) }
  if (dati.da_pagare && dati.prodotto) {
    return {
      ok: false,
      errore: dati.errore ?? 'Non hai sedute da usare.',
      prodotto: dati.prodotto,
      url: typeof dati.url === 'string' ? dati.url : undefined,
      acquisto_id: typeof dati.acquisto_id === 'string' ? dati.acquisto_id : undefined,
      carta: dati.carta ?? null,
    }
  }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a prenotare adesso.' }
}

/** Il link di pagamento della seduta; dopo il pagamento si torna a /lab/personal?acquisto=<id>. */
export async function acquistaPersonal(
  s: Omit<ScelteSeduta, 'definition_id'>,
): Promise<{ ok: true; url: string; acquisto_id: string; prodotto: ProdottoLezione | null; carta: CartaSalvata | null } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'acquista', ...s })
  if (ok && typeof dati.url === 'string') {
    return { ok: true, url: dati.url, acquisto_id: String(dati.acquisto_id ?? ''), prodotto: dati.prodotto ?? null, carta: dati.carta ?? null }
  }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il pagamento adesso.' }
}

export async function pagaPersonalConCarta(acquistoId: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'paga_con_carta', acquisto_id: acquistoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'La carta non è stata addebitata.' }
}

export type EsitoAcquistoPersonal = { stato: 'avviato' | 'prenotato' | 'errore'; errore: string | null; member_id: number; inizio: string | null; trainer: string | null }

export async function esitoAcquistoPersonal(acquistoId: string): Promise<{ ok: true; esito: EsitoAcquistoPersonal } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'esito_acquisto', acquisto_id: acquistoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoAcquistoPersonal }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il pagamento adesso.' }
}

/** La seduta singola senza orario: con la carta salvata si paga subito, senza si apre la pagina di pagamento. */
export async function compraSedutaPersonal(memberId: number, conCarta: boolean): Promise<{ ok: true; url: string | null } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'compra_seduta', member_id: memberId, con_carta: conCarta })
  if (ok) return { ok: true, url: typeof dati.url === 'string' ? dati.url : null }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il pagamento adesso.' }
}

/** L'abbonamento aggiuntivo PT: il contratto e la prima quota. */
export async function attivaPacchettoPersonal(
  memberId: number,
  pianoId: number,
  conCarta: boolean,
): Promise<{ ok: true; pacchetto_id: string; url: string | null; stato: 'avviato' | 'pagato' } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'pacchetto', member_id: memberId, piano_id: pianoId, accetto: true, con_carta: conCarta })
  if (ok && dati.pacchetto_id) {
    return { ok: true, pacchetto_id: String(dati.pacchetto_id), url: typeof dati.url === 'string' ? dati.url : null, stato: dati.stato === 'pagato' ? 'pagato' : 'avviato' }
  }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad attivare l’abbonamento adesso.' }
}

export type EsitoPacchettoPersonal = { stato: 'avviato' | 'pagato' | 'errore'; errore: string | null; member_id: number; nome: string }

export async function esitoPacchettoPersonal(pacchettoId: string): Promise<{ ok: true; esito: EsitoPacchettoPersonal } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'esito_pacchetto', pacchetto_id: pacchettoId })
  if (ok) return { ok: true, esito: dati as unknown as EsitoPacchettoPersonal }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il pagamento adesso.' }
}

export async function disdiciPersonal(memberId: number, bookingId: number): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await personal({ azione: 'disdici', member_id: memberId, booking_id: bookingId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a disdire adesso.' }
}

// ---------------------------------------------------------------------------
// I pagamenti (tappa 4b): Adyen diretto, soldi veri, tetto di 5 euro. Il lavoro
// con Adyen lo fa `lab-pagamenti` nel CRM; `portale-lab-pagamenti` controlla
// solo chi chiama e che l'abbonamento sia suo.

export type PianoLab = { id: string; nome: string; importo_cent: number; rate_totali: number; intervallo_giorni: number }

export type StatoPagamentoLab = 'creato' | 'in_attesa' | 'in_verifica' | 'autorizzato' | 'rifiutato' | 'errore' | 'annullato' | 'scaduto' | 'abbandonato'
export type StatoAbbonamentoLab = 'in_attesa' | 'attivo' | 'insoluto' | 'completato' | 'chiuso'

/** Gli addebiti che aspettano ancora un esito: le pagine si aggiornano da sole. */
export const STATI_IN_CORSO: StatoPagamentoLab[] = ['creato', 'in_attesa', 'in_verifica']

export type PagamentoLab = {
  riferimento: string
  numero_rata: number
  tentativo: number
  importo_cent: number
  stato: StatoPagamentoLab
  esito: string | null
  motivo: string | null
  creato_il: string
  aggiornato_il: string
}

export type AbbonamentoLab = {
  id: string
  creato_il: string
  piano: string
  importo_cent: number
  rate_totali: number
  intervallo_giorni: number
  prossima_il: string | null
  stato: StatoAbbonamentoLab
  metodo: string | null
  ultime_quattro: string | null
  scadenza_carta: string | null
  segnalazione: string | null
  pagamenti: PagamentoLab[]
}

/** Un pagamento visto dalla sua pagina di stato. */
export type StatoDelPagamento = {
  riferimento: string
  numero_rata: number
  tentativo: number
  importo_cent: number
  stato: StatoPagamentoLab
  esito: string | null
  motivo: string | null
  abbonamento_id: string
  piano: string
  stato_abbonamento: StatoAbbonamentoLab
  rate_totali: number
  prossima_il: string | null
  metodo: string | null
  ultime_quattro: string | null
}

/** Quello che serve al Drop-in di Adyen per aprire il pagamento. */
export type SessioneAdyen = {
  riferimento: string
  clientKey: string
  environment: string
  sessione: { id: string; sessionData: string }
}

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string }

const pagamenti = (corpo: Record<string, unknown>) => funzione('portale-lab-pagamenti', corpo)

export async function elencoPagamenti(): Promise<Esito<{ piani: PianoLab[]; abbonamenti: AbbonamentoLab[] }>> {
  const { ok, dati } = await pagamenti({ azione: 'elenco' })
  if (ok) return { ok: true, piani: dati.piani, abbonamenti: dati.abbonamenti }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i pagamenti adesso.' }
}

export async function avviaPagamento(pianoId: string): Promise<Esito<SessioneAdyen>> {
  const { ok, dati } = await pagamenti({ azione: 'checkout', piano_id: pianoId })
  if (ok) return { ok: true, riferimento: dati.riferimento, clientKey: dati.clientKey, environment: dati.environment, sessione: dati.sessione }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti ad aprire il pagamento adesso.' }
}

export async function statoPagamento(riferimento: string): Promise<Esito<{ pagamento: StatoDelPagamento }>> {
  const { ok, dati } = await pagamenti({ azione: 'stato', riferimento })
  if (ok) return { ok: true, pagamento: dati.pagamento }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere il pagamento adesso.' }
}

/** Chiede ad Adyen, dal server, come e' andata la sessione: il browser non fa fede. */
export async function esitoPagamento(riferimento: string, sessioneId: string, risultato: string): Promise<Esito<{ adyen_status: string | null }>> {
  const { ok, dati } = await pagamenti({ azione: 'esito', riferimento, sessione_id: sessioneId, risultato })
  if (ok) return { ok: true, adyen_status: dati.adyen_status ?? null }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a verificare il pagamento adesso.' }
}

export async function configurazioneAdyen(): Promise<Esito<{ clientKey: string; environment: string }>> {
  const { ok, dati } = await pagamenti({ azione: 'config' })
  if (ok) return { ok: true, clientKey: dati.clientKey, environment: dati.environment }
  return { ok: false, errore: dati.errore ?? 'Configurazione di Adyen non disponibile.' }
}

export async function addebitaRata(abbonamentoId: string): Promise<Esito<{ rata: number; esito: string | null; motivo: string | null }>> {
  const { ok, dati } = await pagamenti({ azione: 'addebita', abbonamento_id: abbonamentoId })
  if (ok) return { ok: true, rata: dati.rata, esito: dati.esito ?? null, motivo: dati.motivo ?? null }
  return { ok: false, errore: dati.errore ?? 'Addebito non riuscito.' }
}

export async function chiudiAbbonamento(abbonamentoId: string): Promise<Esito<object>> {
  const { ok, dati } = await pagamenti({ azione: 'chiudi', abbonamento_id: abbonamentoId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'Non siamo riusciti a chiuderlo adesso.' }
}

// ---------------------------------------------------------------------------
// L'anagrafica (laboratorio): i dati del titolare dalla scheda di PerfectGym,
// e la modifica dei contatti. Il lavoro lo fa `portale-lab-anagrafica`
// (repo APP-ATHLON), che controlla chi chiama e scrive su PerfectGym:
//
//   { azione: 'leggi' }                          -> { ok, anagrafica }
//   { azione: 'salva', telefono } oppure
//   { azione: 'salva', indirizzo: { via, cap, citta } }
//                                                -> { ok, anagrafica }
//   { azione: 'email', email }                   -> { ok }  (manda un codice al nuovo indirizzo)
//   { azione: 'conferma_email', email, codice }  -> { ok, anagrafica }
//
// La funzione non risponde mai 404 per una scheda che non trova: qui il 404
// vuol dire che non e' pubblicata, e il profilo resta in sola lettura.
//
// L'email e' anche quella con cui si entra e con cui il portale trova la
// scheda: cambia solo dopo il codice arrivato al nuovo indirizzo, e la
// funzione aggiorna insieme PerfectGym e l'utente di Supabase Auth.

/** L'indirizzo come lo tiene PerfectGym: via, CAP e citta' (la provincia non e' un suo campo di testo). */
export type Indirizzo = { via: string | null; cap: string | null; citta: string | null }

export type Anagrafica = {
  member_id: number
  nome: string | null
  cognome: string | null
  sesso: string | null
  data_nascita: string | null
  luogo_nascita: string | null
  codice_fiscale: string | null
  numero: string | null
  email: string | null
  telefono: string | null
  indirizzo: Indirizzo | null
}

/** `nonAttiva`: la funzione non c'e' ancora (404): si mostra la sola lettura. */
export type EsitoAnagrafica = { ok: true; anagrafica: Anagrafica } | { ok: false; errore: string; nonAttiva: boolean }

const anagrafica = (corpo: Record<string, unknown>) => funzione('portale-lab-anagrafica', corpo)

function esitoAnagrafica(r: { ok: boolean; stato: number; dati: Record<string, any> }, predefinito: string): EsitoAnagrafica {
  if (r.ok && r.dati.anagrafica) return { ok: true, anagrafica: r.dati.anagrafica as Anagrafica }
  if (r.stato === 404) return { ok: false, nonAttiva: true, errore: 'La modifica dei dati non è ancora attiva nel laboratorio.' }
  return { ok: false, nonAttiva: false, errore: r.dati.errore ?? predefinito }
}

export async function leggiAnagrafica(): Promise<EsitoAnagrafica> {
  return esitoAnagrafica(await anagrafica({ azione: 'leggi' }), 'Non riusciamo a leggere i tuoi dati adesso.')
}

export async function salvaTelefono(telefono: string): Promise<EsitoAnagrafica> {
  return esitoAnagrafica(await anagrafica({ azione: 'salva', telefono }), 'Non siamo riusciti a salvare il telefono.')
}

export async function salvaIndirizzo(indirizzo: Indirizzo): Promise<EsitoAnagrafica> {
  return esitoAnagrafica(await anagrafica({ azione: 'salva', indirizzo }), 'Non siamo riusciti a salvare l’indirizzo.')
}

export async function chiediCambioEmail(email: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const r = await anagrafica({ azione: 'email', email })
  if (r.ok) return { ok: true }
  if (r.stato === 404) return { ok: false, errore: 'La modifica dei dati non è ancora attiva nel laboratorio.' }
  return { ok: false, errore: r.dati.errore ?? 'Non siamo riusciti a mandare il codice al nuovo indirizzo.' }
}

export async function confermaCambioEmail(email: string, codice: string): Promise<EsitoAnagrafica> {
  const esito = esitoAnagrafica(await anagrafica({ azione: 'conferma_email', email, codice: codice.replace(/\D/g, '') }), 'Codice sbagliato o scaduto.')
  // La funzione ha cambiato l'email anche su Supabase Auth: la sessione si
  // rinnova, cosi' il token porta gia' quella nuova.
  if (esito.ok) await supabase.auth.refreshSession().catch(() => undefined)
  return esito
}

// ---------------------------------------------------------------------------
// Athlon TV: gli showcase di Vimeo del club, da `portale-lab-video` (repo
// APP-ATHLON), che tiene il token di Vimeo. Tre livelli: gli showcase, i
// video di uno showcase, i link per riprodurne uno (che scadono: si chiedono
// quando lo si apre).

export type VideoClub = {
  id: string
  titolo: string
  descrizione: string | null
  /** In secondi. */
  durata: number
  copertina: string | null
  miniatura: string | null
  pubblicato_il: string | null
}

/** `fuoco`: il punto della copertina da tenere al centro («50% 70%»), se il sito lo indica. */
export type Vetrina = { id: string; titolo: string; descrizione: string | null; copertina: string | null; fuoco?: string | null; totale: number }

export type VideoDaGuardare = VideoClub & { vetrina: { id: string; titolo: string }; hls: string | null; mp4: string | null }

const tv = (corpo: Record<string, unknown>) => funzione('portale-lab-video', corpo)

export async function leggiVetrine(): Promise<Esito<{ vetrine: Vetrina[] }>> {
  const { ok, dati } = await tv({ azione: 'vetrine' })
  if (ok) return { ok: true, vetrine: dati.vetrine as Vetrina[] }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i video adesso.' }
}

export async function leggiVetrina(id: string): Promise<Esito<{ vetrina: Vetrina; video: VideoClub[] }>> {
  const { ok, dati } = await tv({ azione: 'vetrina', id })
  if (ok) return { ok: true, vetrina: dati.vetrina as Vetrina, video: dati.video as VideoClub[] }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i video adesso.' }
}

export async function apriVideo(id: string, vetrina: string): Promise<Esito<{ video: VideoDaGuardare }>> {
  const { ok, dati } = await tv({ azione: 'video', id, vetrina })
  if (ok) return { ok: true, video: dati.video as VideoDaGuardare }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il video adesso.' }
}

// ---------------------------------------------------------------------------
// Le schede di allenamento (16/10/2026), da `portale-lab-schede` (repo
// APP-ATHLON): le schede del socio (standard, personalizzate, AI), la seduta
// col registro delle serie, lo storico e i progressi, e la scheda chiesta
// all'agente AI. Il piano e' in docs/piano-schede.md.

export type RigaSchedaLab = {
  id: string
  tipo: 'standard' | 'personalizzata' | 'ai'
  titolo: string
  descrizione: string | null
  obiettivo: string | null
  livello: string | null
  giorni_settimana: number | null
  giorni: number
  ultimo: string | null
}

export type SedutaBreve = { id: string; inizio: string; fine: string | null; giorno_nome: string | null; titolo: string | null; serie: number }

export type EsercizioScheda = {
  /** La riga della scheda (scheda_esercizi.id). */
  id: string
  esercizio_id: string
  nome: string
  serie: number
  ripetizioni: string
  carico: string | null
  /** La percentuale del massimale: con il massimale del socio diventa chili (o ripetizioni a corpo libero). */
  percentuale: number | null
  recupero_serie: number
  recupero_dopo: number
  superserie: string | null
  note: string | null
  immagini: string[]
  video: string | null
  muscoli_primari: string[]
  attrezzo: string | null
  istruzioni: string[]
  /** L'incremento della macchina (5 kg, 2,5 kg) e il peso minimo: i chili si arrotondano per difetto a quelli. */
  incremento_kg: number | null
  peso_minimo_kg: number | null
  /** Se l'esercizio e' nel test dei massimali, e come: a carico o a ripetizioni. */
  test: 'carico' | 'ripetizioni' | null
}

/** Il massimale del socio per un esercizio: i kg stimati per una ripetizione, o le ripetizioni massime. */
export type Massimale = {
  esercizio_id: string
  tipo: 'carico' | 'ripetizioni'
  massimale: number
  kg: number | null
  ripetizioni: number
  /**
   * test: dal test dei massimali; seduta: tarato alla prima seduta; stima:
   * stimato dal test del distretto (arti superiori, inferiori, core) per un
   * esercizio che il test non misura. La stima non e' salvata: la prima
   * seduta la sostituisce.
   */
  fonte: 'test' | 'seduta' | 'stima'
  creato_il: string
}

export type StatoTest = { ultimo: string | null; fatti: number; totale: number; giorni: number }

export type GiornoSchedaLab = { id: string; nome: string; note: string | null; esercizi: EsercizioScheda[] }

export type SchedaLab = {
  id: string
  tipo: 'standard' | 'personalizzata' | 'ai'
  titolo: string
  descrizione: string | null
  obiettivo: string | null
  livello: string | null
  giorni_settimana: number | null
  rivista_il: string | null
  giorni: GiornoSchedaLab[]
}

export type SerieFatta = { numero: number; ripetizioni: number | null; kg: number | null; secondi: number | null }
export type Precedente = { esercizio_id: string; inizio: string; serie: SerieFatta[] }
export type SerieSeduta = SerieFatta & { scheda_esercizio_id: string; esercizio_id: string }

export type Questionario = {
  obiettivo: string
  livello: 'principiante' | 'intermedio' | 'esperto'
  giorni: number
  minuti: number
  attrezzatura: 'sala_completa' | 'manubri_e_corpo_libero' | 'corpo_libero'
  limitazioni: string
  note: string
}

const schedeLab = (corpo: Record<string, unknown>) => funzione('portale-lab-schede', corpo)

export async function elencoSchede(): Promise<Esito<{ schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: { usate: number; massimo: number }; test: StatoTest }>> {
  const { ok, dati } = await schedeLab({ azione: 'elenco' })
  if (ok) return { ok: true, schede: dati.schede, ultimi: dati.ultimi, ai: dati.ai, test: dati.test ?? { ultimo: null, fatti: 0, totale: 0, giorni: 42 } }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere le tue schede adesso.' }
}

export async function leggiSchedaLab(id: string): Promise<Esito<{ scheda: SchedaLab; precedenti: Precedente[]; massimali: Massimale[]; ultimoTest: string | null; giorniTest: number }>> {
  const { ok, dati } = await schedeLab({ azione: 'scheda', id })
  if (ok) {
    return {
      ok: true,
      scheda: dati.scheda,
      precedenti: dati.precedenti ?? [],
      massimali: dati.massimali ?? [],
      ultimoTest: dati.ultimo_test ?? null,
      giorniTest: dati.giorni_test ?? 42,
    }
  }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire la scheda adesso.' }
}

export async function iniziaSeduta(schedaId: string, giornoId: string): Promise<Esito<{ allenamento: { id: string; inizio: string }; serie: SerieSeduta[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'inizia', scheda_id: schedaId, giorno_id: giornoId })
  if (ok) return { ok: true, allenamento: dati.allenamento, serie: (dati.serie ?? []).map((s: any) => ({ ...s, kg: s.kg == null ? null : Number(s.kg) })) }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a iniziare l’allenamento adesso.' }
}

export async function segnaSerie(s: { allenamento_id: string; scheda_esercizio_id: string; esercizio_id: string; numero: number; ripetizioni: number | null; kg: number | null; secondi?: number | null }): Promise<Esito<object>> {
  const { ok, dati } = await schedeLab({ azione: 'serie', ...s })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'La serie non è stata salvata.' }
}

export async function togliSerie(allenamentoId: string, schedaEsercizioId: string, numero: number): Promise<Esito<object>> {
  const { ok, dati } = await schedeLab({ azione: 'togli_serie', allenamento_id: allenamentoId, scheda_esercizio_id: schedaEsercizioId, numero })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'La serie non è stata tolta.' }
}

export async function chiudiSeduta(allenamentoId: string, note?: string): Promise<Esito<{ vuota: boolean }>> {
  const { ok, dati } = await schedeLab({ azione: 'fine', allenamento_id: allenamentoId, note })
  if (ok) return { ok: true, vuota: dati.vuota === true }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a chiudere l’allenamento adesso.' }
}

export type SedutaStorico = SedutaBreve & { note: string | null; esercizi: number; volume: number }
export type EsercizioFatto = { esercizio_id: string; nome: string; immagini: string[]; sedute: number; kg_massimo: number | null }

export async function storicoAllenamenti(): Promise<Esito<{ allenamenti: SedutaStorico[]; esercizi: EsercizioFatto[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'storico' })
  if (ok) return { ok: true, allenamenti: dati.allenamenti, esercizi: dati.esercizi }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i tuoi allenamenti adesso.' }
}

export type SedutaEsercizio = { inizio: string; kg_massimo: number | null; ripetizioni_massime: number | null; volume: number; serie: SerieFatta[] }

export async function progressiEsercizio(esercizioId: string): Promise<Esito<{ esercizio: { id: string; nome: string; immagini: string[]; video: string | null; muscoli_primari: string[] }; sedute: SedutaEsercizio[] }>> {
  const { ok, dati } = await schedeLab({ azione: 'progressi', esercizio_id: esercizioId })
  if (ok) return { ok: true, esercizio: dati.esercizio, sedute: dati.sedute }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i progressi adesso.' }
}

/** L'agente AI ci mette fino a un paio di minuti. */
export async function chiediSchedaAi(questionario: Questionario): Promise<Esito<{ id: string }>> {
  const { ok, dati } = await schedeLab({ azione: 'chiedi_ai', questionario })
  if (ok) return { ok: true, id: dati.id }
  return { ok: false, errore: dati.errore ?? 'L’agente non è riuscito a scrivere la scheda adesso. Riprova fra qualche minuto.' }
}

/** L'indirizzo pubblico di un'immagine o di un video degli esercizi (bucket «esercizi»). */
export function urlEsercizio(percorso: string | null | undefined): string | null {
  if (!percorso) return null
  if (/^https?:\/\//.test(percorso)) return percorso
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/esercizi/${percorso}`
}

// Il test dei massimali: gli esercizi del test (superiore, core, inferiore)
// coi risultati precedenti, e il salvataggio di un risultato.

export type EsercizioTest = {
  id: string
  nome: string
  immagini: string[]
  video: string | null
  istruzioni: string[]
  muscoli_primari: string[]
  attrezzo: string | null
  test: 'carico' | 'ripetizioni'
  test_gruppo: 'superiore' | 'core' | 'inferiore'
  test_ordine: number | null
  incremento_kg: number | null
  peso_minimo_kg: number | null
  ultimo: { kg: number | null; ripetizioni: number; massimale: number; creato_il: string } | null
}

export async function testMassimali(): Promise<Esito<{ esercizi: EsercizioTest[]; ultimo: string | null; giorni: number }>> {
  const { ok, dati } = await schedeLab({ azione: 'test' })
  if (ok) return { ok: true, esercizi: dati.esercizi, ultimo: dati.ultimo ?? null, giorni: dati.giorni ?? 42 }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il test adesso.' }
}

export async function salvaTestMassimale(esercizioId: string, kg: number | null, ripetizioni: number): Promise<Esito<{ massimale: number; tipo: 'carico' | 'ripetizioni' }>> {
  const { ok, dati } = await schedeLab({ azione: 'salva_test', esercizio_id: esercizioId, kg, ripetizioni })
  if (ok) return { ok: true, massimale: Number(dati.massimale), tipo: dati.tipo }
  return { ok: false, errore: dati.errore ?? 'Il risultato non è stato salvato.' }
}

// ---------------------------------------------------------------------------
// I dati del corpo (16/10/2026): altezza, peso, circonferenze, composizione.

export type Misura = {
  id: string
  /** «AAAA-MM-GG». */
  data: string
  altezza_cm: number | null
  peso_kg: number | null
  vita_cm: number | null
  fianchi_cm: number | null
  petto_cm: number | null
  braccio_cm: number | null
  coscia_cm: number | null
  massa_grassa_pct: number | null
  massa_magra_kg: number | null
  note: string | null
  inserita_da: string
}

export type NuovaMisura = Partial<Omit<Misura, 'id' | 'inserita_da'>>

const misureLab = (corpo: Record<string, unknown>) => funzione('portale-lab-misure', corpo)

/** Il sesso per la stima delle calorie, scelto dal socio (quello di PerfectGym non e' affidabile). */
export type SessoCalcolo = 'm' | 'f' | null

/** Le misurazioni del socio, dalla piu' vecchia, e il sesso scelto per le calorie. */
export async function elencoMisure(): Promise<Esito<{ misure: Misura[]; sesso: SessoCalcolo }>> {
  const { ok, dati } = await misureLab({ azione: 'elenco' })
  if (ok) return { ok: true, misure: dati.misure ?? [], sesso: dati.sesso === 'm' || dati.sesso === 'f' ? dati.sesso : null }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i tuoi dati adesso.' }
}

/** Una misurazione: quella dello stesso giorno si sostituisce. */
export async function salvaMisura(m: NuovaMisura): Promise<Esito<{ misura: Misura }>> {
  const { ok, dati } = await misureLab({ azione: 'salva', ...m })
  if (ok) return { ok: true, misura: dati.misura }
  return { ok: false, errore: dati.errore ?? 'I dati non sono stati salvati.' }
}

export async function salvaSessoCalcolo(sesso: SessoCalcolo): Promise<Esito<{ sesso: SessoCalcolo }>> {
  const { ok, dati } = await misureLab({ azione: 'sesso', sesso })
  if (ok) return { ok: true, sesso: dati.sesso ?? null }
  return { ok: false, errore: dati.errore ?? 'La scelta non è stata salvata.' }
}

export async function eliminaMisura(id: string): Promise<Esito<object>> {
  const { ok, dati } = await misureLab({ azione: 'elimina', id })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? 'La misurazione non è stata tolta.' }
}

// ---------------------------------------------------------------------------
// Il metodo di pagamento vero (PerfectGym), dall'app (16/10/2026): la stessa
// procedura del link per email, senza l'email. `portale-lab-pagamenti` apre la
// richiesta del nucleo e da' il suo token; il resto lo fa `portale-link`.

export async function tokenMetodoPagamento(): Promise<Esito<{ token: string }>> {
  const { ok, dati } = await pagamenti({ azione: 'metodo_link' })
  if (ok && typeof dati.token === 'string') return { ok: true, token: dati.token }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il metodo di pagamento adesso.' }
}

// ---------------------------------------------------------------------------
// I pagamenti veri del nucleo (15/10/2026), dal mirror di PerfectGym:
// lo storico, le quote scadute da saldare e quelle future.

export type VoceMovimento = { cosa: string; dettaglio: string | null; importo: number | null }

export type Movimento = {
  id: string
  data: string | null
  importo: number
  esito: 'riuscito' | 'rimborso' | 'in_corso' | 'da_pagare'
  metodo: string | null
  titolo: string
  voci: VoceMovimento[]
  /** Il nome del familiare, se non e' per il titolare. */
  per: string | null
  scadenza: string | null
  nota: string | null
}

export type QuotaFutura = {
  id: string
  scadenza: string
  importo: number
  totale: number
  titolo: string
  dettaglio: string | null
  per: string | null
  metodo: string | null
  /** «AAAA-MM» della carta registrata. */
  carta_scade: string | null
}

export async function movimentiPagamenti(): Promise<Esito<{ storico: Movimento[]; daSaldare: Movimento[]; futuri: QuotaFutura[] }>> {
  const { ok, dati } = await pagamenti({ azione: 'movimenti' })
  if (ok) return { ok: true, storico: dati.storico ?? [], daSaldare: dati.da_saldare ?? [], futuri: dati.futuri ?? [] }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i tuoi pagamenti adesso.' }
}
