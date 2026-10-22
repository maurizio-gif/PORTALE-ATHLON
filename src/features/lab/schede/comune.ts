import type { EsercizioScheda, GiornoSchedaLab, Massimale } from '@/api/lab'
import { locale, t } from '../../../lib/lingua'

// Le schede di allenamento nel laboratorio: le etichette della libreria (le
// stesse chiavi di lib/esercizi.ts nel CRM) e il calcolo di cosa viene dopo
// una serie, col suo recupero.

export const MUSCOLI: Record<string, string> = {
  pettorali: t('Pettorali', 'Chest'),
  schiena: t('Schiena', 'Back'),
  spalle: t('Spalle', 'Shoulders'),
  trapezi: t('Trapezi', 'Traps'),
  bicipiti: t('Bicipiti', 'Biceps'),
  tricipiti: t('Tricipiti', 'Triceps'),
  avambracci: t('Avambracci', 'Forearms'),
  core: 'Core',
  lombari: t('Lombari', 'Lower back'),
  glutei: t('Glutei', 'Glutes'),
  quadricipiti: t('Quadricipiti', 'Quads'),
  femorali: t('Femorali', 'Hamstrings'),
  adduttori: t('Adduttori', 'Adductors'),
  polpacci: t('Polpacci', 'Calves'),
  tibiale: t('Tibiale anteriore', 'Tibialis anterior'),
  collo: t('Collo', 'Neck'),
  // Le chiavi di free-exercise-db, per gli esercizi del club scritti prima.
  addominali: t('Addominali', 'Abs'),
  abduttori: t('Abduttori', 'Abductors'),
  dorsali: t('Dorsali', 'Lats'),
  schiena_centrale: t('Schiena', 'Back'),
}

export const LIVELLI: Record<string, string> = { principiante: t('Principiante', 'Beginner'), intermedio: t('Intermedio', 'Intermediate'), esperto: t('Esperto', 'Advanced') }

// **Un piano composto non dice «AI»** (20/10/2026, richiesta del club): sulla carta e' «Composto per te», come «Scritto da te» e
// «Importato da te». Che dietro ci sia un'intelligenza artificiale sta nelle postille (in fondo all'editor e al piano).
export const TIPI: Record<string, string> = {
  standard: t('Consigliato dal club', 'Recommended by the club'),
  personalizzata: t('Dal tuo trainer', 'From your trainer'),
  ai: t('Composto per te', 'Built for you'),
  socio: t('Tuo', 'Yours'),
}

/** Da dove viene un piano del socio (`origine`), com'e' scritto sulla carta. */
const ORIGINI: Record<string, string> = {
  creata: t('Scritto da te', 'Written by you'),
  importata: t('Importato da te', 'Imported by you'),
  ai: t('Composto per te', 'Built for you'),
  club: t('Dal club, tuo', 'From the club, yours'),
}

/** L'etichetta di un piano: il suo tipo e, per quelli del socio, da dove viene. */
export function etichettaPiano(s: { tipo: string; origine?: string | null }): string {
  if (s.tipo === 'socio') return ORIGINI[s.origine ?? 'creata'] ?? TIPI.socio
  return TIPI[s.tipo] ?? s.tipo
}

/** L'attrezzo di un esercizio (le chiavi di lib/esercizi.ts nel CRM): in italiano la chiave senza trattini bassi, come prima. */
const ATTREZZI_EN: Record<string, string> = {
  corpo_libero: 'bodyweight',
  macchina: 'machine',
  manubri: 'dumbbells',
  bilanciere: 'barbell',
  bilanciere_ez: 'EZ bar',
  cavi: 'cables',
  kettlebell: 'kettlebell',
  elastici: 'resistance bands',
  palla_medica: 'medicine ball',
  fitball: 'Swiss ball',
  foam_roller: 'foam roller',
  altro: 'other',
}
export const nomeAttrezzo = (a: string): string => t(a.replace(/_/g, ' '), ATTREZZI_EN[a] ?? a.replace(/_/g, ' '))

export function muscoli(lista: string[]): string {
  return lista.map((m) => MUSCOLI[m] ?? m).join(', ')
}

/** «90» → «1:30», «45» → «45″». */
export function recupero(secondi: number): string {
  if (secondi <= 0) return t('nessuno', 'none')
  const m = Math.floor(secondi / 60)
  const s = secondi % 60
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s}″`
}

/** «mar 14 ott, 18:30». */
export function quando(iso: string): string {
  return new Date(iso).toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

/** «mer 26 ago»: la data del test, senza l'ora. */
export function giornoTest(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
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
  return e ? t(`${e.nome} · serie ${p.serie} di ${e.serie}`, `${e.nome} · set ${p.serie} of ${e.serie}`) : ''
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
  return (Math.round(n * 10) / 10).toLocaleString(locale(), { maximumFractionDigits: 1 })
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
  if (o.tipo === 'ripetizioni') return t(`${o.percentuale}% · ${o.ripetizioni} ripetizioni`, `${o.percentuale}% · ${o.ripetizioni} reps`)
  return t(`${o.percentuale}% del massimale`, `${o.percentuale}% of your 1RM`)
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
  if (o.tipo === 'ripetizioni') return { ...base, serieRip: `${e.serie} × ${o.ripetizioni}`, carico: t(`${o.percentuale}% delle tue massime`, `${o.percentuale}% of your max reps`), ripetizioni: o.ripetizioni }
  return { ...base, carico: t(`${o.percentuale}% del massimale`, `${o.percentuale}% of your 1RM`), manca: true, daTest: o.daTest }
}

export const SPIEGA_TARATURA = t(
  'Alla prima seduta scegli un peso con cui fai le ripetizioni indicate tenendone un paio di riserva: da lì calcoliamo i tuoi chili.',
  'In your first workout, pick a weight that lets you do the reps shown with a couple in reserve: from there we work out your weights.',
)

/** I carichi con «≈»: stimati dal test del distretto, poi corretti dalla prima seduta. */
export const SPIEGA_STIMA = t(
  'Dove vedi «≈» il carico è stimato dal test del tuo distretto (arti superiori, core o arti inferiori), con un margine di prudenza: alla prima seduta, coi chili che usi davvero, diventa il tuo.',
  'Where you see “≈” the load is estimated from the test for that body area (upper body, core or lower body), with a safety margin: in your first workout, with the weights you actually use, it becomes yours.',
)

/** Fra quanti giorni rifare il test (0 se e' gia' ora). */
export function giorniAlTest(ultimo: string | null, giorni: number): number {
  if (!ultimo) return 0
  return Math.max(0, Math.ceil((new Date(ultimo).getTime() + giorni * 86_400_000 - Date.now()) / 86_400_000))
}

/** La chiave di memoria dell'elenco dei piani: chi crea un piano fuori da `Schede` (il Percorso, col piano di nuoto) la butta, o l'elenco non lo mostra. */
export const CHIAVE_ELENCO_PIANI = 'schede:elenco'
