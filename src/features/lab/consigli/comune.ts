import type { DatiLezione, Disciplina, Esperienza, Gruppo, Intensita, LezioneConsiglio, Livello, Obiettivo, OrarioLezione, Pausa, QuestionarioConsigli, RispostaConsigli, SedutaConsigliata } from '@/api/percorso'

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
  /** Le lezioni da evitare come le ha scritte il socio, separate da virgole. */
  evitate: string
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
  evitate: '',
  fasce: [],
  giorni: [],
  includi_non_comprese: false,
}

export const ESPERIENZA_TESTO: Record<Esperienza, { testo: string; nota: string }> = {
  mai: { testo: 'Non ho mai praticato', nota: 'Non ho mai fatto attività fisica con regolarità: parto da zero.' },
  ex: { testo: 'Ho praticato, poi ho smesso', nota: 'Mi allenavo, poi ho smesso e ora voglio riprendere.' },
  pratico: { testo: 'Mi alleno già', nota: 'Faccio già attività con regolarità, qui o altrove.' },
}

export const PAUSA_TESTO: Record<Pausa, string> = {
  meno_di_un_anno: 'Meno di un anno fa',
  da_uno_a_tre_anni: 'Da uno a tre anni fa',
  oltre_tre_anni: 'Più di tre anni fa',
}

export const DISCIPLINA_TESTO: Record<Disciplina, string> = {
  sala_pesi: 'Sala pesi',
  corsa: 'Corsa',
  corsi_di_gruppo: 'Corsi di gruppo',
  yoga_pilates: 'Yoga o pilates',
  nuoto: 'Nuoto',
  sport_di_squadra: 'Sport di squadra',
  combattimento: 'Arti marziali o boxe',
  danza: 'Danza',
  ciclismo: 'Ciclismo o spinning',
  altro: 'Altro',
}

export const LIVELLO_TESTO: Record<Livello, { testo: string; nota: string }> = {
  principiante: { testo: 'Da costruire', nota: 'Mi stanco presto, o è da tanto che non mi alleno.' },
  intermedio: { testo: 'Discreta', nota: 'Reggo un’ora di attività senza troppa fatica.' },
  esperto: { testo: 'Ottima', nota: 'Reggo senza problemi anche le lezioni intense.' },
}

export const INTENSITA_TESTO: Record<Intensita, { testo: string; nota: string }> = {
  dolce: { testo: 'Tranquilla', nota: 'Mi piace muovermi senza affanno.' },
  media: { testo: 'Media', nota: 'Un po’ di fatica, ma senza esagerare.' },
  intensa: { testo: 'Intensa', nota: 'Mi piace sudare e spingere.' },
}

/** Cosa gli piace fare: i generi di lezione, e in piu' la sala pesi per conto suo e nuotare. */
export type Gusto = Gruppo | 'sala' | 'nuotare'
export const GUSTI: { valore: Gusto; testo: string; nota: string }[] = [
  { valore: 'mente_corpo', testo: 'Mente e corpo', nota: 'yoga, pilates, Reformer, postura' },
  { valore: 'forza_tono', testo: 'Forza e tono', nota: 'body sculpt, calisthenics, circuiti' },
  { valore: 'cardio_danza', testo: 'Cardio e musica', nota: 'coreografie, balli, ritmo' },
  { valore: 'combat', testo: 'Combattimento', nota: 'boxe e difesa personale' },
  { valore: 'acqua', testo: 'Lezioni in acqua', nota: 'aqua fitness, hydrobike' },
  { valore: 'nuotare', testo: 'Nuotare', nota: 'il nuoto libero, o imparare' },
  { valore: 'sala', testo: 'Sala pesi per conto mio', nota: 'con un piano di allenamento' },
]

export const gustiDi = (s: SceltePerConsigli): Gusto[] => [...s.gruppi, ...(s.sala ? (['sala'] as const) : []), ...(s.nuotare ? (['nuotare'] as const) : [])]

/** Le scelte dopo aver toccato i gusti: i generi, la sala e il nuoto (che, tolto, dimentica anche la risposta sullo stile). */
export function conGusti(s: SceltePerConsigli, gusti: Gusto[]): Partial<SceltePerConsigli> {
  const nuotare = gusti.includes('nuotare')
  return { gruppi: gusti.filter((g): g is Gruppo => g !== 'sala' && g !== 'nuotare'), sala: gusti.includes('sala'), nuotare, saNuotare: nuotare ? s.saNuotare : null }
}

/** «Martedì 20 ottobre»: il giorno com'e' scritto, con l'iniziale maiuscola. */
export const titoloGiorno = (testo: string) => testo.charAt(0).toUpperCase() + testo.slice(1)

export const volteTesto = (n: number) => (n === 1 ? 'una volta a settimana' : n === 2 ? 'due volte a settimana' : n === 3 ? 'tre volte a settimana' : `${n} volte a settimana`)

const GIORNO_ORARIO = ['', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
/** «lun 18:30». */
export const testoOrario = (o: Pick<OrarioLezione, 'giorno' | 'ora'>) => `${GIORNO_ORARIO[o.giorno] ?? ''} ${o.ora}`.trim()

/** Gli orari di una lezione, per riga: prima quelli nelle sue preferenze. `fuori` dice se nessuno ci cade (e lui ne ha date). */
export function orariOrdinati(orari: OrarioLezione[]): { orari: OrarioLezione[]; fuori: boolean } {
  const suoi = orari.filter((o) => o.tuo === true)
  return { orari: [...suoi, ...orari.filter((o) => o.tuo !== true)], fuori: orari.length > 0 && orari.every((o) => o.tuo === false) }
}

/** I giorni di una seduta in parole: «lunedì e giovedì». */
const GIORNO_ESTESO = ['', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']
export function giorniTesto(giorni: number[]): string | null {
  const nomi = giorni.map((g) => GIORNO_ESTESO[g]).filter(Boolean)
  if (!nomi.length) return null
  return nomi.length === 1 ? nomi[0] : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`
}

/** Dove porta una seduta: a comporre il piano (in sala o in vasca) e, per prenotare il turno, al calendario sul primo giorno utile. */
export function destinazioniSeduta(s: SedutaConsigliata): { piano: { pathname: '/allenamento/agente'; params: { dove: 'sala' | 'vasca' } }; calendario: { pathname: '/calendario'; params: { giorno: string; attivita: string } } | null } {
  return {
    piano: { pathname: '/allenamento/agente', params: { dove: s.ambiente } },
    calendario: s.prossimi[0] ? { pathname: '/calendario', params: { giorno: s.prossimi[0], attivita: s.ambiente === 'sala' ? 'Gym Floor' : 'Nuoto Libero' } } : null,
  }
}

/** Le lezioni da evitare scritte dal socio: separate da virgola, punto e virgola o a capo, senza doppioni. */
export function evitateDa(testo: string): string[] {
  const visti = new Set<string>()
  for (const parte of testo.split(/[,;\n]/)) {
    const t = parte.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (t) visti.add(t)
    if (visti.size >= 10) break
  }
  return [...visti]
}

/** Cosa manca perche' il questionario si possa mandare, nell'ordine delle domande; vuoto se c'e' tutto. */
export function cosaManca(s: SceltePerConsigli): string[] {
  const manca: string[] = []
  if (!s.obiettivi.length) manca.push('un obiettivo')
  if (!s.esperienza) manca.push('la tua esperienza')
  else if (s.esperienza !== 'mai' && !s.livello) manca.push('com’è la tua forma oggi')
  if (s.nuotare && s.saNuotare === null) manca.push('se sai nuotare stile libero e dorso')
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
    evitate: evitateDa(s.evitate),
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
