import { funzione, type SessioneAdyen } from '@/api/lab'
import { t } from '@/lib/lingua'

// Lo shop dell'app. Dal 06/11/2026 (decisione di Maurizio) **non e' piu' di PerfectGym**: il catalogo e' nostro (CRM → Shop), il pagamento e'
// diretto su Adyen e GoCardless **come le gare** (carta salvata con un tocco, addebito SEPA sul mandato gia' salvato, Drop-in sul web, link nel
// browser sull'app nativa) e la ricevuta arriva alla conferma. Il lavoro lo fa `portale-lab-shop` (repo APP-ATHLON). Qui si legge e si mostra;
// **l'app non calcola mai quanto si paga**: il totale che si vede nel carrello e' una somma per comodita', quello vero lo dice la funzione.
//
// Un articolo puo' avere un **questionario prima del pagamento** (`opzioni`: chi e' l'atleta, la taglia) e puo' essere un **preordine**: si paga
// adesso e si consegna quando la merce arriva. Etichette, aiuti e tabelle delle taglie arrivano dal server **gia' nella lingua della richiesta**:
// l'app mostra quelle, e rimanda indietro solo il valore `v`.

export type CategoriaShop = { id: number; nome: string }

/** Una risposta possibile di una scelta: `v` e' quello che si rimanda, `v_testo` quello che si legge. */
export type ValoreOpzione = { v: string; v_testo: string; gruppo?: string | null }

/** Una tabella (la guida alle taglie): scorre in orizzontale se non sta. */
export type TabellaOpzione = { titolo: string; nota?: string | null; colonne: string[]; righe: string[][] }

/** Un campo del questionario. `persona` = chi del nucleo (vedi `Vetrina.persone`); `scelta` = una voce da una lista chiusa. */
export type Opzione = {
  id: string
  tipo: 'persona' | 'scelta'
  etichetta: string
  aiuto?: string | null
  valori?: ValoreOpzione[]
  tabella?: TabellaOpzione | null
}

/** Chi del nucleo puo' essere l'«atleta»: il titolare e i figli. */
export type PersonaShop = { member_id: number; nome: string | null; cognome: string | null; anno: number | null }

export type ArticoloShop = {
  product_id: number
  nome: string
  prezzo: number
  categoria_id: number
  categoria: string
  descrizione: string | null
  /** Indirizzi pubblici, la prima e' quella dell'elenco. Puo' essere vuoto: al suo posto c'e' il segnaposto. */
  foto: string[]
  esaurito: boolean
  /** Il questionario da compilare prima del carrello. Vuoto per quasi tutti gli articoli. */
  opzioni: Opzione[]
  /** Si paga adesso, si consegna quando la merce arriva. Un ordine con un preordine contiene solo quell'articolo. */
  preordine: boolean
  /** Falso: il preordine e' chiuso e non si compra piu'. Per un articolo che non e' un preordine e' sempre vero. */
  preordine_aperto: boolean
  preordine_chiude: string | null
  consegna_prevista: string | null
  ritiro_testo: string | null
}

export type Vetrina = { categorie: CategoriaShop[]; articoli: ArticoloShop[]; quantita_max: number; persone: PersonaShop[] }

/** La risposta a una domanda: per `persona` il socio scelto, per `scelta` il valore `v`. */
export type ValoreScelta = string | { member_id: number }
export type Scelte = Record<string, ValoreScelta>

/**
 * Una riga del carrello. `id` e' solo locale (per togliere quella riga): non parte mai verso il server. Un articolo con `opzioni` si compra un pezzo per
 * riga, ognuna con le sue `scelte` (due atleti sono due righe); gli altri hanno una riga sola con la quantita'.
 */
export type RigaCarrello = { id: string; product_id: number; quantita: number; scelte?: Scelte }

export type RigaOrdine = {
  product_id: number
  nome: string
  prezzo: number
  quantita: number
  foto: string | null
  /** Le risposte del questionario, gia' scritte («Atleta» «Sara Rossi»). Vuoto per gli articoli senza opzioni. */
  scelte_testo: { etichetta: string; valore: string }[]
}

export type StatoOrdine = 'avviato' | 'pagato' | 'errore'
/** Dove sta la merce: in preordine, ordinata al fornitore, pronta in segreteria, ritirata. Null finche' l'ordine non e' pagato. */
export type StatoRitiro = 'in_attesa' | 'ordinato' | 'pronto' | 'ritirato'

export type Ordine = {
  ordine_id: string
  numero: number | null
  stato: StatoOrdine
  errore: string | null
  totale: number
  creato_il: string
  pagato_il: string | null
  /** Come si e' pagato: `carta` o `sepa` (il conto gia' salvato). */
  pagamento: 'carta' | 'sepa' | null
  /** L'addebito SEPA: in corso (l'ordine e' gia' pagato), incassato, fallito o contestato (la carta prende il suo posto). */
  sepa_stato: 'in_corso' | 'incassato' | 'fallito' | 'contestato' | null
  preordine: boolean
  stato_ritiro: StatoRitiro | null
  arrivato_il: string | null
  consegnato_il: string | null
  righe: RigaOrdine[]
}

const shop = (corpo: Record<string, unknown>) => funzione('portale-lab-shop', corpo)

/**
 * La pagina a cui Adyen riporta dopo una 3D Secure o un metodo con reindirizzamento: `/shop/ordine/<id>`, con `sessionId` e `redirectResult` che
 * `EsitoOrdine` consegna ad Adyen. Intero (come per le gare) perche' lo scrive il server nella sessione.
 */
const ritornoOrdine = (ordineId: string) => `https://app.athlonroma.it/shop/ordine/${ordineId}`

// ---------------------------------------------------------------------------------------------------------------------
// La vetrina

export type EsitoVetrina = ({ ok: true } & Vetrina) | { ok: false; errore: string }

const testoOVuoto = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null)

/** Un'opzione come la manda il server, ripulita: quella che non torna (senza id, tipo sconosciuto) si butta, e non rompe la scheda dell'articolo. */
function opzioneDa(grezza: unknown): Opzione | null {
  const o = grezza as Partial<Opzione> | null
  if (!o || typeof o.id !== 'string' || !o.id || (o.tipo !== 'persona' && o.tipo !== 'scelta') || typeof o.etichetta !== 'string') return null
  const valori = Array.isArray(o.valori)
    ? o.valori.filter((v): v is ValoreOpzione => !!v && typeof v.v === 'string' && typeof v.v_testo === 'string').map((v) => ({ v: v.v, v_testo: v.v_testo, gruppo: testoOVuoto(v.gruppo) }))
    : []
  const tab = o.tabella
  const tabella: TabellaOpzione | null =
    tab && Array.isArray(tab.colonne) && Array.isArray(tab.righe)
      ? { titolo: testoOVuoto(tab.titolo) ?? '', nota: testoOVuoto(tab.nota), colonne: tab.colonne.map(String), righe: tab.righe.filter(Array.isArray).map((r) => r.map(String)) }
      : null
  return { id: o.id, tipo: o.tipo, etichetta: o.etichetta, aiuto: testoOVuoto(o.aiuto), valori, tabella }
}

function articoloDa(g: Partial<ArticoloShop>): ArticoloShop {
  const preordine = g.preordine === true
  return {
    product_id: Number(g.product_id),
    nome: String(g.nome ?? ''),
    prezzo: Number(g.prezzo),
    categoria_id: Number(g.categoria_id),
    categoria: String(g.categoria ?? ''),
    descrizione: testoOVuoto(g.descrizione),
    foto: Array.isArray(g.foto) ? g.foto.filter((u): u is string => typeof u === 'string') : [],
    esaurito: g.esaurito === true,
    opzioni: Array.isArray(g.opzioni) ? g.opzioni.map(opzioneDa).filter((o): o is Opzione => o !== null) : [],
    preordine,
    // Un preordine di cui il server non dice che e' aperto si tiene chiuso: meglio non offrirlo che offrire un acquisto che il server rifiuta.
    preordine_aperto: preordine ? g.preordine_aperto === true : true,
    preordine_chiude: testoOVuoto(g.preordine_chiude),
    consegna_prevista: testoOVuoto(g.consegna_prevista),
    ritiro_testo: testoOVuoto(g.ritiro_testo),
  }
}

export async function leggiVetrina(): Promise<EsitoVetrina> {
  const { ok, dati } = await shop({ azione: 'catalogo' })
  if (ok) {
    return {
      ok: true,
      categorie: (dati.categorie ?? []) as CategoriaShop[],
      articoli: Array.isArray(dati.articoli) ? (dati.articoli as Partial<ArticoloShop>[]).map(articoloDa) : [],
      quantita_max: Number(dati.quantita_max) || 5,
      persone: Array.isArray(dati.persone) ? (dati.persone as PersonaShop[]).filter((p) => p && Number.isInteger(p.member_id)) : [],
    }
  }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere lo shop adesso.', 'We can’t load the shop right now.') }
}

// ---------------------------------------------------------------------------------------------------------------------
// L'ordine

/** Cosa non va in un ordine che la funzione ha rifiutato: dice quale articolo e perche', per toglierlo dal carrello. */
export type RifiutoOrdine = {
  ok: false
  errore: string
  codice?: 'non_in_vendita' | 'esaurito' | 'prezzo_cambiato' | 'preordine_chiuso' | 'scelte' | 'misto'
  product_id?: number
}

/** L'ordine aperto: **non c'e' nessun pagamento**, quello e' un passo dopo (`CassaShop`). `totale` e' quello della funzione. */
export type OrdineAperto = { ok: true; ordine_id: string; numero: number | null; totale: number; preordine: boolean }

/** Apre l'ordine. **Non addebita niente e non porta a nessun pagamento**: dopo si sceglie come pagare. Alla funzione arrivano solo id, quantita' e risposte, mai un prezzo. */
export async function ordina(righe: RigaCarrello[]): Promise<OrdineAperto | RifiutoOrdine> {
  const corpo = righe.map((r) => ({ product_id: r.product_id, quantita: r.quantita, ...(r.scelte ? { scelte: r.scelte } : {}) }))
  const { ok, dati } = await shop({ azione: 'ordina', righe: corpo })
  if (ok && typeof dati.ordine_id === 'string') {
    return { ok: true, ordine_id: dati.ordine_id, numero: dati.numero != null && Number.isFinite(Number(dati.numero)) ? Number(dati.numero) : null, totale: Number(dati.totale), preordine: dati.preordine === true }
  }
  return {
    ok: false,
    errore: dati.errore ?? t('Non riusciamo ad aprire l’ordine adesso.', 'We can’t open the order right now.'),
    codice: typeof dati.codice === 'string' ? (dati.codice as RifiutoOrdine['codice']) : undefined,
    product_id: typeof dati.product_id === 'number' ? dati.product_id : undefined,
  }
}

const STATI_RITIRO: StatoRitiro[] = ['in_attesa', 'ordinato', 'pronto', 'ritirato']

/** Un ordine come lo manda il server, con i campi nuovi sempre presenti: una funzione di prima non li ha, e l'app non deve rompersi. */
function ordineDa(g: Record<string, any>): Ordine {
  const preordine = g.preordine === true
  const stato: StatoOrdine = g.stato === 'pagato' || g.stato === 'errore' ? g.stato : 'avviato'
  const consegnato = typeof g.consegnato_il === 'string' ? g.consegnato_il : null
  // `stato_ritiro` e' null finche' non e' pagato; per un pagato che il server non descrive (una funzione di prima) si ricava da quello che c'e'.
  const stato_ritiro: StatoRitiro | null = STATI_RITIRO.includes(g.stato_ritiro) ? g.stato_ritiro : stato !== 'pagato' ? null : consegnato ? 'ritirato' : preordine ? 'in_attesa' : 'pronto'
  return {
    ordine_id: String(g.ordine_id),
    numero: Number.isFinite(Number(g.numero)) && g.numero != null ? Number(g.numero) : null,
    stato,
    errore: typeof g.errore === 'string' ? g.errore : null,
    totale: Number(g.totale),
    creato_il: String(g.creato_il ?? ''),
    pagato_il: typeof g.pagato_il === 'string' ? g.pagato_il : null,
    pagamento: g.pagamento === 'carta' || g.pagamento === 'sepa' ? g.pagamento : null,
    sepa_stato: g.sepa_stato === 'in_corso' || g.sepa_stato === 'incassato' || g.sepa_stato === 'fallito' || g.sepa_stato === 'contestato' ? g.sepa_stato : null,
    preordine,
    stato_ritiro,
    arrivato_il: typeof g.arrivato_il === 'string' ? g.arrivato_il : null,
    consegnato_il: consegnato,
    righe: (Array.isArray(g.righe) ? g.righe : []).map((r: Record<string, any>) => ({
      product_id: Number(r.product_id),
      nome: String(r.nome ?? ''),
      prezzo: Number(r.prezzo),
      quantita: Number(r.quantita) || 1,
      foto: typeof r.foto === 'string' ? r.foto : null,
      scelte_testo: Array.isArray(r.scelte_testo) ? r.scelte_testo.filter((s: any) => s && typeof s.etichetta === 'string' && typeof s.valore === 'string') : [],
    })),
  }
}

/** Com'e' andato un ordine: finche' e' `avviato` si richiede (la conferma del pagamento arriva dal webhook, qualche secondo dopo). */
export async function esitoOrdine(ordineId: string): Promise<{ ok: true; ordine: Ordine } | { ok: false; errore: string }> {
  const { ok, dati } = await shop({ azione: 'esito', ordine_id: ordineId })
  if (ok) return { ok: true, ordine: ordineDa(dati) }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}

/** I miei ordini: pagati (in preordine, da ritirare o ritirati) e quelli ancora da pagare. */
export async function miOrdini(): Promise<{ ok: true; ordini: Ordine[] } | { ok: false; errore: string }> {
  const { ok, dati } = await shop({ azione: 'ordini' })
  if (ok) return { ok: true, ordini: (Array.isArray(dati.ordini) ? dati.ordini : []).map(ordineDa) }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi ordini adesso.', 'We can’t load your orders right now.') }
}

// ---------------------------------------------------------------------------------------------------------------------
// Il pagamento: le stesse strade delle gare (`api/gare.ts`), sull'ordine. La conferma e' sempre del webhook (Adyen, GoCardless), mai del ritorno dell'app.

const nonRiuscito = t('Non riusciamo a fare il pagamento adesso. Riprova fra qualche minuto.', 'We can’t take the payment right now. Try again in a few minutes.')

/** Il server dice «gia' pagato» in due grafie nelle sue funzioni (`gia_pagata` per le gare, `gia_pagato` qui): le tengo tutte e due. */
const giaPagato = (dati: Record<string, any>) => dati.gia_pagato === true || dati.gia_pagata === true

/** `salva`: il Drop-in salva la carta pagando (lo si dice prima che la persona la scriva). */
export type EsitoSessioneOrdine = ({ ok: true; salva: boolean } & SessioneAdyen) | { ok: true; giaPagato: true } | { ok: false; errore: string }

/** La sessione Adyen per pagare **dentro l'app**, col Drop-in (solo web: nell'app nativa si usa il link di `linkPagamentoOrdine`). */
export async function sessioneOrdine(ordineId: string): Promise<EsitoSessioneOrdine> {
  const { ok, dati } = await shop({ azione: 'sessione', ordine_id: ordineId, ritorno: ritornoOrdine(ordineId) })
  if (!ok) return { ok: false, errore: dati.errore ?? t('Non riusciamo a preparare il pagamento adesso. Riprova fra qualche minuto.', 'We can’t set up the payment right now. Try again in a few minutes.') }
  if (giaPagato(dati)) return { ok: true, giaPagato: true }
  return { ok: true, salva: dati.salva === true, riferimento: String(dati.riferimento), clientKey: String(dati.clientKey), environment: String(dati.environment), sessione: dati.sessione }
}

/** Com'e' andata la sessione, chiesto ad Adyen dal server (`completed`, `refused`, `paymentPending`, `canceled`, `expired`). Non conferma niente. */
export async function esitoSessioneOrdine(ordineId: string, sessioneId: string, risultato: string): Promise<{ ok: true; adyen_status: string | null } | { ok: false }> {
  const { ok, dati } = await shop({ azione: 'esito_sessione', ordine_id: ordineId, sessione_id: sessioneId, risultato })
  return ok && dati.ok !== false ? { ok: true, adyen_status: typeof dati.adyen_status === 'string' ? dati.adyen_status : null } : { ok: false }
}

/** Una carta gia' salvata di chi paga. L'`id` e' quello da rimandare per addebitarla: il server rilegge le carte di chi chiede. */
export type CartaSalvataShop = { id: string; marca: string; cifre: string; scade: string }

/** Le carte gia' salvate da proporre prima del modulo. Mai un errore: senza carte (o se il server non risponde) si paga col modulo, salvando la carta. */
export async function carteSalvateShop(): Promise<CartaSalvataShop[]> {
  const { ok, dati } = await shop({ azione: 'carte' })
  if (!ok || !Array.isArray(dati.carte)) return []
  return dati.carte
    .filter((c: Partial<CartaSalvataShop>) => typeof c?.id === 'string' && typeof c?.cifre === 'string')
    .map((c: CartaSalvataShop) => ({ id: c.id, marca: String(c.marca ?? ''), cifre: c.cifre, scade: String(c.scade ?? '') }))
}

/** Come e' andato l'addebito con un tocco: incassato, da verificare (la schermata aspetta il webhook) o non autorizzato (si propone un'altra carta). */
export type EsitoCartaOrdine = { ok: true; esito: 'autorizzato' | 'in_verifica' | 'non_autorizzato' } | { ok: false; errore: string; cartaPersa?: boolean }

export async function pagaOrdineConCartaSalvata(ordineId: string, cartaId: string): Promise<EsitoCartaOrdine> {
  const { ok, dati } = await shop({ azione: 'paga_carta', ordine_id: ordineId, carta_id: cartaId, ritorno: ritornoOrdine(ordineId) })
  if (ok && (dati.esito === 'autorizzato' || dati.esito === 'in_verifica' || dati.esito === 'non_autorizzato')) return { ok: true, esito: dati.esito }
  if (ok && giaPagato(dati)) return { ok: true, esito: 'in_verifica' }
  return { ok: false, errore: dati.errore ?? nonRiuscito, cartaPersa: dati.codice === 'carta' }
}

/** Il conto (IBAN) gia' salvato su PerfectGym da chi paga: solo le ultime cifre e la banca. `consenso` e' il testo da confermare, scritto dal server per quell'ordine. */
export type ContoSalvatoShop = { cifre: string; banca: string | null; intestatario: string | null; consenso: string }

/** Il conto da proporre accanto alle carte. `null` se non c'e', se l'addebito sul conto non e' acceso o se il server non risponde: si paga con la carta. Mai un errore. */
export async function contoSalvatoShop(ordineId: string): Promise<ContoSalvatoShop | null> {
  const { ok, dati } = await shop({ azione: 'conto', ordine_id: ordineId })
  const c = dati?.conto
  if (!ok || !c || typeof c.cifre !== 'string' || typeof dati.consenso !== 'string') return null
  return { cifre: c.cifre, banca: typeof c.banca === 'string' ? c.banca : null, intestatario: typeof c.intestatario === 'string' ? c.intestatario : null, consenso: dati.consenso }
}

/** L'addebito SEPA: l'ordine e' pagato subito, l'incasso arriva in qualche giorno lavorativo (`dataAddebito`, se GoCardless la dice). */
export type EsitoContoOrdine = { ok: true; esito: 'in_corso'; dataAddebito: string | null } | { ok: true; giaPagato: true } | { ok: false; errore: string; contoPerso?: boolean }

export async function pagaOrdineConConto(ordineId: string): Promise<EsitoContoOrdine> {
  const { ok, dati } = await shop({ azione: 'paga_conto', ordine_id: ordineId, consenso: true })
  if (ok && giaPagato(dati)) return { ok: true, giaPagato: true }
  if (ok && dati.esito === 'in_corso') return { ok: true, esito: 'in_corso', dataAddebito: typeof dati.data_addebito === 'string' ? dati.data_addebito : null }
  return {
    ok: false,
    errore: dati?.errore ?? t('Non riusciamo a fare l’addebito adesso. Puoi pagare con la carta.', 'We can’t make the debit right now. You can pay by card.'),
    contoPerso: dati?.codice === 'conto' || dati?.codice === 'sepa' || dati?.codice === 'non_disponibile',
  }
}

export type EsitoLinkOrdine = { ok: true; url: string } | { ok: true; giaPagato: true; url?: undefined } | { ok: false; errore: string }

/** Il link di pagamento Adyen: si apre nel browser integrato dell'app nativa (dove il Drop-in non c'e'). La conferma resta del webhook. */
export async function linkPagamentoOrdine(ordineId: string): Promise<EsitoLinkOrdine> {
  const { ok, dati } = await shop({ azione: 'paga', ordine_id: ordineId, ritorno: ritornoOrdine(ordineId) })
  if (!ok) return { ok: false, errore: dati.errore ?? t('Non riusciamo a preparare il pagamento adesso. Riprova fra qualche minuto.', 'We can’t set up the payment right now. Try again in a few minutes.') }
  if (giaPagato(dati)) return { ok: true, giaPagato: true }
  if (typeof dati.url !== 'string') return { ok: false, errore: nonRiuscito }
  return { ok: true, url: dati.url }
}
