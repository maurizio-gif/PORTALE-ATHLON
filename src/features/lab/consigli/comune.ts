import type { PacchettoPersonal, StatoPersonal } from '@/api/lab'
import type {
  AmbienteLezione,
  Bisogno,
  ConsiglioPersonal,
  DatiLezione,
  Disciplina,
  Esperienza,
  Gruppo,
  Intensita,
  LezioneConsiglio,
  Livello,
  Obiettivo,
  OrarioLezione,
  Pausa,
  PersonalEsperienza,
  PersonalInteresse,
  QuestionarioConsigli,
  Quota,
  RispostaConsigli,
  SedutaConsigliata,
  Tipologia,
} from '@/api/percorso'
import { locale, t, tv } from '@/lib/lingua'

// Le parole e i piccoli conti dei Consigli di Athlon (20/10/2026, rifatti il 21/10/2026). Sono **consigli**, non una settimana:
// dal profilo del socio (obiettivi, esperienza, gusti, quando preferisce venire) quali tipi di lezione potrebbero interessargli,
// con le alternative e gli orari in cui li trova, e dove serve una seduta in sala o in vasca, che porta a comporre il piano di
// allenamento. Le lezioni vere le trova la funzione (`portale-lab-percorso`, azione `consigli`); qui si mostrano, e si
// prenotano come dal Calendario, una alla volta. Niente «percorso» nei testi per il socio: il percorso e' un'altra cosa (la
// settimana a tappe), e «piano» si dice solo per gli esercizi di un allenamento, che e' dove portano le sedute.

/** Le chiavi di memoria del laboratorio: lo stato, l'ultima risposta (senza niente di sanitario) e le scelte fatte, **senza le limitazioni**. */
export const CHIAVE_STATO_CONSIGLI = 'consigli:stato'
export const CHIAVE_ULTIMI_CONSIGLI = 'consigli:ultimi'
export const CHIAVE_SCELTE_CONSIGLI = 'consigli:scelte'
/** Le scelte portate dal profilo comune (`schede/profiloComune.ts`) e non ancora toccate: alla riapertura si rifanno dal profilo. */
export const CHIAVE_RIPORTATE_CONSIGLI = 'consigli:riportate'

/**
 * Le scelte del questionario nella forma in cui stanno nella schermata. **Le limitazioni non ci sono**: sono dati sulla salute,
 * vivono solo nel campo di testo e arrivano all'AI, e basta. Obiettivi, esperienza e livello sono vuoti finche' il socio non li
 * sceglie. Il nuoto si chiede in due tempi: se gli piace nuotare, e poi se sa gia' lo stile libero e il dorso.
 */
export type SceltePerConsigli = Omit<QuestionarioConsigli, 'limitazioni' | 'evitate' | 'obiettivo' | 'obiettivi' | 'esperienza' | 'livello' | 'nuoto'> & {
  obiettivi: Obiettivo[]
  esperienza: Esperienza | null
  livello: Livello | null
  /** Gli piace nuotare (fra i gusti). */
  nuotare: boolean
  /** Sa nuotare stile libero e dorso: null finche' non risponde. */
  saNuotare: boolean | null
}

export const VOLTE_DI_PARTENZA = 3

export const SCELTE_DI_PARTENZA: SceltePerConsigli = {
  obiettivi: [],
  esperienza: null,
  pausa: null,
  discipline: [],
  livello: null,
  intensita: null,
  volte_settimana: VOLTE_DI_PARTENZA,
  gruppi: [],
  sala: false,
  nuotare: false,
  saNuotare: null,
  tipologie: [],
  evita_gruppi: [],
  evita_tipologie: [],
  ambienti: [],
  fasce: [],
  giorni: [],
  includi_non_comprese: false,
  personal_esperienza: null,
  personal_interesse: null,
  bisogni: [],
}

export const ESPERIENZA_TESTO: Record<Esperienza, { testo: string; nota: string }> = {
  mai: { testo: t('Non ho mai praticato', 'I’ve never trained'), nota: t('Non ho mai fatto attività fisica con regolarità: parto da zero.', 'I’ve never exercised regularly: I’m starting from scratch.') },
  ex: { testo: t('Ho praticato, poi ho smesso', 'I used to train, then stopped'), nota: t('Mi allenavo, poi ho smesso e ora voglio riprendere.', 'I used to train, then stopped, and now I want to get back to it.') },
  pratico: { testo: t('Mi alleno già', 'I already train'), nota: t('Faccio già attività con regolarità, qui o altrove.', 'I already exercise regularly, here or elsewhere.') },
}

export const PAUSA_TESTO: Record<Pausa, string> = {
  meno_di_un_anno: t('Meno di un anno fa', 'Less than a year ago'),
  da_uno_a_tre_anni: t('Da uno a tre anni fa', 'One to three years ago'),
  oltre_tre_anni: t('Più di tre anni fa', 'More than three years ago'),
}

export const DISCIPLINA_TESTO: Record<Disciplina, string> = {
  sala_pesi: t('Sala pesi', 'Gym floor'),
  corsa: t('Corsa', 'Running'),
  corsi_di_gruppo: t('Corsi di gruppo', 'Group classes'),
  yoga_pilates: t('Yoga o pilates', 'Yoga or pilates'),
  nuoto: t('Nuoto', 'Swimming'),
  sport_di_squadra: t('Sport di squadra', 'Team sports'),
  combattimento: t('Arti marziali o boxe', 'Martial arts or boxing'),
  danza: t('Danza', 'Dance'),
  ciclismo: t('Ciclismo o spinning', 'Cycling or spinning'),
  altro: t('Altro', 'Other'),
}

export const LIVELLO_TESTO: Record<Livello, { testo: string; nota: string }> = {
  principiante: { testo: t('Da costruire', 'Needs building'), nota: t('Mi stanco presto, o è da tanto che non mi alleno.', 'I tire quickly, or it’s been a long time since I trained.') },
  intermedio: { testo: t('Discreta', 'Fair'), nota: t('Reggo un’ora di attività senza troppa fatica.', 'I can manage an hour of activity without too much effort.') },
  esperto: { testo: t('Ottima', 'Excellent'), nota: t('Reggo senza problemi anche le lezioni intense.', 'I can easily handle intense classes too.') },
}

export const INTENSITA_TESTO: Record<Intensita, { testo: string; nota: string }> = {
  dolce: { testo: t('Tranquilla', 'Easy'), nota: t('Mi piace muovermi senza affanno.', 'I like to move without getting out of breath.') },
  media: { testo: t('Media', 'Moderate'), nota: t('Un po’ di fatica, ma senza esagerare.', 'A bit of effort, but nothing extreme.') },
  intensa: { testo: t('Intensa', 'Intense'), nota: t('Mi piace sudare e spingere.', 'I like to sweat and push hard.') },
}

export const PERSONAL_ESPERIENZA_TESTO: Record<PersonalEsperienza, string> = { mai: t('Mai', 'Never'), passato: t('In passato', 'In the past'), ora: t('Sì, adesso', 'Yes, right now') }
export const PERSONAL_INTERESSE_TESTO: Record<PersonalInteresse, string> = { no: t('No, grazie', 'No, thanks'), curioso: t('Mi incuriosisce', 'I’m curious'), si: t('Sì, mi piacerebbe', 'Yes, I’d like that') }

/** Le domande indirette sul personal: cosa c'e' dietro agli obiettivi. */
export const BISOGNO_TESTO: Record<Bisogno, { testo: string; nota: string }> = {
  tecnica: { testo: t('Imparare a fare bene gli esercizi', 'Learning to do the exercises properly'), nota: t('la tecnica giusta, senza farmi male', 'the right technique, without getting hurt') },
  scadenza: { testo: t('Ho una data in mente', 'I have a date in mind'), nota: t('un evento, una gara, l’estate', 'an event, a race, the summer') },
  ripresa: { testo: t('Ripartire dopo uno stop', 'Restarting after a break'), nota: t('una pausa lunga, un periodo difficile', 'a long break, a tough time') },
  costanza: { testo: t('Restare costante', 'Staying consistent'), nota: t('mi serve qualcuno che mi tenga sulla strada', 'I need someone to keep me on track') },
  su_misura: { testo: t('Un lavoro su misura', 'Tailor-made training'), nota: t('costruito su di me e su come cambio', 'built around me and how I change') },
}

/** Cosa gli piace fare: i generi di lezione, e in piu' la sala pesi per conto suo e nuotare. */
export type Gusto = Gruppo | 'sala' | 'nuotare'
export const GUSTI: { valore: Gusto; testo: string; nota: string }[] = [
  { valore: 'mente_corpo', testo: t('Mente e corpo', 'Mind and body'), nota: t('yoga, pilates, Reformer, postura', 'yoga, pilates, Reformer, posture') },
  { valore: 'forza_tono', testo: t('Forza e tono', 'Strength and tone'), nota: t('body sculpt, calisthenics, circuiti', 'body sculpt, calisthenics, circuits') },
  { valore: 'cardio_danza', testo: t('Cardio e musica', 'Cardio and music'), nota: t('coreografie, balli, ritmo', 'choreography, dance, rhythm') },
  { valore: 'combat', testo: t('Combattimento', 'Combat'), nota: t('boxe e difesa personale', 'boxing and self-defense') },
  { valore: 'acqua', testo: t('Lezioni in acqua', 'Water classes'), nota: 'aqua fitness, hydrobike' },
  { valore: 'nuotare', testo: t('Nuotare', 'Swimming'), nota: t('il nuoto libero, o imparare', 'lap swimming, or learning') },
  { valore: 'sala', testo: t('Sala pesi per conto mio', 'Gym floor on my own'), nota: t('con un piano di allenamento', 'with a workout plan') },
]

export const gustiDi = (s: SceltePerConsigli): Gusto[] => [...s.gruppi, ...(s.sala ? (['sala'] as const) : []), ...(s.nuotare ? (['nuotare'] as const) : [])]

/** Le scelte dopo aver toccato i gusti: i generi, la sala e il nuoto (che, tolto, dimentica anche la risposta sullo stile). */
export function conGusti(s: SceltePerConsigli, gusti: Gusto[]): Partial<SceltePerConsigli> {
  const nuotare = gusti.includes('nuotare')
  const gruppi = gusti.filter((g): g is Gruppo => g !== 'sala' && g !== 'nuotare')
  return { gruppi, evita_gruppi: senza(s.evita_gruppi, gruppi), sala: gusti.includes('sala'), nuotare, saNuotare: nuotare ? s.saNuotare : null }
}

/** Le tipologie di lezione, con un esempio (22/10/2026): quelle che attraggono e quelle da evitare. */
export const TIPOLOGIA_TESTO: Record<Tipologia, { testo: string; nota: string }> = {
  yoga: { testo: 'Yoga', nota: 'hatha, power, yogassè' },
  pilates_reformer: { testo: t('Pilates e Reformer', 'Pilates and Reformer'), nota: 'matwork, Group Reformer, MOTR' },
  postura: { testo: t('Postura e mobilità', 'Posture and mobility'), nota: t('ginnastica dolce e posturale, Antigravity', 'gentle and postural gymnastics, Antigravity') },
  tono_forza: { testo: t('Tono e forza', 'Tone and strength'), nota: 'body sculpt, body pump, calisthenics' },
  danza: { testo: t('Danza e coreografie', 'Dance and choreography'), nota: t('balli di gruppo, GP Coreo', 'group dances, GP Coreo') },
  combattimento: { testo: t('Boxe e difesa personale', 'Boxing and self-defense'), nota: 'HBX Boxing, HBX Fusion' },
  acqua_fitness: { testo: t('Fitness in acqua', 'Water fitness'), nota: 'aqua aerobic, aqua soft, aqua tonic' },
  hydrobike: { testo: 'Hydrobike', nota: t('la bici in acqua', 'bike in the water') },
}

/** Dove vuole fare lezione. Con una sola scelta l'altro ambiente cade; nessuna o tutte e due: nessun limite. */
export const AMBIENTE_TESTO: Record<AmbienteLezione, { testo: string; nota: string }> = {
  sala: { testo: t('In sala', 'In the studio'), nota: t('lezioni a terra: corsi fitness, Reformer', 'land classes: fitness courses, Reformer') },
  acqua: { testo: t('In acqua', 'In the water'), nota: t('aqua fitness, hydrobike', 'aqua fitness, hydrobike') },
}

/** Un valore che il socio vuole evitare non puo' essere anche fra quelli che lo attraggono, e viceversa. */
const senza = <T extends string>(lista: readonly T[], tolti: readonly string[]): T[] => lista.filter((x) => !tolti.includes(x))

/** Le scelte dopo aver toccato i generi o le tipologie da evitare: quello che evita esce dai gusti. */
export function conEvitate(s: SceltePerConsigli, evita_gruppi: Gruppo[], evita_tipologie: Tipologia[]): Partial<SceltePerConsigli> {
  return { evita_gruppi, evita_tipologie, gruppi: senza(s.gruppi, evita_gruppi), tipologie: senza(s.tipologie, evita_tipologie) }
}

/** Le scelte dopo aver toccato le tipologie che attraggono: quello che gli piace esce dalle cose da evitare. */
export function conTipologie(s: SceltePerConsigli, tipologie: Tipologia[]): Partial<SceltePerConsigli> {
  return { tipologie, evita_tipologie: senza(s.evita_tipologie, tipologie) }
}

/** «Martedì 20 ottobre»: il giorno com'e' scritto, con l'iniziale maiuscola. */
export const titoloGiorno = (testo: string) => testo.charAt(0).toUpperCase() + testo.slice(1)

export const volteTesto = (n: number) =>
  t(
    n === 1 ? 'una volta a settimana' : n === 2 ? 'due volte a settimana' : n === 3 ? 'tre volte a settimana' : `${n} volte a settimana`,
    n === 1 ? 'once a week' : n === 2 ? 'twice a week' : n === 3 ? 'three times a week' : `${n} times a week`,
  )

const GIORNO_ORARIO = tv(['', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'], ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
/** «lun 18:30». */
export const testoOrario = (o: Pick<OrarioLezione, 'giorno' | 'ora'>) => `${GIORNO_ORARIO[o.giorno] ?? ''} ${o.ora}`.trim()

/** Gli orari di una lezione, per riga: prima quelli nelle sue preferenze. `fuori` dice se nessuno ci cade (e lui ne ha date). */
export function orariOrdinati(orari: OrarioLezione[]): { orari: OrarioLezione[]; fuori: boolean } {
  const suoi = orari.filter((o) => o.tuo === true)
  return { orari: [...suoi, ...orari.filter((o) => o.tuo !== true)], fuori: orari.length > 0 && orari.every((o) => o.tuo === false) }
}

/** I giorni di una seduta in parole: «lunedì e giovedì». */
const GIORNO_ESTESO = tv(
  ['', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
  ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
)
export function giorniTesto(giorni: number[]): string | null {
  const nomi = giorni.map((g) => GIORNO_ESTESO[g]).filter(Boolean)
  if (!nomi.length) return null
  return nomi.length === 1 ? nomi[0] : `${nomi.slice(0, -1).join(', ')} ${t('e', 'and')} ${nomi[nomi.length - 1]}`
}

/** Dove porta una seduta: a comporre il piano (in sala o in vasca) e, per prenotare il turno, al calendario sul primo giorno utile. */
export function destinazioniSeduta(s: SedutaConsigliata): { piano: { pathname: '/allenamento/agente'; params: { dove: 'sala' | 'vasca' } }; calendario: { pathname: '/calendario'; params: { giorno: string; attivita: string } } | null } {
  return {
    piano: { pathname: '/allenamento/agente', params: { dove: s.ambiente } },
    calendario: s.prossimi[0] ? { pathname: '/calendario', params: { giorno: s.prossimi[0], attivita: s.ambiente === 'sala' ? 'Gym Floor' : 'Nuoto Libero' } } : null,
  }
}

/** Una formula di personal pronta da mostrare: cosa, quanto costa (dal listino di PerfectGym), e dove porta. */
export type FormulaPersonal = {
  chiave: string
  titolo: string
  sotto: string | null
  prezzo: number | null
  /** «al mese» per gli abbonamenti PT. */
  alMese: boolean
  destinazione: { pathname: '/personal'; params?: { compra: string } }
}

export const sedutePersonalTesto = (n: number) => (n === 1 ? t('una seduta al mese', 'one session a month') : t(`${n} sedute al mese`, `${n} sessions a month`))

/**
 * Dal consiglio (quante sedute al mese) e dallo stato del personal (`statoPersonal`: la seduta singola in vendita, gli
 * abbonamenti PT che la persona puo' attivare, quello che ha gia') le formule da mostrare: **la consigliata** e **le altre**.
 * I prezzi li dice PerfectGym, mai il consiglio. Una seduta singola porta a `/personal`, dove si sceglie trainer e orario e si
 * paga; un abbonamento PT a `/personal?compra=<piano>`, che apre il suo foglio. Chi ha gia' un abbonamento PT ha solo da
 * prenotare; chi non ha un abbonamento attivo non puo' attivarne uno PT, e gli resta la seduta singola. Senza stato (la
 * funzione non ha risposto) le formule ci sono, senza prezzo.
 */
export function formulePersonal(c: ConsiglioPersonal, stato: StatoPersonal | null): { consigliata: FormulaPersonal; altre: FormulaPersonal[]; attivo: string | null; senzaAbbonamento: boolean } {
  const prezzoSeduta = stato?.acquisto?.prodotto.prezzo ?? null
  const minuti = stato?.acquisto?.minuti
  const singola: FormulaPersonal = {
    chiave: 'seduta',
    titolo: t('Seduta singola', 'Single session'),
    sotto: t(`${minuti ? `${minuti} minuti` : 'Una seduta'} con un trainer, da prenotare quando vuoi`, `${minuti ? `${minuti} minutes` : 'A session'} with a trainer, to book whenever you like`),
    prezzo: prezzoSeduta,
    alMese: false,
    destinazione: { pathname: '/personal' },
  }
  const pacchetto = (k: PacchettoPersonal): FormulaPersonal => ({
    chiave: `pt-${k.piano_id}`,
    titolo: `${t('Abbonamento PT', 'PT membership')} · ${sedutePersonalTesto(k.sedute ?? 0)}`,
    sotto: t('Si aggiunge al tuo abbonamento: le sedute si caricano ogni mese', 'Added to your membership: sessions are loaded every month'),
    prezzo: k.prezzo_mese,
    alMese: true,
    destinazione: { pathname: '/personal', params: { compra: String(k.piano_id) } },
  })
  const attivo = stato?.pacchetto_attivo ?? null
  const pacchetti = attivo ? [] : (stato?.pacchetti ?? [])
  const scelto = c.sedute_mese === 1 ? null : pacchetti.find((k) => k.sedute === c.sedute_mese) ?? null
  // Senza lo stato non si sa cosa e' in vendita: la consigliata resta, senza prezzo, e porta alla schermata del personal.
  const senzaStato: FormulaPersonal = { ...singola, chiave: `pt-${c.sedute_mese}`, titolo: `${t('Abbonamento PT', 'PT membership')} · ${sedutePersonalTesto(c.sedute_mese)}`, sotto: null, alMese: true }
  const consigliata = scelto ? pacchetto(scelto) : c.sedute_mese === 1 || stato ? singola : senzaStato
  const altre = [singola, ...pacchetti.map(pacchetto)].filter((f) => f.chiave !== consigliata.chiave)
  return { consigliata, altre: stato ? altre : [], attivo, senzaAbbonamento: !!stato && !attivo && !stato.pacchetti.length && c.sedute_mese > 1 }
}

/** Cosa manca perche' il questionario si possa mandare, nell'ordine delle domande; vuoto se c'e' tutto. */
/**
 * Le scelte da un questionario salvato (`ultimiConsigli`), per riaprirlo com'era: e' l'inverso di `questionarioDa`, senza
 * le limitazioni, che non si conservano. Un campo che il questionario di prima non aveva resta com'e' di partenza.
 */
export function scelteDa(q: Partial<QuestionarioConsigli> | undefined): Partial<SceltePerConsigli> {
  if (!q) return {}
  const s: Partial<SceltePerConsigli> = {}
  if (Array.isArray(q.obiettivi)) s.obiettivi = q.obiettivi
  if (q.esperienza !== undefined) s.esperienza = q.esperienza
  if (q.pausa !== undefined) s.pausa = q.pausa
  if (Array.isArray(q.discipline)) s.discipline = q.discipline
  if (q.livello && q.esperienza !== 'mai') s.livello = q.livello
  if (q.intensita !== undefined) s.intensita = q.intensita
  if (typeof q.volte_settimana === 'number') s.volte_settimana = q.volte_settimana
  if (Array.isArray(q.gruppi)) s.gruppi = q.gruppi
  if (typeof q.sala === 'boolean') s.sala = q.sala
  if (q.nuoto !== undefined) {
    s.nuotare = q.nuoto != null
    s.saNuotare = q.nuoto === 'libero' ? true : q.nuoto === 'imparare' ? false : null
  }
  if (Array.isArray(q.tipologie)) s.tipologie = q.tipologie
  if (Array.isArray(q.evita_gruppi)) s.evita_gruppi = q.evita_gruppi
  if (Array.isArray(q.evita_tipologie)) s.evita_tipologie = q.evita_tipologie
  if (Array.isArray(q.ambienti)) s.ambienti = q.ambienti
  if (Array.isArray(q.fasce)) s.fasce = q.fasce
  if (Array.isArray(q.giorni)) s.giorni = q.giorni
  if (typeof q.includi_non_comprese === 'boolean') s.includi_non_comprese = q.includi_non_comprese
  if (q.personal_esperienza !== undefined) s.personal_esperienza = q.personal_esperienza
  if (q.personal_interesse !== undefined) s.personal_interesse = q.personal_interesse
  if (Array.isArray(q.bisogni)) s.bisogni = q.bisogni
  return s
}

/**
 * I consigli si chiedono una volta a settimana, e la schermata lo dice sempre. **In prova il limite non si applica**
 * (`in_prova` dalla funzione): il questionario resta aperto anche a chi li ha gia' chiesti.
 */
export const quotaFinita = (q: Quota | undefined): boolean => !!q && !q.in_prova && q.usate >= q.massimo

/** «martedì 21 ottobre», all'ora di Roma. */
export const giornoEsteso = (iso: string, giorniDopo = 0): string =>
  new Date(new Date(iso).getTime() + giorniDopo * 86_400_000).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })

export function cosaManca(s: SceltePerConsigli): string[] {
  const manca: string[] = []
  if (!s.obiettivi.length) manca.push(t('un obiettivo', 'a goal'))
  if (!s.esperienza) manca.push(t('la tua esperienza', 'your experience'))
  else if (s.esperienza !== 'mai' && !s.livello) manca.push(t('com’è la tua forma oggi', 'how fit you are today'))
  if (s.nuotare && s.saNuotare === null) manca.push(t('se sai nuotare stile libero e dorso', 'whether you can swim freestyle and backstroke'))
  return manca
}

/**
 * Il questionario per la funzione, dalle scelte e dalle limitazioni; null finche' manca qualcosa (`cosaManca`). Chi non ha mai
 * praticato e' un principiante e non ha discipline; la pausa e' solo di chi ha smesso. Il nuoto: chi sa stile libero e dorso
 * fa il Nuoto Libero, chi no comincia dalla Scuola Nuoto Adulti.
 */
export function questionarioDa(s: SceltePerConsigli, limitazioni: string): QuestionarioConsigli | null {
  if (cosaManca(s).length || !s.esperienza) return null
  const livello: Livello = s.esperienza === 'mai' ? 'principiante' : s.livello!
  const { nuotare, saNuotare, ...resto } = s
  return {
    ...resto,
    obiettivo: s.obiettivi[0],
    esperienza: s.esperienza,
    livello,
    pausa: s.esperienza === 'ex' ? s.pausa : null,
    discipline: s.esperienza === 'mai' ? [] : s.discipline,
    nuoto: nuotare ? (saNuotare ? 'libero' : 'imparare') : null,
    // Il testo libero non c'e' piu': la funzione lo legge ancora da un'app di prima.
    evitate: [],
    limitazioni: limitazioni.trim(),
  }
}

type Prenotazione = DatiLezione['prenotazione']

/** Cambia una lezione (se e' quella) dopo un clic: la prenotazione, i posti liberi e la lista d'attesa, come nel Calendario. */
function ritocca<T extends DatiLezione>(d: T, classId: number, prenotazione: Prenotazione, delta: number, deltaAttesa: number): T {
  if (d.class_id !== classId) return d
  return { ...d, prenotazione, liberi: Math.max(0, d.liberi - delta), in_attesa: Math.max(0, d.in_attesa + deltaAttesa) }
}

/**
 * La risposta con una prenotazione cambiata, in ogni posto in cui compare quella lezione (un consiglio o una sua
 * alternativa). Dopo un clic la riga si aggiorna subito, con quello che ha detto PerfectGym: il mirror arriva con qualche
 * secondo di ritardo e non si rilegge per confermare.
 */
export function conPrenotazione(r: RispostaConsigli, classId: number, nuova: Prenotazione, delta: number, deltaAttesa = 0): RispostaConsigli {
  const l = (x: LezioneConsiglio) => ritocca(x, classId, nuova, delta, deltaAttesa)
  return {
    ...r,
    consigli: r.consigli.map((c) => ({ ...c, prossime: c.prossime.map(l), alternative: c.alternative.map((a) => ({ ...a, prossime: a.prossime.map(l) })) })),
  }
}

/** Una lezione della risposta, per id: serve a sapere di che giorno e' quando si prenota o si disdice. */
export function trovaLezione(r: RispostaConsigli, classId: number): LezioneConsiglio | null {
  const tutte: LezioneConsiglio[] = r.consigli.flatMap((c) => [...c.prossime, ...c.alternative.flatMap((a) => a.prossime)])
  return tutte.find((x) => x.class_id === classId) ?? null
}
