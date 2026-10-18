import type { Alimento, Pasto, VoceDiario } from '@/api/alimentazione'

import { FATTORE_RIPOSO, metabolismoBasale } from '../schede/stimaCalorie'
import type { Corpo, Voce } from '../schede/contatoreCalorie'

// I conti della sezione Alimentazione (19/10/2026): quanto e' entrato in un
// giorno, da quali nutrienti, e quanto si e' consumato secondo le stesse stime
// del contatore delle calorie. Nessun obiettivo: si mostra il bilancio, non si
// dice quanto mangiare (la sezione e' educazione alimentare, non una dieta).
//
// **I riferimenti** sono quelli dei LARN (SINU, IV revisione, 2014) per gli
// adulti: carboidrati 45–60% dell'energia, grassi 20–35%, proteine 0,9 g per kg
// di peso al giorno. Per chi si allena con regolarita' la posizione comune di
// ACSM, Academy of Nutrition and Dietetics e Dietitians of Canada (2016) indica
// 1,2–2,0 g/kg di proteine. Si mostrano come intervalli di riferimento, non come
// traguardi.
//
// **Il consumo del giorno** e' il metabolismo a riposo per 1,2 (la vita
// quotidiana leggera, FATTORE_RIPOSO delle schede) piu' quello che il contatore
// conta per oggi, al netto della parte di riposo che sarebbe stata consumata
// comunque in quei minuti (altrimenti la si conterebbe due volte).

export const LARN = {
  carboidrati: [45, 60] as const,
  grassi: [20, 35] as const,
  proteineGKg: 0.9,
  proteineSportivo: [1.2, 2.0] as const,
}

export type Totali = { kcal: number; proteine: number; carboidrati: number; grassi: number; fibre: number; voci: number }

export const ZERO: Totali = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibre: 0, voci: 0 }

export function somma(voci: VoceDiario[]): Totali {
  return voci.reduce<Totali>(
    (t, v) => ({
      kcal: t.kcal + v.kcal,
      proteine: t.proteine + v.proteine,
      carboidrati: t.carboidrati + v.carboidrati,
      grassi: t.grassi + v.grassi,
      fibre: t.fibre + v.fibre,
      voci: t.voci + 1,
    }),
    ZERO,
  )
}

export function perPasto(voci: VoceDiario[]): Record<Pasto, VoceDiario[]> {
  const r: Record<Pasto, VoceDiario[]> = { colazione: [], pranzo: [], cena: [], spuntino: [] }
  for (const v of voci) r[v.pasto].push(v)
  return r
}

/** La quota dell'energia che viene da ogni nutriente (Atwater: 4, 4, 9 kcal per grammo), in percentuale. */
export function ripartizione(t: Totali): { proteine: number; carboidrati: number; grassi: number } | null {
  const e = t.proteine * 4 + t.carboidrati * 4 + t.grassi * 9
  if (e < 1) return null
  return { proteine: (t.proteine * 4 * 100) / e, carboidrati: (t.carboidrati * 4 * 100) / e, grassi: (t.grassi * 9 * 100) / e }
}

/** Quanto ha consumato oggi: il riposo e la vita quotidiana, piu' l'attivita' contata al netto del riposo. */
export function consumoDelGiorno(corpo: Corpo, attivitaDelGiorno: Voce[]): { riposo: number; attivita: number; totale: number } {
  const bmr = metabolismoBasale(corpo)
  const riposo = bmr * FATTORE_RIPOSO
  const alMinuto = riposo / 1440
  const attivita = attivitaDelGiorno.reduce((s, v) => s + Math.max(0, v.kcal - alMinuto * v.minuti), 0)
  return { riposo, attivita, totale: riposo + attivita }
}

/** I grammi di una voce dai valori per 100 g. */
export function perGrammi(a: Pick<Alimento, 'kcal' | 'proteine' | 'carboidrati' | 'grassi'>, g: number) {
  const f = g / 100
  return { kcal: a.kcal * f, proteine: a.proteine * f, carboidrati: a.carboidrati * f, grassi: a.grassi * f }
}

// ---------------------------------------------------------------------------
// La ricerca nel catalogo: senza accenti e senza maiuscole, sul nome e sui sinonimi

const piano = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Gli alimenti che rispondono a quello che si e' scritto: prima chi comincia cosi', poi chi lo contiene. */
export function cerca(catalogo: Alimento[], testo: string, quanti = 30): Alimento[] {
  const q = piano(testo)
  if (!q) return []
  const parole = q.split(' ')
  const punti = (a: Alimento) => {
    const nomi = [a.nome, ...a.sinonimi].map(piano)
    if (nomi.some((n) => n === q)) return 4
    if (nomi.some((n) => n.startsWith(q))) return 3
    if (nomi.some((n) => n.split(' ').some((w) => w.startsWith(q)))) return 2
    if (parole.every((p) => nomi.some((n) => n.includes(p)))) return 1
    return 0
  }
  return catalogo
    .map((a) => ({ a, p: punti(a) }))
    .filter((x) => x.p > 0)
    .sort((x, y) => y.p - x.p || x.a.nome.localeCompare(y.a.nome, 'it'))
    .slice(0, quanti)
    .map((x) => x.a)
}

/** I giorni a Roma, come nel contatore. */
const giorniRoma = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })
export const oggiRoma = () => giorniRoma.format(new Date())
