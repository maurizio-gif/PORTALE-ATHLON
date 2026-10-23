import type { AbitudineTrain } from '@/api/lab'
import type { Fascia as FasciaConsigli, Obiettivo, Pausa } from '@/api/percorso'

import type { SceltePerConsigli } from '../consigli/comune'
import { abitudineNota, dimenticaAbitudine } from './abitudineMemoria'
import { eSalute, livelloScelto, OBIETTIVI, type Esperienza, type Fascia as FasciaSala, type Intensita, type Livello, type Risposte } from './questionario'

// Il profilo comune fra i Consigli e «Componi il tuo piano» in sala (22/10/2026, richiesta di Maurizio: i due questionari erano lunghi e si
// ripetevano). Quello che la persona ha gia' detto in uno dei due si ritrova **gia' scelto, ben segnalato e cambiabile** nell'altro; non si
// riscrive mai una risposta che ha gia' dato li'. Puro, senza React: si prova con `LC_ALL=it_IT.UTF-8 npx tsx` (`questionario.ts` usa `t()`).
//
// **Solo quello che e' davvero la stessa domanda**: l'obiettivo, l'esperienza, la forma di oggi, l'intensita' e quando si viene. Le altre
// somiglianze sono solo apparenti e non si portano: «quante volte a settimana pensi di venire» (le volte al club, lezioni comprese) non
// sono i giorni di sala; «lezioni da evitare» (nomi di lezioni) non sono gli «esercizi da evitare»; i fastidi non si portano mai.
// **Niente di sanitario**: zone, limitazioni e note restano dove sono state scritte, in memoria solo li'. Il profilo sta in memoria
// (mai sul disco) e esce con l'uscita dall'app (`dimenticaTutteLeRisposte`).
//
// **Sotto alle risposte, l'abitudine** (22/10/2026, `abitudine.ts`): chi non ha ancora detto **quando** viene o **in che giorni**, li trova gia'
// scelti da quello che fa davvero (gli ingressi al tornello e le lezioni), segnati «Dalle tue visite al club» e cambiabili. Una risposta data
// vince sempre: l'abitudine e' un valore di partenza, non una risposta, e non finisce nel profilo finche' la persona non conferma.

/** Quando si viene: come lo dicono i Consigli (anche piu' fasce) ridotto alle quattro del giorno, o «cambia». */
export type Momento = 'mattina' | 'pranzo' | 'pomeriggio' | 'sera' | 'varia'

/**
 * Le cinque risposte in comune, **nel vocabolario della sala** dove i due differiscono (l'esperienza ha due «ho smesso», i Consigli
 * chiedono in piu' da quanto). Un campo assente e' una risposta non data.
 */
export type ProfiloComune = {
  obiettivo?: Obiettivo
  esperienza?: Esperienza
  /** La forma di oggi **stimata dal piano in sala** (esperienza e tre test): solo la sala la scrive. */
  livello?: Livello
  intensita?: Intensita
  momento?: Momento
}
export type CampoProfilo = keyof ProfiloComune

/** Cosa cambia nel profilo: `undefined` lo lascia com'e', `null` toglie la risposta (la persona l'ha tolta). */
export type Novita = { [K in CampoProfilo]?: ProfiloComune[K] | null }

let profilo: ProfiloComune = {}

export const leggiProfilo = (): ProfiloComune => profilo

export function aggiornaProfilo(n: Novita) {
  const nuovo: Record<string, unknown> = { ...profilo }
  for (const [k, v] of Object.entries(n)) {
    if (v === undefined) continue
    if (v === null) delete nuovo[k]
    else nuovo[k] = v
  }
  profilo = nuovo as ProfiloComune
}

/** Si e' gia' cercato fra i Consigli salvati (a ogni apertura dell'app, una volta): chi non li ha mai chiesti non li cerca a ogni questionario. */
let cercato = false
export const giaCercato = () => cercato
export const segnaCercato = () => {
  cercato = true
}

export function dimenticaProfilo() {
  profilo = {}
  cercato = false
  dimenticaAbitudine()
}

/** Dalle novita' tiene solo le risposte che il profilo non ha ancora: una risposta arrivata in ritardo non ne cancella una piu' recente. */
export function soloMancanti(p: ProfiloComune, n: Novita): Novita {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(n)) if (v != null && p[k as CampoProfilo] === undefined) out[k] = v
  return out as Novita
}

const eObiettivo = (o: string | null | undefined): o is Obiettivo => !!o && (OBIETTIVI as readonly string[]).includes(o)

// ---- quando si viene -------------------------------------------------------------------------------------------------------

const MOMENTO_DA_FASCIA_SALA: Record<FasciaSala, Momento> = { mattina: 'mattina', pausa_pranzo: 'pranzo', pomeriggio: 'pomeriggio', sera: 'sera', varia: 'varia' }
const FASCIA_SALA_DA_MOMENTO: Record<Momento, FasciaSala> = { mattina: 'mattina', pranzo: 'pausa_pranzo', pomeriggio: 'pomeriggio', sera: 'sera', varia: 'varia' }
/** Le fasce dei Consigli (la lista e' di `api/percorso.ts`: qui una copia, perche' un import dall'API non si esegue fuori dall'app). */
const FASCE_CONSIGLI: readonly FasciaConsigli[] = ['mattina_presto', 'mattina', 'pranzo', 'pomeriggio', 'sera', 'weekend']
const FASCIA_CONSIGLI_DA_MOMENTO: Record<Exclude<Momento, 'varia'>, FasciaConsigli> = { mattina: 'mattina', pranzo: 'pranzo', pomeriggio: 'pomeriggio', sera: 'sera' }

/**
 * Le fasce dei Consigli (piu' di una, e il fine settimana) come un momento solo: una fascia del giorno e' quella; piu' fasce diverse
 * sono «cambia da un giorno all'altro»; il solo weekend o niente non dicono un momento.
 */
export function momentoDaFasce(fasce: readonly FasciaConsigli[]): Momento | null {
  const m = new Set<Momento>()
  for (const f of fasce) {
    if (f === 'mattina_presto' || f === 'mattina') m.add('mattina')
    else if (f === 'pranzo') m.add('pranzo')
    else if (f === 'pomeriggio') m.add('pomeriggio')
    else if (f === 'sera') m.add('sera')
  }
  return m.size === 0 ? null : m.size === 1 ? [...m][0] : 'varia'
}

/** Il momento in cui la persona viene davvero, dagli ingressi e dalle lezioni: solo se l'abitudine e' affidabile e c'e' una fascia che prevale. */
export function momentoDaVisite(a: AbitudineTrain | null | undefined): Momento | null {
  return a && a.affidabile ? momentoDaFasce(a.fasce as FasciaConsigli[]) : null
}

/**
 * Il profilo come lo leggono le due schermate: le risposte date, e **sotto** quello che si vede dalle visite. Per ora solo quando si viene.
 * Una risposta data (anche «cambia da un giorno all'altro») vince sempre.
 */
export function profiloEffettivo(p: ProfiloComune, a: AbitudineTrain | null | undefined = abitudineNota()): ProfiloComune {
  if (p.momento !== undefined) return p
  const m = momentoDaVisite(a)
  return m ? { ...p, momento: m } : p
}

/** Vero se il momento che si propone viene dalle visite e non da una risposta: per scrivere «Dalle tue visite al club» e non «Dalle tue risposte precedenti». */
export const momentoDaVisiteAlPosto = (p: ProfiloComune = profilo, a: AbitudineTrain | null | undefined = abitudineNota()): boolean => p.momento === undefined && momentoDaVisite(a) !== null

// ---- l'esperienza ----------------------------------------------------------------------------------------------------------

/**
 * L'esperienza dei Consigli (con da quanto ha smesso) in quella della sala. «Ho smesso» senza dire da quanto non dice niente: sarebbe
 * un'indovinata fra le due, e si lascia vuoto.
 */
export function esperienzaDaConsigli(e: SceltePerConsigli['esperienza'], pausa: Pausa | null): Esperienza | null {
  if (e === 'mai') return 'mai'
  if (e === 'pratico') return 'regolare'
  if (e === 'ex') return pausa === 'meno_di_un_anno' ? 'smesso_da_poco' : pausa ? 'smesso_da_tempo' : null
  return null
}

// ---- dalle risposte al profilo ---------------------------------------------------------------------------------------------

/**
 * Cosa ha detto la persona nel piano in sala. Solo le risposte date (`Salute` non e' un obiettivo di nessuno dei due). Il livello e' a
 * parte (`livelloDaSala`): lo stimano i test, e conta quando la persona l'ha visto.
 */
export function daSala(r: Pick<Risposte, 'obiettivo' | 'esperienza' | 'intensita' | 'fascia'>): Novita {
  const n: Novita = {}
  if (eObiettivo(r.obiettivo) && !eSalute(r.obiettivo)) n.obiettivo = r.obiettivo
  if (r.esperienza) n.esperienza = r.esperienza
  if (r.intensita) n.intensita = r.intensita
  if (r.fascia) n.momento = MOMENTO_DA_FASCIA_SALA[r.fascia]
  return n
}

/** La forma di oggi come la sala l'ha stimata (o la persona l'ha cambiata a mano); senza esperienza non c'e' una stima. */
export const livelloDaSala = (r: Risposte): Livello | null => (r.esperienza ? livelloScelto(r) : null)

type ChiaveConsigli = 'obiettivi' | 'esperienza' | 'pausa' | 'intensita' | 'fasce'

/**
 * Cosa ha detto la persona nei Consigli. Con `cambiati` (le chiavi che ha appena toccato) si portano **solo quelle**: le altre non le ha
 * dette ora, e una risposta riportata dalla sala non va riscritta (o tolta) solo perche' ne ha cambiata un'altra. Senza, tutte: e' quando
 * conferma il questionario. `null` = l'ha tolta o non dice niente.
 */
export function daConsigli(s: Pick<SceltePerConsigli, ChiaveConsigli>, cambiati?: readonly string[]): Novita {
  const tocca = (...k: ChiaveConsigli[]) => !cambiati || k.some((x) => cambiati.includes(x))
  const n: Novita = {}
  if (tocca('obiettivi')) n.obiettivo = s.obiettivi.find(eObiettivo) ?? null
  if (tocca('esperienza', 'pausa')) n.esperienza = esperienzaDaConsigli(s.esperienza, s.pausa)
  if (tocca('intensita')) n.intensita = s.intensita ?? null
  if (tocca('fasce')) n.momento = momentoDaFasce(s.fasce)
  return n
}

/** Quello che la persona ha appena toccato nel piano in sala (le sole chiavi in `x`): una risposta tolta o non portabile e' `null`. */
export function daSalaCambiate(x: Partial<Pick<Risposte, 'obiettivo' | 'esperienza' | 'intensita' | 'fascia'>>): Novita {
  const dal = daSala({ obiettivo: x.obiettivo ?? null, esperienza: x.esperienza ?? null, intensita: x.intensita ?? null, fascia: x.fascia ?? null })
  const n: Novita = {}
  if ('obiettivo' in x) n.obiettivo = dal.obiettivo ?? null
  if ('esperienza' in x) n.esperienza = dal.esperienza ?? null
  if ('intensita' in x) n.intensita = dal.intensita ?? null
  if ('fascia' in x) n.momento = dal.momento ?? null
  return n
}

// ---- dal profilo alle domande ----------------------------------------------------------------------------------------------

export type CampoSala = 'obiettivo' | 'esperienza' | 'intensita' | 'fascia'

/**
 * Le risposte della sala da portare dal profilo: **solo quelle che la persona non ha ancora dato li'**. `riportate` dice quali sono, per
 * segnarle («Dai tuoi consigli») finche' non le tocca. Il livello non si porta: lo stimano i tre test che la sala chiede dopo.
 */
export function inSala(p: ProfiloComune, r: Pick<Risposte, 'obiettivo' | 'esperienza' | 'intensita' | 'fascia'>): { risposte: Partial<Risposte>; riportate: CampoSala[] } {
  const risposte: Partial<Risposte> = {}
  const riportate: CampoSala[] = []
  if (!r.obiettivo && p.obiettivo) {
    risposte.obiettivo = p.obiettivo
    riportate.push('obiettivo')
  }
  if (!r.esperienza && p.esperienza) {
    risposte.esperienza = p.esperienza
    riportate.push('esperienza')
  }
  if (!r.intensita && p.intensita) {
    risposte.intensita = p.intensita
    riportate.push('intensita')
  }
  if (!r.fascia && p.momento) {
    risposte.fascia = FASCIA_SALA_DA_MOMENTO[p.momento]
    riportate.push('fascia')
  }
  return { risposte, riportate }
}

export type CampoConsigli = 'obiettivi' | 'esperienza' | 'livello' | 'intensita' | 'fasce' | 'giorni'

/**
 * Le scelte dei Consigli da portare dal profilo, **solo dove la persona non ha ancora risposto**. L'esperienza «ho smesso da poco» porta
 * anche «meno di un anno fa»; «ho smesso da tempo» non dice se uno o tre anni, e quella domanda resta da fare. La forma di oggi arriva
 * dalla stima della sala, e solo per chi ha un'esperienza (chi non ha mai praticato e' un principiante, e non la dice).
 */
export function inConsigli(
  p: ProfiloComune,
  s: Pick<SceltePerConsigli, 'obiettivi' | 'esperienza' | 'pausa' | 'livello' | 'intensita' | 'fasce' | 'giorni'>,
  a: AbitudineTrain | null | undefined = null,
): { scelte: Partial<SceltePerConsigli>; riportate: CampoConsigli[] } {
  const scelte: Partial<SceltePerConsigli> = {}
  const riportate: CampoConsigli[] = []
  if (!s.obiettivi.length && p.obiettivo) {
    scelte.obiettivi = [p.obiettivo]
    riportate.push('obiettivi')
  }
  let esperienza = s.esperienza
  if (!esperienza && p.esperienza) {
    esperienza = p.esperienza === 'mai' ? 'mai' : p.esperienza === 'regolare' ? 'pratico' : 'ex'
    scelte.esperienza = esperienza
    if (p.esperienza === 'smesso_da_poco' && !s.pausa) scelte.pausa = 'meno_di_un_anno'
    riportate.push('esperienza')
  }
  if (esperienza && esperienza !== 'mai' && !s.livello && p.livello) {
    scelte.livello = p.livello
    riportate.push('livello')
  }
  if (!s.intensita && p.intensita) {
    scelte.intensita = p.intensita
    riportate.push('intensita')
  }
  if (!s.fasce.length) {
    if (p.momento && p.momento !== 'varia') {
      scelte.fasce = [FASCIA_CONSIGLI_DA_MOMENTO[p.momento]]
      riportate.push('fasce')
    } else if (p.momento === undefined && a && a.affidabile) {
      // Nessuna risposta sul momento: si propone quello in cui viene davvero (fino a due fasce e il fine settimana), le stesse dei Consigli.
      const dalleVisite = a.fasce.filter((f): f is FasciaConsigli => (FASCE_CONSIGLI as readonly string[]).includes(f))
      if (dalleVisite.length) {
        scelte.fasce = dalleVisite
        riportate.push('fasce')
      }
    }
  }
  // I giorni non sono una risposta del profilo: vengono solo dalle visite, e solo se la persona non li ha scelti.
  if (!s.giorni.length && a && a.affidabile && a.giorni.length) {
    scelte.giorni = [...a.giorni]
    riportate.push('giorni')
  }
  return { scelte, riportate }
}

// ---- riaprire un questionario ----------------------------------------------------------------------------------------------

/**
 * Le chiavi delle scelte dei Consigli che toccano ogni risposta riportata: toccarne una la rende «sua» (la pausa fa parte dell'esperienza,
 * che si porta insieme).
 */
export const CHIAVI_CONSIGLI: Record<CampoConsigli, readonly string[]> = {
  obiettivi: ['obiettivi'],
  esperienza: ['esperienza', 'pausa'],
  livello: ['livello'],
  intensita: ['intensita'],
  fasce: ['fasce'],
  giorni: ['giorni'],
}

/** Le risposte riportate che la persona non ha toccato: quelle toccate sono sue, e non si segnano piu'. */
export const senzaToccate = <C extends string>(riportate: readonly C[], toccate: readonly string[], chiavi: (c: C) => readonly string[] = (c) => [c]): C[] =>
  riportate.filter((c) => !chiavi(c).some((k) => toccate.includes(k)))

/**
 * Le risposte della sala quando la schermata si apre. **Una risposta riportata e non toccata non e' una risposta sua**: si toglie e si
 * riporta di nuovo dal profilo, cosi' segue le risposte piu' recenti; una risposta toccata (o data li') resta com'e'.
 */
export function salaDaProfilo(salvate: Risposte, riportate: readonly CampoSala[], p: ProfiloComune): { risposte: Risposte; riportate: CampoSala[] } {
  const base: Risposte = { ...salvate }
  for (const c of riportate) base[c] = null
  const dal = inSala(profiloEffettivo(p), base)
  return { risposte: { ...base, ...dal.risposte }, riportate: dal.riportate }
}

/** Lo stesso per i Consigli: le scelte riportate e non toccate si rifanno dal profilo, le altre restano. */
export function consigliDaProfilo(salvate: SceltePerConsigli, riportate: readonly CampoConsigli[], p: ProfiloComune): { scelte: SceltePerConsigli; riportate: CampoConsigli[] } {
  const base: SceltePerConsigli = { ...salvate }
  for (const c of riportate) {
    if (c === 'obiettivi') base.obiettivi = []
    else if (c === 'esperienza') {
      base.esperienza = null
      base.pausa = null
    } else if (c === 'livello') base.livello = null
    else if (c === 'intensita') base.intensita = null
    else if (c === 'giorni') base.giorni = []
    else base.fasce = []
  }
  const dal = inConsigli(p, base, abitudineNota())
  return { scelte: { ...base, ...dal.scelte }, riportate: dal.riportate }
}
