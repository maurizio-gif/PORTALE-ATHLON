import type { VoceDiario } from '@/api/alimentazione'
import type { AllenamentoDispositivo, GiornoDispositivo } from '@/api/dispositivi'
import type { PresenzaLezione, SedutaStorico } from '@/api/lab'

import { allenamentiContati, nomeSport } from '../dispositivi/allenamentiDispositivo'
import { giornoRoma, spostaGiorno } from '../schede/contatoreCalorie'
import { locale, t } from '../../../lib/lingua'

// L'Athlon Health Score (richiesta del club, 20/10/2026): un punteggio da 0 a 100 su tre
// pilastri, Train, Food e Relax, che dice **come stai andando**: regolarita', non volume.
// Come Move di Technogym fa con il movimento, qui si da' un numero a un'abitudine
// (allenarsi con continuita', mangiare con regolarita', dormire), non a un risultato.
// E' una funzione pura di quello che l'app gia' legge: niente rete, niente salvataggio, si
// ricalcola a ogni apertura. Descrive, non giudica: nessuna frase dice cosa fare.
//
//   Train  fino a 70 punti   i giorni in cui ci si e' allenati, non le sedute
//   Food   fino a 15 punti   i giorni in cui si sono scritti i pasti principali
//   Relax  fino a 15 punti   le notti scritte (o lette dal dispositivo) e quanto lunghe
//
// **Le quattro settimane**: ogni pilastro e' una media pesata delle ultime quattro
// settimane mobili (la piu' recente 40%, poi 30, 20, 10). Mobili, non da lunedi' a
// domenica: cosi' una settimana storta non azzera tutto e il lunedi' non riparte da zero.
// Le settimane prima della prima attivita' registrata non contano (chi comincia adesso non
// parte penalizzato) e il punteggio dice su quante e' calcolato.
//
// **Train** conta i *giorni attivi* (almeno 20 minuti fra sedute chiuse nell'app e lezioni con
// la presenza segnata dalla reception): due lezioni nello stesso giorno valgono una volta
// sola, ed e' anche cosi' che un domani un allenamento dell'orologio non si conta due volte.
// La curva premia il ritmo costante: 2-4 giorni su 7 e' il massimo, e oltre scende piano
// (un giorno di riposo fa parte dell'allenamento), senza mai scendere sotto il 70%.
// **Food** non guarda le calorie ne' i nutrienti (il club non ha un nutrizionista: niente
// diete, niente traguardi): un giorno vale se ci sono colazione, pranzo e cena nel diario, e
// 5 giorni su 7 bastano. Oggi non conta, non e' finito. **Relax**: ogni notte vale in base alle
// ore (da 7 in su il massimo, e piu' lunghe non sono penalizzate), e bastano 5 notti su 7.
//
// **Un pilastro non attivato non penalizza**: contribuisce zero e il suo posto resta visibile
// («fino a 15 punti»). Chi ha nascosto i numeri in Food (o ha detto che contare lo mette a
// disagio) esce dal conto: il punteggio si rapporta ai pilastri che restano, e non c'e' nessun
// invito a tornarci. Nella vista cliente e per i minorenni Food e Relax non si vedono: resta
// il solo allenamento.
//
// Le soglie (20 minuti, 2-4 giorni, 5 giorni di diario, 7 ore) sono nostre e vanno fatte
// validare dal Direttore Tecnico; le ore di sonno per gli adulti (7 o piu') sono la posizione
// comune delle societa' scientifiche, ricordata e non riletta alla fonte.

export const PUNTI = { train: 70, food: 15, relax: 15 } as const
export type IdPilastro = keyof typeof PUNTI

/** Le quattro settimane, dalla piu' recente. */
export const PESI = [0.4, 0.3, 0.2, 0.1] as const
export const MINUTI_GIORNO_ATTIVO = 20
/** Quota di Train per numero di giorni attivi in 7 (0..7): 2-4 e' il massimo, oltre scende di un decimo a giorno. */
export const CURVA_TRAIN = [0, 0.4, 1, 1, 1, 0.9, 0.8, 0.7] as const
/** Giorni di diario buoni, e notti, che in una settimana danno il massimo. */
export const GIORNI_FOOD = 5
export const NOTTI_RELAX = 5

const SETTIMANE = PESI.length

// ---------------------------------------------------------------------------
// Le tre fonti, ridotte a quello che serve

/** Quello che serve al punteggio: il giorno (a Roma) e quanto e' durato. */
export type SessioneBase = { giorno: string; minuti: number }

/**
 * Una sessione di allenamento com'e' per l'analisi del Train (20/10/2026): in piu' del giorno e dei minuti dice di che tipo e'
 * (una seduta di sala o una lezione), come si chiama, a che ora e', e per la sala le serie, i chili sollevati e gli esercizi.
 */
export type Sessione = SessioneBase & {
  fonte: 'scheda' | 'lezione' | 'dispositivo'
  nome: string
  /** La categoria della lezione su PerfectGym («Mind&Body»…), se la funzione la dice. */
  categoria: string | null
  /** L'istante d'inizio, ISO. */
  inizio: string
  /** Solo per la sala. */
  serie: number
  volume: number
  esercizi: number
}

/** Le sedute chiuse (fra 10 minuti e 3 ore, come il contatore) e le lezioni con la presenza segnata. */
export function sessioniDa(sedute: SedutaStorico[], presenze: PresenzaLezione[], dispositivi: AllenamentoDispositivo[] = []): Sessione[] {
  const r: Sessione[] = []
  for (const s of sedute) {
    if (!s.fine || s.serie <= 0) continue
    const minuti = (new Date(s.fine).getTime() - new Date(s.inizio).getTime()) / 60000
    if (minuti < 10 || minuti > 180) continue
    r.push({
      giorno: giornoRoma(s.inizio),
      minuti,
      fonte: 'scheda',
      nome: [s.titolo, s.giorno_nome].filter(Boolean).join(' · ') || t('Allenamento in sala', 'Gym floor workout'),
      categoria: null,
      inizio: s.inizio,
      serie: s.serie,
      volume: s.volume ?? 0,
      esercizi: s.esercizi ?? 0,
    })
  }
  for (const l of presenze) {
    const minuti = (new Date(l.fine).getTime() - new Date(l.inizio).getTime()) / 60000
    if (!(minuti > 0) || minuti > 240) continue
    r.push({ giorno: giornoRoma(l.inizio), minuti, fonte: 'lezione', nome: l.nome, categoria: l.categoria, inizio: l.inizio, serie: 0, volume: 0, esercizi: 0 })
  }
  // Gli allenamenti dei dispositivi e quelli scritti a mano (28/10/2026): contano come giorni attivi, ma non se sono gia' una seduta o una lezione.
  for (const a of allenamentiContati(dispositivi, r.map((x) => ({ inizio: x.inizio, minuti: x.minuti })))) {
    r.push({ giorno: giornoRoma(a.inizio), minuti: a.durata_minuti, fonte: 'dispositivo', nome: nomeSport(a.sport), categoria: null, inizio: a.inizio, serie: 0, volume: 0, esercizi: 0 })
  }
  return r
}

/** I minuti di allenamento per giorno. */
export function minutiPerGiorno(sessioni: SessioneBase[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessioni) m.set(s.giorno, (m.get(s.giorno) ?? 0) + s.minuti)
  return m
}

/** I giorni attivi (almeno 20 minuti in tutto), in ordine. */
export const giorniAttiviDa = (sessioni: SessioneBase[]): string[] =>
  [...minutiPerGiorno(sessioni)].filter(([, m]) => m >= MINUTI_GIORNO_ATTIVO).map(([g]) => g).sort()

/** I giorni del diario con i pasti principali scritti (chi non fa colazione non ne ha bisogno). */
export function giorniBuoniFood(diario: VoceDiario[], senzaColazione: boolean): string[] {
  const pasti = new Map<string, Set<string>>()
  for (const v of diario) {
    const s = pasti.get(v.data) ?? new Set<string>()
    s.add(v.pasto)
    pasti.set(v.data, s)
  }
  const richiesti = senzaColazione ? ['pranzo', 'cena'] : ['colazione', 'pranzo', 'cena']
  return [...pasti].filter(([, s]) => richiesti.every((p) => s.has(p))).map(([g]) => g)
}

type Blocco = { da: string; a: string }
/** Le quattro settimane mobili che finiscono in `fine`, dalla piu' recente. */
const blocchi = (fine: string): Blocco[] => Array.from({ length: SETTIMANE }, (_, k) => ({ a: spostaGiorno(fine, -7 * k), da: spostaGiorno(fine, -7 * k - 6) }))
const dentro = (g: string, b: Blocco) => g >= b.da && g <= b.a

/** La media pesata delle quote delle sole settimane che contano; null se non ne conta nessuna. */
function mediaPesata(quote: { quota: number; conta: boolean }[]): number | null {
  let somma = 0
  let pesi = 0
  quote.forEach((q, k) => {
    if (!q.conta) return
    somma += q.quota * PESI[k]
    pesi += PESI[k]
  })
  return pesi ? somma / pesi : null
}

export type Settimana = { da: string; a: string; /** I giorni buoni (Train: attivi; Food: col diario; Relax: notti scritte). */ giorni: number; quota: number; conta: boolean }

// ---------------------------------------------------------------------------
// Train

export type Train = {
  quota: number
  settimane: Settimana[]
  /** Gli ultimi sette giorni, dal piu' vecchio a oggi: per i pallini. */
  ultimi7: { giorno: string; attivo: boolean; minuti: number }[]
  /** Almeno una attivita' registrata, mai. */
  haStoria: boolean
}

export function calcolaTrain(sessioni: SessioneBase[], oggi: string): Train {
  const minutiPer = minutiPerGiorno(sessioni)
  const attivi = giorniAttiviDa(sessioni)
  const primo = attivi[0] ?? null
  const settimane: Settimana[] = blocchi(oggi).map((b) => {
    const giorni = attivi.filter((g) => dentro(g, b)).length
    return { ...b, giorni, quota: CURVA_TRAIN[Math.min(7, giorni)], conta: primo !== null && b.a >= primo }
  })
  const quota = mediaPesata(settimane) ?? 0
  const ultimi7 = Array.from({ length: 7 }, (_, i) => {
    const giorno = spostaGiorno(oggi, i - 6)
    const minuti = Math.round(minutiPer.get(giorno) ?? 0)
    return { giorno, attivo: minuti >= MINUTI_GIORNO_ATTIVO, minuti }
  })
  return { quota, settimane, ultimi7, haStoria: primo !== null }
}

// ---------------------------------------------------------------------------
// Food

export type Food = { quota: number; settimane: Settimana[]; senzaColazione: boolean; haStoria: boolean }

/** Il giorno e' buono se ci sono i pasti principali; chi non fa colazione non ne ha bisogno. */
export function calcolaFood(diario: VoceDiario[], oggi: string, senzaColazione: boolean): Food {
  const buoni = giorniBuoniFood(diario, senzaColazione)
  const primo = [...new Set(diario.map((v) => v.data))].sort()[0] ?? null
  // Oggi non e' finito: le settimane finiscono ieri.
  const settimane: Settimana[] = blocchi(spostaGiorno(oggi, -1)).map((b) => {
    const giorni = buoni.filter((g) => dentro(g, b)).length
    return { ...b, giorni, quota: Math.min(1, giorni / GIORNI_FOOD), conta: primo !== null && b.a >= primo }
  })
  return { quota: mediaPesata(settimane) ?? 0, settimane, senzaColazione, haStoria: primo !== null }
}

// ---------------------------------------------------------------------------
// Relax

/** `mediaMinuti`: la durata media delle notti scritte negli ultimi 7 giorni, o null se non ce n'e'. */
export type Relax = { quota: number; settimane: Settimana[]; mediaMinuti: number | null; haStoria: boolean }

/** Quanto vale una notte: da 7 ore in su il massimo; piu' lunga non e' penalizzata. */
export function quotaNotte(minuti: number): number {
  return minuti >= 420 ? 1 : minuti >= 360 ? 0.7 : minuti >= 300 ? 0.4 : 0.2
}

/** Le notti: il giorno e' quello del risveglio. Se una notte ha piu' righe vale il dispositivo, non quella scritta a mano. */
export function nottiDa(giorni: GiornoDispositivo[]): Map<string, number> {
  const notti = new Map<string, number>()
  const daDispositivo = new Set<string>()
  for (const g of giorni) {
    if (g.sonno_minuti === null) continue
    if (g.fornitore === 'manuale') {
      if (!daDispositivo.has(g.data)) notti.set(g.data, g.sonno_minuti)
    } else {
      daDispositivo.add(g.data)
      notti.set(g.data, g.sonno_minuti)
    }
  }
  return notti
}

export function calcolaRelax(notti: Map<string, number>, oggi: string): Relax {
  const primo = [...notti.keys()].sort()[0] ?? null
  const settimane: Settimana[] = blocchi(oggi).map((b) => {
    const dellaSettimana = [...notti].filter(([g]) => dentro(g, b))
    const somma = dellaSettimana.reduce((s, [, m]) => s + quotaNotte(m), 0)
    return { ...b, giorni: dellaSettimana.length, quota: Math.min(1, somma / NOTTI_RELAX), conta: primo !== null && b.a >= primo }
  })
  const ultime = [...notti].filter(([g]) => dentro(g, settimane[0]))
  const mediaMinuti = ultime.length ? Math.round(ultime.reduce((s, [, m]) => s + m, 0) / ultime.length) : null
  return { quota: mediaPesata(settimane) ?? 0, settimane, mediaMinuti, haStoria: primo !== null }
}

// ---------------------------------------------------------------------------
// Il punteggio

/**
 * attivo: si conta; spento: si potrebbe e non c'e' (nessun consenso): zero punti, e il posto resta;
 * escluso: la persona ha scelto di non vedere i numeri, il pilastro esce dal conto e non si invita;
 * nonDisponibile: vista cliente o minorenne, il pilastro non esiste per loro.
 */
export type StatoPilastro = 'attivo' | 'spento' | 'escluso' | 'nonDisponibile'

export type Pilastro = {
  id: IdPilastro
  nome: 'Train' | 'Food' | 'Recover'
  max: number
  stato: StatoPilastro
  /** I punti interi guadagnati, 0..max. */
  punti: number
  /** 0..1, o null se il pilastro non e' attivo. */
  quota: number | null
  /** Su quante settimane delle quattro e' calcolato (0 se non c'e' ancora storia). */
  settimane: number
  /** Una riga che descrive com'e' andata questa settimana; null dove non c'e' niente da dire. */
  frase: string | null
}

export type Banda = 'Si comincia' | 'Sulla strada' | 'Buon ritmo' | 'Ottimo ritmo' | 'In equilibrio'

export type Punteggio = {
  train: Pilastro
  food: Pilastro
  relax: Pilastro
  /** Il numero grande, da 0 a `su`. */
  totale: number
  /** 100; 70 quando Food e Relax non ci sono (vista cliente, minorenni): il solo allenamento. */
  su: number
  /** Il punteggio e' rapportato ai pilastri che restano (Food nascosto): lo si dice. */
  rapportato: boolean
  banda: Banda
  /** I pilastri che concorrono al punteggio, in ordine. */
  contano: IdPilastro[]
  /** Quanti punti restano da prendere dai pilastri spenti ma accendibili. */
  invito: { id: 'food' | 'relax'; punti: number }[]
  oggi: string
  train7: Train['ultimi7']
  dettaglio: { train: Train; food: Food | null; relax: Relax | null }
}

export type Ingressi = {
  oggi: string
  sessioni: SessioneBase[]
  /** Food: null dove non esiste per questa persona (vista cliente, minorenne). */
  food: { consenso: boolean; escluso: boolean; senzaColazione: boolean; diario: VoceDiario[] } | null
  /** Relax: null dove non esiste per questa persona. */
  relax: { consenso: boolean; giorni: GiornoDispositivo[] } | null
}

const n = (x: number) => x.toLocaleString(locale())
const giorniParola = (g: number) => (g === 1 ? t('1 giorno', '1 day') : t(`${g} giorni`, `${g} days`))

function fraseTrain(tr: Train): string | null {
  const g = tr.settimane[0].giorni
  if (!tr.haStoria) return t('Ancora nessuna lezione o allenamento registrato: dal primo, il punteggio comincia a salire.', 'No classes or workouts registered yet: from the first one, your score starts to rise.')
  if (g === 0) return t('Negli ultimi 7 giorni non c’è nessun allenamento.', 'No workouts in the last 7 days.')
  if (g === 1) return t('Un giorno attivo negli ultimi 7: con il secondo sei ai punti pieni.', 'One active day in the last 7: one more and you’re at full points.')
  if (g <= 4) return t(`${giorniParola(g)} attivi negli ultimi 7: è il ritmo giusto.`, `${giorniParola(g)} active in the last 7: that’s the right pace.`)
  return t(`${giorniParola(g)} attivi negli ultimi 7: un giorno di riposo fa parte dell’allenamento.`, `${giorniParola(g)} active in the last 7: a rest day is part of training too.`)
}

function fraseFood(f: Food): string | null {
  if (!f.haStoria)
    return t(
      `Scrivi ${f.senzaColazione ? 'pranzo e cena' : 'colazione, pranzo e cena'} nel diario: contano i giorni finiti, oggi no.`,
      `Log ${f.senzaColazione ? 'lunch and dinner' : 'breakfast, lunch and dinner'} in the diary: completed days count, today doesn’t.`,
    )
  const g = f.settimane[0].giorni
  return t(
    `Negli ultimi 7 giorni finiti hai scritto i pasti principali per ${giorniParola(g)}: ne bastano ${GIORNI_FOOD}.`,
    `In the last 7 completed days you logged your main meals on ${giorniParola(g)}: ${GIORNI_FOOD} is enough.`,
  )
}

const ore = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`

function fraseRelax(r: Relax): string | null {
  if (!r.haStoria) return t('Scrivi ogni mattina quanto hai dormito, o collega un dispositivo: contano le notti degli ultimi 7 giorni.', 'Each morning, log how long you slept, or connect a device: nights from the last 7 days count.')
  const g = r.settimane[0].giorni
  if (g === 0) return t('Negli ultimi 7 giorni non c’è nessuna notte scritta.', 'No nights logged in the last 7 days.')
  return t(
    `${g === 1 ? 'Una notte scritta' : `${n(g)} notti scritte`} negli ultimi 7 giorni${r.mediaMinuti !== null ? `, in media ${ore(r.mediaMinuti)}` : ''}.`,
    `${g === 1 ? 'One night logged' : `${n(g)} nights logged`} in the last 7 days${r.mediaMinuti !== null ? `, ${ore(r.mediaMinuti)} on average` : ''}.`,
  )
}

export function calcolaPunteggio(i: Ingressi): Punteggio {
  const train = calcolaTrain(i.sessioni, i.oggi)
  const food = i.food && !i.food.escluso && i.food.consenso ? calcolaFood(i.food.diario, i.oggi, i.food.senzaColazione) : null
  const relax = i.relax && i.relax.consenso ? calcolaRelax(nottiDa(i.relax.giorni), i.oggi) : null

  const contate = (s: Settimana[]) => s.filter((x) => x.conta).length
  const pilastroTrain: Pilastro = {
    id: 'train', nome: 'Train', max: PUNTI.train, stato: 'attivo',
    punti: Math.round(train.quota * PUNTI.train), quota: train.quota, settimane: contate(train.settimane), frase: fraseTrain(train),
  }
  const pilastroFood: Pilastro = !i.food
    ? { id: 'food', nome: 'Food', max: PUNTI.food, stato: 'nonDisponibile', punti: 0, quota: null, settimane: 0, frase: null }
    : i.food.escluso
      ? { id: 'food', nome: 'Food', max: PUNTI.food, stato: 'escluso', punti: 0, quota: null, settimane: 0, frase: null }
      : food
        ? { id: 'food', nome: 'Food', max: PUNTI.food, stato: 'attivo', punti: Math.round(food.quota * PUNTI.food), quota: food.quota, settimane: contate(food.settimane), frase: fraseFood(food) }
        : { id: 'food', nome: 'Food', max: PUNTI.food, stato: 'spento', punti: 0, quota: null, settimane: 0, frase: null }
  const pilastroRelax: Pilastro = !i.relax
    ? { id: 'relax', nome: 'Recover', max: PUNTI.relax, stato: 'nonDisponibile', punti: 0, quota: null, settimane: 0, frase: null }
    : relax
      ? { id: 'relax', nome: 'Recover', max: PUNTI.relax, stato: 'attivo', punti: Math.round(relax.quota * PUNTI.relax), quota: relax.quota, settimane: contate(relax.settimane), frase: fraseRelax(relax) }
      : { id: 'relax', nome: 'Recover', max: PUNTI.relax, stato: 'spento', punti: 0, quota: null, settimane: 0, frase: null }

  const tutti = [pilastroTrain, pilastroFood, pilastroRelax]
  const inGioco = tutti.filter((p) => p.stato === 'attivo' || p.stato === 'spento')
  const soloTrain = inGioco.length === 1
  const riferimento = inGioco.reduce((s, p) => s + p.max, 0)
  const punti = tutti.reduce((s, p) => s + p.punti, 0)
  // Con un pilastro escluso (Food nascosto) il punteggio si rapporta ai restanti; col solo allenamento resta in settantesimi.
  const rapportato = !soloTrain && riferimento < 100
  const su = soloTrain ? PUNTI.train : 100
  const totale = rapportato ? Math.round((punti / riferimento) * 100) : punti
  const quotaTotale = punti / riferimento

  const attivi = tutti.filter((p) => p.stato === 'attivo')
  const inEquilibrio = attivi.length === inGioco.length && attivi.length >= 2 && attivi.every((p) => (p.quota ?? 0) >= 0.6)
  const banda: Banda = inEquilibrio ? 'In equilibrio' : quotaTotale < 0.25 ? 'Si comincia' : quotaTotale < 0.5 ? 'Sulla strada' : quotaTotale < 0.75 ? 'Buon ritmo' : 'Ottimo ritmo'

  return {
    train: pilastroTrain,
    food: pilastroFood,
    relax: pilastroRelax,
    totale,
    su,
    rapportato,
    banda,
    contano: inGioco.map((p) => p.id),
    invito: tutti.filter((p): p is Pilastro & { id: 'food' | 'relax' } => p.stato === 'spento').map((p) => ({ id: p.id, punti: p.max })),
    oggi: i.oggi,
    train7: train.ultimi7,
    dettaglio: { train, food, relax },
  }
}
