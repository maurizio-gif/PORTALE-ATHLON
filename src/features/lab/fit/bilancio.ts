import type { VoceDiario } from '@/api/alimentazione'

import { consumoDelGiorno } from '../alimentazione/conti'
import { locale, t } from '../../../lib/lingua'
import { lunediDi, spostaGiorno, type Corpo, type Voce } from '../schede/contatoreCalorie'

// Balance (19/10/2026): quanto si e' consumato e quanto si e' mangiato, giorno per
// giorno, e la media della settimana. Le due cifre sono stime, e ognuna puo'
// sbagliare del 10-20%: per questo il confronto che conta e' la media di piu'
// giorni, non il numero di uno solo.
//
// Due regole, e il resto ne discende:
//   - **un giorno senza niente nel diario non vale zero**: non e' un digiuno, e'
//     un giorno non scritto. Resta nel grafico col solo consumo ed esce dalle medie;
//   - **oggi non e' finito**: si vede, ma non entra nelle medie, o la cena che
//     manca farebbe sembrare ogni sera un giorno in deficit.
// Il consumo e' quello del diario e del contatore (consumoDelGiorno): riposo per
// 1,2 piu' l'attivita' contata, col peso di adesso.

export type GiornoBilancio = {
  giorno: string
  consumate: number
  /** null: quel giorno non c'e' niente nel diario. */
  mangiate: number | null
  inCorso: boolean
}

export type Media = { giorni: number; consumate: number; mangiate: number; differenza: number }

/** Sotto questa differenza media al giorno, le due stime non si distinguono. */
export const SOGLIA_PARI = 150

export function giorniBilancio(oggi: string, quanti: number, corpo: Corpo, attivita: Voce[], diario: VoceDiario[] | null): GiornoBilancio[] {
  const mangiato = new Map<string, number>()
  for (const v of diario ?? []) mangiato.set(v.data, (mangiato.get(v.data) ?? 0) + v.kcal)
  const perGiorno = new Map<string, Voce[]>()
  for (const v of attivita) perGiorno.set(v.giorno, [...(perGiorno.get(v.giorno) ?? []), v])
  const r: GiornoBilancio[] = []
  for (let i = quanti - 1; i >= 0; i--) {
    const giorno = spostaGiorno(oggi, -i)
    r.push({
      giorno,
      consumate: consumoDelGiorno(corpo, perGiorno.get(giorno) ?? []).totale,
      mangiate: mangiato.has(giorno) ? mangiato.get(giorno)! : null,
      inCorso: giorno === oggi,
    })
  }
  return r
}

/** La media dei giorni scritti e finiti; null se non ce n'e' nessuno. */
export function media(giorni: GiornoBilancio[]): Media | null {
  const buoni = giorni.filter((g) => g.mangiate != null && !g.inCorso)
  if (!buoni.length) return null
  const consumate = buoni.reduce((s, g) => s + g.consumate, 0) / buoni.length
  const mangiate = buoni.reduce((s, g) => s + g.mangiate!, 0) / buoni.length
  return { giorni: buoni.length, consumate, mangiate, differenza: mangiate - consumate }
}

/** La media dei soli consumi (anche senza diario), oggi escluso. */
export function mediaConsumo(giorni: GiornoBilancio[]): number | null {
  const finiti = giorni.filter((g) => !g.inCorso)
  return finiti.length ? finiti.reduce((s, g) => s + g.consumate, 0) / finiti.length : null
}

/** Arrotondata a 50: una stima che sbaglia di centinaia non merita le unita'. */
export const a50 = (n: number) => Math.round(Math.abs(n) / 50) * 50

export type Verso = 'pari' | 'meno' | 'piu'
export const verso = (m: Media): Verso => (Math.abs(m.differenza) < SOGLIA_PARI ? 'pari' : m.differenza < 0 ? 'meno' : 'piu')

/** La frase della media: descrive, non giudica e non indica un traguardo. */
export function frase(m: Media): string {
  const giorni = m.giorni === 1 ? t('nell’unico giorno scritto', 'on the only day logged') : t(`nei ${m.giorni} giorni scritti`, `over the ${m.giorni} days logged`)
  switch (verso(m)) {
    case 'pari':
      return t(`In media, ${giorni}, hai mangiato più o meno quanto hai consumato.`, `On average, ${giorni}, you ate about as much as you burned.`)
    case 'meno':
      return t(
        `In media, ${giorni}, hai mangiato circa ${a50(m.differenza).toLocaleString(locale())} kcal al giorno meno di quante ne hai consumate.`,
        `On average, ${giorni}, you ate about ${a50(m.differenza).toLocaleString(locale())} kcal a day less than you burned.`,
      )
    case 'piu':
      return t(
        `In media, ${giorni}, hai mangiato circa ${a50(m.differenza).toLocaleString(locale())} kcal al giorno più di quante ne hai consumate.`,
        `On average, ${giorni}, you ate about ${a50(m.differenza).toLocaleString(locale())} kcal a day more than you burned.`,
      )
  }
}

/** Le ultime `quante` settimane da lunedi' a domenica, dalla piu' vecchia; i giorni dopo oggi non ci sono. */
export function settimane(giorni: GiornoBilancio[], oggi: string, quante: number): { lunedi: string; giorni: GiornoBilancio[]; media: Media | null }[] {
  const r = []
  const corrente = lunediDi(oggi)
  for (let i = quante - 1; i >= 0; i--) {
    const lunedi = spostaGiorno(corrente, -7 * i)
    const domenica = spostaGiorno(lunedi, 6)
    const sue = giorni.filter((g) => g.giorno >= lunedi && g.giorno <= domenica)
    r.push({ lunedi, giorni: sue, media: media(sue) })
  }
  return r
}
