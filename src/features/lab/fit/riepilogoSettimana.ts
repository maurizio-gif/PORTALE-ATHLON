import { locale, t } from '../../../lib/lingua'
import { lunediDi, spostaGiorno } from '../schede/contatoreCalorie'
import { MINUTI_GIORNO_ATTIVO, minutiPerGiorno, type Sessione } from './calcoloPunteggio'
import { oreBrevi, serieLunga } from './riepilogoMese'

// «La tua settimana in Athlon» (31/10/2026, richiesta di Maurizio: una scheda condivisibile sui social, che fa anche branding): il riepilogo di una
// settimana di Train, lunedi'-domenica, con la sua frase scritta dal codice. Funzione **pura** delle sessioni che Fit gia' legge (sedute chiuse nell'app,
// lezioni con la presenza segnata dalla reception, allenamenti dei dispositivi): niente rete, niente salvataggio. **Solo Train**, come «Il tuo mese»:
// sonno, diario, peso e calorie hanno un consenso a parte e non escono dall'app in una scheda da mandare a un amico. **Descrive, non giudica e non
// confronta con gli altri**: la settimana prima e' un numero, mai «meglio» o «peggio», e nessuna frase dice cosa fare.
//
// Il giorno e' quello di Roma (come `giorno` di ogni `Sessione`); un giorno e' attivo da 20 minuti in su, come per il punteggio.

export type CellaSettimana = {
  /** «AAAA-MM-GG». */
  giorno: string
  /** Il numero del giorno nel mese (quello che si scrive nella pallina). */
  numero: number
  attivo: boolean
  futuro: boolean
  oggi: boolean
}

export type RiepilogoSettimana = {
  /** Il lunedi' della settimana, «AAAA-MM-GG». */
  inizio: string
  /** La domenica. */
  fine: string
  /** «26 ott – 1 nov» (nella lingua dell'app). */
  titolo: string
  /** La settimana e' quella di oggi e non e' ancora finita. */
  incorso: boolean
  sessioni: number
  lezioni: number
  /** Le sedute di sala e gli allenamenti dei dispositivi. */
  altre: number
  giorniAttivi: number
  minuti: number
  /** I giorni attivi di fila piu' lunghi della settimana. */
  serieMax: number
  /** Le lezioni fatte, le piu' frequenti per prime (al massimo tre). */
  lezioniFatte: { nome: string; volte: number }[]
  /** La settimana prima, solo come numeri. */
  precedente: { giorniAttivi: number; sessioni: number; minuti: number } | null
  /** Sette celle, da lunedi' a domenica. */
  celle: CellaSettimana[]
  haDati: boolean
}

/** Il lunedi' della settimana di un giorno «AAAA-MM-GG». */
export const settimanaDi = (giorno: string): string => lunediDi(giorno)

/** Il lunedi' della settimana prima. */
export const settimanaPrima = (inizio: string): string => spostaGiorno(inizio, -7)

const dentro = (sessioni: Sessione[], inizio: string) => {
  const fine = spostaGiorno(inizio, 6)
  return sessioni.filter((s) => s.giorno >= inizio && s.giorno <= fine)
}

function conta(sessioni: Sessione[], inizio: string) {
  const mie = dentro(sessioni, inizio)
  const perGiorno = minutiPerGiorno(mie)
  const attivi = [...perGiorno].filter(([, m]) => m >= MINUTI_GIORNO_ATTIVO).map(([g]) => g).sort()
  return { mie, attivi, minuti: Math.round([...perGiorno.values()].reduce((a, b) => a + b, 0)) }
}

/** «26 ott – 1 nov», o «19–25 ott» dentro lo stesso mese. */
export function titoloSettimana(inizio: string): string {
  const fine = spostaGiorno(inizio, 6)
  const giorno = new Intl.DateTimeFormat(locale(), { day: 'numeric', timeZone: 'UTC' })
  const mese = new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' })
  const a = new Date(`${inizio}T12:00:00Z`)
  const b = new Date(`${fine}T12:00:00Z`)
  if (inizio.slice(0, 7) === fine.slice(0, 7)) return `${giorno.format(a)}–${giorno.format(b)} ${mese.format(a)}`
  return `${giorno.format(a)} ${mese.format(a)} – ${giorno.format(b)} ${mese.format(b)}`
}

export function riepilogoSettimana(sessioni: Sessione[], inizio: string, oggi: string): RiepilogoSettimana {
  const { mie, attivi, minuti } = conta(sessioni, inizio)

  const nomi = new Map<string, number>()
  for (const s of mie) if (s.fonte === 'lezione') nomi.set(s.nome, (nomi.get(s.nome) ?? 0) + 1)
  const lezioniFatte = [...nomi]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([nome, volte]) => ({ nome, volte }))

  const prima = conta(sessioni, settimanaPrima(inizio))
  const celle: CellaSettimana[] = Array.from({ length: 7 }, (_, i) => {
    const giorno = spostaGiorno(inizio, i)
    return { giorno, numero: Number(giorno.slice(8)), attivo: attivi.includes(giorno), futuro: giorno > oggi, oggi: giorno === oggi }
  })

  return {
    inizio,
    fine: spostaGiorno(inizio, 6),
    titolo: titoloSettimana(inizio),
    incorso: oggi >= inizio && oggi <= spostaGiorno(inizio, 6),
    sessioni: mie.length,
    lezioni: mie.filter((s) => s.fonte === 'lezione').length,
    altre: mie.filter((s) => s.fonte !== 'lezione').length,
    giorniAttivi: attivi.length,
    minuti,
    serieMax: serieLunga(attivi),
    lezioniFatte,
    precedente: prima.mie.length ? { giorniAttivi: prima.attivi.length, sessioni: prima.mie.length, minuti: prima.minuti } : null,
    celle,
    haDati: mie.length > 0,
  }
}

/** Quale settimana mostrare di partenza: quella di oggi; se e' vuota e la scorsa no (lunedi', martedi'), la scorsa. */
export function settimanaPartenza(sessioni: Sessione[], oggi: string): string {
  const questa = settimanaDi(oggi)
  if (dentro(sessioni, questa).length) return questa
  const scorsa = settimanaPrima(questa)
  return dentro(sessioni, scorsa).length ? scorsa : questa
}

const pl = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`

/** «La frase»: il riepilogo scritto dal codice. Solo cifre che la scheda mostra, nessun consiglio, nessun confronto. */
export function fraseSettimana(r: RiepilogoSettimana): string {
  const quando = r.incorso ? t('Questa settimana, finora', 'This week, so far') : t(`Nella settimana del ${r.titolo}`, `In the week of ${r.titolo}`)
  const giorni = t(pl(r.giorniAttivi, 'giorno attivo', 'giorni attivi') + ' su 7', `${pl(r.giorniAttivi, 'active day', 'active days')} out of 7`)
  const sessioni = t(pl(r.sessioni, 'allenamento', 'allenamenti'), pl(r.sessioni, 'workout', 'workouts'))
  const parti = [t(`${quando}: ${giorni}, ${sessioni}, ${oreBrevi(r.minuti)}.`, `${quando}: ${giorni}, ${sessioni}, ${oreBrevi(r.minuti)}.`)]

  const prima = r.lezioniFatte[0]
  if (prima) {
    if (prima.volte >= 2) parti.push(t(`La lezione più fatta: ${prima.nome} (${prima.volte} volte).`, `The class you did most: ${prima.nome} (${prima.volte} times).`))
    else parti.push(t(`Lezioni fatte: ${r.lezioniFatte.map((l) => l.nome).join(', ')}.`, `Classes you did: ${r.lezioniFatte.map((l) => l.nome).join(', ')}.`))
  }
  if (r.serieMax >= 2) parti.push(t(`Il tratto più lungo: ${r.serieMax} giorni di fila.`, `Longest stretch: ${r.serieMax} days in a row.`))
  return parti.join(' ')
}

/** Il testo che accompagna la condivisione: tre cifre e il nome del club. Niente dati di persona. */
export function testoCondivisioneSettimana(r: RiepilogoSettimana): string {
  const giorni = t(pl(r.giorniAttivi, 'giorno attivo', 'giorni attivi'), pl(r.giorniAttivi, 'active day', 'active days'))
  const sessioni = t(pl(r.sessioni, 'allenamento', 'allenamenti'), pl(r.sessioni, 'workout', 'workouts'))
  return t(
    `La mia settimana da Athlon Roma: ${giorni}, ${sessioni}, ${oreBrevi(r.minuti)}. athlonroma.it`,
    `My week at Athlon Roma: ${giorni}, ${sessioni}, ${oreBrevi(r.minuti)}. athlonroma.it`,
  )
}
