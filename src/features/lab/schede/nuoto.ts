import type { Continuo, Stile } from '@/api/lab'

// Il piano di nuoto nell'app (20/10/2026): le parole, e i conti che si fanno a vista. Un piano di vasca e' un piano
// come gli altri — le righe sono «4 × 100 m, recupero 20″, medio» — ma **si legge e non si registra**: in acqua non
// ci sono chili da segnare, e per questo non c'e' «Inizia». La funzione (`_shared/nuoto`) lo scrive e lo ricontrolla;
// qui si mostrano i **metri**, che sono un'addizione, e non i minuti, che sarebbero una stima.
//
// Questo file e' puro (solo tipi da `@/api/lab`, nessun valore): si prova con `npx tsx` senza React Native.

export const NOME_STILE: Record<Stile, string> = { stile_libero: 'Stile libero', dorso: 'Dorso', rana: 'Rana', farfalla: 'Farfalla' }

export const NOME_CONTINUO: Record<Continuo, { titolo: string; nota: string }> = {
  sotto_100: { titolo: 'Meno di 100 m', nota: 'Mi fermo presto' },
  '100_400': { titolo: '100–400 m', nota: 'Qualche vasca di fila' },
  '400_1000': { titolo: '400–1000 m', nota: 'Nuoto a lungo senza fermarmi' },
  oltre_1000: { titolo: 'Oltre 1000 m', nota: 'Nuoto per mezz’ora e più' },
}

// Le liste escono dai nomi, nell'ordine in cui sono scritti: `Record<Stile, …>` obbliga a nominarli tutti.
export const STILI_ELENCO: { valore: Stile; testo: string }[] = (Object.keys(NOME_STILE) as Stile[]).map((s) => ({ valore: s, testo: NOME_STILE[s] }))
export const CONTINUO_ELENCO: { valore: Continuo; testo: string }[] = (Object.keys(NOME_CONTINUO) as Continuo[]).map((c) => ({ valore: c, testo: NOME_CONTINUO[c].titolo }))

/** Quanto dura una seduta in vasca: il turno del Nuoto Libero e' di un'ora, ma si puo' venire per meno. */
export const MINUTI_VASCA: (30 | 45 | 60)[] = [30, 45, 60]

/** Un piano e' di vasca se lo dice la funzione (`ambiente`): si ricava dagli esercizi, il browser non lo decide. */
export const eDiVasca = (s: { ambiente?: string | null } | null | undefined): boolean => s?.ambiente === 'vasca'

/** «100 m» → 100; qualunque altra cosa («10», «30 sec») non e' una distanza e non si somma. */
export function metriDi(ripetizioni: string): number | null {
  const m = /^\s*(\d{1,4})\s*m\s*$/i.exec(ripetizioni)
  return m ? Number(m[1]) : null
}

/** I metri di una riga: serie per distanza. Zero se la distanza non e' scritta come «<n> m». */
export const metriRiga = (e: { serie: number; ripetizioni: string }): number => e.serie * (metriDi(e.ripetizioni) ?? 0)

/** I metri di una seduta: una somma. */
export const metriDelGiorno = (g: { esercizi: { serie: number; ripetizioni: string }[] }): number => g.esercizi.reduce((s, e) => s + metriRiga(e), 0)

/** «1800» → «1.800 m» (a mano: Intl non c'e' su tutti i motori). */
export const inMetri = (n: number): string => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} m`

/** Le parti di una seduta, nell'ordine in cui si nuotano. La parte sta in testa alla nota: «Serie principale. Respira ogni tre bracciate». */
export const PARTI_VASCA = ['Riscaldamento', 'Tecnica', 'Serie principale', 'Defaticamento'] as const
export type ParteVasca = (typeof PARTI_VASCA)[number]

/** La parte e il resto della nota. Una nota che non comincia per una parte (scritta a mano) non ne ha e resta intera. */
export function parteDa(nota: string | null | undefined): { parte: ParteVasca | null; resto: string } {
  const t = (nota ?? '').trim()
  for (const p of PARTI_VASCA) {
    if (t.toLowerCase().startsWith(p.toLowerCase())) return { parte: p, resto: t.slice(p.length).replace(/^[.:\s-]+/, '') }
  }
  return { parte: null, resto: t }
}

/** «1.600 m · 1.800 m · 1.400 m»: i metri di ogni seduta in una riga, per le carte. Vuoto se non ce ne sono. */
export function riassuntoVasca(giorni: { esercizi: { serie: number; ripetizioni: string }[] }[]): string {
  const metri = giorni.map(metriDelGiorno).filter((m) => m > 0)
  return metri.map(inMetri).join(' · ')
}

/** Il «piano di nuoto» che si dice sulla carta, accanto a da dove viene. */
export const ETICHETTA_VASCA = 'Piano di nuoto'

/** Perche' non c'e' «Inizia»: lo si dice una volta, dove il socio se lo aspetterebbe. */
export const SPIEGA_SOLO_LETTURA =
  'Un piano di nuoto si legge a bordo vasca: non ci sono chili e ripetizioni da segnare, quindi qui non c’è «Inizia» e non finisce nello storico. Se qualcosa ti sembra troppo, accorcia la seduta: meglio corta e fatta bene.'

/** Cosa dice il piano di vasca quando lo si apre dal Percorso: «cosa fai in vasca oggi». */
export const COSA_FAI_IN_VASCA = 'Cosa fai in vasca oggi'
