// Le risposte ammesse nel questionario «Componi il tuo piano» (`Agente.tsx`). Puro, senza React: si prova con
// `node --experimental-strip-types`. Il lato server (`_shared/schede/questionario.ts` di APP-ATHLON) ricontrolla le stesse
// risposte: se cambiano qui, cambiano anche là.
//
// **Salute non e' un obiettivo per l'agente** (20/10/2026, richiesta del club): recupero dopo un trauma, malattie metaboliche
// o cardiovascolari, problemi articolari e alterazioni posturali chiedono una persona. Scegliendola, l'app non manda nessuna
// richiesta: spiega che il piano lo costruisce un personal trainer e porta alla prenotazione (`/personal`).
//
// I valori (`OBIETTIVI`, `valore`) vanno al server e restano in italiano: si traducono solo le etichette (`nomeObiettivo`, `testo`).

import { t } from '../../../lib/lingua'

export const OBIETTIVI = ['Tonificazione', 'Ipertrofia', 'Dimagrimento', 'Forza', 'Resistenza', 'Mobilità', 'Benessere generale'] as const
/** In vasca c'e' anche «Tecnica», che in sala non ha senso. */
export const OBIETTIVI_VASCA = [...OBIETTIVI, 'Tecnica'] as const

export const OBIETTIVO_SALUTE = 'Salute'

/** L'etichetta di un obiettivo (il valore resta quello che va alla funzione). */
const NOMI_OBIETTIVO: Record<string, string> = {
  Tonificazione: t('Tonificazione', 'Toning'),
  Ipertrofia: t('Ipertrofia', 'Muscle growth'),
  Dimagrimento: t('Dimagrimento', 'Weight loss'),
  Forza: t('Forza', 'Strength'),
  Resistenza: t('Resistenza', 'Endurance'),
  Mobilità: t('Mobilità', 'Mobility'),
  'Benessere generale': t('Benessere generale', 'General wellbeing'),
  Tecnica: t('Tecnica', 'Technique'),
  Salute: t('Salute', 'Health'),
}
export const nomeObiettivo = (o: string): string => NOMI_OBIETTIVO[o] ?? o

/**
 * Di cosa si tratta, sotto «Salute». Servono a dire al socio che e' nel posto giusto e a dare al personal trainer un punto di
 * partenza, non a scegliere un piano: **qualunque sia la risposta si va alla prenotazione**. `frase` e' come si legge dentro
 * «Per … il piano non si scrive da un questionario».
 */
export const CONDIZIONI_SALUTE = [
  { valore: 'post_traumatico', testo: t('Recupero post traumatico', 'Post-injury recovery'), dettaglio: null, frase: t('il recupero dopo un trauma', 'recovery after an injury') },
  { valore: 'metabolica', testo: t('Malattia metabolica', 'Metabolic condition'), dettaglio: null, frase: t('una malattia metabolica', 'a metabolic condition') },
  { valore: 'articolari', testo: t('Problemi articolari', 'Joint problems'), dettaglio: null, frase: t('i problemi articolari', 'joint problems') },
  { valore: 'cardiovascolare', testo: t('Malattia cardiovascolare', 'Cardiovascular condition'), dettaglio: null, frase: t('una malattia cardiovascolare', 'a cardiovascular condition') },
  { valore: 'posturali', testo: t('Alterazioni posturali', 'Postural problems'), dettaglio: t('Scoliosi, ipercifosi, ecc.', 'Scoliosis, kyphosis, etc.'), frase: t('le alterazioni posturali', 'postural problems') },
] as const
export type CondizioneSalute = (typeof CONDIZIONI_SALUTE)[number]['valore']

export const eSalute = (obiettivo: string | null): boolean => obiettivo === OBIETTIVO_SALUTE

/** Il testo del riquadro che porta al personal trainer: con la condizione scelta la nomina, altrimenti e' generico. */
export function testoSalute(condizione: CondizioneSalute | null): string {
  const c = CONDIZIONI_SALUTE.find((x) => x.valore === condizione)
  const per = c ? t(`Per ${c.frase} il piano`, `For ${c.frase}, a plan`) : t('Con un obiettivo legato alla salute il piano', 'With a health-related goal, a plan')
  return t(
    `${per} non si scrive da un questionario: lo costruisce un personal trainer, dopo averti conosciuto e visto muoverti. Scegli trainer, giorno e ora e prenota la tua seduta; il piano che prepara lo trovi poi fra i tuoi piani.`,
    `${per} can’t come from a questionnaire: a personal trainer builds it, after meeting you and seeing how you move. Choose a trainer, day and time and book your session; the plan they prepare will then be among your plans.`,
  )
}

/** Da dire sotto il riquadro: chi ha una diagnosi o un trattamento porta le indicazioni di chi lo segue. */
export const NOTA_SALUTE = t(
  'Se hai una diagnosi o un trattamento in corso, porta alla prima seduta le indicazioni del tuo medico o del fisioterapista.',
  'If you have a diagnosis or ongoing treatment, bring your doctor’s or physiotherapist’s advice to your first session.',
)

/** Quanto dura una seduta in sala (20/10/2026: 30, 45, 60 e 80 minuti; prima 30, 45, 60, 75 e 90). */
export const DURATE_SALA = [30, 45, 60, 80] as const

/**
 * Cosa usa in sala (20/10/2026): **una prevalenza, non un'esclusiva**. Il piano usa soprattutto quello che si sceglie; cardio,
 * stretching e mobilita' ci sono comunque, per il riscaldamento e il core. I valori sono quelli della funzione.
 */
export const ATTREZZATURE = [
  { valore: 'tutto', testo: t('Tutto', 'Everything') },
  { valore: 'macchine', testo: t('Prevalenza macchine isotoniche', 'Mostly weight machines') },
  { valore: 'pesi_liberi', testo: t('Prevalenza pesi liberi e corpo libero', 'Mostly free weights and bodyweight') },
] as const
export type Attrezzatura = (typeof ATTREZZATURE)[number]['valore']

// ---------------------------------------------------------------------------------------------------------------------------
// Il questionario a passi della sala (22/10/2026): una domanda per schermata, con l'anello che si chiude (`PassiSala.tsx`).
// Tutto quello che segue e' puro: il testo di ogni risposta, il livello che si ricava dai test, i giorni consigliati, quando un passo e'
// completo. I valori vanno alla funzione (`_shared/schede/questionario.ts` di APP-ATHLON, che li ricontrolla): se cambiano, cambiano
// in tutti e due i posti. Le **risposte non si conservano**: solo in memoria (`rispostePiano.ts`), perche' le zone che danno fastidio
// sono dati sulla salute.

export type Livello = 'principiante' | 'intermedio' | 'esperto'
export type Opzione<T extends string> = { valore: T; testo: string; nota?: string }

export const FOCUS = [
  { valore: 'petto', testo: t('Petto', 'Chest') },
  { valore: 'schiena', testo: t('Schiena', 'Back') },
  { valore: 'spalle', testo: t('Spalle', 'Shoulders') },
  { valore: 'braccia', testo: t('Braccia', 'Arms') },
  { valore: 'gambe', testo: t('Gambe', 'Legs') },
  { valore: 'glutei', testo: t('Glutei', 'Glutes') },
  { valore: 'addome', testo: t('Addome', 'Abs') },
] as const
export type Focus = (typeof FOCUS)[number]['valore']
export const FOCUS_MAX = 3

export const ESPERIENZE = [
  { valore: 'regolare', testo: t('Sì, mi alleno regolarmente', 'Yes, I train regularly') },
  { valore: 'smesso_da_poco', testo: t('Sì, ma ho smesso da meno di un anno', 'Yes, but I stopped less than a year ago') },
  { valore: 'smesso_da_tempo', testo: t('Sì, ma ho smesso da più di un anno', 'Yes, but I stopped more than a year ago') },
  { valore: 'mai', testo: t('No, nessuna esperienza precedente', 'No, no previous experience') },
] as const
export type Esperienza = (typeof ESPERIENZE)[number]['valore']

export const STRUMENTI = [
  { valore: 'macchine', testo: t('Macchine isotoniche', 'Weight machines'), nota: t('Quelle a carico selezionabile', 'The selectorised ones') },
  { valore: 'cavi', testo: t('Cavi', 'Cables') },
  { valore: 'manubri', testo: t('Manubri', 'Dumbbells') },
  { valore: 'bilanciere', testo: t('Bilanciere', 'Barbell') },
  { valore: 'kettlebell', testo: t('Kettlebell', 'Kettlebells') },
  { valore: 'corpo_libero', testo: t('Corpo libero ed elastici', 'Bodyweight and bands') },
] as const
export type Strumento = (typeof STRUMENTI)[number]['valore']

/** I tre test: quante ne fai senza una pausa. Le soglie sono le stesse della funzione (`CAPACITA`). */
export const TEST = {
  squat: {
    titolo: t('Quanti squat riesci a fare?', 'How many squats can you do?'),
    nota: t('Quanti riesci a farne senza una pausa?', 'How many can you do without a break?'),
    opzioni: [
      { valore: 'meno_15', testo: t('Meno di 15', 'Fewer than 15') },
      { valore: '15_30', testo: '15-30' },
      { valore: 'oltre_30', testo: t('Più di 30', 'More than 30') },
      { valore: 'non_so', testo: t('Non lo so', 'I don’t know') },
    ],
  },
  flessioni: {
    titolo: t('Quante flessioni riesci a fare?', 'How many push-ups can you do?'),
    nota: t('Quante riesci a farne senza una pausa?', 'How many can you do without a break?'),
    opzioni: [
      { valore: 'meno_10', testo: t('Meno di 10', 'Fewer than 10') },
      { valore: '10_20', testo: '10-20' },
      { valore: 'oltre_20', testo: t('Più di 20', 'More than 20') },
      { valore: 'non_so', testo: t('Non lo so', 'I don’t know') },
    ],
  },
  plank: {
    titolo: t('Quanto riesci a mantenere un plank?', 'How long can you hold a plank?'),
    nota: t('Scegli il tuo massimo tempo senza riposo.', 'Choose your longest time without a rest.'),
    opzioni: [
      { valore: 'meno_30', testo: t('Meno di 30 s', 'Under 30 s') },
      { valore: '30_60', testo: '30-60 s' },
      { valore: 'oltre_60', testo: t('Più di 1 min', 'Over 1 min') },
      { valore: 'non_so', testo: t('Non lo so', 'I don’t know') },
    ],
  },
} as const
export type NomeTest = keyof typeof TEST

/** Nessun fastidio / niente da evitare: una risposta che esclude le altre. */
export const NESSUNO = 'nessuno'

export const ZONE = [
  { valore: 'ginocchia', testo: t('Ginocchia', 'Knees') },
  { valore: 'lombare', testo: t('Zona lombare', 'Lower back') },
  { valore: 'cervicale', testo: t('Collo e cervicale', 'Neck') },
  { valore: 'spalle', testo: t('Spalle', 'Shoulders') },
  { valore: 'polsi_gomiti', testo: t('Polsi e gomiti', 'Wrists and elbows') },
  { valore: 'anche', testo: t('Anche', 'Hips') },
  { valore: 'caviglie', testo: t('Caviglie', 'Ankles') },
] as const
export type Zona = (typeof ZONE)[number]['valore']

export const GIORNATE = [
  { valore: 'seduto', testo: t('Per lo più seduto', 'Mostly seated'), nota: t('Scrivania, auto, studio', 'Desk, car, studying') },
  { valore: 'in_piedi', testo: t('Spesso in piedi o in movimento', 'Often on my feet or moving') },
  { valore: 'fisico', testo: t('Un lavoro fisico', 'A physical job') },
] as const
export type Giornata = (typeof GIORNATE)[number]['valore']

export const EVITA = [
  { valore: 'corsa', testo: t('La corsa', 'Running') },
  { valore: 'salti', testo: t('I salti', 'Jumping') },
  { valore: 'squat', testo: t('Gli squat', 'Squats') },
  { valore: 'stacchi', testo: t('Gli stacchi', 'Deadlifts') },
  { valore: 'affondi', testo: t('Gli affondi', 'Lunges') },
  { valore: 'trazioni', testo: t('Le trazioni', 'Pull-ups') },
  { valore: 'flessioni', testo: t('Le flessioni', 'Push-ups') },
] as const
export type Evita = (typeof EVITA)[number]['valore']

export const CARDIO = [
  { valore: 'no', testo: t('No, preferisco di no', 'No, I’d rather not') },
  { valore: 'poco', testo: t('Poco, giusto il riscaldamento', 'A little, just the warm-up') },
  { valore: 'volentieri', testo: t('Sì, volentieri', 'Yes, gladly') },
] as const
export type Cardio = (typeof CARDIO)[number]['valore']

/** Le stesse tre parole dei consigli. */
export const INTENSITA = [
  { valore: 'dolce', testo: t('Dolce', 'Gentle'), nota: t('Parto piano, senza stancarmi troppo', 'I’ll start easy, without getting worn out') },
  { valore: 'media', testo: t('Media', 'Moderate'), nota: t('Un lavoro serio ma sostenibile', 'Solid work that I can keep up') },
  { valore: 'intensa', testo: t('Intensa', 'Intense'), nota: t('Voglio spingere', 'I want to push') },
] as const
export type Intensita = (typeof INTENSITA)[number]['valore']

export const FASCE = [
  { valore: 'mattina', testo: t('Mattina', 'Morning') },
  { valore: 'pausa_pranzo', testo: t('Pausa pranzo', 'Lunch break') },
  { valore: 'pomeriggio', testo: t('Pomeriggio', 'Afternoon') },
  { valore: 'sera', testo: t('Sera', 'Evening') },
  { valore: 'varia', testo: t('Cambia da un giorno all’altro', 'It changes day to day') },
] as const
export type Fascia = (typeof FASCE)[number]['valore']

export const LIVELLI_PASSI: Opzione<Livello>[] = [
  { valore: 'principiante', testo: t('Principiante', 'Beginner'), nota: t('Ho iniziato da poco o riprendo dopo una pausa', 'I’ve just started or I’m getting back after a break') },
  { valore: 'intermedio', testo: t('Intermedio', 'Intermediate'), nota: t('Mi alleno con regolarità e conosco gli esercizi base', 'I train regularly and know the basic exercises') },
  { valore: 'esperto', testo: t('Esperto', 'Advanced'), nota: t('Mi alleno da anni e conosco bene gli esercizi', 'I’ve been training for years and know the exercises well') },
]

/**
 * Le risposte del questionario, com'e' mentre si compila. `null` o vuoto = non ancora risposto. «Nessuno» (`NESSUNO`) sta dentro `zone`
 * ed `evita` come risposta che esclude le altre: chi non ha fastidi ha risposto, e non e' lo stesso di chi non ha ancora risposto.
 */
export type Risposte = {
  obiettivo: string | null
  condizione: CondizioneSalute | null
  focus: Focus[]
  esperienza: Esperienza | null
  strumenti: Strumento[]
  squat: string | null
  flessioni: string | null
  plank: string | null
  /** Il livello scelto a mano dopo aver visto quello stimato; `null` = vale lo stimato. */
  livello: Livello | null
  zone: (Zona | typeof NESSUNO)[]
  /** Facoltativo, e solo se c'e' una zona: «ginocchio operato», «una spalla da proteggere». */
  limitazioni: string
  giornata: Giornata | null
  evita: (Evita | typeof NESSUNO)[]
  cardio: Cardio | null
  intensita: Intensita | null
  minuti: number | null
  /** Il numero di giorni scelto; `null` = vale quello consigliato. */
  giorni: number | null
  fascia: Fascia | null
  note: string
}

export const RISPOSTE_VUOTE: Risposte = {
  obiettivo: null,
  condizione: null,
  focus: [],
  esperienza: null,
  strumenti: [],
  squat: null,
  flessioni: null,
  plank: null,
  livello: null,
  zone: [],
  limitazioni: '',
  giornata: null,
  evita: [],
  cardio: null,
  intensita: null,
  minuti: null,
  giorni: null,
  fascia: null,
  note: '',
}

/**
 * Il livello che si ricava da quello che il socio ha detto: l'esperienza e i tre test. **Soglie nostre**, da far validare dal
 * Direttore Tecnico. Il socio lo vede (passo «Il tuo livello») e lo puo' cambiare: e' una stima, non un giudizio.
 *  - «non lo so» non conta; senza nessun test risposto basta l'esperienza (solo chi si allena regolarmente e' intermedio);
 *  - con i test, meta' e' l'esperienza e meta' la media dei test (0 poche, 1 medie, 2 tante);
 *  - chi non ha mai fatto niente non va oltre intermedio, qualunque test dia.
 */
export function livelloDa(r: Pick<Risposte, 'esperienza' | 'squat' | 'flessioni' | 'plank'>): Livello {
  const base = { mai: 0, smesso_da_tempo: 1, smesso_da_poco: 2, regolare: 3 }[r.esperienza ?? 'mai']
  const punti = (v: string | null): number | null => {
    if (!v || v === 'non_so') return null
    return v.startsWith('meno') ? 0 : v.startsWith('oltre') ? 2 : 1
  }
  const dati = [punti(r.squat), punti(r.flessioni), punti(r.plank)].filter((x): x is number => x !== null)
  if (!dati.length) return base >= 3 ? 'intermedio' : 'principiante'
  const test = dati.reduce((a, b) => a + b, 0) / (2 * dati.length)
  const punteggio = (base / 3) * 0.5 + test * 0.5
  return punteggio >= 0.8 ? 'esperto' : punteggio >= 0.4 ? 'intermedio' : 'principiante'
}

/** Il livello che vale: quello scelto a mano, se c'e', altrimenti lo stimato. */
export const livelloScelto = (r: Risposte): Livello => r.livello ?? livelloDa(r)

/**
 * Quanti giorni a settimana consigliamo. **Soglie nostre, da far validare dal Direttore Tecnico.** Parte da 3 (4 per un esperto), un
 * giorno in piu' per sedute da 30 minuti o per chi sceglie un'intensita' intensa (e non e' un principiante), uno in meno per sedute da 80
 * minuti; il numero resta fra 2 e 5.
 * Lo calcola il codice, non un modello: il socio lo vede come «Consigliato» e sceglie lui.
 */
export function giorniConsigliati(r: Pick<Risposte, 'minuti' | 'intensita'> & { livello: Livello }): number {
  let n = r.livello === 'esperto' ? 4 : 3
  if (r.minuti !== null && r.minuti <= 30) n += 1
  if (r.minuti !== null && r.minuti >= 80) n -= 1
  if (r.intensita === 'intensa' && r.livello !== 'principiante') n += 1
  return Math.max(2, Math.min(5, n))
}

export const giorniScelti = (r: Risposte): number => r.giorni ?? giorniConsigliati({ ...r, livello: livelloScelto(r) })

/**
 * Cosa sa usare → la prevalenza che usa la funzione: solo macchine e cavi = `macchine`; niente macchine ne' cavi = `pesi_liberi`;
 * il resto = `tutto`. Lo stesso conto di `attrezzaturaDaStrumenti` nella funzione.
 */
export function attrezzaturaDaStrumenti(strumenti: readonly string[]): 'tutto' | 'macchine' | 'pesi_liberi' {
  if (!strumenti.length) return 'tutto'
  const dellaMacchina = (s: string) => s === 'macchine' || s === 'cavi'
  if (strumenti.every(dellaMacchina)) return 'macchine'
  if (!strumenti.some(dellaMacchina)) return 'pesi_liberi'
  return 'tutto'
}

// ---- i passi ---------------------------------------------------------------------------------------------------------------

export const PASSI_SALA = [
  'obiettivo', 'focus', 'esperienza', 'strumenti', 'squat', 'flessioni', 'plank', 'livello', 'fastidi', 'giornata', 'evita', 'cardio', 'intensita', 'durata', 'giorni', 'fascia', 'note', 'riepilogo',
] as const
export type PassoSala = (typeof PASSI_SALA)[number]

/**
 * Se si puo' andare avanti da questo passo. Obbligatori: obiettivo (non «Salute»: lo ferma il riquadro del personal trainer),
 * esperienza, almeno uno strumento, un fastidio o «nessuno», quando e come si allena, quanto dura, la fascia. Facoltativi: su cosa
 * concentrarsi, i tre test (anche «non lo so»: ma almeno una risposta per non saltarli per sbaglio), la nota.
 */
export function passoCompleto(passo: PassoSala, r: Risposte): boolean {
  switch (passo) {
    case 'obiettivo':
      return !!r.obiettivo && !eSalute(r.obiettivo)
    case 'focus':
      return true
    case 'esperienza':
      return !!r.esperienza
    case 'strumenti':
      return r.strumenti.length > 0
    case 'squat':
    case 'flessioni':
    case 'plank':
      return !!r[passo]
    case 'livello':
      return !!r.esperienza
    case 'fastidi':
      return r.zone.length > 0
    case 'giornata':
      return !!r.giornata
    case 'evita':
      return r.evita.length > 0
    case 'cardio':
      return !!r.cardio
    case 'intensita':
      return !!r.intensita
    case 'durata':
      return !!r.minuti
    case 'giorni':
      return giorniScelti(r) >= 1
    case 'fascia':
      return !!r.fascia
    case 'note':
    case 'riepilogo':
      return true
  }
}

/** Un valore in una lista a scelta multipla; «nessuno» esclude le altre e le altre escludono «nessuno». `max` limita quante se ne tengono. */
export function accendi<T extends string>(lista: readonly (T | typeof NESSUNO)[], v: T | typeof NESSUNO, max = Infinity): (T | typeof NESSUNO)[] {
  if (v === NESSUNO) return lista.includes(NESSUNO) ? [] : [NESSUNO]
  const senza = lista.filter((x) => x !== NESSUNO && x !== v)
  if (lista.includes(v)) return senza
  return senza.length >= max ? senza : [...senza, v]
}

/** Quello che parte per la funzione. Mai `null` o vuoto: una risposta non data non c'e' (la funzione la tratta cosi'). */
export function questionarioSalaDa(r: Risposte): QuestionarioSalaCompleto {
  const zone = r.zone.filter((z): z is Zona => z !== NESSUNO)
  const evita = r.evita.filter((e): e is Evita => e !== NESSUNO)
  const capacita: Record<string, string> = {}
  for (const k of ['squat', 'flessioni', 'plank'] as const) if (r[k] && r[k] !== 'non_so') capacita[k] = r[k]!
  return {
    obiettivo: r.obiettivo!,
    livello: livelloScelto(r),
    giorni: giorniScelti(r),
    minuti: r.minuti!,
    attrezzatura: attrezzaturaDaStrumenti(r.strumenti),
    limitazioni: zone.length ? r.limitazioni.trim() : '',
    note: r.note.trim(),
    ...(r.focus.length ? { focus: r.focus } : {}),
    ...(r.esperienza ? { esperienza: r.esperienza } : {}),
    ...(r.strumenti.length ? { strumenti: r.strumenti } : {}),
    ...(Object.keys(capacita).length ? { capacita } : {}),
    ...(zone.length ? { zone } : {}),
    ...(r.giornata ? { giornata: r.giornata } : {}),
    ...(evita.length ? { evita } : {}),
    ...(r.cardio ? { cardio: r.cardio } : {}),
    ...(r.intensita ? { intensita: r.intensita } : {}),
    ...(r.fascia ? { fascia: r.fascia } : {}),
  }
}

/** Cio' che parte per la funzione (`Questionario` di `api/lab.ts`), con i campi nuovi. */
export type QuestionarioSalaCompleto = {
  obiettivo: string
  livello: Livello
  giorni: number
  minuti: number
  attrezzatura: 'tutto' | 'macchine' | 'pesi_liberi'
  limitazioni: string
  note: string
  focus?: Focus[]
  esperienza?: Esperienza
  strumenti?: Strumento[]
  capacita?: Record<string, string>
  zone?: Zona[]
  giornata?: Giornata
  evita?: Evita[]
  cardio?: Cardio
  intensita?: Intensita
  fascia?: Fascia
}

const testoDi = <T extends string>(lista: readonly { valore: T; testo: string }[], v: T | null) => lista.find((x) => x.valore === v)?.testo ?? ''

/** Una riga del riepilogo: cosa, la risposta, e il passo a cui si torna per cambiarla. */
export type RigaRiepilogo = { titolo: string; valore: string; passo: PassoSala }

/** Le righe del riepilogo («Ecco cosa abbiamo capito»): niente calorie, niente peso, niente promesse. Ogni riga porta al suo passo. */
export function riepilogoDa(r: Risposte): RigaRiepilogo[] {
  const zone = r.zone.filter((z): z is Zona => z !== NESSUNO)
  const evita = r.evita.filter((e): e is Evita => e !== NESSUNO)
  const righe: RigaRiepilogo[] = [
    { titolo: t('Obiettivo', 'Goal'), valore: nomeObiettivo(r.obiettivo ?? ''), passo: 'obiettivo' },
    { titolo: t('Livello', 'Level'), valore: testoDi(LIVELLI_PASSI, livelloScelto(r)), passo: 'livello' },
    { titolo: t('Giorni a settimana', 'Days a week'), valore: String(giorniScelti(r)), passo: 'giorni' },
    { titolo: t('Durata di una seduta', 'Session length'), valore: r.minuti ? `${r.minuti} min` : '', passo: 'durata' },
  ]
  if (r.focus.length) righe.push({ titolo: t('Ti concentri su', 'Focus'), valore: r.focus.map((f) => testoDi(FOCUS, f)).join(', '), passo: 'focus' })
  righe.push({ titolo: t('Intensità', 'Intensity'), valore: testoDi(INTENSITA, r.intensita), passo: 'intensita' })
  righe.push({ titolo: t('Strumenti', 'Equipment'), valore: r.strumenti.map((s) => testoDi(STRUMENTI, s)).join(', '), passo: 'strumenti' })
  righe.push({ titolo: t('Fastidi', 'Aches'), valore: zone.length ? zone.map((z) => testoDi(ZONE, z)).join(', ') : t('Nessuno', 'None'), passo: 'fastidi' })
  righe.push({ titolo: t('Da evitare', 'To avoid'), valore: evita.length ? evita.map((e) => testoDi(EVITA, e)).join(', ') : t('Niente', 'Nothing'), passo: 'evita' })
  righe.push({ titolo: t('Cardio', 'Cardio'), valore: testoDi(CARDIO, r.cardio), passo: 'cardio' })
  righe.push({ titolo: t('Quando ti alleni', 'When you train'), valore: testoDi(FASCE, r.fascia), passo: 'fascia' })
  return righe.filter((x) => x.valore)
}
