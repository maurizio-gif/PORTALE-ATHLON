// Il Guest Pass dal link: cosa manda `guest-pass` (azione `pagina`) alla pagina
// /r/<codice>, e le parole delle scelte.

import { locale, t, tv } from './lingua'

export type PersonaGuestPass = {
  trovata: boolean
  nome: string | null
  cognome: string | null
  email: string | null
  telefono: string | null
  nascita: string | null
  /** Null per chi e' residente all'estero: il segnaposto di PerfectGym non si vede mai. */
  codice_fiscale: string | null
  /** Ha dichiarato di essere residente all'estero e senza codice fiscale italiano. */
  residente_estero?: boolean
  /** Il Paese (codice ISO, mai IT) di chi e' residente all'estero. */
  paese?: string | null
  via: string | null
  cap: string | null
  citta: string | null
  /** I campi che su PerfectGym mancano: si chiedono nel primo passo. Per chi e' residente all'estero niente `codice_fiscale`, e `paese` se non l'ha scelto. */
  manca: string[]
}

export type MetodoSalvato = { id: number; tipo: 'carta' | 'iban'; finale: string | null; scadenza: string | null }

/** «Carta •••• 1234 · scade 03/2028», «Conto •••• 5678». */
export function nomeMetodo(m: MetodoSalvato): string {
  const scade = m.scadenza && /^\d{4}-\d{2}/.test(m.scadenza) ? ` · ${t('scade', 'expires')} ${m.scadenza.slice(5, 7)}/${m.scadenza.slice(0, 4)}` : ''
  return `${m.tipo === 'carta' ? t('Carta', 'Card') : t('Conto', 'Account')}${m.finale ? ` •••• ${m.finale}` : ''}${m.tipo === 'carta' ? scade : ''}`
}

export type ConsensoGuestPass = { id: number; nome: string; testo: string; allegato: string | null }

/**
 * Una persona per cui si puo' attivare il Guest Pass da questo link (21/10/2026): chi ha l'email (`me`) o un figlio
 * del suo nucleo. `idoneo: false` col perche' (`motivo`): ha gia' un abbonamento, ha meno di 13 anni… Per `me` di chi il
 * club non conosce ancora, `member_id` e' vuoto e l'idoneita' si vede dal codice fiscale.
 */
export type CandidatoGuestPass = {
  chi: 'me' | 'figlio'
  member_id: number | null
  nome: string | null
  cognome: string | null
  /** Solo per i figli. */
  nascita: string | null
  idoneo: boolean
  motivo: string | null
}

/** Il figlio scelto: una scheda del nucleo (`nuovo: false`) o quello scritto dal genitore, che nasce alla conferma. */
export type FiglioGuestPass = { nome: string | null; cognome: string | null; nascita: string | null; codice_fiscale: string | null; nuovo: boolean }

export type SceltaGuestPass = {
  per: 'me' | 'figlio' | null
  candidati: CandidatoGuestPass[]
  beneficiario_id: number | null
  figlio: FiglioGuestPass | null
  tutore: boolean
  eta: { min: number; max: number }
}

export type PaginaGuestPass = {
  stato: 'aperta' | 'attivato' | 'annullata' | 'errore'
  /** I dati di chi ha l'email: per un figlio, il genitore che paga. */
  persona: PersonaGuestPass
  /** Per chi e'. Manca con una funzione di prima: allora e' per chi ha l'email, come sempre. */
  scelta?: SceltaGuestPass
  /**
   * Un'anagrafica simile nel club (21/10/2026): `in_attesa`, la segreteria la sta guardando (si risponde per email entro un
   * giorno lavorativo); `bloccata`, ha confermato che e' la stessa persona. Il testo lo scrive la funzione.
   */
  verifica?: { stato: 'in_attesa' | 'bloccata'; testo: string } | null
  /** A Guest Pass attivato, le persone per cui se ne puo' attivare un altro. */
  anche_per?: { chi: 'me' | 'figlio'; member_id: number | null; nome: string | null }[]
  consensi: ConsensoGuestPass[]
  inizio: { dal: string; al: string; scelto: string | null }
  prezzo: number
  /** La password per l'app e il portale: obbligatoria per chi non ha mai avuto un accesso (era nuovo o Lead). */
  password?: { obbligatoria: boolean }
  /** La carta e il conto gia' salvati su PerfectGym: si mostrano, e si possono usare. */
  salvati?: MetodoSalvato[]
  scelte: { consensi: number[]; metodo: 'carta' | 'iban' | null; metodo_pronto: boolean; payment_source_id?: number | null; dati_confermati?: boolean; firmato?: boolean }
  contratto: number | null
  pagamento: string | null
  /** Per un Guest Pass attivato: come sta il pagamento, e quanto resta. */
  pagamento_stato?: 'pagato' | 'addebito' | 'da_pagare' | 'sconosciuto' | null
  resta?: number | null
}

/** I dati del riepilogo, nell'ordine in cui si mostrano. */
export const CAMPI: Record<string, string> = {
  nome: t('Nome', 'First name'),
  cognome: t('Cognome', 'Last name'),
  email: 'Email',
  telefono: t('Cellulare', 'Mobile'),
  nascita: t('Data di nascita', 'Date of birth'),
  codice_fiscale: t('Codice fiscale', 'Tax code'),
  via: t('Via e numero civico', 'Street and house number'),
  cap: t('CAP', 'Postcode'),
  citta: t('Città', 'City'),
}

/** I dati del primo passo, in tre gruppi: chi sei, come ti troviamo, dove abiti. */
export const GRUPPI: { titolo: string; campi: string[] }[] = [
  { titolo: t('Chi sei', 'About you'), campi: ['nome', 'cognome', 'nascita', 'codice_fiscale'] },
  { titolo: t('Contatti', 'Contact details'), campi: ['email', 'telefono'] },
  { titolo: t('Residenza', 'Home address'), campi: ['via', 'cap', 'citta'] },
]

/** Le pagine del sito coi testi completi: si aprono in un'altra scheda. */
export const REGOLAMENTO_URL = 'https://www.athlonroma.it/regolamento/'
export const PRIVACY_URL = 'https://www.athlonroma.it/privacy/'

/**
 * Cosa comprende il Guest Pass: le stesse parole della pagina «Attiva» del sito, col prezzo della richiesta (19 €, o 5
 * con l'invito di un socio: prima qui c'era scritto 19 anche per chi pagava 5).
 */
export function cosaComprende(prezzo: number): string[] {
  return tv(
    [
      '7 giorni dal giorno che scegli, con accesso a tutto il club agli stessi orari di un abbonamento Premium: sala pesi, corsi fitness, piscine, aqua fitness e nuoto libero.',
      `Senza impegno: nessun rinnovo automatico e nessun addebito oltre i ${prezzo} € iniziali. Alla fine decidi tu se iscriverti.`,
      `Paghi i ${prezzo} € con addebito su conto o con carta.`,
      'Il certificato medico non agonistico non serve subito: hai 15 giorni dall’inizio per portarlo.',
    ],
    [
      '7 days from the day you choose, with access to the whole club at the same hours as a Premium membership: gym floor, fitness classes, pools, aqua fitness and lap swimming.',
      `No commitment: no auto-renewal and no charges beyond the initial €${prezzo}. At the end, you decide whether to join.`,
      `You pay the €${prezzo} by direct debit or by card.`,
      'You don’t need the non-competitive medical certificate right away: you have 15 days from the start to bring it.',
    ],
  )
}

/** I giorni fra `dal` e `al`, compresi: «2026-10-13», … */
export function giorniFra(dal: string, al: string): string[] {
  const out: string[] = []
  const d = new Date(dal + 'T12:00:00Z')
  const fine = new Date(al + 'T12:00:00Z')
  while (d <= fine) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export function giornoBreve(g: string): { settimana: string; numero: string; mese: string } {
  const d = new Date(g + 'T12:00:00Z')
  return {
    settimana: d.toLocaleDateString(locale(), { weekday: 'short', timeZone: 'UTC' }),
    numero: String(d.getUTCDate()),
    mese: d.toLocaleDateString(locale(), { month: 'short', timeZone: 'UTC' }),
  }
}

export function giornoLungo(g: string): string {
  return new Date(g + 'T12:00:00Z').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** L'ultimo giorno di una settimana che comincia `g`. */
export function fineSettimana(g: string): string {
  const d = new Date(g + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

/** Le regole di prenotazione, dal wiki del club (generali/prenotazioni). */
export const REGOLE_PRENOTAZIONE = tv(
  [
    'Le lezioni si prenotano dall’app Athlon o dal portale: la prenotazione si apre 3 giorni (72 ore) prima e resta aperta fino all’inizio.',
  ],
  [
    'You book classes from the Athlon app or the portal: booking opens 3 days (72 hours) before and stays open until the start.',
  ],
)

/** La password scelta dal link: null se va bene (o se e' facoltativa e vuota), altrimenti cosa correggere. */
export function problemaPassword(password: string, conferma: string, obbligatoria: boolean): string | null {
  if (!password && !conferma) return obbligatoria ? t('Scegli la password per entrare nell’app e nel portale.', 'Choose the password to sign in to the app and the portal.') : null
  if (password.length < 8) return t('La password deve avere almeno 8 caratteri.', 'The password must have at least 8 characters.')
  if (password.length > 64) return t('La password è troppo lunga: al massimo 64 caratteri.', 'The password is too long: 64 characters at most.')
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return t('La password deve contenere lettere e numeri.', 'The password must contain letters and numbers.')
  if (password !== conferma) return t('Le due password non coincidono.', 'The two passwords don’t match.')
  return null
}

const SITO = 'https://www.athlonroma.it'

/**
 * Le attività del Guest Pass nella pagina finale, ognuna con la sua pagina sul
 * sito. Sono quelle del Premium, che il Guest Pass apre per una settimana
 * (`plans` nel sito): il giorno che il Premium cambia, cambiano qui.
 */
export const ATTIVITA_GUEST_PASS: { nome: string; url: string }[] = [
  { nome: 'Gym Floor', url: `${SITO}/gym-floor/` },
  { nome: 'Corsi Fitness', url: `${SITO}/corsi-fitness/` },
  { nome: 'Athlon TV', url: `${SITO}/athlon-tv/` },
  { nome: 'Nuoto Libero Assistito', url: `${SITO}/nuoto-libero/` },
  { nome: 'Aqua Fitness', url: `${SITO}/aqua-fitness/` },
  { nome: 'Aqua Gym gestanti', url: `${SITO}/gestanti/` },
  { nome: 'Scuola Nuoto Adulti', url: `${SITO}/scuola-nuoto-adulti/` },
  { nome: 'Group Reformer', url: `${SITO}/reformer/` },
]

/** I due comandi della pagina finale. Il wiki vecchio reindirizza qui. */
export const LINK_CONFERMA = {
  prenotazioni: `${SITO}/wikiathlon/generali/prenotazioni/`,
  chiamata: `${SITO}/prenota-chiamata/`,
} as const

/** L'app Athlon Club: un link solo, che porta allo store giusto per il telefono. */
export const APP_ATHLON_URL = 'https://onelink.to/athlon'
