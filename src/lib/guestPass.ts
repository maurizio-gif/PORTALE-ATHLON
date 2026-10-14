// Il Guest Pass dal link: cosa manda `guest-pass` (azione `pagina`) alla pagina
// /r/<codice>, e le parole delle scelte.

export type PersonaGuestPass = {
  trovata: boolean
  nome: string | null
  cognome: string | null
  email: string | null
  telefono: string | null
  nascita: string | null
  codice_fiscale: string | null
  via: string | null
  cap: string | null
  citta: string | null
  /** I campi che su PerfectGym mancano: si chiedono nel primo passo. */
  manca: string[]
}

export type MetodoSalvato = { id: number; tipo: 'carta' | 'iban'; finale: string | null; scadenza: string | null }

/** «Carta •••• 1234 · scade 03/2028», «Conto •••• 5678». */
export function nomeMetodo(m: MetodoSalvato): string {
  const scade = m.scadenza && /^\d{4}-\d{2}/.test(m.scadenza) ? ` · scade ${m.scadenza.slice(5, 7)}/${m.scadenza.slice(0, 4)}` : ''
  return `${m.tipo === 'carta' ? 'Carta' : 'Conto'}${m.finale ? ` •••• ${m.finale}` : ''}${m.tipo === 'carta' ? scade : ''}`
}

export type ConsensoGuestPass = { id: number; nome: string; testo: string; allegato: string | null }

export type PaginaGuestPass = {
  stato: 'aperta' | 'attivato' | 'annullata' | 'errore'
  persona: PersonaGuestPass
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
  nome: 'Nome',
  cognome: 'Cognome',
  email: 'Email',
  telefono: 'Cellulare',
  nascita: 'Data di nascita',
  codice_fiscale: 'Codice fiscale',
  via: 'Via e numero civico',
  cap: 'CAP',
  citta: 'Città',
}

/** I dati del primo passo, in tre gruppi: chi sei, come ti troviamo, dove abiti. */
export const GRUPPI: { titolo: string; campi: string[] }[] = [
  { titolo: 'Chi sei', campi: ['nome', 'cognome', 'nascita', 'codice_fiscale'] },
  { titolo: 'Contatti', campi: ['email', 'telefono'] },
  { titolo: 'Residenza', campi: ['via', 'cap', 'citta'] },
]

/** Le pagine del sito coi testi completi: si aprono in un'altra scheda. */
export const REGOLAMENTO_URL = 'https://www.athlonroma.it/regolamento/'
export const PRIVACY_URL = 'https://www.athlonroma.it/privacy/'

/** Cosa comprende il Guest Pass: le stesse parole della pagina «Attiva» del sito. */
export const COSA_COMPRENDE = [
  '7 giorni dal giorno che scegli, con accesso a tutto il club agli stessi orari di un abbonamento Premium: sala pesi, corsi fitness, piscine, aqua fitness e nuoto libero.',
  'Senza impegno: nessun rinnovo automatico e nessun addebito oltre i 19 € iniziali. Alla fine decidi tu se iscriverti.',
  'Paghi i 19 € con addebito su conto o con carta.',
  'Il certificato medico non agonistico non serve subito: hai 15 giorni dall’inizio per portarlo.',
]

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
    settimana: d.toLocaleDateString('it-IT', { weekday: 'short', timeZone: 'UTC' }),
    numero: String(d.getUTCDate()),
    mese: d.toLocaleDateString('it-IT', { month: 'short', timeZone: 'UTC' }),
  }
}

export function giornoLungo(g: string): string {
  return new Date(g + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** L'ultimo giorno di una settimana che comincia `g`. */
export function fineSettimana(g: string): string {
  const d = new Date(g + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

/** Le regole di prenotazione, dal wiki del club (generali/prenotazioni). */
export const REGOLE_PRENOTAZIONE = [
  'Le lezioni si prenotano dall’app Athlon o dal portale: la prenotazione si apre 3 giorni (72 ore) prima e resta aperta fino all’inizio.',
  'Si disdice fino a 1 ora prima dell’inizio, così subentra chi è in lista d’attesa.',
  'Al massimo 3 prenotazioni attive per Corsi Fitness, Aqua Fitness e Scuola Nuoto Adulti; la lista d’attesa conta come una prenotazione.',
]

/** La password scelta dal link: null se va bene (o se e' facoltativa e vuota), altrimenti cosa correggere. */
export function problemaPassword(password: string, conferma: string, obbligatoria: boolean): string | null {
  if (!password && !conferma) return obbligatoria ? 'Scegli la password per entrare nell’app e nel portale.' : null
  if (password.length < 8) return 'La password deve avere almeno 8 caratteri.'
  if (password.length > 64) return 'La password è troppo lunga: al massimo 64 caratteri.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'La password deve contenere lettere e numeri.'
  if (password !== conferma) return 'Le due password non coincidono.'
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
