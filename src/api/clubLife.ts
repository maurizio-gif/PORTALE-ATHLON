import { SITO_URL } from '@/config'

// Club Life: le news, gli eventi in arrivo e le schede dell'Help Desk, letti dal
// sito (https://www.athlonroma.it/club-life.json). Il file lo genera il sito a
// ogni deploy dalle stesse collezioni della pagina /club-life, con le stesse
// regole (news nella loro finestra, eventi da oggi in poi, schede non in bozza):
// una news scritta in Tina compare qui al deploy dopo, senza toccare l'app.
//
// E' un contenuto pubblico, lo stesso che il sito mostra a chiunque, quindi a
// differenza della memoria del laboratorio (memoria.ts) si tiene anche sul
// disco: alla prossima apertura la sezione si disegna subito con l'ultima copia,
// e intanto si aggiorna.

/** Un pezzo di testo con la sua forma. `\n` e' un a capo voluto. */
export type Inline = { testo: string; b?: true; i?: true; link?: string }

export type TipoModulo = 'appuntamento' | 'appuntamento-nuoto' | 'metodo-pagamento' | 'cambio-abbonamento'

/** Il testo di un contenuto, nei blocchi che il sito ricava dalla sua pagina (data/blocchi.ts). */
export type Blocco =
  | { t: 'titolo'; livello: 2 | 3 | 4; testo: Inline[] }
  | { t: 'paragrafo'; testo: Inline[]; piccolo?: true }
  | { t: 'elenco'; ordinato: boolean; voci: { spunta?: boolean; blocchi: Blocco[] }[] }
  | { t: 'citazione'; blocchi: Blocco[] }
  | { t: 'riquadro'; blocchi: Blocco[] }
  | { t: 'dettagli'; titolo: Inline[]; blocchi: Blocco[] }
  | { t: 'tabella'; intestazione: Inline[][]; righe: Inline[][][] }
  | { t: 'pulsanti'; voci: { etichetta: string; url: string; primario: boolean }[] }
  | { t: 'codice'; etichetta: string; codice: string }
  | { t: 'immagine'; src: string; alt: string }
  | { t: 'separatore' }
  /** Un modulo del sito (appuntamento, metodo di pagamento...): per ora si apre la' (url con l'ancora). */
  | { t: 'modulo'; tipo: TipoModulo; etichetta: string; url: string }

export type Comando = { etichetta: string; url: string }

export type NewsClub = {
  id: string
  categoria: string
  titolo: string
  sommario: string
  /** ISO. */
  data: string
  miniatura: string
  immagine: string
  alt: string
  cta: Comando | null
  url: string
  blocchi: Blocco[]
}

export type EventoClub = {
  id: string
  etichetta: string
  titolo: string
  sommario: string
  /** ISO, il giorno dell'evento. */
  data: string
  /** «16:00 - 17:30», se non dura tutto il giorno. */
  ora: string | null
  gratuito: boolean
  prezzo: string | null
  miniatura: string | null
  immagine: string | null
  alt: string
  note: string[]
  programma: { sala: string; voci: { ora: string; lezione: string; trainer: string | null }[] }[]
  /** Si prenota col modulo del sito: per ora il comando apre la pagina dell'evento. */
  prenotaSulSito: boolean
  cta: Comando | null
  url: string
  blocchi: Blocco[]
}

export type AreaHelpDesk = { id: string; etichetta: string; descrizione: string }

export type SchedaHelpDesk = {
  /** «generali/certificato-medico»: la cartella e' l'area. */
  id: string
  area: string
  titolo: string
  descrizione: string
  ordine: number
  tag: string[]
  /** Le attivita' a cui si riferisce, in chiaro; vuoto vuol dire tutte. */
  attivita: string[]
  url: string
  blocchi: Blocco[]
}

export type ClubLife = {
  generato: string
  news: NewsClub[]
  eventi: EventoClub[]
  aree: AreaHelpDesk[]
  schede: SchedaHelpDesk[]
  /** Gli slug delle pagine che nell'app portano al calendario delle prenotazioni. */
  corsiPrenotabili: string[]
}

export const URL_CLUB_LIFE_JSON = `${SITO_URL}/club-life.json`

const CHIAVE_DISCO = 'athlon:club-life:v2'

/** L'ultima copia salvata, se c'e' e si legge. */
export function clubLifeDalDisco(): ClubLife | null {
  try {
    const s = globalThis.localStorage?.getItem(CHIAVE_DISCO)
    if (!s) return null
    const d = JSON.parse(s) as ClubLife
    return Array.isArray(d?.news) && Array.isArray(d?.schede) ? d : null
  } catch {
    return null
  }
}

function salvaSulDisco(d: ClubLife) {
  try {
    globalThis.localStorage?.setItem(CHIAVE_DISCO, JSON.stringify(d))
  } catch {
    // Spazio pieno o storage negato: la copia in memoria basta per questa visita.
  }
}

export async function leggiClubLife(): Promise<{ ok: true; dati: ClubLife } | { ok: false; errore: string }> {
  try {
    const r = await fetch(URL_CLUB_LIFE_JSON, { headers: { Accept: 'application/json' } })
    if (!r.ok) return { ok: false, errore: 'Club Life non risponde adesso. Riprova fra poco.' }
    const d = (await r.json()) as ClubLife
    if (!Array.isArray(d?.news) || !Array.isArray(d?.eventi) || !Array.isArray(d?.schede)) {
      return { ok: false, errore: 'Club Life non risponde adesso. Riprova fra poco.' }
    }
    // Il campo nuovo manca finche' il sito non ha il deploy: senza, i link restano quelli di prima.
    const dati: ClubLife = {
      generato: d.generato,
      news: d.news,
      eventi: d.eventi,
      aree: d.aree ?? [],
      schede: d.schede,
      corsiPrenotabili: d.corsiPrenotabili ?? [],
    }
    salvaSulDisco(dati)
    return { ok: true, dati }
  } catch {
    return { ok: false, errore: 'Connessione non riuscita. Controlla la rete e riprova.' }
  }
}
