import { locale, t } from '../../../lib/lingua'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { MINUTI_GIORNO_ATTIVO, minutiPerGiorno, type Sessione } from './calcoloPunteggio'

// «Il tuo mese in Athlon» (30/10/2026): il riepilogo di un mese di Train, da guardare e da condividere. Funzione **pura** delle sessioni che Fit gia' legge
// (sedute chiuse nell'app, lezioni con la presenza segnata dalla reception, allenamenti dei dispositivi): niente rete, niente salvataggio. **Solo Train**:
// calorie, peso, diario e sonno sono dati sulla salute con un consenso a parte e non escono dall'app in una scheda da mandare a un amico.
// **Descrive, non confronta con gli altri soci e non giudica**: il mese scorso si mostra come numero, mai come «meglio» o «peggio».
//
// Il giorno e' quello di Roma (come `giorno` di ogni `Sessione`); un giorno e' attivo da 20 minuti in su, come per il punteggio.

export type CellaMese = { giorno: number; attivo: boolean; futuro: boolean }

export type RiepilogoMese = {
  /** «AAAA-MM». */
  mese: string
  anno: number
  /** «ottobre» (nella lingua dell'app). */
  nome: string
  /** Il mese e' quello di oggi e non e' ancora finito. */
  incorso: boolean
  giorniNelMese: number
  sessioni: number
  lezioni: number
  /** Le sedute di sala e gli allenamenti dei dispositivi. */
  altre: number
  giorniAttivi: number
  minuti: number
  /** I giorni attivi di fila piu' lunghi del mese. */
  serieMax: number
  /** La lezione fatta piu' volte (almeno due), o null. */
  preferita: { nome: string; volte: number } | null
  /** Quanti giorni ha la settimana piu' piena del mese (lunedi'-domenica, dentro il mese). */
  settimanaMigliore: number
  /** Il mese prima, solo come numeri. */
  precedente: { giorniAttivi: number; sessioni: number; minuti: number } | null
  /** Una cella per giorno, e `inizio` celle vuote prima del primo (lunedi' = 0). */
  celle: CellaMese[]
  inizio: number
  haDati: boolean
}

/** «AAAA-MM» di un giorno «AAAA-MM-GG». */
export const meseDi = (giorno: string): string => giorno.slice(0, 7)

/** Il mese prima, «AAAA-MM». */
export function mesePrima(mese: string): string {
  const [a, m] = mese.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

/** Quanti giorni ha un mese «AAAA-MM». */
export const giorniDelMese = (mese: string): number => {
  const [a, m] = mese.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

const lunedi = (giorno: string): number => (new Date(`${giorno}T12:00:00Z`).getUTCDay() + 6) % 7

const nomeMese = (mese: string): string => new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }).format(new Date(`${mese}-15T12:00:00Z`))

/** Il numero di giorni attivi di fila piu' lungo, su giorni «AAAA-MM-GG» ordinati e senza doppioni. */
export function serieLunga(attivi: string[]): number {
  let max = 0
  let corrente = 0
  let prima: string | null = null
  for (const g of attivi) {
    corrente = prima && spostaGiorno(prima, 1) === g ? corrente + 1 : 1
    if (corrente > max) max = corrente
    prima = g
  }
  return max
}

function contaMese(sessioni: Sessione[], mese: string) {
  const dentro = sessioni.filter((s) => meseDi(s.giorno) === mese)
  const minutiGiorno = minutiPerGiorno(dentro)
  const attivi = [...minutiGiorno].filter(([, m]) => m >= MINUTI_GIORNO_ATTIVO).map(([g]) => g).sort()
  return { dentro, attivi, minuti: Math.round([...minutiGiorno.values()].reduce((a, b) => a + b, 0)) }
}

/** Le settimane lunedi'-domenica che il mese tocca: la piu' piena in giorni attivi. */
function settimanaPiuPiena(attivi: string[]): number {
  const perSettimana = new Map<string, number>()
  for (const g of attivi) {
    const inizio = spostaGiorno(g, -lunedi(g))
    perSettimana.set(inizio, (perSettimana.get(inizio) ?? 0) + 1)
  }
  return Math.max(0, ...perSettimana.values())
}

export function riepilogoMese(sessioni: Sessione[], mese: string, oggi: string): RiepilogoMese {
  const { dentro, attivi, minuti } = contaMese(sessioni, mese)
  const giorniNelMese = giorniDelMese(mese)
  const incorso = meseDi(oggi) === mese

  const nomi = new Map<string, number>()
  for (const s of dentro) if (s.fonte === 'lezione') nomi.set(s.nome, (nomi.get(s.nome) ?? 0) + 1)
  const piu = [...nomi].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]

  const prima = contaMese(sessioni, mesePrima(mese))
  const celle: CellaMese[] = Array.from({ length: giorniNelMese }, (_, i) => {
    const giorno = `${mese}-${String(i + 1).padStart(2, '0')}`
    return { giorno: i + 1, attivo: attivi.includes(giorno), futuro: giorno > oggi }
  })

  return {
    mese,
    anno: Number(mese.slice(0, 4)),
    nome: nomeMese(mese),
    incorso,
    giorniNelMese,
    sessioni: dentro.length,
    lezioni: dentro.filter((s) => s.fonte === 'lezione').length,
    altre: dentro.filter((s) => s.fonte !== 'lezione').length,
    giorniAttivi: attivi.length,
    minuti,
    serieMax: serieLunga(attivi),
    preferita: piu && piu[1] >= 2 ? { nome: piu[0], volte: piu[1] } : null,
    settimanaMigliore: settimanaPiuPiena(attivi),
    precedente: prima.dentro.length ? { giorniAttivi: prima.attivi.length, sessioni: prima.dentro.length, minuti: prima.minuti } : null,
    celle,
    inizio: lunedi(`${mese}-01`),
    haDati: dentro.length > 0,
  }
}

/** Quale mese mostrare di partenza: quello di oggi; se e' vuoto e il mese scorso no (primi giorni del mese), quello scorso. */
export function mesePartenza(sessioni: Sessione[], oggi: string): string {
  const questo = meseDi(oggi)
  if (sessioni.some((s) => meseDi(s.giorno) === questo)) return questo
  const scorso = mesePrima(questo)
  return sessioni.some((s) => meseDi(s.giorno) === scorso) ? scorso : questo
}

const ore = (minuti: number) => (minuti < 60 ? `${minuti} min` : `${Math.floor(minuti / 60)} h${minuti % 60 ? ` ${String(minuti % 60).padStart(2, '0')}` : ''}`)
export const oreBrevi = ore

/** Il testo che accompagna la condivisione: tre cifre e il nome del club. Niente dati di persona. */
export function testoCondivisione(r: RiepilogoMese): string {
  const giorni = t(`${r.giorniAttivi} ${r.giorniAttivi === 1 ? 'giorno attivo' : 'giorni attivi'}`, `${r.giorniAttivi} active ${r.giorniAttivi === 1 ? 'day' : 'days'}`)
  const sessioni = t(`${r.sessioni} ${r.sessioni === 1 ? 'allenamento' : 'allenamenti'}`, `${r.sessioni} ${r.sessioni === 1 ? 'workout' : 'workouts'}`)
  return t(`Il mio ${r.nome} da Athlon Roma: ${giorni}, ${sessioni}, ${ore(r.minuti)}.`, `My ${r.nome} at Athlon Roma: ${giorni}, ${sessioni}, ${ore(r.minuti)}.`)
}
