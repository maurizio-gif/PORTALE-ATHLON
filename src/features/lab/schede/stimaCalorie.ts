import type { GiornoSchedaLab, SedutaStorico } from '@/api/lab'

import { aTempo, dopo, type Passo } from './comune'

// Le calorie di una scheda (15/10/2026): una stima di massima, dai dati del
// socio (l'eta' dall'anagrafica di PerfectGym, il sesso scelto da lui, peso e
// altezza da «I tuoi dati») e dalla scheda stessa (serie, ripetizioni, recuperi).
// Il sesso di PerfectGym non si usa: oltre un terzo delle schede dice «Other»,
// e anche Male/Female non sempre e' giusto.
//
// **Il metabolismo a riposo** e' la formula di Mifflin-St Jeor, la piu'
// usata per gli adulti: 10 x kg + 6,25 x cm - 5 x anni, +5 per gli uomini e
// -161 per le donne. Finche' il socio non sceglie si usa la via di mezzo,
// -78, e lo si dice.
//
// **La seduta ha tre parti, e la prima stesura ne contava una sola.** Dava
// 26 minuti e 140 kcal a un Giorno A che in sala dura tre quarti d'ora, e le
// ragioni erano tre:
//
// - **la parte coi pesi** si conta seguendo la scheda come la segue la seduta
//   vera (`dopo()` di comune.ts, superserie comprese): ogni ripetizione 4
//   secondi (2 di salita e 2 di discesa, il ritmo che si insegna), 15 secondi
//   per serie per prendere posizione, il recupero scritto, e 1 minuto per ogni
//   esercizio per sistemare la macchina o caricare il bilanciere. Prima erano
//   3 secondi, 10 e niente cambi;
// - **il riscaldamento e il defaticamento** si leggono dalla nota del giorno
//   («Riscaldamento 5 min di cyclette leggera…»), che li scrive: prima non si
//   contavano perche' «non sono nella scheda», e invece ci sono;
// - **le sedute vere vincono sulla stima**: se il socio ha gia' chiuso sedute
//   di quel giorno, la durata della parte coi pesi e' la mediana delle sue.
//
// **Il consumo** usa i MET del Compendium of Physical Activities (Ainsworth
// 2011): i pesi da 3,5 (codice 02054, moderato) a 6 (02052, vigoroso: i
// recuperi da un minuto e le serie vicine al cedimento della scheda), la
// cyclette leggera 3,5 (02011), lo stretching 2,3 (02101). Un MET e' quanto si
// consuma a riposo, e il Compendium lo fissa a 3,5 ml di ossigeno per kg al
// minuto, che per molti e' troppo: qui il MET e' il metabolismo a riposo del
// socio, cioe' BMR / 1440 kcal al minuto. Cosi' l'eta', il sesso e
// l'altezza entrano anche nella seduta, e non solo il peso.
//
// **Il dopo-allenamento** (EPOC): dopo i pesi il corpo consuma di piu' per
// qualche ora. Gli studi danno fra il 5 e il 15% di quello che la seduta ha
// aggiunto al riposo; qui il 10%, scritto a parte perche' e' la voce piu'
// incerta.
//
// Sono stime: possono sbagliare del 20-30% in un verso o nell'altro, e la
// schermata lo dice. Nessun numero esce dall'app.

export const SECONDI_PER_RIPETIZIONE = 4
export const SECONDI_PREPARAZIONE = 15
export const SECONDI_CAMBIO_ESERCIZIO = 60
export const MET_MODERATO = 3.5
export const MET_INTENSO = 6
export const MET_RISCALDAMENTO = 3.5
export const MET_DEFATICAMENTO = 2.3
/** La quota del consumo netto dei pesi che si aggiunge dopo la seduta. */
export const EPOC = 0.1
/** Il fattore di una giornata senza allenamento (sedentaria). */
export const FATTORE_RIPOSO = 1.2

export type Sesso = 'm' | 'f' | null

/** Gli anni compiuti a oggi, da «AAAA-MM-GG». */
export function etaDa(dataNascita: string | null | undefined, oggi = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascita ?? '')
  if (!m) return null
  const [a, me, g] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let anni = oggi.getFullYear() - a
  if (oggi.getMonth() + 1 < me || (oggi.getMonth() + 1 === me && oggi.getDate() < g)) anni--
  return anni > 0 && anni < 120 ? anni : null
}

export const COSTANTE_SESSO: Record<'m' | 'f' | 'x', number> = { m: 5, f: -161, x: -78 }

/** Il metabolismo a riposo, kcal al giorno (Mifflin-St Jeor). */
export function metabolismoBasale(p: { kg: number; cm: number; anni: number; sesso: Sesso }): number {
  return 10 * p.kg + 6.25 * p.cm - 5 * p.anni + COSTANTE_SESSO[p.sesso ?? 'x']
}

/** «8-10» vale 9; il primo numero da solo vale se stesso. */
function medio(numeri: number[]): number | null {
  if (!numeri.length) return null
  return numeri.length > 1 ? (numeri[0] + numeri[1]) / 2 : numeri[0]
}

/** I secondi di una serie, presa di posizione compresa: quelli scritti se e' a tempo, altrimenti le ripetizioni. */
export function secondiSerie(ripetizioni: string): number {
  const numeri = (ripetizioni.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')))
  if (aTempo(ripetizioni)) {
    const n = numeri[0] ?? 30
    return (/\b(min|minuti)\b/i.test(ripetizioni) ? n * 60 : n) + SECONDI_PREPARAZIONE
  }
  // «max», «a cedimento» senza numero valgono 12; «per gamba» e «per lato» si fanno due volte.
  const rip = (medio(numeri) ?? 12) * (/\bper\s+(gamba|lato|braccio)\b/i.test(ripetizioni) ? 2 : 1)
  return rip * SECONDI_PER_RIPETIZIONE + SECONDI_PREPARAZIONE
}

export type DurataGiorno = { lavoro: number; recupero: number; cambi: number; serie: number; esercizi: number }

/** Quanto dura la parte coi pesi di un giorno, in secondi, seguendo le serie e i recuperi come la seduta. */
export function durataGiorno(g: GiornoSchedaLab): DurataGiorno {
  let lavoro = 0
  let recupero = 0
  let serie = 0
  let passo: Passo | null = g.esercizi.length ? { indice: 0, serie: 1 } : null
  // Un tetto: una scheda scritta male non deve far girare il conto all'infinito.
  for (let giri = 0; passo && giri < 2000; giri++) {
    const e = g.esercizi[passo.indice]
    if (passo.serie <= e.serie) {
      lavoro += secondiSerie(e.ripetizioni)
      serie++
    }
    const d = dopo(g, passo.indice, passo.serie)
    recupero += d.recupero
    passo = d.prossimo
  }
  const esercizi = g.esercizi.length
  return { lavoro, recupero, cambi: esercizi * SECONDI_CAMBIO_ESERCIZIO, serie, esercizi }
}

/**
 * Il riscaldamento e il defaticamento, in minuti, dalla nota del giorno:
 * «Riscaldamento 5 min di cyclette; defaticamento 5-10 min di stretching».
 * Senza un numero di minuti non si conta niente: meglio una parte in meno che
 * una inventata.
 */
export function contornoDaNota(nota: string | null | undefined): { riscaldamento: number; defaticamento: number } {
  const esito = { riscaldamento: 0, defaticamento: 0 }
  for (const pezzo of (nota ?? '').split(/[;.\n]/)) {
    const m = /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:min\b|minuti\b|')/i.exec(pezzo)
    if (!m) continue
    const minuti = m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1])
    if (minuti <= 0 || minuti > 30) continue
    if (/riscald/i.test(pezzo)) esito.riscaldamento += minuti
    else if (/defatic|stretching|allungament/i.test(pezzo)) esito.defaticamento += minuti
  }
  return esito
}

/**
 * La durata vera della parte coi pesi: la mediana delle sedute chiuse di quel
 * giorno di quella scheda, dall'avvio alla chiusura. Le sedute lasciate aperte
 * o chiuse per sbaglio (meno di 10 minuti, piu' di 3 ore) non contano.
 */
export function durataVera(sedute: SedutaStorico[] | null | undefined, titolo: string, giorno: string): { minuti: number; sedute: number } | null {
  const minuti = (sedute ?? [])
    .filter((s) => s.fine && s.serie > 0 && s.titolo === titolo && s.giorno_nome === giorno)
    .map((s) => (new Date(s.fine as string).getTime() - new Date(s.inizio).getTime()) / 60000)
    .filter((m) => m >= 10 && m <= 180)
    .sort((a, b) => a - b)
  if (!minuti.length) return null
  const meta = Math.floor(minuti.length / 2)
  const mediana = minuti.length % 2 ? minuti[meta] : (minuti[meta - 1] + minuti[meta]) / 2
  return { minuti: Math.round(mediana), sedute: minuti.length }
}

/** Le kcal di tanti minuti a un certo MET, col MET del socio (BMR / 1440 al minuto). */
export function kcal(bmr: number, met: number, minuti: number): number {
  return (met * bmr * minuti) / 1440
}

/** Il di piu' dopo la seduta: una quota di quello che i pesi hanno aggiunto al riposo. */
export function dopoSeduta(bmr: number, met: number, minuti: number): number {
  return EPOC * kcal(bmr, met - 1, minuti)
}

export type StimaGiorno = {
  nome: string
  /** Tutta la seduta: riscaldamento, pesi, defaticamento. */
  minuti: number
  pesi: { minuti: number; lavoro: number; recupero: number; cambi: number; da: number; a: number; circa: number }
  /** La durata dei pesi viene dalle sedute vere, quando ci sono. */
  vera: { sedute: number } | null
  riscaldamento: { minuti: number; kcal: number }
  defaticamento: { minuti: number; kcal: number }
  epoc: { da: number; a: number; circa: number }
  serie: number
  da: number
  a: number
  circa: number
}

export type Stima = {
  anni: number
  sesso: Sesso
  kg: number
  cm: number
  bmr: number
  giorni: StimaGiorno[]
  /** Le sedute a settimana: quelle della scheda, o tanti quanti i suoi giorni. */
  sedute: number
  settimana: { da: number; a: number; circa: number }
  /** Il fabbisogno di massima di un giorno medio della settimana, allenamento compreso. */
  fabbisogno: number
}

const arrotonda = (n: number, a = 5) => Math.round(n / a) * a
export const MET_MEDIO = (MET_MODERATO + MET_INTENSO) / 2

export function stimaScheda(
  giorni: GiornoSchedaLab[],
  giorniSettimana: number | null,
  p: { kg: number; cm: number; anni: number; sesso: Sesso },
  vere?: { titolo: string; sedute: SedutaStorico[] | null },
): Stima {
  const bmr = metabolismoBasale(p)
  let nettoMedio = 0
  const perGiorno: StimaGiorno[] = giorni.map((g) => {
    const d = durataGiorno(g)
    const vera = vere ? durataVera(vere.sedute, vere.titolo, g.nome) : null
    const minutiPesi = vera ? vera.minuti : (d.lavoro + d.recupero + d.cambi) / 60
    const contorno = contornoDaNota(g.note)
    const risc = kcal(bmr, MET_RISCALDAMENTO, contorno.riscaldamento)
    const defa = kcal(bmr, MET_DEFATICAMENTO, contorno.defaticamento)
    const pesi = (met: number) => kcal(bmr, met, minutiPesi)
    const epoc = (met: number) => dopoSeduta(bmr, met, minutiPesi)
    const tot = (met: number) => pesi(met) + epoc(met) + risc + defa
    // Il netto (quello che la seduta aggiunge al riposo), per il fabbisogno.
    nettoMedio +=
      kcal(bmr, MET_MEDIO - 1, minutiPesi) + epoc(MET_MEDIO) + kcal(bmr, MET_RISCALDAMENTO - 1, contorno.riscaldamento) + kcal(bmr, MET_DEFATICAMENTO - 1, contorno.defaticamento)
    return {
      nome: g.nome,
      minuti: Math.round(minutiPesi + contorno.riscaldamento + contorno.defaticamento),
      pesi: {
        minuti: Math.round(minutiPesi),
        lavoro: Math.round(d.lavoro / 60),
        recupero: Math.round(d.recupero / 60),
        cambi: Math.round(d.cambi / 60),
        da: arrotonda(pesi(MET_MODERATO)),
        a: arrotonda(pesi(MET_INTENSO)),
        circa: arrotonda(pesi(MET_MEDIO)),
      },
      vera: vera ? { sedute: vera.sedute } : null,
      riscaldamento: { minuti: contorno.riscaldamento, kcal: Math.round(risc) },
      defaticamento: { minuti: contorno.defaticamento, kcal: Math.round(defa) },
      epoc: { da: Math.round(epoc(MET_MODERATO)), a: Math.round(epoc(MET_INTENSO)), circa: Math.round(epoc(MET_MEDIO)) },
      serie: d.serie,
      da: arrotonda(tot(MET_MODERATO)),
      a: arrotonda(tot(MET_INTENSO)),
      circa: arrotonda(tot(MET_MEDIO)),
    }
  })
  const sedute = giorniSettimana && giorniSettimana > 0 ? giorniSettimana : Math.max(1, giorni.length)
  const media = (k: 'da' | 'a' | 'circa') => (perGiorno.length ? perGiorno.reduce((s, x) => s + x[k], 0) / perGiorno.length : 0)
  const settimana = { da: arrotonda(media('da') * sedute, 10), a: arrotonda(media('a') * sedute, 10), circa: arrotonda(media('circa') * sedute, 10) }
  // Un giorno medio: la vita fuori dalla sala, sedentaria, piu' la settimana di
  // allenamento spalmata su sette giorni. Dell'allenamento si conta solo il di
  // piu' (il MET meno uno): il riposo di quei minuti e' gia' nel basale.
  const nettoSettimana = (perGiorno.length ? nettoMedio / perGiorno.length : 0) * sedute
  const fabbisogno = arrotonda(bmr * FATTORE_RIPOSO + nettoSettimana / 7, 10)
  return { ...p, bmr: Math.round(bmr), giorni: perGiorno, sedute, settimana, fabbisogno }
}
