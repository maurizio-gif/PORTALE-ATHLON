import { SITO_URL } from '@/config'
import { t } from '@/lib/lingua'

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
  /** Si prenota dal calendario dell'app (non da un comando del sito): il comando porta alle Prenotazioni, su questo giorno e questa categoria. */
  prenotaSulSito: boolean
  /** La categoria dell'evento su PerfectGym («Eventi Gratuiti», «Master Class»), il filtro del calendario; assente finche' il sito non la pubblica. */
  categoria?: string | null
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

/** Una domanda a stelle di una survey. L'`id` e' il nome con cui la risposta finisce su Supabase: lo stesso del sito. */
export type DomandaSurvey = { id: string; testo: string }

/** Un argomento delle survey del sito (`/surveys/<slug>/`), con le sue domande e la pagina dove il club ha scritto la promessa che controllano. */
export type TemaSurvey = {
  slug: string
  titolo: string
  eyebrow: string
  intro: string
  domande: DomandaSurvey[]
  fonte: { testo: string; url: string } | null
}

/** Le tre forme della domanda aperta: neutra finche' non c'e' un giudizio, poi sotto o sopra soglia. */
export type FormaNota = { titolo: string; aiuto: string }

/**
 * Le survey, come le pubblica il sito (`surveyPerApp` in `data/surveys.ts`): le domande, la scala dell'NPS, la soglia che decide
 * se chiedere la recensione su Google e le frasi della nota. **L'app non ne ha una copia**: un tema nuovo o una domanda ritoccata
 * arrivano al deploy del sito.
 */
export type SurveyClub = {
  temi: TemaSurvey[]
  nps: { testo: string; minimo: string; massimo: string }
  stelle: string[]
  soglia: { nps: number; media: number }
  nota: { neutra: FormaNota; sotto: FormaNota; sopra: FormaNota }
  /** Il riquadro della recensione su Google, per chi e' contento. */
  recensione: string
}

export type ClubLife = {
  generato: string
  news: NewsClub[]
  eventi: EventoClub[]
  aree: AreaHelpDesk[]
  schede: SchedaHelpDesk[]
  /** Gli slug delle pagine che nell'app portano al calendario delle prenotazioni. */
  corsiPrenotabili: string[]
  /** Le survey del sito; assente (o null) finche' il sito non ha il deploy che le pubblica: allora la sezione non compare. */
  survey?: SurveyClub | null
}

const testoDa = (v: unknown): string => (typeof v === 'string' ? v : '')

function formaNotaDa(v: any): FormaNota | null {
  const titolo = testoDa(v?.titolo).trim()
  return titolo ? { titolo, aiuto: testoDa(v?.aiuto).trim() } : null
}

/**
 * Le survey con la forma controllata, o `null`. Un pezzo che manca o e' sporco fa sparire la sezione invece di rompere Club Life:
 * senza la soglia non si sa se chiedere la recensione, senza la scala dell'NPS non si disegna la domanda. Un tema senza domande
 * o senza titolo si scarta da solo; gli altri restano.
 */
export function surveyDa(d: any): SurveyClub | null {
  if (!d || typeof d !== 'object') return null
  const temi: TemaSurvey[] = (Array.isArray(d.temi) ? d.temi : [])
    .map((x: any): TemaSurvey | null => {
      const slug = testoDa(x?.slug).trim()
      const titolo = testoDa(x?.titolo).trim()
      const domande: DomandaSurvey[] = (Array.isArray(x?.domande) ? x.domande : [])
        .filter((q: any) => q && testoDa(q.id).trim() && testoDa(q.testo).trim())
        .map((q: any) => ({ id: testoDa(q.id).trim(), testo: testoDa(q.testo).trim() }))
      if (!/^[a-z0-9-]+$/.test(slug) || !titolo || !domande.length) return null
      const fonte = x?.fonte && testoDa(x.fonte.testo).trim() && /^https?:\/\//.test(testoDa(x.fonte.url)) ? { testo: testoDa(x.fonte.testo).trim(), url: testoDa(x.fonte.url) } : null
      return { slug, titolo, eyebrow: testoDa(x.eyebrow).trim(), intro: testoDa(x.intro).trim(), domande, fonte }
    })
    .filter((x: TemaSurvey | null): x is TemaSurvey => x !== null)
  const stelle = (Array.isArray(d.stelle) ? d.stelle : []).map(testoDa)
  const soglia = d.soglia
  const neutra = formaNotaDa(d.nota?.neutra)
  const sotto = formaNotaDa(d.nota?.sotto)
  const sopra = formaNotaDa(d.nota?.sopra)
  if (!temi.length || !testoDa(d.nps?.testo).trim() || stelle.length !== 5) return null
  if (typeof soglia?.nps !== 'number' || typeof soglia?.media !== 'number' || !neutra || !sotto || !sopra) return null
  return {
    temi,
    nps: { testo: testoDa(d.nps.testo).trim(), minimo: testoDa(d.nps.minimo).trim(), massimo: testoDa(d.nps.massimo).trim() },
    stelle,
    soglia: { nps: soglia.nps, media: soglia.media },
    nota: { neutra, sotto, sopra },
    recensione: /^https?:\/\//.test(testoDa(d.recensione)) ? testoDa(d.recensione) : '',
  }
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
    if (!r.ok) return { ok: false, errore: t('Club Life non risponde adesso. Riprova fra poco.', 'Club Life isn’t responding right now. Try again shortly.') }
    const d = (await r.json()) as ClubLife
    if (!Array.isArray(d?.news) || !Array.isArray(d?.eventi) || !Array.isArray(d?.schede)) {
      return { ok: false, errore: t('Club Life non risponde adesso. Riprova fra poco.', 'Club Life isn’t responding right now. Try again shortly.') }
    }
    // Il campo nuovo manca finche' il sito non ha il deploy: senza, i link restano quelli di prima.
    const dati: ClubLife = {
      generato: d.generato,
      news: d.news,
      eventi: d.eventi,
      aree: d.aree ?? [],
      schede: d.schede,
      corsiPrenotabili: d.corsiPrenotabili ?? [],
      survey: surveyDa(d.survey),
    }
    salvaSulDisco(dati)
    return { ok: true, dati }
  } catch {
    return { ok: false, errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') }
  }
}
