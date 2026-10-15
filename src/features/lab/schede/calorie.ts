import type { GiornoSchedaLab } from '@/api/lab'

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
// **La seduta** si conta minuto per minuto, seguendo la scheda come la segue
// la seduta vera (`dopo()` di comune.ts, superserie comprese): ogni serie
// dura le sue ripetizioni a 3 secondi l'una, piu' 10 secondi per prendere
// posizione, e poi il recupero scritto. Il riscaldamento non c'e': non e'
// nella scheda.
//
// **Il consumo** usa i MET del Compendium of Physical Activities: 3,5 per
// l'allenamento coi pesi a intensita' moderata (codice 02054), 5 se e'
// impegnativo. Un MET e' quanto si consuma a riposo, e il Compendium lo
// fissa a 3,5 ml di ossigeno per kg al minuto, che per molti e' troppo: qui
// il MET e' il metabolismo a riposo del socio, cioe' BMR / 1440 kcal al
// minuto. Cosi' l'eta', il sesso e l'altezza entrano anche nella seduta, e
// non solo il peso.
//
// Sono stime: possono sbagliare del 20-30% in un verso o nell'altro, e la
// schermata lo dice. Nessun numero esce dall'app.

export const SECONDI_PER_RIPETIZIONE = 3
export const SECONDI_PREPARAZIONE = 10
export const MET_MODERATO = 3.5
export const MET_INTENSO = 5
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

/** I secondi di lavoro di una serie: quelli scritti se e' a tempo, altrimenti le ripetizioni. */
export function secondiSerie(ripetizioni: string): number {
  const numeri = (ripetizioni.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')))
  if (aTempo(ripetizioni)) {
    const n = numeri[0] ?? 30
    return /\b(min|minuti)\b/i.test(ripetizioni) ? n * 60 : n
  }
  // «8-10» vale 9; «max», «a cedimento» senza numero valgono 12.
  const rip = numeri.length ? (numeri.length > 1 ? (numeri[0] + numeri[1]) / 2 : numeri[0]) : 12
  return rip * SECONDI_PER_RIPETIZIONE + SECONDI_PREPARAZIONE
}

export type DurataGiorno = { lavoro: number; recupero: number; serie: number; minuti: number }

/** Quanto dura un giorno della scheda, seguendo le serie e i recuperi come la seduta. */
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
  return { lavoro, recupero, serie, minuti: Math.round((lavoro + recupero) / 60) }
}

/** Le kcal di tanti minuti a un certo MET, col MET del socio (BMR / 1440 al minuto). */
export function kcal(bmr: number, met: number, minuti: number): number {
  return (met * bmr * minuti) / 1440
}

export type StimaGiorno = { nome: string; minuti: number; lavoro: number; recupero: number; serie: number; da: number; a: number; circa: number }

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
const metMedio = (MET_MODERATO + MET_INTENSO) / 2

export function stimaScheda(giorni: GiornoSchedaLab[], giorniSettimana: number | null, p: { kg: number; cm: number; anni: number; sesso: Sesso }): Stima {
  const bmr = metabolismoBasale(p)
  const perGiorno = giorni.map((g) => {
    const d = durataGiorno(g)
    const da = kcal(bmr, MET_MODERATO, d.minuti)
    const a = kcal(bmr, MET_INTENSO, d.minuti)
    return { nome: g.nome, minuti: d.minuti, lavoro: Math.round(d.lavoro / 60), recupero: Math.round(d.recupero / 60), serie: d.serie, da: arrotonda(da), a: arrotonda(a), circa: arrotonda((da + a) / 2) }
  })
  const sedute = giorniSettimana && giorniSettimana > 0 ? giorniSettimana : Math.max(1, giorni.length)
  const media = (k: 'da' | 'a' | 'circa') => (perGiorno.length ? perGiorno.reduce((s, x) => s + x[k], 0) / perGiorno.length : 0)
  const settimana = { da: arrotonda(media('da') * sedute, 10), a: arrotonda(media('a') * sedute, 10), circa: arrotonda(media('circa') * sedute, 10) }
  // Un giorno medio: la vita fuori dalla sala, sedentaria, piu' la settimana di
  // allenamento spalmata su sette giorni. Dell'allenamento si conta solo il
  // di piu' (il MET meno uno): il riposo di quei minuti e' gia' nel basale.
  const nettoSettimana = (media('circa') * sedute * (metMedio - 1)) / metMedio
  const fabbisogno = arrotonda(bmr * FATTORE_RIPOSO + nettoSettimana / 7, 10)
  return { ...p, bmr: Math.round(bmr), giorni: perGiorno, sedute, settimana, fabbisogno }
}
