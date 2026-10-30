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

/**
 * I dati del primo passo, in due gruppi: chi sei, come ti troviamo. L'indirizzo non si chiede per la prova
 * (decisione del 29/10/2026: e' un attrito in piu'): lo si chiede all'abbonamento.
 */
export const GRUPPI: { titolo: string; campi: string[] }[] = [
  { titolo: t('Chi sei', 'About you'), campi: ['nome', 'cognome', 'nascita', 'codice_fiscale'] },
  { titolo: t('Contatti', 'Contact details'), campi: ['email', 'telefono'] },
]

/** I dati che la persona deve avere compilati per attivare: quelli che si mostrano. */
export const CAMPI_RICHIESTI: string[] = GRUPPI.flatMap((g) => g.campi)

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

/**
 * Cosa c'e' dentro ogni attivita' del Guest Pass, per la lista a fisarmonica in cima alla pagina di attivazione (30/10/2026,
 * richiesta di Maurizio: «prova tutto il club per una settimana», sul modello della pagina /prova del sito).
 *
 * Le voci e il loro ordine sono quelli di `/prova` (le attivita' del piano **Premium**, che il Pass apre per sette giorni, senza
 * Athlon TV: e' in streaming e sta nella riga di testo); `breve` e' la riga che si legge a fisarmonica chiusa, `dettaglio` quello
 * che si apre, ripreso dalla spiegazione che il sito mostra per la stessa attivita' (`activityInfo` in `data/abbonamenti.ts`
 * di SITO-ATHLON). **Nessun conteggio di lezioni qui**: sul sito le calcola il palinsesto, e una cifra scritta a mano resta
 * indietro al primo cambio. Se il Premium cambia, si cambia l'elenco insieme al sito. `ATTIVITA_GUEST_PASS` (la pagina finale)
 * ha le sue etichette e non e' stato toccato.
 */
export type AttivitaProva = {
  /** La chiave dell'icona (`ICONE` in `ProvaTuttoIlClub.tsx`). */
  chiave: string
  nome: string
  url: string
  breve: string
  dettaglio: string
}

export const ATTIVITA_PROVA: AttivitaProva[] = [
  {
    chiave: 'gym-floor',
    nome: 'Gym Floor',
    url: `${SITO}/gym-floor/`,
    breve: t('400 mq di sala, aperta dalle 6:00 alle 22:00', '400 sq m of gym floor, open from 6:00 to 22:00'),
    dettaglio: t(
      '400 mq di sala aperta dalle 6:00 alle 22:00: area cardio Matrix 4.0 con macchinari connessi all’app, area isotonica, area funzionale Ziva con rig da 8 metri, manubri fino a 50 kg e area cavi e carico libero. 30 piani di allenamento già disponibili sulla tua app, con Assistenza di Sala (quando prenoti trovi indicati gli orari con Assistenza). Per essere seguiti individualmente ci sono le sedute di personal training, che si prenotano e si acquistano a parte.',
      '400 sq m of gym floor open from 6:00 to 22:00: Matrix 4.0 cardio area with machines connected to the app, a strength area, a Ziva functional area with an 8-metre rig, dumbbells up to 50 kg and a cable and free-weight area. 30 training plans already available in your app, with Floor Assistance (when you book you’ll see which time slots have Assistance). For one-to-one coaching there are personal training sessions, booked and paid for separately.',
    ),
  },
  {
    chiave: 'corsi-fitness',
    nome: 'Corsi Fitness',
    url: `${SITO}/corsi-fitness/`,
    breve: t('Oltre 80 corsi a settimana, in due sale', 'Over 80 classes a week, in two studios'),
    dettaglio: t(
      'Oltre 80 corsi a settimana in due sale dedicate: attività aerobiche, olistiche e di tonificazione, più HIIT in Sala B. Prenoti dall’app a partire da 3 giorni prima.',
      'Over 80 classes a week in two dedicated studios: aerobic, holistic and toning classes, plus HIIT in Studio B. You book from the app starting 3 days before.',
    ),
  },
  {
    chiave: 'group-reformer',
    nome: 'Group Reformer',
    url: `${SITO}/reformer/`,
    breve: t('Pilates Reformer in gruppi da 10', 'Reformer Pilates in groups of 10'),
    dettaglio: t(
      'Pilates Reformer in piccoli gruppi da 10 persone con istruttore dedicato, nella nuova Sala C da 80 mq. Lavoro su postura, forza e mobilità.',
      'Reformer Pilates in small groups of 10 with a dedicated instructor, in the new 80 sq m Studio C. Work on posture, strength and mobility.',
    ),
  },
  {
    chiave: 'aqua-fitness',
    nome: 'Aqua Fitness',
    url: `${SITO}/aqua-fitness/`,
    breve: t('Cardio a basso impatto, in acqua', 'Low-impact cardio, in the water'),
    dettaglio: t(
      'Allenamento cardio a basso impatto in acqua, su due vasche: Aqua Aerobic, Aqua Soft, Aqua Tonic e Hydrobike nella vasca piccola, a una temperatura fra 30 °C e 30,5 °C; l’Aqua Training si svolge invece in vasca grande, sempre fra 28 °C e 28,5 °C. Ideale anche per chi cerca un carico dolce sulle articolazioni.',
      'Low-impact cardio training in the water, in two pools: Aqua Aerobic, Aqua Soft, Aqua Tonic and Hydrobike in the small pool, at a temperature between 30 °C and 30.5 °C; Aqua Training takes place in the large pool, always between 28 °C and 28.5 °C. Also ideal if you’re looking for gentle loading on your joints.',
    ),
  },
  {
    chiave: 'scuola-nuoto-adulti',
    nome: 'Scuola Nuoto Adulti',
    url: `${SITO}/scuola-nuoto-adulti/`,
    breve: t('Tre livelli, istruttori federali', 'Three levels, federation instructors'),
    dettaglio: t(
      'Corsi su tre livelli — base, intermedio e avanzato — con istruttori federali. Scegli fra le lezioni del tuo livello, senza limiti di frequenza: prenoti quando vuoi, negli orari del tuo livello.',
      'Classes at three levels — beginner, intermediate and advanced — with federation instructors. Choose among the classes for your level, with no limit on how often: you book whenever you like, at the times for your level.',
    ),
  },
  {
    chiave: 'nuoto-libero',
    nome: 'Nuoto Libero Assistito',
    url: `${SITO}/nuoto-libero/`,
    breve: t('Vasca da 25 m a 5 corsie, sempre assistito', '25 m pool with 5 lanes, always supervised'),
    dettaglio: t(
      'Nuoto libero nella vasca da 25 metri a 5 corsie, con Tecnici Federali e Assistenti Bagnanti sempre a bordo vasca, per tutta la durata del turno. Corsie divise per ritmo, temperatura costante fra 28 °C e 28,5 °C. A bordo vasca c’è un contasecondi dedicato al nuoto per le ripetute.',
      'Lap swimming in the 25 m, 5-lane pool, with Federation Coaches and Lifeguards always on the pool deck for the whole session. Lanes split by pace, constant temperature between 28 °C and 28.5 °C. On the pool deck there’s a swim pace clock for your repeats.',
    ),
  },
  {
    chiave: 'gestanti',
    nome: 'Corso Gestanti',
    url: `${SITO}/gestanti/`,
    breve: t('In acqua, pensato per la gravidanza', 'In the water, designed for pregnancy'),
    dettaglio: t(
      'Attività in acqua pensata per la gravidanza, in vasca alta e in sospensione: il peso è sostenuto dall’acqua, per un lavoro a basso impatto sulle articolazioni. Lavoro dolce su respirazione, mobilità e scarico del peso.',
      'Water activity designed for pregnancy, in the deep pool and in suspension: your weight is supported by the water, for low-impact work on the joints. Gentle work on breathing, mobility and taking the weight off.',
    ),
  },
]

/** I due comandi della pagina finale. Il wiki vecchio reindirizza qui. */
export const LINK_CONFERMA = {
  prenotazioni: `${SITO}/wikiathlon/generali/prenotazioni/`,
  chiamata: `${SITO}/prenota-chiamata/`,
} as const

/** L'app Athlon Club: un link solo, che porta allo store giusto per il telefono. */
export const APP_ATHLON_URL = 'https://onelink.to/athlon'
