import { spostaGiorno, type Voce } from '../schede/contatoreCalorie'
import { CURVA_TRAIN, MINUTI_GIORNO_ATTIVO, minutiPerGiorno, PESI, type Sessione } from './calcoloPunteggio'

// L'analisi del Train in profondita' (richiesta del club, 20/10/2026): sotto il punteggio, **com'e' fatto**
// l'allenamento delle ultime quattro settimane: quanti giorni e quante volte, di che tipo (sala o lezioni, e quali),
// quando (che giorno della settimana, che parte della giornata), la sala (serie e chili), quanto si riposa e, se ci sono
// peso, altezza, eta' e sesso, quante calorie ha consumato. Pura funzione delle stesse sessioni del punteggio
// (calcoloPunteggio.ts) e delle voci del contatore delle calorie: niente rete, niente salvataggio.
// **Descrive, non giudica**: nessuna frase dice cosa fare; la sola soglia e' quella del punteggio (2-4 giorni su 7 e' il
// ritmo da punti pieni), e chi si allena di meno o di piu' lo vede com'e', senza un «dovresti».
//
// Le quattro settimane sono le stesse del punteggio (blocchi mobili di 7 giorni che finiscono oggi) e **quelle prima
// della prima attivita' registrata non contano** (chi comincia adesso non ha «quattro settimane»).

export type SettimanaAnalisi = {
  da: string
  a: string
  giorniAttivi: number
  sessioni: number
  minuti: number
  sala: number
  lezioni: number
  /** Le calorie consumate in quella settimana dall'attivita' contata; null senza i dati del corpo. */
  kcal: number | null
  nelRitmo: boolean
  conta: boolean
}

export type Conteggio = { nome: string; volte: number; minuti: number }

export type SalaAnalisi = {
  sedute: number
  serie: number
  /** I chili sollevati in tutto (serie x ripetizioni x kg). */
  volume: number
  esercizi: number
  /** I chili sollevati nell'ultima settimana e la media delle tre prima (solo dove ci sono sedute); per il confronto. */
  volumeUltima: number
  volumeMediaPrecedenti: number | null
}

export type CalorieAnalisi = {
  totali: number
  perSeduta: number | null
  perTipo: { tipo: string; kcal: number; volte: number }[]
}

export type AnalisiTraining = {
  /** Le quattro settimane, dalla piu' recente. */
  settimane: SettimanaAnalisi[]
  totali: { sessioni: number; giorniAttivi: number; minuti: number; sala: number; lezioni: number }
  medie: {
    /** Dei giorni attivi a settimana e dei minuti: sulle settimane che contano. */
    giorniAttivi: number
    sessioni: number
    minuti: number
    /** Dei minuti per sessione. */
    durataSessione: number
  }
  ritmo: { settimaneNelRitmo: number; settimaneContate: number; /** Settimane di fila nel ritmo, dalla piu' recente. */ serie: number }
  /** Quante sessioni per giorno della settimana, da lunedi' (0) a domenica (6). */
  perGiornoSettimana: number[]
  /** Quante sessioni per parte della giornata. */
  fasce: { id: 'mattina' | 'pranzo' | 'pomeriggio' | 'sera'; nome: string; volte: number }[]
  /** Le lezioni per categoria, dalla piu' frequente. */
  categorie: Conteggio[]
  /** Le lezioni per nome, dalla piu' frequente. */
  lezioni: Conteggio[]
  sala: SalaAnalisi | null
  riposo: {
    giorniDiRiposo: number
    /** Il piu' lungo tratto di giorni di fila senza allenarsi, nei 28 giorni. */
    intervalloMassimo: number
    /** Da quanti giorni non ci si allena (0 = oggi); null se non c'e' niente. */
    daQuando: number | null
  }
  calorie: CalorieAnalisi | null
  /** Frasi che raccontano com'e' andata, senza consigli. */
  frasi: string[]
  haDati: boolean
}

export const NOMI_GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'] as const
export const SIGLE_GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'] as const
const FASCE: { id: 'mattina' | 'pranzo' | 'pomeriggio' | 'sera'; nome: string; da: number; fino: number }[] = [
  { id: 'mattina', nome: 'Mattina', da: 5, fino: 12 },
  { id: 'pranzo', nome: 'Pranzo', da: 12, fino: 15 },
  { id: 'pomeriggio', nome: 'Pomeriggio', da: 15, fino: 19 },
  { id: 'sera', nome: 'Sera', da: 19, fino: 29 }, // fino alle 5 del mattino dopo
]

const oraRoma = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' })
/** L'ora (0-23) a Roma di un istante ISO. */
export const oraDi = (iso: string): number => Number(oraRoma.format(new Date(iso)))

/** Lunedi' = 0 … domenica = 6, dal giorno AAAA-MM-GG. */
export const giornoDellaSettimana = (giorno: string): number => (new Date(`${giorno}T12:00:00Z`).getUTCDay() + 6) % 7

const somma = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const media = (xs: number[]) => (xs.length ? somma(xs) / xs.length : 0)
const uno = (n: number) => Math.round(n * 10) / 10
const decimale = (n: number) => uno(n).toLocaleString('it-IT', { maximumFractionDigits: 1 })
const volte = (n: number) => (n === 1 ? 'una volta' : `${n} volte`)
const giorniParola = (n: number) => (n === 1 ? '1 giorno' : `${n} giorni`)

function perNome(sessioni: Sessione[], chiave: (s: Sessione) => string): Conteggio[] {
  const m = new Map<string, Conteggio>()
  for (const s of sessioni) {
    const k = chiave(s)
    const c = m.get(k) ?? { nome: k, volte: 0, minuti: 0 }
    c.volte++
    c.minuti += s.minuti
    m.set(k, c)
  }
  return [...m.values()].map((c) => ({ ...c, minuti: Math.round(c.minuti) })).sort((a, b) => b.volte - a.volte || b.minuti - a.minuti || a.nome.localeCompare(b.nome, 'it'))
}

export function analizzaTraining(sessioni: Sessione[], oggi: string, attivita: Voce[] | null): AnalisiTraining {
  const minutiPer = minutiPerGiorno(sessioni)
  const attivi = [...minutiPer].filter(([, m]) => m >= MINUTI_GIORNO_ATTIVO).map(([g]) => g).sort()
  const primo = attivi[0] ?? null
  const dal = spostaGiorno(oggi, -27)
  const ultime28 = sessioni.filter((s) => s.giorno >= dal && s.giorno <= oggi)

  const settimane: SettimanaAnalisi[] = Array.from({ length: PESI.length }, (_, k) => {
    const a = spostaGiorno(oggi, -7 * k)
    const da = spostaGiorno(a, -6)
    const dellaSettimana = sessioni.filter((s) => s.giorno >= da && s.giorno <= a)
    const giorniAttivi = attivi.filter((g) => g >= da && g <= a).length
    return {
      da,
      a,
      giorniAttivi,
      sessioni: dellaSettimana.length,
      minuti: Math.round(somma(dellaSettimana.map((s) => s.minuti))),
      sala: dellaSettimana.filter((s) => s.fonte === 'scheda').length,
      lezioni: dellaSettimana.filter((s) => s.fonte === 'lezione').length,
      kcal: attivita ? Math.round(somma(attivita.filter((v) => v.giorno >= da && v.giorno <= a).map((v) => v.kcal))) : null,
      nelRitmo: CURVA_TRAIN[Math.min(7, giorniAttivi)] >= 1,
      conta: primo !== null && a >= primo,
    }
  })
  const contate = settimane.filter((s) => s.conta)

  // Le settimane di fila nel ritmo, dalla piu' recente (la in corso conta se gia' ci e'; se no si guarda da quella prima).
  let serie = 0
  for (const s of settimane) {
    if (!s.conta || !s.nelRitmo) break
    serie++
  }

  const perGiornoSettimana = Array.from({ length: 7 }, () => 0)
  for (const s of ultime28) perGiornoSettimana[giornoDellaSettimana(s.giorno)]++
  const fasce = FASCE.map((f) => ({ id: f.id, nome: f.nome, volte: 0 }))
  for (const s of ultime28) {
    const h = oraDi(s.inizio)
    const i = FASCE.findIndex((f) => (h >= f.da && h < f.fino) || (f.id === 'sera' && h < 5))
    if (i >= 0) fasce[i].volte++
  }

  const lezioni = ultime28.filter((s) => s.fonte === 'lezione')
  const sedute = ultime28.filter((s) => s.fonte === 'scheda')
  const categorie = perNome(lezioni, (s) => s.categoria ?? 'Lezioni di gruppo')
  const perNomeLezione = perNome(lezioni, (s) => s.nome)

  let sala: SalaAnalisi | null = null
  if (sedute.length) {
    const volumeDi = (da: string, a: string) => somma(sedute.filter((s) => s.giorno >= da && s.giorno <= a).map((s) => s.volume))
    const precedenti = settimane.slice(1).filter((s) => s.sala > 0)
    sala = {
      sedute: sedute.length,
      serie: somma(sedute.map((s) => s.serie)),
      volume: Math.round(somma(sedute.map((s) => s.volume))),
      esercizi: somma(sedute.map((s) => s.esercizi)),
      volumeUltima: Math.round(volumeDi(settimane[0].da, settimane[0].a)),
      volumeMediaPrecedenti: precedenti.length ? Math.round(media(precedenti.map((s) => volumeDi(s.da, s.a)))) : null,
    }
  }

  // Il riposo: i giorni senza allenamento e il tratto piu' lungo di fila.
  const giorniAttivi28 = new Set(attivi.filter((g) => g >= dal && g <= oggi))
  let intervalloMassimo = 0
  let tratto = 0
  for (let i = 0; i < 28; i++) {
    if (giorniAttivi28.has(spostaGiorno(dal, i))) tratto = 0
    else intervalloMassimo = Math.max(intervalloMassimo, ++tratto)
  }
  const ultimoAttivo = attivi.filter((g) => g <= oggi).at(-1) ?? null
  const daQuando = ultimoAttivo ? Math.round((new Date(`${oggi}T12:00:00Z`).getTime() - new Date(`${ultimoAttivo}T12:00:00Z`).getTime()) / 86_400_000) : null

  let calorie: CalorieAnalisi | null = null
  if (attivita) {
    const voci = attivita.filter((v) => v.giorno >= dal && v.giorno <= oggi)
    const tipi = new Map<string, { tipo: string; kcal: number; volte: number }>()
    for (const v of voci) {
      const t = tipi.get(v.tipo) ?? { tipo: v.tipo, kcal: 0, volte: 0 }
      t.kcal += v.kcal
      t.volte++
      tipi.set(v.tipo, t)
    }
    calorie = {
      totali: Math.round(somma(voci.map((v) => v.kcal))),
      perSeduta: voci.length ? Math.round(somma(voci.map((v) => v.kcal)) / voci.length) : null,
      perTipo: [...tipi.values()].map((t) => ({ ...t, kcal: Math.round(t.kcal) })).sort((a, b) => b.kcal - a.kcal),
    }
  }

  const giorniAttiviTot = giorniAttivi28.size
  const medie = {
    giorniAttivi: uno(media(contate.map((s) => s.giorniAttivi))),
    sessioni: uno(media(contate.map((s) => s.sessioni))),
    minuti: Math.round(media(contate.map((s) => s.minuti))),
    durataSessione: ultime28.length ? Math.round(somma(ultime28.map((s) => s.minuti)) / ultime28.length) : 0,
  }
  const ritmo = { settimaneNelRitmo: contate.filter((s) => s.nelRitmo).length, settimaneContate: contate.length, serie }
  const totali = {
    sessioni: ultime28.length,
    giorniAttivi: giorniAttiviTot,
    minuti: Math.round(somma(ultime28.map((s) => s.minuti))),
    sala: sedute.length,
    lezioni: lezioni.length,
  }

  return {
    settimane,
    totali,
    medie,
    ritmo,
    perGiornoSettimana,
    fasce,
    categorie,
    lezioni: perNomeLezione,
    sala,
    riposo: { giorniDiRiposo: 28 - giorniAttiviTot, intervalloMassimo, daQuando },
    calorie,
    frasi: frasi({ totali, medie, ritmo, perGiornoSettimana, fasce, categorie, lezioni: perNomeLezione, sala, intervalloMassimo, daQuando, calorie, nSettimane: contate.length }),
    haDati: ultime28.length > 0,
  }
}

// ---------------------------------------------------------------------------
// Le frasi: com'e' andata, in parole, senza dire cosa fare

function frasi(a: {
  totali: AnalisiTraining['totali']
  medie: AnalisiTraining['medie']
  ritmo: AnalisiTraining['ritmo']
  perGiornoSettimana: number[]
  fasce: AnalisiTraining['fasce']
  categorie: Conteggio[]
  lezioni: Conteggio[]
  sala: SalaAnalisi | null
  intervalloMassimo: number
  daQuando: number | null
  calorie: CalorieAnalisi | null
  nSettimane: number
}): string[] {
  const r: string[] = []
  if (!a.totali.sessioni) return r

  r.push(`Negli ultimi 28 giorni ti sei allenato in ${giorniParola(a.totali.giorniAttivi)}, per ${a.totali.sessioni === 1 ? 'una sessione' : `${a.totali.sessioni} sessioni`} e circa ${Math.round(a.totali.minuti / 60)} ${Math.round(a.totali.minuti / 60) === 1 ? 'ora' : 'ore'} in tutto.`)

  if (a.nSettimane >= 2) {
    r.push(`In media sono ${decimale(a.medie.giorniAttivi)} giorni a settimana${a.medie.giorniAttivi >= 2 && a.medie.giorniAttivi <= 4 ? ': il ritmo da punti pieni è fra 2 e 4' : ''}.`)
    if (a.ritmo.serie >= 2) r.push(`Sono ${a.ritmo.serie} settimane di fila nel ritmo giusto.`)
    else if (a.ritmo.settimaneNelRitmo > 0) r.push(`${a.ritmo.settimaneNelRitmo === 1 ? 'Una settimana' : `${a.ritmo.settimaneNelRitmo} settimane`} su ${a.ritmo.settimaneContate} nel ritmo giusto (2–4 giorni).`)
  }

  if (a.totali.sala > 0 && a.totali.lezioni > 0) {
    r.push(`Alterni la sala (${volte(a.totali.sala)}) e le lezioni di gruppo (${volte(a.totali.lezioni)}).`)
  } else if (a.totali.sala > 0) {
    r.push(`Ti alleni in sala: ${volte(a.totali.sala)} nelle ultime quattro settimane.`)
  } else if (a.totali.lezioni > 0) {
    r.push(`Ti alleni con le lezioni di gruppo: ${volte(a.totali.lezioni)} nelle ultime quattro settimane.`)
  }
  if (a.lezioni.length) r.push(`La lezione che fai più spesso è ${a.lezioni[0].nome} (${volte(a.lezioni[0].volte)}).`)

  if (a.totali.sessioni >= 4) {
    const max = Math.max(...a.perGiornoSettimana)
    const giorni = a.perGiornoSettimana.map((n, i) => (n === max ? NOMI_GIORNI[i] : null)).filter(Boolean) as string[]
    if (giorni.length === 1) r.push(`Il giorno in cui ti alleni di più è il ${giorni[0]} (${volte(max)}).`)
    const fascia = [...a.fasce].sort((x, y) => y.volte - x.volte)[0]
    if (fascia.volte > 0 && fascia.volte / a.totali.sessioni >= 0.5) r.push(`Ti alleni soprattutto ${fascia.id === 'mattina' ? 'al mattino' : fascia.id === 'pranzo' ? 'all’ora di pranzo' : fascia.id === 'pomeriggio' ? 'nel pomeriggio' : 'la sera'}.`)
  }

  if (a.sala && a.sala.volume > 0) {
    r.push(`In sala hai fatto ${a.sala.serie.toLocaleString('it-IT')} serie e sollevato circa ${a.sala.volume.toLocaleString('it-IT')} kg in tutto.`)
    if (a.sala.volumeMediaPrecedenti && a.sala.volumeUltima > 0) {
      const d = Math.round(((a.sala.volumeUltima - a.sala.volumeMediaPrecedenti) / a.sala.volumeMediaPrecedenti) * 100)
      if (Math.abs(d) >= 5) r.push(`Negli ultimi 7 giorni hai sollevato il ${Math.abs(d)}% ${d > 0 ? 'in più' : 'in meno'} della media delle tre settimane prima.`)
    }
  }

  if (a.intervalloMassimo >= 4) r.push(`Il tuo tratto più lungo senza allenarti è stato di ${giorniParola(a.intervalloMassimo)}.`)
  if (a.daQuando !== null) r.push(a.daQuando === 0 ? 'Ti sei allenato oggi.' : a.daQuando === 1 ? 'L’ultimo allenamento è stato ieri.' : `L’ultimo allenamento è stato ${a.daQuando} giorni fa.`)

  if (a.calorie && a.calorie.totali > 0) {
    r.push(`Dall’allenamento hai consumato circa ${a.calorie.totali.toLocaleString('it-IT')} kcal nelle quattro settimane${a.calorie.perSeduta ? ', circa ' + a.calorie.perSeduta.toLocaleString('it-IT') + ' a sessione' : ''}.`)
  }
  return r
}
