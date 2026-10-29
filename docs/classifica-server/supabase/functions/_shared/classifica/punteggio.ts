// Il punteggio del mese della classifica (29/10/2026): la copia in TypeScript di `athlon_classifica_punteggio` (migrazione
// 20261029a). **Il calcolo vero e' quello SQL**, che gira di notte per tutti; questo serve a provarlo (la prova confronta i due su
// dati veri) e a fissare le regole in un posto leggibile. Se cambia una regola, cambia in tutti e due, e nell'app
// (`src/features/lab/fit/calcoloPunteggio.ts` del portale: curva, cinque giorni di diario, cinque notti).
//
// Le settimane sono lunedi'-domenica; per ogni settimana che tocca il mese si calcola la quota (0-1) di ogni pilastro e la quota
// del mese e' la media pesata per i giorni che la settimana ha nel mese. Si contano i giorni fino a ieri; la settimana in corso si
// guarda sugli ultimi 7 giorni. Le settimane prima della prima attivita' del pilastro non contano. Il punteggio rapporta ai soli
// pilastri in uso (Food e Recover solo con consenso vivo), cosi' chi non li usa puo' arrivare a 100.
// Puro: niente rete, niente database.

export const PESI = { train: 70, food: 15, recover: 15 } as const
/** Quota di Train per numero di giorni attivi in 7 (0..7). */
export const CURVA_TRAIN = [0, 0.4, 1, 1, 1, 0.9, 0.8, 0.7] as const
export const GIORNI_FOOD = 5
export const NOTTI_RECOVER = 5

export const spostaGiorno = (g: string, n: number): string => {
  const d = new Date(`${g}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** Il lunedi' della settimana di un giorno. */
export const lunediDi = (g: string): string => spostaGiorno(g, -((new Date(`${g}T12:00:00Z`).getUTCDay() + 6) % 7))
/** L'ultimo giorno del mese di `g`. */
export const ultimoDelMese = (g: string): string => new Date(Date.UTC(Number(g.slice(0, 4)), Number(g.slice(5, 7)), 0)).toISOString().slice(0, 10)

/** Quanto vale una notte: da 7 ore in su il massimo. */
export const quotaNotte = (minuti: number): number => (minuti >= 420 ? 1 : minuti >= 360 ? 0.7 : minuti >= 300 ? 0.4 : 0.2)

export type IngressiMese = {
  /** Un giorno qualunque del mese («AAAA-MM-GG»). */
  mese: string
  /** Oggi, a Roma. */
  oggi: string
  /** I giorni (a Roma) con un ingresso al tornello o una presenza segnata a una lezione. */
  giorniTrain: string[]
  /** Il primo giorno di sempre con un ingresso o una presenza, o null. */
  primaTrain: string | null
  /** Null se Food non e' in uso (nessun consenso vivo alla versione corrente, o numeri nascosti). `giorni` sono quelli con i pasti principali. */
  food: { giorni: string[]; prima: string | null } | null
  /** Null se Recover non e' in uso. Una notte per giorno, con la durata in minuti. */
  recover: { notti: { giorno: string; minuti: number }[]; prima: string | null } | null
}

export type PunteggioMese = { punteggio: number; giorni_attivi: number }

export function punteggioMese(i: IngressiMese): PunteggioMese {
  const m0 = `${i.mese.slice(0, 7)}-01`
  const fino = [ultimoDelMese(m0), spostaGiorno(i.oggi, -1)].sort()[0]
  const settimane: { fin: string; peso: number }[] = []
  for (let lun = lunediDi(m0), n = 0; lun <= fino && n < 6; lun = spostaGiorno(lun, 7), n++) {
    let peso = 0
    for (let k = 0; k < 7; k++) {
      const g = spostaGiorno(lun, k)
      if (g >= m0 && g <= fino) peso++
    }
    if (peso > 0) settimane.push({ fin: [spostaGiorno(lun, 6), fino].sort()[0], peso })
  }
  const dentro = (g: string, fin: string) => g >= spostaGiorno(fin, -6) && g <= fino && g <= fin
  const train = new Set(i.giorniTrain)
  const media = (prima: string | null, quota: (fin: string) => number): number => {
    let somma = 0
    let pesi = 0
    for (const s of settimane) {
      if (prima === null || s.fin < prima) continue
      somma += s.peso * quota(s.fin)
      pesi += s.peso
    }
    return pesi ? somma / pesi : 0
  }
  const mt = media(i.primaTrain, (fin) => CURVA_TRAIN[Math.min(7, [...train].filter((g) => dentro(g, fin)).length)])
  const giorniFood = new Set(i.food?.giorni ?? [])
  const mf = i.food ? media(i.food.prima, (fin) => Math.min(1, [...giorniFood].filter((g) => dentro(g, fin)).length / GIORNI_FOOD)) : 0
  const mr = i.recover
    ? media(i.recover.prima, (fin) => Math.min(1, i.recover!.notti.filter((n) => dentro(n.giorno, fin)).reduce((s, n) => s + quotaNotte(n.minuti), 0) / NOTTI_RECOVER))
    : 0
  const pesiInUso = PESI.train + (i.food ? PESI.food : 0) + (i.recover ? PESI.recover : 0)
  const punti = PESI.train * mt + (i.food ? PESI.food * mf : 0) + (i.recover ? PESI.recover * mr : 0)
  return {
    punteggio: Math.round((100 * punti) / pesiInUso),
    giorni_attivi: [...train].filter((g) => g >= m0 && g <= fino).length,
  }
}
