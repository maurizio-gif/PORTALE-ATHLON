import type { SceltaAbitudine, TipoAbitudine } from '@/api/dispositivi'

// Il catalogo delle abitudini che si possono seguire (31/10/2026, richiesta di Maurizio: abitudini personalizzabili e sfida di 30 giorni).
// **Puro, senza testi**: soglie, limiti e regole. I testi (nomi, frasi, unita') stanno nelle schermate. **I limiti hanno una copia sul
// server** (`_shared/dispositivi/abitudini.ts` di APP-ATHLON): si cambiano insieme, e `scripts/prova-abitudini.ts` le confronta se i due
// repository stanno affiancati. Un valore fuori dai limiti il server lo rifiuta: qui servono a non offrirlo.
//
// Le soglie di partenza sono nostre (6.000 passi, 20 minuti, 7 ore, 8 ore in piedi, 30 minuti di luce...) e vanno fatte validare dal
// Direttore Tecnico; i 20 minuti e le 7 ore sono quelle del punteggio, per non dire due cose diverse sulla stessa persona.

export type Pilastro = 'train' | 'recover'

export type VoceCatalogo = {
  min: number
  max: number
  /** Di quanto si muove la soglia a ogni tocco di «+» e «−». */
  passo: number
  /** Si puo' trasformare in una sfida a obiettivo crescente. */
  sfida: boolean
  /** Si scrive a mano (cronometro o contatore): non arriva dal telefono. */
  manuale: boolean
  /** Meglio sotto la soglia che sopra: l'orario in cui ci si corica deve essere non oltre il limite. */
  inverso: boolean
  pilastro: Pilastro
  /** La soglia e i giorni a settimana con cui un'abitudine nasce. */
  predefinita: { soglia: number; giorni: number }
  /** I valori di una sfida si arrotondano a questo (per i passi: 4.137 sarebbe strano), minimo 1. */
  arrotonda: number
}

export const CATALOGO: Record<TipoAbitudine, VoceCatalogo> = {
  passi: { min: 1000, max: 30000, passo: 500, sfida: true, manuale: false, inverso: false, pilastro: 'train', predefinita: { soglia: 6000, giorni: 5 }, arrotonda: 50 },
  movimento: { min: 5, max: 240, passo: 5, sfida: true, manuale: false, inverso: false, pilastro: 'train', predefinita: { soglia: 20, giorni: 3 }, arrotonda: 1 },
  sonno: { min: 240, max: 600, passo: 15, sfida: false, manuale: false, inverso: false, pilastro: 'recover', predefinita: { soglia: 420, giorni: 5 }, arrotonda: 1 },
  // La soglia e' l'ultimo orario ammesso, in minuti dopo le 18:00 (180 = 21:00, 330 = 23:30, 480 = 02:00).
  coricamento: { min: 180, max: 480, passo: 15, sfida: false, manuale: false, inverso: true, pilastro: 'recover', predefinita: { soglia: 330, giorni: 5 }, arrotonda: 1 },
  in_piedi: { min: 1, max: 16, passo: 1, sfida: true, manuale: false, inverso: false, pilastro: 'train', predefinita: { soglia: 8, giorni: 5 }, arrotonda: 1 },
  mindfulness: { min: 1, max: 120, passo: 1, sfida: true, manuale: false, inverso: false, pilastro: 'recover', predefinita: { soglia: 5, giorni: 3 }, arrotonda: 1 },
  luce: { min: 5, max: 240, passo: 5, sfida: true, manuale: false, inverso: false, pilastro: 'recover', predefinita: { soglia: 30, giorni: 5 }, arrotonda: 5 },
  // Plank in secondi, squat e flessioni in ripetizioni.
  plank: { min: 5, max: 600, passo: 5, sfida: true, manuale: true, inverso: false, pilastro: 'train', predefinita: { soglia: 60, giorni: 3 }, arrotonda: 5 },
  squat: { min: 1, max: 200, passo: 5, sfida: true, manuale: true, inverso: false, pilastro: 'train', predefinita: { soglia: 30, giorni: 3 }, arrotonda: 1 },
  flessioni: { min: 1, max: 200, passo: 5, sfida: true, manuale: true, inverso: false, pilastro: 'train', predefinita: { soglia: 15, giorni: 3 }, arrotonda: 1 },
  // Bicchieri d'acqua: un contatore, niente sfida (bere di piu' ogni giorno non e' un obiettivo che si fa crescere) e niente numero «giusto»: 6 e' un punto di
  // partenza che la persona cambia (non c'e' un nutrizionista nel club: nessun «devi bere N litri»). Minuti di mobilita': si scrivono qui, o li somma una sessione guidata.
  acqua: { min: 1, max: 20, passo: 1, sfida: false, manuale: true, inverso: false, pilastro: 'recover', predefinita: { soglia: 6, giorni: 5 }, arrotonda: 1 },
  mobilita: { min: 1, max: 120, passo: 5, sfida: true, manuale: true, inverso: false, pilastro: 'recover', predefinita: { soglia: 10, giorni: 3 }, arrotonda: 1 },
}

export const TIPI = Object.keys(CATALOGO) as TipoAbitudine[]
/** Le tre con cui si parte, senza aver scelto niente (come nella prima versione): camminare, muoversi, dormire. */
export const DI_PARTENZA: readonly TipoAbitudine[] = ['passi', 'movimento', 'sonno']
export const ABITUDINI_MASSIME = 5
export const SFIDA_GIORNI = 30
export const SFIDA_GIORNI_MIN = 7
export const SFIDA_GIORNI_MAX = 90

export const eTipoAbitudine = (x: unknown): x is TipoAbitudine => typeof x === 'string' && (TIPI as string[]).includes(x)

/** Le abitudini di partenza, non salvate: soglia e ritmo di sempre. */
export const sceltePredefinite = (): SceltaAbitudine[] => DI_PARTENZA.map((tipo) => ({ tipo, soglia: CATALOGO[tipo].predefinita.soglia, giorni: CATALOGO[tipo].predefinita.giorni, sfida: null }))

/** Una soglia dentro i limiti del tipo. */
export const dentroILimiti = (tipo: TipoAbitudine, v: number): number => Math.min(CATALOGO[tipo].max, Math.max(CATALOGO[tipo].min, Math.round(v)))

const GIORNO_MS = 86_400_000
const giorniFra = (da: string, a: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${da}T12:00:00Z`)) / GIORNO_MS)

/** Il valore da cui parte il tipo con l'arrotondamento che gli spetta (50 passi, 5 minuti di luce...). */
const arrotondato = (tipo: TipoAbitudine, v: number): number => {
  const a = CATALOGO[tipo].arrotonda
  return dentroILimiti(tipo, a > 1 ? Math.round(v / a) * a : v)
}

/**
 * La soglia di un giorno. Senza sfida e' sempre quella scelta; con la sfida sale in linea retta da `da` (il primo giorno) ad `a` (l'ultimo,
 * il giorno `giorni`) e poi resta ad `a`. I giorni prima dell'inizio valgono `da`: la storia non si riscrive con un obiettivo che non c'era.
 */
export function sogliaDelGiorno(s: Pick<SceltaAbitudine, 'tipo' | 'soglia' | 'sfida'>, giorno: string): number {
  const f = s.sfida
  if (!f) return s.soglia
  const i = Math.min(Math.max(giorniFra(f.inizio, giorno), 0), f.giorni - 1)
  const v = f.giorni <= 1 ? f.a : f.da + ((f.a - f.da) * i) / (f.giorni - 1)
  return arrotondato(s.tipo, v)
}

export type StatoSfida = {
  /** Il giorno della sfida in cui siamo, da 1 a `giorni` (dopo la fine resta `giorni`). */
  giorno: number
  giorni: number
  /** Gli stessi tre numeri della scelta. */
  da: number
  a: number
  /** L'ultimo giorno e' passato: l'obiettivo e' quello finale e la sfida e' conclusa. */
  finita: boolean
  /** Ancora non cominciata (l'inizio e' domani o dopo): non succede salvando dall'app, ma e' un caso che un orologio storto puo' creare. */
  nonIniziata: boolean
}

export function statoSfida(s: Pick<SceltaAbitudine, 'sfida'>, oggi: string): StatoSfida | null {
  const f = s.sfida
  if (!f) return null
  const trascorsi = giorniFra(f.inizio, oggi)
  return { giorno: Math.min(Math.max(trascorsi + 1, 1), f.giorni), giorni: f.giorni, da: f.da, a: f.a, finita: trascorsi >= f.giorni, nonIniziata: trascorsi < 0 }
}

/**
 * Da dove parte una sfida e dove arriva, suggeriti dai valori recenti della persona (i giorni che hanno un valore, dal piu' recente).
 * **Si parte un po' sotto quello che gia' fa** (nove decimi della mediana: il primo giorno si deve poter fare) e si arriva a un
 * obiettivo che e' una crescita, non un salto (una volta e mezza, almeno un passo in piu'). Senza storia si parte da meta' della soglia
 * di partenza e si arriva a quella. Sempre dentro i limiti del tipo e con `a > da`; `null` se il tipo non ha la sfida o non c'e' spazio per salire.
 * **Sono suggerimenti: la persona li cambia.**
 */
export function puntoDiPartenza(tipo: TipoAbitudine, valoriRecenti: number[]): { da: number; a: number; giorni: number } | null {
  const v = CATALOGO[tipo]
  if (!v.sfida) return null
  const noti = valoriRecenti.filter((x) => Number.isFinite(x) && x > 0).slice(0, 14).sort((x, y) => x - y)
  let da: number
  let a: number
  if (noti.length >= 3) {
    const mediana = noti.length % 2 ? noti[(noti.length - 1) / 2] : (noti[noti.length / 2 - 1] + noti[noti.length / 2]) / 2
    da = arrotondato(tipo, mediana * 0.9)
    a = arrotondato(tipo, mediana * 1.5)
  } else {
    da = arrotondato(tipo, v.predefinita.soglia * 0.5)
    a = arrotondato(tipo, v.predefinita.soglia)
  }
  // Dentro i limiti e con spazio per salire.
  if (a <= da) a = dentroILimiti(tipo, da + Math.max(v.passo, v.arrotonda))
  if (a <= da) {
    da = dentroILimiti(tipo, a - Math.max(v.passo, v.arrotonda))
    if (a <= da) return null
  }
  return { da, a, giorni: SFIDA_GIORNI }
}

/** Una sfida da salvare, con i numeri controllati: stesso criterio del server. `null` se non regge. */
export function sfidaValida(tipo: TipoAbitudine, f: { giorni: number; da: number; a: number }): boolean {
  const v = CATALOGO[tipo]
  const ok = (x: number, min: number, max: number) => Number.isInteger(x) && x >= min && x <= max
  return v.sfida && ok(f.giorni, SFIDA_GIORNI_MIN, SFIDA_GIORNI_MAX) && ok(f.da, v.min, v.max) && ok(f.a, v.min, v.max) && f.a > f.da
}

/** Minuti dopo le 18:00 -> «HH:MM» (330 -> «23:30», 435 -> «01:15»). */
export function oraDaCoricamento(min: number): string {
  const tot = (1080 + Math.round(min)) % 1440
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

/** «HH:MM» -> minuti dopo le 18:00; le ore prima di mezzogiorno sono quelle dopo la mezzanotte (01:15 -> 435). Null fuori dalla fascia 18:00-12:00. */
export function coricamentoDaOra(ora: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(ora)
  if (!m) return null
  const tot = Number(m[1]) * 60 + Number(m[2])
  if (Number(m[1]) > 23 || Number(m[2]) > 59) return null
  const dopo = tot < 12 * 60 ? tot + 1440 : tot
  const v = dopo - 1080
  return v >= 0 && v <= 1080 ? v : null
}
