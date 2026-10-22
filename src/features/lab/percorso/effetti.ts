import type { SchedaLezione } from '@/api/lab'
import type { Barre, GiornoSettimana, Obiettivo, Tappa } from '@/api/percorso'
import { locale, t as tr } from '@/lib/lingua'

import { MUSCOLI } from '../schede/comune'
import { giornoRoma, lunediDi, spostaGiorno, type Voce } from '../schede/contatoreCalorie'
import { kcal, metabolismoBasale, MET_INTENSO, MET_MEDIO, MET_MODERATO, type Sesso } from '../schede/stimaCalorie'
import { metDi, riconosci, stimaLezione } from '../schede/stimaCorso'
import { GIORNI } from './comune'

// Gli effetti di un Percorso Athlon (20/10/2026): **cosa fa la settimana**, non solo quante calorie costa.
// Funzione pura: dalle tappe (la bozza che si sta modificando o il percorso salvato) e dalle schede delle
// lezioni, senza leggere niente dalla rete, cosi' il pannello si ricalcola mentre il socio cambia una tappa.
//
// **Il modello non scrive mai un numero**: tutto quello che il pannello dice e' calcolato qui, da dati che il
// club ha scritto (le barre di ogni lezione, i muscoli di ogni esercizio, il MET di `stimaCorso.ts`).
//
// **Regole di onesta'**, che valgono per ogni riga:
//   - **la sala non entra nel radar delle lezioni**: non ha barre di intensita' e non se ne inventano. Le sue
//     misure sono quelle degli esercizi dei piani (i muscoli) e dei minuti;
//   - **le lezioni non entrano nella mappa dei muscoli**: le loro barre dicono quanto e' intensa una lezione,
//     non quali muscoli lavora;
//   - **dove manca una barra, il dato non c'e'** (null) e il pannello dice «dato non disponibile»: mai zero.
//     Nuoto Libero, Scuola Nuoto e la flessibilita' delle lezioni in acqua non hanno barre sul sito. Il radar
//     dice sempre su che quota dei minuti e' calcolato;
//   - **riferimenti, non traguardi**: i minuti a intensita' moderata e intensa e i giorni di rinforzo
//     muscolare si confrontano con le indicazioni dell'OMS (150-300 minuti moderati o 75-150 intensi, e due
//     giorni di rinforzo: OMS 2020) come Food fa coi LARN. Sono numeri ricordati, non riletti alla fonte;
//   - **nessun chilo, nessuna promessa estetica**: dire che una settimana «copre» un obiettivo vuol dire che ha
//     gli ingredienti che le linee guida indicano per quel tipo di lavoro, non che il risultato arriva.
//
// **Cosa e' una stima**: le calorie (la stessa formula delle schede e del calendario: BMR / 1440 × MET ×
// minuti), il MET di ogni lezione (`stimaCorso.ts`: il tipo da' una forbice, le barre la scorrono), e il
// **cardio**, che qui si conta come attivita' moderata (MET di mezzo) perche' la tappa non dice se e' una
// camminata o una corsa. La sala vale MET_MEDIO come nella stima della scheda.

export type Corpo = { kg: number; cm: number; anni: number; sesso: NonNullable<Sesso> }

export type IdAsse = 'muscolare' | 'cardio' | 'coordinazione' | 'flessibilita'
export const ASSI: { id: IdAsse; etichetta: string }[] = [
  { id: 'muscolare', etichetta: tr('Muscolare', 'Strength') },
  { id: 'cardio', etichetta: 'Cardio' },
  { id: 'coordinazione', etichetta: tr('Coordinazione', 'Coordination') },
  { id: 'flessibilita', etichetta: tr('Flessibilità', 'Flexibility') },
]

/** La barra di un asse e quanti minuti di lezione la hanno: il resto e' «dato non disponibile». */
export type Asse = { id: IdAsse; etichetta: string; valore: number | null; minutiConDato: number }

export type Muscolo = { chiave: string; etichetta: string; sedute: number; esercizi: number }

export type Riga = { ok: boolean | null; testo: string; dettaglio?: string }

export type Effetti = {
  minuti: { totale: number; sala: number; lezioni: number; cardio: number }
  /** Tappe per tipo, per dire «3 lezioni, 2 volte in sala». */
  tappe: { totale: number; sala: number; lezioni: number; cardio: number }
  giorni: {
    attivi: number
    riposo: number
    perGiorno: { giorno: GiornoSettimana; minuti: number; sala: number; lezioni: number; cardio: number }[]
    piuLungo: number
    /** Il numero massimo di giorni di allenamento di fila: la settimana si ripete, quindi la domenica tocca il lunedi'. */
    difila: number
  }
  lezioni: {
    minuti: number
    assi: Asse[]
    /** Quota dei minuti di lezione con almeno una barra, da 0 a 1; null se non ci sono lezioni. */
    copertura: number | null
    /** Nomi di lezione senza nessuna barra sul sito. */
    senzaDati: string[]
    /** Quante lezioni hanno molta flessibilita' (barra da 50 in su: soglia nostra, non del club). */
    flessibili: number
  }
  sala: {
    sedute: number
    minuti: number
    /** Almeno una tappa di sala porta i muscoli dei suoi esercizi. */
    conDati: boolean
    muscoli: Muscolo[]
    /** Gruppi principali che in sala non si lavorano mai in questa settimana. */
    scoperti: string[]
    /** Un gruppo lavorato forte in due giorni di fila. */
    ravvicinati: { chiave: string; etichetta: string; giorni: [GiornoSettimana, GiornoSettimana] }[]
  }
  riferimenti: {
    moderati: number
    intensi: number
    /** Moderati piu' il doppio degli intensi: cosi' l'OMS li somma. */
    equivalenti: number
    /** Minuti di lezione di cui non si sa l'intensita' (non riconosciute), e di intensita' leggera. */
    nonClassificati: number
    leggeri: number
    giorniAerobici: number
    giorniRinforzo: number
    cardioContatoModerato: boolean
  }
  obiettivo: { obiettivo: Obiettivo; righe: Riga[] }
  /** Null senza i quattro dati del corpo. */
  calorie: { da: number; a: number; circa: number; parziale: boolean } | null
}

// ---------------------------------------------------------------------------
// Dalle schede del sito

const semplice = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Le quattro barre di una scheda del sito per nome della barra; null dove manca (stessa lettura del server). */
export function barreDiScheda(scheda: Pick<SchedaLezione, 'caratteristiche'> | null | undefined): Barre {
  const valore = (re: RegExp) => {
    const k = (scheda?.caratteristiche ?? []).find((x) => re.test(semplice(String(x.l ?? ''))))
    return k && Number.isFinite(Number(k.v)) ? Math.max(0, Math.min(100, Number(k.v))) : null
  }
  return { muscolare: valore(/muscol/), cardio: valore(/cardio/), coordinazione: valore(/coordin/), flessibilita: valore(/flessib/) }
}

// ---------------------------------------------------------------------------
// Una tappa, valutata

type Classe = 'leggera' | 'moderata' | 'intensa'

type Valutata = {
  t: Tappa
  minuti: number
  classe: Classe | null
  rinforzo: boolean
  barre: Barre | null
  stima: { da: number; a: number; circa: number } | null
}

const arrotonda = (n: number, a = 5) => Math.round(n / a) * a
const classeDi = (met: number): Classe => (met >= MET_INTENSO ? 'intensa' : met >= 3 ? 'moderata' : 'leggera')

function valuta(t: Tappa, schede: Record<string, Pick<SchedaLezione, 'caratteristiche' | 'descrizione'>>, corpo: Corpo | null): Valutata {
  const minuti = Math.max(0, t.minuti)
  if (t.tipo === 'lezione' && t.lezione) {
    const scheda = t.lezione.scheda ? (schede[t.lezione.scheda] ?? null) : null
    const r = riconosci({ nome: t.lezione.nome, categoria: t.lezione.categoria }, scheda)
    const s = corpo ? stimaLezione({ nome: t.lezione.nome, categoria: t.lezione.categoria, minuti }, scheda, corpo) : null
    return {
      t,
      minuti,
      classe: r ? classeDi(metDi(r)) : null,
      rinforzo: r?.tipo.id === 'forza',
      barre: barreDiScheda(scheda),
      stima: s ? { da: s.kcal.da, a: s.kcal.a, circa: s.kcal.circa } : null,
    }
  }
  // Sala e cardio: la forbice delle schede (MET moderato e intenso) e il MET di mezzo.
  const bmr = corpo ? metabolismoBasale(corpo) : null
  return {
    t,
    minuti,
    classe: 'moderata',
    rinforzo: t.tipo === 'sala',
    barre: null,
    stima: bmr === null ? null : { da: arrotonda(kcal(bmr, MET_MODERATO, minuti)), a: arrotonda(kcal(bmr, MET_INTENSO, minuti)), circa: arrotonda(kcal(bmr, MET_MEDIO, minuti)) },
  }
}

// ---------------------------------------------------------------------------
// I muscoli della sala

/** Le chiavi della libreria vecchia (free-exercise-db) che sono lo stesso gruppo di una nuova. */
const STESSO_GRUPPO: Record<string, string> = { schiena_centrale: 'schiena', dorsali: 'schiena', addominali: 'core' }
const chiaveMuscolo = (m: string) => STESSO_GRUPPO[m] ?? m

/** I gruppi con cui si dice cosa «resta scoperto» in sala: i grandi, non i piccoli (avambracci, collo, tibiale…). */
export const GRUPPI_PRINCIPALI = ['pettorali', 'schiena', 'spalle', 'bicipiti', 'tricipiti', 'core', 'glutei', 'quadricipiti', 'femorali'] as const

/** Sotto questa quantita' di esercizi primari in un giorno, un gruppo non e' «lavorato forte»: e' di passaggio. */
const ESERCIZI_PER_LAVORARLO = 2

const etichettaMuscolo = (k: string) => MUSCOLI[k] ?? k.charAt(0).toUpperCase() + k.slice(1)

function muscoliDellaSala(sala: Valutata[]) {
  const per = new Map<string, { sedute: number; esercizi: number; giorni: Set<GiornoSettimana> }>()
  let conDati = false
  for (const v of sala) {
    const primari = v.t.sala?.muscoli_primari
    if (!primari || !Object.keys(primari).length) continue
    conDati = true
    // Due chiavi dello stesso gruppo nello stesso giorno si sommano prima di decidere se e' lavorato forte.
    const delGiorno = new Map<string, number>()
    for (const [m, n] of Object.entries(primari)) delGiorno.set(chiaveMuscolo(m), (delGiorno.get(chiaveMuscolo(m)) ?? 0) + n)
    for (const [k, n] of delGiorno) {
      if (n < 1) continue
      const x = per.get(k) ?? { sedute: 0, esercizi: 0, giorni: new Set<GiornoSettimana>() }
      x.sedute++
      x.esercizi += n
      if (n >= ESERCIZI_PER_LAVORARLO) x.giorni.add(v.t.giorno)
      per.set(k, x)
    }
  }
  const muscoli: Muscolo[] = [...per.entries()]
    .map(([chiave, x]) => ({ chiave, etichetta: etichettaMuscolo(chiave), sedute: x.sedute, esercizi: x.esercizi }))
    .sort((a, b) => b.esercizi - a.esercizi || a.etichetta.localeCompare(b.etichetta, locale()))
  const scoperti = conDati ? GRUPPI_PRINCIPALI.filter((g) => !per.has(g)).map(etichettaMuscolo) : []
  // La settimana si ripete: la domenica e il lunedi' sono giorni di fila.
  const ravvicinati: Effetti['sala']['ravvicinati'] = []
  for (const [chiave, x] of per) {
    const giorni = [...x.giorni].sort((a, b) => a - b)
    const coppia = giorni.flatMap((g) => giorni.filter((h) => (h % 7) + 1 === g).map((h): [GiornoSettimana, GiornoSettimana] => [h, g]))[0]
    if (coppia) ravvicinati.push({ chiave, etichetta: etichettaMuscolo(chiave), giorni: coppia })
  }
  return { conDati, muscoli, scoperti, ravvicinati }
}

/** Quanti giorni di fila, nel giro di sette (la settimana si ripete). */
function giorniDiFila(attivi: Set<GiornoSettimana>): number {
  if (attivi.size === 0) return 0
  if (attivi.size === 7) return 7
  let massimo = 0
  for (const g of GIORNI) {
    // Si parte solo da un giorno attivo preceduto da uno di riposo: l'inizio di una serie.
    if (!attivi.has(g) || attivi.has((((g + 5) % 7) + 1) as GiornoSettimana)) continue
    let n = 0
    let x = g
    while (attivi.has(x as GiornoSettimana)) {
      n++
      x = (x % 7) + 1
    }
    massimo = Math.max(massimo, n)
  }
  return massimo
}

// ---------------------------------------------------------------------------
// Il conto

export function calcolaEffetti(
  tappe: Tappa[],
  schede: Record<string, Pick<SchedaLezione, 'caratteristiche' | 'descrizione'>>,
  opz: { obiettivo: Obiettivo; corpo?: Corpo | null },
): Effetti {
  const corpo = opz.corpo ?? null
  const vs = tappe.map((t) => valuta(t, schede, corpo))
  const di = (tipo: Tappa['tipo']) => vs.filter((v) => v.t.tipo === tipo)
  const somma = (xs: Valutata[]) => xs.reduce((s, v) => s + v.minuti, 0)
  const sala = di('sala')
  const lezioni = di('lezione')
  const cardio = di('cardio')

  // I giorni.
  const attiviSet = new Set<GiornoSettimana>(vs.map((v) => v.t.giorno))
  const perGiorno = GIORNI.map((giorno) => {
    const del = vs.filter((v) => v.t.giorno === giorno)
    const m = (xs: Valutata[]) => somma(xs.filter((v) => v.t.giorno === giorno))
    return { giorno, minuti: somma(del), sala: m(sala), lezioni: m(lezioni), cardio: m(cardio) }
  })

  // Le lezioni: media delle barre pesata sui minuti, solo dove la barra c'e'.
  const minutiLezioni = somma(lezioni)
  const assi: Asse[] = ASSI.map(({ id, etichetta }) => {
    let peso = 0
    let totale = 0
    for (const v of lezioni) {
      const b = v.barre?.[id]
      if (b == null || v.minuti <= 0) continue
      peso += v.minuti
      totale += b * v.minuti
    }
    return { id, etichetta, valore: peso > 0 ? Math.round(totale / peso) : null, minutiConDato: peso }
  })
  const conAlmenoUnaBarra = lezioni.filter((v) => v.barre && ASSI.some((a) => v.barre![a.id] != null))
  const senzaDati = [...new Set(lezioni.filter((v) => !conAlmenoUnaBarra.includes(v)).map((v) => v.t.lezione?.nome ?? tr('Lezione', 'Class')))]

  // Riferimenti OMS.
  let moderati = 0
  let intensi = 0
  let leggeri = 0
  let nonClassificati = 0
  const aerobici = new Set<GiornoSettimana>()
  const rinforzo = new Set<GiornoSettimana>()
  for (const v of vs) {
    if (v.classe === null) nonClassificati += v.minuti
    else if (v.classe === 'leggera') leggeri += v.minuti
    else {
      // La sala si conta come rinforzo muscolare, non come attivita' aerobica: i pesi non sono «cardio».
      if (v.t.tipo !== 'sala') {
        if (v.classe === 'moderata') moderati += v.minuti
        else intensi += v.minuti
        if (v.minuti >= 10) aerobici.add(v.t.giorno)
      }
    }
    if (v.rinforzo && v.classe !== 'leggera') rinforzo.add(v.t.giorno)
  }
  const equivalenti = moderati + 2 * intensi

  const ms = muscoliDellaSala(sala)

  // Calorie: se una lezione non si stima il totale e' parziale, e lo si dice.
  const stimate = vs.filter((v) => v.stima)
  const calorie =
    corpo && stimate.length
      ? {
          da: arrotonda(stimate.reduce((s, v) => s + v.stima!.da, 0), 10),
          a: arrotonda(stimate.reduce((s, v) => s + v.stima!.a, 0), 10),
          circa: arrotonda(stimate.reduce((s, v) => s + v.stima!.circa, 0), 10),
          parziale: stimate.length < vs.length,
        }
      : null

  const base: Omit<Effetti, 'obiettivo'> = {
    minuti: { totale: somma(vs), sala: somma(sala), lezioni: minutiLezioni, cardio: somma(cardio) },
    tappe: { totale: vs.length, sala: sala.length, lezioni: lezioni.length, cardio: cardio.length },
    giorni: { attivi: attiviSet.size, riposo: 7 - attiviSet.size, perGiorno, piuLungo: Math.max(0, ...perGiorno.map((g) => g.minuti)), difila: giorniDiFila(attiviSet) },
    lezioni: {
      minuti: minutiLezioni,
      assi,
      copertura: minutiLezioni > 0 ? Math.min(1, lezioni.filter((v) => conAlmenoUnaBarra.includes(v)).reduce((s, v) => s + v.minuti, 0) / minutiLezioni) : null,
      senzaDati,
      flessibili: lezioni.filter((v) => (v.barre?.flessibilita ?? -1) >= FLESSIBILITA_ALTA).length,
    },
    sala: { sedute: sala.length, minuti: somma(sala), conDati: ms.conDati, muscoli: ms.muscoli, scoperti: ms.scoperti, ravvicinati: ms.ravvicinati },
    riferimenti: { moderati, intensi, equivalenti, nonClassificati, leggeri, giorniAerobici: aerobici.size, giorniRinforzo: rinforzo.size, cardioContatoModerato: cardio.length > 0 },
    calorie,
  }
  return { ...base, obiettivo: { obiettivo: opz.obiettivo, righe: righeObiettivo(opz.obiettivo, base) } }
}

// ---------------------------------------------------------------------------
// Cosa copre l'obiettivo: regole fisse, scritte qui, che dicono se la settimana ha gli ingredienti che le linee
// guida indicano per quel genere di lavoro. Non e' una promessa di risultato.

/** Una lezione ha «molta flessibilita'» da questa barra in su: soglia nostra, non del club. */
const FLESSIBILITA_ALTA = 50

const OMS_MINUTI = 150

const giorniN = (n: number) => tr(`${n} ${n === 1 ? 'giorno' : 'giorni'}`, `${n} ${n === 1 ? 'day' : 'days'}`)

function righeObiettivo(o: Obiettivo, e: Omit<Effetti, 'obiettivo'>): Riga[] {
  const r = e.riferimenti
  const aerobica: Riga = {
    ok: r.equivalenti >= OMS_MINUTI,
    testo: tr('Attività aerobica: almeno 150 minuti a intensità moderata (o la metà, se intensa)', 'Aerobic activity: at least 150 minutes at moderate intensity (or half that, if vigorous)'),
    dettaglio: tr(
      `${r.equivalenti} minuti equivalenti${r.nonClassificati ? `, senza contare ${r.nonClassificati} di lezioni di cui non conosciamo l’intensità` : ''}`,
      `${r.equivalenti} equivalent minutes${r.nonClassificati ? `, not counting ${r.nonClassificati} of classes whose intensity we don’t know` : ''}`,
    ),
  }
  const distribuita: Riga = { ok: r.giorniAerobici >= 3, testo: tr('Attività aerobica distribuita su almeno tre giorni', 'Aerobic activity spread over at least three days'), dettaglio: giorniN(r.giorniAerobici) }
  const rinforzo: Riga = {
    ok: r.giorniRinforzo >= 2,
    testo: tr('Rinforzo muscolare in almeno due giorni', 'Muscle strengthening on at least two days'),
    dettaglio: giorniN(r.giorniRinforzo),
  }
  const riposo: Riga = { ok: e.giorni.riposo >= 1, testo: tr('Almeno un giorno di riposo', 'At least one rest day'), dettaglio: giorniN(e.giorni.riposo) }
  const recupero: Riga | null = e.sala.conDati
    ? {
        ok: e.sala.ravvicinati.length === 0,
        testo: tr('Lo stesso gruppo muscolare non viene lavorato forte in due giorni di fila', 'No muscle group is worked hard two days in a row'),
        dettaglio: e.sala.ravvicinati.length ? e.sala.ravvicinati.map((x) => x.etichetta).join(', ') : undefined,
      }
    : null
  const duePerGruppo: Riga | null = e.sala.conDati
    ? {
        ok: e.sala.muscoli.length > 0 && GRUPPI_PRINCIPALI.every((g) => (e.sala.muscoli.find((m) => m.chiave === g)?.sedute ?? 0) >= 2),
        testo: tr('Ogni gruppo principale lavorato in sala almeno due volte', 'Every major muscle group worked on the gym floor at least twice'),
        dettaglio: e.sala.scoperti.length ? tr(`Non lavori in sala: ${e.sala.scoperti.join(', ').toLowerCase()}`, `Not worked on the gym floor: ${e.sala.scoperti.join(', ').toLowerCase()}`) : undefined,
      }
    : null
  const tuttiAlmenoUna: Riga | null = e.sala.conDati
    ? { ok: e.sala.scoperti.length === 0, testo: tr('Tutti i gruppi principali lavorati in sala almeno una volta', 'All major muscle groups worked on the gym floor at least once'), dettaglio: e.sala.scoperti.length ? tr(`Non lavori in sala: ${e.sala.scoperti.join(', ').toLowerCase()}`, `Not worked on the gym floor: ${e.sala.scoperti.join(', ').toLowerCase()}`) : undefined }
    : null
  const sedute = (n: number): Riga => ({ ok: e.sala.sedute >= n, testo: tr(`Almeno ${n === 2 ? 'due' : 'tre'} sedute in sala`, `At least ${n === 2 ? 'two' : 'three'} gym floor sessions`), dettaglio: `${e.sala.sedute}` })
  const flessibili = (): Riga => {
    // Dove la barra manca (le lezioni in acqua, il nuoto) non si puo' dire: ok e' null, non falso.
    const asse = e.lezioni.assi.find((a) => a.id === 'flessibilita')!
    const testo = tr('Almeno due lezioni con molta flessibilità', 'At least two classes with lots of flexibility')
    if (asse.minutiConDato === 0) return { ok: null, testo, dettaglio: tr('dato non disponibile: le lezioni scelte non hanno la barra della flessibilità', 'data not available: the chosen classes have no flexibility bar') }
    return { ok: e.lezioni.flessibili >= 2, testo, dettaglio: `${e.lezioni.flessibili}` }
  }

  const poiTolgoNull = (x: (Riga | null)[]) => x.filter((v): v is Riga => v !== null)
  switch (o) {
    case 'Dimagrimento':
      return poiTolgoNull([aerobica, distribuita, rinforzo, riposo])
    case 'Ipertrofia':
      return poiTolgoNull([sedute(3), duePerGruppo, recupero, riposo])
    case 'Forza':
      return poiTolgoNull([sedute(2), duePerGruppo, recupero, riposo])
    case 'Tonificazione':
      return poiTolgoNull([rinforzo, tuttiAlmenoUna, aerobica, riposo])
    case 'Resistenza':
      return poiTolgoNull([aerobica, distribuita, rinforzo, riposo])
    case 'Mobilità':
      return poiTolgoNull([flessibili(), riposo])
    case 'Benessere generale':
      return poiTolgoNull([aerobica, rinforzo, riposo])
  }
}

// ---------------------------------------------------------------------------
// Il confronto con le ultime quattro settimane

export type Ultime = { minuti: number; kcal: number; attivita: number }

/**
 * Cosa ha fatto in media, a settimana, nelle quattro settimane intere prima di questa: solo quello che si
 * sa (le sedute chiuse nell'app e le lezioni con la presenza segnata dalla reception, come il contatore).
 * Null finche' le attivita' non sono arrivate.
 */
export function ultimeQuattroSettimane(attivita: Voce[] | null, adesso: Date = new Date()): Ultime | null {
  if (!attivita) return null
  const lunedi = lunediDi(giornoRoma(adesso))
  const da = spostaGiorno(lunedi, -28)
  const fino = spostaGiorno(lunedi, -1)
  const dentro = attivita.filter((v) => v.giorno >= da && v.giorno <= fino)
  return { minuti: Math.round(dentro.reduce((s, v) => s + v.minuti, 0) / 4), kcal: Math.round(dentro.reduce((s, v) => s + v.kcal, 0) / 4), attivita: Math.round((dentro.length / 4) * 10) / 10 }
}

export type Verso = 'piu' | 'pari' | 'meno'

/** Piu', uguale o meno, con un margine del 15%: sotto quello le due cifre sono «pari» (le stime sbagliano di piu'). */
export function verso(ora: number, prima: number, margine = 0.15): Verso {
  if (prima <= 0) return ora > 0 ? 'piu' : 'pari'
  const d = (ora - prima) / prima
  return d > margine ? 'piu' : d < -margine ? 'meno' : 'pari'
}
