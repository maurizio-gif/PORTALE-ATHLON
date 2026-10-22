import type { VoceDiario } from '@/api/alimentazione'
import type { GiornoDispositivo } from '@/api/dispositivi'

import { spostaGiorno } from '../schede/contatoreCalorie'
import { t } from '../../../lib/lingua'
import { CURVA_TRAIN, GIORNI_FOOD, giorniBuoniFood, minutiPerGiorno, nottiDa, NOTTI_RELAX, PUNTI, quotaNotte, MINUTI_GIORNO_ATTIVO, type Punteggio, type SessioneBase } from './calcoloPunteggio'

// I livelli dell'Athlon Health Score (richiesta del club, 20/10/2026): Legno, Bronzo, Argento, Oro,
// Platino, Diamante. Il punteggio (calcoloPunteggio.ts) dice come stai andando adesso; i livelli sono
// **punti che si accumulano**, settimana dopo settimana, e non tornano indietro: per questo sono
// ingaggianti, perche' ogni allenamento fa salire il contatore, anche quando il punteggio e' basso.
//
//   - **I punti di una settimana** (da lunedi' a domenica, finita) sono quelli dei tre pilastri, con le
//     stesse regole del punteggio ma su quella settimana sola: Train fino a 70 (dai giorni attivi, stessa
//     curva: 2-4 giorni e' il massimo), Food fino a 15, Relax fino a 15. Una settimana con un solo allenamento
//     fa comunque 28 punti.
//   - **Due premi** che si leggono dal registro, non si salvano: la *costanza* (+5 per ogni settimana di fila
//     nel ritmo giusto dopo la prima, al massimo +20) e l'*equilibrio* (+10 se in una settimana tutti e tre
//     i pilastri attivi sono almeno al 60%). Una settimana vale quindi al massimo 130.
//   - **Si parte raccogliendo i dati**: la prima volta l'app registra le ultime 4 settimane finite (le stesse
//     che guarda il punteggio), poi ogni apertura aggiunge quelle nuove. Il registro sta nel server
//     (portale-lab-livelli): i dati vecchi escono dalle finestre di lettura e i punti non devono sparire.
//   - **Per mantenere il livello serve l'equilibrio**: il livello si raggiunge coi punti e non si perde mai, ma e'
//     «attivo» solo finche' il punteggio di adesso e' almeno al 50% di quello possibile; sotto, e' «in pausa»
//     (si vede, e dice cosa riprendere) e torna attivo da solo. Mai una retrocessione, mai un allarme.
//
// Le soglie e i premi sono nostri e vanno fatti validare dal club. Per un socio sempre nel ritmo giusto, con il
// solo Train si arriva a Oro in circa 14 settimane, a Platino in 27, a Diamante in 47; coi tre pilastri in 10, 19 e 33.

export type IdLivello = 'legno' | 'bronzo' | 'argento' | 'oro' | 'platino' | 'diamante'
export type Livello = { id: IdLivello; nome: string; /** I punti da cui comincia. */ da: number; colori: readonly [string, string] }

export const LIVELLI: readonly Livello[] = [
  { id: 'legno', nome: t('Legno', 'Wood'), da: 0, colori: ['#B98B5E', '#8A5A36'] },
  { id: 'bronzo', nome: t('Bronzo', 'Bronze'), da: 150, colori: ['#EBAE7C', '#B0652A'] },
  { id: 'argento', nome: t('Argento', 'Silver'), da: 500, colori: ['#EEF0F5', '#9AA3B2'] },
  { id: 'oro', nome: t('Oro', 'Gold'), da: 1200, colori: ['#FFD966', '#E0A100'] },
  { id: 'platino', nome: t('Platino', 'Platinum'), da: 2400, colori: ['#DDF4FF', '#7FB8D9'] },
  { id: 'diamante', nome: t('Diamante', 'Diamond'), da: 4200, colori: ['#9EE7FF', '#7A6CFF'] },
]

/** Quante settimane finite si registrano ogni volta: le stesse che guarda il punteggio. */
export const SETTIMANE_DA_REGISTRARE = 4
/** Il punteggio di adesso, in quota del possibile, sotto cui il livello e' «in pausa». */
export const SOGLIA_MANTENIMENTO = 0.5
/** Un pilastro e' «in equilibrio» da questa quota in su. */
const QUOTA_EQUILIBRIO = 0.6
export const BONUS_COSTANZA = { passo: 5, massimo: 20 } as const
export const BONUS_EQUILIBRIO = 10

/** I punti registrati di una settimana finita, come li conserva il server. */
export type SettimanaPunti = { settimana: string; train: number; food: number; relax: number; giorni_attivi: number; minuti: number }

/** Il lunedi' della settimana del giorno. */
export function lunediDi(giorno: string): string {
  const dow = new Date(`${giorno}T12:00:00Z`).getUTCDay()
  return spostaGiorno(giorno, -((dow + 6) % 7))
}

const nei7 = (lunedi: string) => new Set(Array.from({ length: 7 }, (_, i) => spostaGiorno(lunedi, i)))

/**
 * I punti che le tre fonti danno a una settimana da lunedi' a domenica. Food e Relax sono `null` dove non c'e' il consenso (e
 * allora valgono zero): non servono per Train, che dipende solo dall'allenamento.
 */
export function puntiSettimana(
  lunedi: string,
  sessioni: SessioneBase[],
  food: { diario: VoceDiario[]; senzaColazione: boolean } | null,
  giorni: GiornoDispositivo[] | null,
): SettimanaPunti {
  const w = nei7(lunedi)
  const minutiPer = minutiPerGiorno(sessioni.filter((s) => w.has(s.giorno)))
  const attivi = [...minutiPer].filter(([, m]) => m >= MINUTI_GIORNO_ATTIVO).length
  const minuti = Math.round([...minutiPer.values()].reduce((s, m) => s + m, 0))
  const train = Math.round(CURVA_TRAIN[Math.min(7, attivi)] * PUNTI.train)
  const buoni = food ? giorniBuoniFood(food.diario, food.senzaColazione).filter((g) => w.has(g)).length : 0
  const notti = giorni ? [...nottiDa(giorni)].filter(([g]) => w.has(g)) : []
  const sonno = notti.reduce((s, [, m]) => s + quotaNotte(m), 0)
  return {
    settimana: lunedi,
    train,
    food: Math.round(Math.min(1, buoni / GIORNI_FOOD) * PUNTI.food),
    relax: Math.round(Math.min(1, sonno / NOTTI_RELAX) * PUNTI.relax),
    giorni_attivi: Math.min(7, attivi),
    minuti: Math.min(5000, minuti),
  }
}

/** Le ultime `quante` settimane **finite** (da lunedi' a domenica) a oggi, dalla piu' vecchia: i lunedi'. */
export function lunediFiniti(oggi: string, quante: number = SETTIMANE_DA_REGISTRARE): string[] {
  const questa = lunediDi(oggi)
  return Array.from({ length: quante }, (_, i) => spostaGiorno(questa, -7 * (quante - i)))
}

/**
 * Le settimane da mandare al server: quelle in cui i punti calcolati sono di piu' di quelli gia' registrati (o che non
 * ci sono). Il server non li fa mai scendere, ma qui si evita di scrivere quello che c'e' gia'.
 */
export function daRegistrare(calcolate: SettimanaPunti[], registrate: SettimanaPunti[]): SettimanaPunti[] {
  const per = new Map(registrate.map((r) => [r.settimana, r]))
  return calcolate.filter((c) => {
    const r = per.get(c.settimana)
    if (!r) return c.train + c.food + c.relax > 0
    return c.train > r.train || c.food > r.food || c.relax > r.relax || c.giorni_attivi > r.giorni_attivi || c.minuti > r.minuti
  })
}

// ---------------------------------------------------------------------------
// Dai punti delle settimane al livello

export type SettimanaConti = SettimanaPunti & {
  /** Train + Food + Relax. */
  base: number
  costanza: number
  equilibrio: number
  /** Quello che la settimana ha dato in tutto. */
  totale: number
  nelRitmo: boolean
}

/**
 * Conta le settimane registrate, dalla piu' vecchia, e aggiunge i due premi. La costanza guarda le settimane **di fila**
 * (lunedi' consecutivi): una settimana mancante nel registro interrompe la serie.
 */
export function contaSettimane(registrate: SettimanaPunti[], attivi: { food: boolean; relax: boolean } = { food: true, relax: true }): SettimanaConti[] {
  const ordinate = [...registrate].sort((a, b) => a.settimana.localeCompare(b.settimana))
  let serie = 0
  let ultimaNelRitmo: string | null = null
  return ordinate.map((r) => {
    const nelRitmo = r.train >= PUNTI.train
    if (nelRitmo) {
      serie = ultimaNelRitmo !== null && spostaGiorno(ultimaNelRitmo, 7) === r.settimana ? serie + 1 : 1
      ultimaNelRitmo = r.settimana
    } else {
      serie = 0
      ultimaNelRitmo = null
    }
    const costanza = serie > 1 ? Math.min(BONUS_COSTANZA.massimo, BONUS_COSTANZA.passo * (serie - 1)) : 0
    // L'equilibrio: tutti i pilastri che la persona usa, almeno al 60%; ne servono almeno due.
    const quote = [r.train / PUNTI.train, ...(attivi.food ? [r.food / PUNTI.food] : []), ...(attivi.relax ? [r.relax / PUNTI.relax] : [])]
    const equilibrio = quote.length >= 2 && quote.every((q) => q >= QUOTA_EQUILIBRIO) ? BONUS_EQUILIBRIO : 0
    const base = r.train + r.food + r.relax
    return { ...r, base, costanza, equilibrio, totale: base + costanza + equilibrio, nelRitmo }
  })
}

export type StatoLivelli = {
  punti: number
  livello: Livello
  indice: number
  prossimo: Livello | null
  /** I punti che mancano al prossimo livello; null all'ultimo. */
  mancano: number | null
  /** Quanto del tratto fra questo livello e il prossimo e' fatto, 0..1 (1 all'ultimo). */
  quota: number
  /** Il livello e' «attivo» (l'equilibrio c'e') o «in pausa». null: non si sa ancora. */
  attivo: boolean | null
  /** Le settimane, dalla piu' recente. */
  settimane: SettimanaConti[]
  /** I punti della settimana in corso, provvisori: contano quando la settimana finisce. */
  provvisori: number
  /** Nessuna settimana registrata: si sta ancora raccogliendo i dati. */
  alPrimoGiro: boolean
}

export function livelloDi(punti: number): { livello: Livello; indice: number; prossimo: Livello | null } {
  let indice = 0
  LIVELLI.forEach((l, i) => {
    if (punti >= l.da) indice = i
  })
  return { livello: LIVELLI[indice], indice, prossimo: LIVELLI[indice + 1] ?? null }
}

/**
 * Lo stato dei livelli. `punteggio`: quello di adesso, per sapere se l'equilibrio c'e' (si guarda la quota del possibile).
 * `provvisori`: i punti della settimana in corso (puntiSettimana di questa settimana).
 */
export function statoLivelli(registrate: SettimanaPunti[], punteggio: Punteggio | null, provvisori: SettimanaPunti | null): StatoLivelli {
  const attivi = { food: punteggio ? punteggio.food.stato === 'attivo' : true, relax: punteggio ? punteggio.relax.stato === 'attivo' : true }
  const settimane = contaSettimane(registrate, attivi)
  const punti = settimane.reduce((s, w) => s + w.totale, 0)
  const { livello, indice, prossimo } = livelloDi(punti)
  const mancano = prossimo ? prossimo.da - punti : null
  const quota = prossimo ? (punti - livello.da) / (prossimo.da - livello.da) : 1
  return {
    punti,
    livello,
    indice,
    prossimo,
    mancano,
    quota: Math.max(0, Math.min(1, quota)),
    attivo: punteggio ? punteggio.totale / punteggio.su >= SOGLIA_MANTENIMENTO : null,
    settimane: [...settimane].reverse(),
    provvisori: provvisori ? provvisori.train + provvisori.food + provvisori.relax : 0,
    alPrimoGiro: registrate.length === 0,
  }
}
