import type { EsercizioScheda, GiornoSchedaLab, Massimale } from '@/api/lab'

// Le schede di allenamento nel laboratorio: le etichette della libreria (le
// stesse chiavi di lib/esercizi.ts nel CRM) e il calcolo di cosa viene dopo
// una serie, col suo recupero.

export const MUSCOLI: Record<string, string> = {
  pettorali: 'Pettorali',
  schiena: 'Schiena',
  spalle: 'Spalle',
  trapezi: 'Trapezi',
  bicipiti: 'Bicipiti',
  tricipiti: 'Tricipiti',
  avambracci: 'Avambracci',
  core: 'Core',
  lombari: 'Lombari',
  glutei: 'Glutei',
  quadricipiti: 'Quadricipiti',
  femorali: 'Femorali',
  adduttori: 'Adduttori',
  polpacci: 'Polpacci',
  tibiale: 'Tibiale anteriore',
  collo: 'Collo',
  // Le chiavi di free-exercise-db, per gli esercizi del club scritti prima.
  addominali: 'Addominali',
  abduttori: 'Abduttori',
  dorsali: 'Dorsali',
  schiena_centrale: 'Schiena',
}

export const LIVELLI: Record<string, string> = { principiante: 'Principiante', intermedio: 'Intermedio', esperto: 'Esperto' }

export const TIPI: Record<string, string> = { standard: 'Del club', personalizzata: 'Del tuo trainer', ai: 'Agente AI' }

export function muscoli(lista: string[]): string {
  return lista.map((m) => MUSCOLI[m] ?? m).join(', ')
}

/** «90» → «1:30», «45» → «45″». */
export function recupero(secondi: number): string {
  if (secondi <= 0) return 'nessuno'
  const m = Math.floor(secondi / 60)
  const s = secondi % 60
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s}″`
}

/** «mar 14 ott, 18:30». */
export function quando(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

/** «mer 26 ago»: la data del test, senza l'ora. */
export function giornoTest(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
}

/** Gli esercizi a tempo («30 s», «45 sec», «1 min»): si registrano i secondi, non le ripetizioni. */
export function aTempo(ripetizioni: string): boolean {
  return /\b(s|sec|secondi|min|minuti)\b|″|"/i.test(ripetizioni)
}

/** Il gruppo di superserie di un esercizio del giorno: gli esercizi consecutivi con la stessa lettera. */
export function gruppo(giorno: GiornoSchedaLab, indice: number): number[] {
  const e = giorno.esercizi[indice]
  if (!e?.superserie) return [indice]
  let da = indice
  while (da > 0 && giorno.esercizi[da - 1].superserie === e.superserie) da--
  let a = indice
  while (a < giorno.esercizi.length - 1 && giorno.esercizi[a + 1].superserie === e.superserie) a++
  return Array.from({ length: a - da + 1 }, (_, i) => da + i)
}

export type Passo = { indice: number; serie: number }

/**
 * Dopo la serie `serie` dell'esercizio `indice`: quanto si recupera e cosa
 * viene dopo. Nella superserie si passa all'esercizio successivo del giro
 * senza recupero, e si recupera alla fine del giro (il recupero dell'ultimo
 * esercizio del gruppo); finite le serie, il recupero «dopo» e l'esercizio
 * successivo alla scheda.
 */
export function dopo(giorno: GiornoSchedaLab, indice: number, serie: number): { recupero: number; prossimo: Passo | null } {
  const g = gruppo(giorno, indice)
  const ultimo = g[g.length - 1]
  const e = giorno.esercizi[indice]
  if (g.length > 1 && indice !== ultimo) {
    return { recupero: 0, prossimo: { indice: indice + 1, serie } }
  }
  const serieGruppo = Math.max(...g.map((i) => giorno.esercizi[i].serie))
  if (serie < serieGruppo) {
    return { recupero: e.recupero_serie, prossimo: { indice: g[0], serie: serie + 1 } }
  }
  const successivo = ultimo + 1 < giorno.esercizi.length ? { indice: ultimo + 1, serie: 1 } : null
  return { recupero: successivo ? e.recupero_dopo : 0, prossimo: successivo }
}

/** «Panca piana · serie 2 di 4». */
export function descriviPasso(giorno: GiornoSchedaLab, p: Passo): string {
  const e: EsercizioScheda | undefined = giorno.esercizi[p.indice]
  return e ? `${e.nome} · serie ${p.serie} di ${e.serie}` : ''
}

// ---------------------------------------------------------------------------
// I massimali (16/10/2026): la scheda dice la percentuale, il massimale del
// socio la trasforma in chili sulla sua macchina (o in ripetizioni a corpo libero).

/** Il massimale stimato: la media di Epley e Brzycki (come la funzione portale-lab-schede). */
export function stimaMassimale(kg: number, ripetizioni: number): number {
  if (ripetizioni <= 1) return kg
  const epley = kg * (1 + ripetizioni / 30)
  const brzycki = (kg * 36) / (37 - ripetizioni)
  return Math.round(((epley + brzycki) / 2) * 10) / 10
}

/** «37,5». */
export function kg(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('it-IT', { maximumFractionDigits: 1 })
}

export type Obiettivo =
  /** I chili da usare, arrotondati per difetto all'incremento della macchina. */
  | { tipo: 'kg'; kg: number; percentuale: number }
  /** Le ripetizioni da fare (a corpo libero, percentuale delle massime). */
  | { tipo: 'ripetizioni'; ripetizioni: number; percentuale: number }
  /** La percentuale c'e', il massimale ancora no: si fa il test (o si tara alla prima seduta). */
  | { tipo: 'manca'; percentuale: number; daTest: boolean }

/** Dalla percentuale della scheda e dal massimale del socio, il carico vero. */
export function obiettivo(
  e: { percentuale: number | null; incremento_kg: number | null; peso_minimo_kg: number | null; test: 'carico' | 'ripetizioni' | null },
  massimale: { tipo: 'carico' | 'ripetizioni'; massimale: number } | undefined,
): Obiettivo | null {
  if (!e.percentuale) return null
  if (!massimale) return { tipo: 'manca', percentuale: e.percentuale, daTest: !!e.test }
  if (massimale.tipo === 'ripetizioni') {
    return { tipo: 'ripetizioni', ripetizioni: Math.max(1, Math.round((massimale.massimale * e.percentuale) / 100)), percentuale: e.percentuale }
  }
  const grezzo = (massimale.massimale * e.percentuale) / 100
  const passo = e.incremento_kg && e.incremento_kg > 0 ? e.incremento_kg : 0.5
  // Per difetto: meglio una ripetizione in piu' che un peso che non si regge.
  const arrotondato = Math.floor(grezzo / passo + 1e-9) * passo
  return { tipo: 'kg', kg: Math.max(e.peso_minimo_kg ?? 0, arrotondato), percentuale: e.percentuale }
}

/** «70% · 35 kg», «60% · 12 ripetizioni», «70% del massimale». */
export function descriviObiettivo(o: Obiettivo | null): string | null {
  if (!o) return null
  if (o.tipo === 'kg') return `${o.percentuale}% · ${kg(o.kg)} kg`
  if (o.tipo === 'ripetizioni') return `${o.percentuale}% · ${o.ripetizioni} ripetizioni`
  return `${o.percentuale}% del massimale`
}

/** Il test e' da rifare? Ogni 6 settimane, 4 per i principianti. */
export function testDaRifare(ultimo: string | null, giorni: number, principiante = false): boolean {
  if (!ultimo) return false
  const limite = principiante ? Math.min(giorni, 28) : giorni
  return Date.now() - new Date(ultimo).getTime() > limite * 86_400_000
}

export type Indicazione = {
  /** «3 × 10», o con le ripetizioni calcolate a corpo libero. */
  serieRip: string
  /** «35 kg · 70%», «60% delle tue massime», «70% del massimale», o il carico a parole. */
  carico: string | null
  /** I chili da proporre nella seduta. */
  kg: number | null
  /** Le ripetizioni da proporre, se calcolate. */
  ripetizioni: number | null
  /** La percentuale c'e' ma il massimale no: si fa il test, o si tara alla prima seduta. */
  manca: boolean
  /** Manca e l'esercizio e' nel test: il test lo risolve. */
  daTest: boolean
  /** I chili vengono da un massimale stimato dal test del distretto, non misurato. */
  stimato: boolean
}

/** Cosa fare in un esercizio, coi massimali del socio. */
export function indicazione(e: EsercizioScheda, massimali: Massimale[]): Indicazione {
  const m = massimali.find((x) => x.esercizio_id === e.esercizio_id)
  const o = obiettivo(e, m)
  const base = { serieRip: `${e.serie} × ${e.ripetizioni}`, carico: e.carico || null, kg: null, ripetizioni: null, manca: false, daTest: false, stimato: false }
  if (!o) return base
  if (o.tipo === 'kg') {
    const stimato = m?.fonte === 'stima'
    return { ...base, carico: `${stimato ? '≈ ' : ''}${kg(o.kg)} kg · ${o.percentuale}%`, kg: o.kg, stimato }
  }
  if (o.tipo === 'ripetizioni') return { ...base, serieRip: `${e.serie} × ${o.ripetizioni}`, carico: `${o.percentuale}% delle tue massime`, ripetizioni: o.ripetizioni }
  return { ...base, carico: `${o.percentuale}% del massimale`, manca: true, daTest: o.daTest }
}

export const SPIEGA_TARATURA = 'Alla prima seduta scegli un peso con cui fai le ripetizioni indicate tenendone un paio di riserva: da lì calcoliamo i tuoi chili.'

/** I carichi con «≈»: stimati dal test del distretto, poi corretti dalla prima seduta. */
export const SPIEGA_STIMA =
  'Dove vedi «≈» il carico è stimato dal test del tuo distretto (arti superiori, core o arti inferiori), con un margine di prudenza: alla prima seduta, coi chili che usi davvero, diventa il tuo.'

/** Fra quanti giorni rifare il test (0 se e' gia' ora). */
export function giorniAlTest(ultimo: string | null, giorni: number): number {
  if (!ultimo) return 0
  return Math.max(0, Math.ceil((new Date(ultimo).getTime() + giorni * 86_400_000 - Date.now()) / 86_400_000))
}
