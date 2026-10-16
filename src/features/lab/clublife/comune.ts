import type { Blocco, SchedaHelpDesk } from '@/api/clubLife'

// Quello che le schermate di Club Life si dividono: le date e la ricerca nelle
// schede dell'Help Desk.

/*
 * Le date del sito sono giorni, non istanti: «2026-11-15» arriva come la
 * mezzanotte UTC di quel giorno. Si scrivono quindi in UTC, o a Roma la sera
 * prima diventerebbe il giorno giusto e a New York quello sbagliato.
 */
const GIORNO = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const BREVE = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const GIORNO_NUMERO = new Intl.DateTimeFormat('it-IT', { day: 'numeric', timeZone: 'UTC' })
const MESE_CORTO = new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' })

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** «Domenica 15 novembre». */
export const giornoEvento = (iso: string) => maiuscola(GIORNO.format(new Date(iso)))

/** «22 settembre 2026». */
export const dataNews = (iso: string) => BREVE.format(new Date(iso))

/** Il bollino del calendario: «15» e «NOV». */
export function bollinoData(iso: string): { giorno: string; mese: string } {
  const d = new Date(iso)
  return { giorno: GIORNO_NUMERO.format(d), mese: MESE_CORTO.format(d).replace('.', '').toUpperCase() }
}

/* ---- La ricerca nell'Help Desk ----------------------------------------- */

/** Minuscolo e senza accenti: «perché» e «perche» sono la stessa parola. */
export function normale(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function testoDi(blocchi: Blocco[]): string {
  const parti: string[] = []
  const giro = (bs: Blocco[]) => {
    for (const b of bs) {
      if ('testo' in b && Array.isArray(b.testo)) parti.push(b.testo.map((x) => x.testo).join(''))
      if (b.t === 'dettagli') parti.push(b.titolo.map((x) => x.testo).join(''))
      if ('blocchi' in b) giro(b.blocchi)
      if (b.t === 'elenco') b.voci.forEach((v) => giro(v.blocchi))
      if (b.t === 'tabella') [b.intestazione, ...b.righe].forEach((r) => r.forEach((c) => parti.push(c.map((x) => x.testo).join(''))))
    }
  }
  giro(blocchi)
  return parti.join(' ')
}

type Indice = { scheda: SchedaHelpDesk; titolo: string; sopra: string; corpo: string }
const indici = new WeakMap<SchedaHelpDesk[], Indice[]>()

function indice(schede: SchedaHelpDesk[]): Indice[] {
  let i = indici.get(schede)
  if (!i) {
    i = schede.map((s) => ({
      scheda: s,
      titolo: normale(s.titolo),
      sopra: normale([s.descrizione, ...s.tag, ...s.attivita].join(' ')),
      corpo: normale(testoDi(s.blocchi)),
    }))
    indici.set(schede, i)
  }
  return i
}

/**
 * Le schede che rispondono a una ricerca, dalla piu' vicina. Ogni parola deve
 * comparire da qualche parte; pesa di piu' nel titolo, poi nella descrizione e
 * nei tag, e meno nel testo — cosi' «certificato» porta in cima la scheda del
 * certificato e non le dieci che lo nominano.
 */
export function cerca(schede: SchedaHelpDesk[], domanda: string): SchedaHelpDesk[] {
  const parole = normale(domanda).split(/[^a-z0-9]+/).filter((x) => x.length > 1)
  if (!parole.length) return []
  return indice(schede)
    .map((x) => {
      let punti = 0
      for (const w of parole) {
        if (x.titolo.includes(w)) punti += 6
        else if (x.sopra.includes(w)) punti += 3
        else if (x.corpo.includes(w)) punti += 1
        else return null
      }
      return { scheda: x.scheda, punti }
    })
    .filter((x): x is { scheda: SchedaHelpDesk; punti: number } => x !== null)
    .sort((a, b) => b.punti - a.punti || a.scheda.ordine - b.scheda.ordine)
    .map((x) => x.scheda)
}
