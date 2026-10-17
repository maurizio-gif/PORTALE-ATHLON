import type { SchedaLezione } from '@/api/lab'

import { kcal, metabolismoBasale, type Sesso } from './stimaCalorie'

// Le calorie di una lezione di gruppo (17/10/2026): UNA PROVA, senza un MET
// scritto per ogni lezione. Il calcolo e' quello delle schede (stimaCalorie.ts:
// il MET e' il metabolismo a riposo del socio, BMR / 1440 kcal al minuto, per
// i minuti della lezione); qui cambia come si sceglie il MET: si capisce che
// TIPO di lezione e', e il tipo da' una forbice.
//
// **Come si riconosce il tipo**, in questo ordine, e si ferma al primo che trova:
//   1. dal nome del tipo di lezione su PerfectGym («Hatha Yoga», «HBX Boxing»,
//      «Nuoto Adulti - Intermedio»), perche' e' la cosa che non cambia;
//   2. dal testo della scheda del sito, per una lezione nuova di cui il nome
//      non dice niente;
//   3. dalle sole barre della scheda, che dicono quanto e' intensa ma non cosa e'.
// Una lezione nuova entra da sola, come succede sul sito; se non si capisce
// niente si tace: un numero inventato e' peggio di un numero assente.
//
// **Dentro il tipo, l'intensita' la danno le barre della scheda** (quelle che il
// club ha gia' scritto per il planning): il 65% dell'intensita' cardiovascolare
// e il 35% di quella muscolare, da 0 a 100, scorre la forbice del tipo da
// un'estremita' all'altra. Cosi' Hatha Yoga e Power Yoga stanno nello stesso
// tipo ma non allo stesso MET.
//
// **Il nuoto non ha barre**, e non ne ha bisogno: la Scuola Nuoto Adulti dice il
// livello nel nome del tipo (Base, Intermedio, Avanzato) e il consumo cresce con
// lui; il Nuoto Libero e' un turno in cui stile e ritmo li sceglie chi nuota, e
// da' un consumo *indicativo*, con la forbice piu' larga.
//
// **Cosa NON si stima**, di proposito: la Gym Floor (la sala pesi ha la stima
// della sua scheda), l'Aqua Gestanti (non si spinge una gravidanza verso un
// numero), i corsi e gli eventi dei bambini.
//
// **Le fonti dei MET** sono il Compendium of Physical Activities (Ainsworth et
// al., Med Sci Sports Exerc 2011;43:1575-81, e l'aggiornamento 2024 su
// pacompendium.com). Le forbici sono tarate cosi':
//   - yoga e mobilita': Hatha 2,5 (02150; 2,3 nel 2024) e Power yoga 4,0 (02160);
//   - pilates: general 3,0 (02105; 2,8 nel 2024);
//   - acqua fitness: water aerobics 5,3 nel 2011 (5,5 nel 2024);
//   - forza: calisthenics moderata 3,8 e vigorosa 8,0 (7,5 nel 2024), circuit
//     training vigoroso con kettlebell 8,0 (02040), pesi 3,5-6,0 (02054, 02052);
//   - combat: punching bag 5,5 (5,8 nel 2024) e sparring 7,8;
//   - nuoto: crawl lento, sforzo leggero o moderato 5,8 (18240) e veloce 9,8 (18230).
// **Nessuno e' stato verificato sulla tabella originale** (pacompendium.com non
// era raggiungibile da dove e' stato scritto): vengono da pagine che la
// riportano, dal Compendium stesso nel caso di yoga, pilates e nuoto, da ABS per
// l'acqua e da calcolatori per il boxing, quindi i meno sicuri. Non trovati: la danza di gruppo
// e la bicicletta in acqua (il Compendium non ha una voce per l'acquabike): quei
// due tipi, e i MET per livello del corso di nuoto (una media di tutta la
// lezione, pause comprese), sono stime nostre da far validare col Direttore
// Tecnico. Stanno tutti in `TIPI` e `MET_NUOTO_PER_LIVELLO`.
//
// Sono stime: la forbice e' il +/- 20% del MET (35% per il nuoto libero), e
// anche cosi' possono sbagliare del 20-30%.

export type IdTipo = 'mobilita' | 'controllo' | 'forza' | 'combattimento' | 'danza' | 'acqua' | 'acquabike' | 'nuoto-corso' | 'nuoto-libero' | 'generica'
export type Livello = 'base' | 'intermedio' | 'avanzato'

export type Tipo = {
  id: IdTipo
  /** Come lo si dice al socio. */
  etichetta: string
  /** Il MET con intensita' 0 e con intensita' 100 delle barre. Uguali dove le barre non servono. */
  met: [number, number]
  /** Di quanto, in piu' e in meno, puo' sbagliare il MET. */
  margine: number
}

const MARGINE = 0.2

export const TIPI: Record<IdTipo, Tipo> = {
  mobilita: { id: 'mobilita', etichetta: 'Yoga e mobilità', met: [2, 5], margine: MARGINE },
  controllo: { id: 'controllo', etichetta: 'Pilates e controllo del movimento', met: [2, 4.5], margine: MARGINE },
  forza: { id: 'forza', etichetta: 'Tonificazione e forza', met: [3.5, 8], margine: MARGINE },
  combattimento: { id: 'combattimento', etichetta: 'Combat e difesa personale', met: [4.5, 7.8], margine: MARGINE },
  danza: { id: 'danza', etichetta: 'Danza e coreografia', met: [3.5, 7], margine: MARGINE },
  acqua: { id: 'acqua', etichetta: 'Acqua fitness', met: [3, 7], margine: MARGINE },
  acquabike: { id: 'acquabike', etichetta: 'Bicicletta in acqua', met: [4, 8], margine: MARGINE },
  'nuoto-corso': { id: 'nuoto-corso', etichetta: 'Corso di nuoto', met: [5.5, 5.5], margine: MARGINE },
  'nuoto-libero': { id: 'nuoto-libero', etichetta: 'Nuoto libero', met: [5.5, 5.5], margine: 0.35 },
  // Un tipo che non si riconosce, ma di cui il club ha scritto le barre.
  generica: { id: 'generica', etichetta: 'Lezione di gruppo', met: [2.5, 7.5], margine: 0.3 },
}

/**
 * Il MET medio di tutta una lezione di nuoto per livello, pause e esercizi a
 * bordo vasca compresi: chi comincia sta piu' fermo, chi e' avanzato nuota di
 * continuo.
 */
export const MET_NUOTO_PER_LIVELLO: Record<Livello, number> = { base: 4, intermedio: 5.5, avanzato: 7 }

/** Le categorie di PerfectGym di cui si stima qualcosa. */
const CATEGORIE: ReadonlySet<string> = new Set(['Corsi Fitness', 'Group Reformer', 'Aqua Fitness', 'Nuoto Libero', 'Scuola Nuoto Adulti', 'Master Class'])

/** Senza accenti e maiuscole, perche' «Yogassè» e «Yogasse» sono la stessa lezione. */
function semplice(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Il nome del tipo di lezione e' il primo posto dove si guarda. */
const PER_NOME: [RegExp, IdTipo][] = [
  [/hydrobike|aqua ?bike|acqua ?bike/, 'acquabike'],
  [/\baqua\b/, 'acqua'],
  [/yoga|yogasse|hatha|ginnastica (dolce|posturale)|posturale/, 'mobilita'],
  [/pilates|mat ?4\.?1|matwork|reformer|motr|antigravity/, 'controllo'],
  [/hbx|boxing|boxe|difesa personale|karate|muay|krav|kick/, 'combattimento'],
  [/gp coreo|balli|danza|zumba|coreo/, 'danza'],
  [/body ?sculpt|body ?pump|booty|strength|calisthenics|tonific|total body|circuit/, 'forza'],
]

/** Il testo della scheda, per le lezioni nuove: e' HTML semplice (<b>, <br>). */
const PER_TESTO: [RegExp, IdTipo][] = [
  [/\b(yoga|stretching|mobilita|posturale|rilassament)/, 'mobilita'],
  [/\b(pilates|reformer|controllo del movimento)/, 'controllo'],
  [/\b(box|pugil|arti marziali|combat|difesa)/, 'combattimento'],
  [/\b(danza|coreograf|ballo|balli|musica)/, 'danza'],
  [/\b(manubri|bilancier|pesi|tonific|forza|circuito)/, 'forza'],
  [/\b(acqua|vasca|piscina)\b/, 'acqua'],
]

/** Le lezioni per cui non si stima niente, anche se la categoria e' fra quelle ammesse. */
const ESCLUSE = /gestanti|gravidanza|gym floor/

function primo(testo: string, regole: [RegExp, IdTipo][]): IdTipo | null {
  for (const [re, id] of regole) if (re.test(testo)) return id
  return null
}

function valoreBarra(caratteristiche: SchedaLezione['caratteristiche'] | undefined, chi: RegExp): number | null {
  const k = (caratteristiche ?? []).find((x) => chi.test(semplice(x.l)))
  return k && Number.isFinite(k.v) ? Math.max(0, Math.min(100, k.v)) : null
}

export type Riconosciuta = {
  tipo: Tipo
  /** Da dove si e' capito il tipo. */
  come: 'nome' | 'livello' | 'testo' | 'barre'
  livello: Livello | null
  /** Cardio e muscolare dalla scheda, 0-100, o null dove non ci sono. */
  barre: { cardio: number | null; muscolare: number | null }
  /** 0-100, dalle due barre; null senza barre. */
  intensita: number | null
}

/**
 * Che tipo di lezione e'. Null se non se ne stima niente: categoria che non e'
 * quella degli adulti, lezione esclusa, o niente che permetta di capire.
 */
export function riconosci(
  l: { nome: string; categoria: string | null },
  scheda: Pick<SchedaLezione, 'caratteristiche' | 'descrizione'> | null,
): Riconosciuta | null {
  if (!l.categoria || !CATEGORIE.has(l.categoria)) return null
  const nome = semplice(l.nome)
  if (ESCLUSE.test(nome)) return null

  const cardio = valoreBarra(scheda?.caratteristiche, /cardio/)
  const muscolare = valoreBarra(scheda?.caratteristiche, /muscol/)
  const barre = { cardio, muscolare }
  const intensita = cardio != null && muscolare != null ? 0.65 * cardio + 0.35 * muscolare : (cardio ?? muscolare)

  if (l.categoria === 'Scuola Nuoto Adulti' || /^nuoto adulti/.test(nome)) {
    const livello = (/\b(base|intermedio|avanzato)\b/.exec(nome)?.[1] ?? null) as Livello | null
    return { tipo: TIPI['nuoto-corso'], come: 'livello', livello, barre, intensita: null }
  }
  if (l.categoria === 'Nuoto Libero') return { tipo: TIPI['nuoto-libero'], come: 'nome', livello: null, barre, intensita: null }

  const dalNome = primo(nome, PER_NOME)
  if (dalNome) return { tipo: TIPI[dalNome], come: 'nome', livello: null, barre, intensita }
  const dalTesto = primo(semplice((scheda?.descrizione ?? '').replace(/<[^>]+>/g, ' ')), PER_TESTO)
  if (dalTesto) return { tipo: TIPI[dalTesto], come: 'testo', livello: null, barre, intensita }
  if (intensita != null) return { tipo: TIPI.generica, come: 'barre', livello: null, barre, intensita }
  return null
}

export type StimaLezione = Riconosciuta & {
  minuti: number
  /** Il MET scelto e la sua forbice. */
  met: number
  metDa: number
  metA: number
  kcal: { da: number; a: number; circa: number }
  /** Nel nuoto libero la forbice e' larga: si dice «indicativo», non «circa». */
  indicativo: boolean
}

const arrotonda = (n: number, a = 5) => Math.round(n / a) * a

/** Il MET di una lezione riconosciuta: la forbice del tipo, scorsa dall'intensita'; il livello nel nuoto dei corsi. */
export function metDi(r: Riconosciuta): number {
  if (r.tipo.id === 'nuoto-corso') return MET_NUOTO_PER_LIVELLO[r.livello ?? 'intermedio']
  const [basso, alto] = r.tipo.met
  // Senza barre, a meta' della forbice: e' quel che si sa.
  return basso + (alto - basso) * ((r.intensita ?? 50) / 100)
}

export function stimaLezione(
  l: { nome: string; categoria: string | null; minuti: number },
  scheda: Pick<SchedaLezione, 'caratteristiche' | 'descrizione'> | null,
  p: { kg: number; cm: number; anni: number; sesso: Sesso },
): StimaLezione | null {
  if (!(l.minuti > 0 && l.minuti <= 240)) return null
  const r = riconosci(l, scheda)
  if (!r) return null
  const bmr = metabolismoBasale(p)
  const met = metDi(r)
  // Un corso di nuoto senza livello nel nome (non dovrebbe succedere) vale quello di mezzo, con la forbice larga.
  const margine = r.tipo.id === 'nuoto-corso' && !r.livello ? 0.3 : r.tipo.margine
  const metDa = met * (1 - margine)
  const metA = met * (1 + margine)
  return {
    ...r,
    minuti: l.minuti,
    met,
    metDa,
    metA,
    kcal: { da: arrotonda(kcal(bmr, metDa, l.minuti)), a: arrotonda(kcal(bmr, metA, l.minuti)), circa: arrotonda(kcal(bmr, met, l.minuti)) },
    indicativo: r.tipo.id === 'nuoto-libero',
  }
}
