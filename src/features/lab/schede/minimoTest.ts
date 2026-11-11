// Il minimo del test dei massimali (11/11/2026): un esercizio per gruppo, cioe' 3 su 7.
//
// Puro, senza rete e senza React: lo usa `Test.tsx` per il riquadro «Il minimo» e lo prova `scripts/prova-minimo-test.ts`.
//
// Il minimo e' la stessa cosa che il server chiama `copertura.calcolabile` (`_shared/schede/massimali.ts` di APP-ATHLON, `TEST_MINIMI`:
// uno per la parte superiore, uno per il core, uno per la parte inferiore). Qui si ricava dall'elenco degli esercizi del test, che c'e'
// sempre: `copertura` puo' mancare (un server di prima), e il riquadro non deve dipendere da lei. Se il server cambia il minimo di un
// gruppo, `daCopertura` lo segue; `statoMinimo` no (conta 1 per gruppo): in quel caso va cambiato qui.

export type GruppoTest = 'superiore' | 'core' | 'inferiore'

/** L'ordine in cui i gruppi si mostrano, lo stesso della schermata. */
export const ORDINE_GRUPPI: GruppoTest[] = ['superiore', 'core', 'inferiore']

export type PassoMinimo = {
  gruppo: GruppoTest
  /** Almeno un esercizio del gruppo e' stato fatto. */
  fatto: boolean
  /** Quanti esercizi del gruppo sono stati fatti, e quanti ce ne sono nel test. */
  fatti: number
  totale: number
}

export type StatoMinimo = {
  /** Un passo per ogni gruppo che ha almeno un esercizio nel test. */
  passi: PassoMinimo[]
  /** Quanti gruppi hanno il loro esercizio, e quanti sono i gruppi: «2 di 3». */
  fatti: number
  totale: number
  /** Tutti i gruppi hanno almeno un esercizio fatto: i chili si calcolano. */
  raggiunto: boolean
  /** I gruppi ancora senza un esercizio fatto, nell'ordine della schermata. */
  mancano: GruppoTest[]
  /** Gli esercizi del test non ancora fatti: quelli in piu', che rendono i chili piu' precisi. */
  altri: number
  /** Fra gli `altri`, quelli consigliati (`secondoConsigliato`): oggi il secondo esercizio delle gambe, quando ne e' stato fatto uno solo. */
  consigliati: number
  /** I gruppi a cui appartengono i `consigliati`. */
  gruppiConsigliati: GruppoTest[]
}

/**
 * I gruppi in cui il secondo esercizio non e' un di piu' ma un consiglio (11/11/2026, deciso da Maurizio): la parte inferiore. I due test
 * delle gambe (leg extension e leg curl) danno spesso stime che non tornano fra loro (in tre soci su quattro di quelli che li avevano fatti
 * tutti e due), e con un test solo non c'e' modo di accorgersene; i test della parte superiore invece tornano fra loro, e li' il secondo
 * resta facoltativo. Il minimo non cambia: resta un esercizio per gruppo. La stessa regola sta nel CRM (`lib/massimaliTest.ts` di APP-ATHLON).
 */
export const GRUPPI_CON_SECONDO_CONSIGLIATO: GruppoTest[] = ['inferiore']

/**
 * Gli esercizi non ancora fatti di questo gruppo sono «consigliati»? Si' se il gruppo e' fra quelli sopra, ne ha piu' di uno, e ne e' stato
 * fatto **uno solo**: con zero la scelta e' ancora libera (basta il minimo), con due il controllo c'e' gia'.
 */
export function secondoConsigliato(gruppo: GruppoTest, fatti: number, totale: number): boolean {
  return GRUPPI_CON_SECONDO_CONSIGLIATO.includes(gruppo) && totale > 1 && fatti === 1
}

/** Lo stato del minimo, dall'elenco degli esercizi del test (`ultimo` non nullo = fatto). */
export function statoMinimo(esercizi: { test_gruppo: GruppoTest; ultimo: unknown | null }[]): StatoMinimo {
  const passi: PassoMinimo[] = []
  for (const gruppo of ORDINE_GRUPPI) {
    const qui = esercizi.filter((e) => e.test_gruppo === gruppo)
    if (!qui.length) continue
    const fatti = qui.filter((e) => e.ultimo != null).length
    passi.push({ gruppo, fatto: fatti >= 1, fatti, totale: qui.length })
  }
  const fatti = passi.filter((p) => p.fatto).length
  const daConsigliare = passi.filter((p) => secondoConsigliato(p.gruppo, p.fatti, p.totale))
  return {
    passi,
    fatti,
    totale: passi.length,
    raggiunto: passi.length > 0 && fatti === passi.length,
    mancano: passi.filter((p) => !p.fatto).map((p) => p.gruppo),
    altri: esercizi.filter((e) => e.ultimo == null).length,
    consigliati: daConsigliare.reduce((n, p) => n + (p.totale - p.fatti), 0),
    gruppiConsigliati: daConsigliare.map((p) => p.gruppo),
  }
}

/** Lo stesso, dalla `copertura` che il server manda dopo un salvataggio: quanti gruppi hanno raggiunto il loro minimo. */
export function daCopertura(c: { gruppi: Partial<Record<GruppoTest, { fatti: number; minimo: number }>> } | null | undefined): Pick<StatoMinimo, 'fatti' | 'totale' | 'raggiunto' | 'mancano'> | null {
  if (!c?.gruppi) return null
  const gruppi = ORDINE_GRUPPI.filter((g) => c.gruppi[g])
  if (!gruppi.length) return null
  const mancano = gruppi.filter((g) => c.gruppi[g]!.fatti < Math.max(1, c.gruppi[g]!.minimo))
  return { fatti: gruppi.length - mancano.length, totale: gruppi.length, raggiunto: !mancano.length, mancano }
}
