import type { AllenamentoDispositivo } from '@/api/dispositivi'
import { t } from '../../../lib/lingua'

import { kcal, metabolismoBasale, type Sesso } from '../schede/stimaCalorie'

// Gli allenamenti che non nascono nell'app (28/10/2026): quelli letti dai dispositivi (Apple Salute fa da hub: Oura, Apple Watch,
// Garmin, Fitbit…, e Oura/Polar collegati) e quelli che il socio scrive a mano (una pedalata di tre ore all'aperto).
// Contano nel punteggio (i giorni attivi) e nelle calorie, con una regola sola per non contare due volte la stessa ora:
// se l'allenamento si sovrappone a una seduta o a una lezione gia' contata, vale quella dell'app.
//
// **Calorie, in ordine di fiducia**: (1) quelle misurate dal dispositivo (la fonte le da' al netto del riposo, come le
// «calorie attive»); (2) dal battito medio, se c'e' e si conoscono peso, eta' e sesso (formula di Keytel 2005);
// (3) un valore standard per sport e intensita' (MET del Compendium of Physical Activities, ricordati e non riletti
// alla fonte: da far validare dal Direttore Tecnico). La schermata dice quale dei tre e'.

export type MetodoStima = 'misurato' | 'battito' | 'stimato'
export type CorpoStima = { kg: number; cm: number; anni: number; sesso: NonNullable<Sesso> }

type Intensita = 'leggera' | 'media' | 'intensa'
type Sport = { nome: () => string; met: Record<Intensita, number> }

const SPORT: Record<string, Sport> = {
  bici: { nome: () => t('Bicicletta', 'Cycling'), met: { leggera: 4, media: 8, intensa: 12 } },
  corsa: { nome: () => t('Corsa', 'Running'), met: { leggera: 7, media: 9.8, intensa: 12.5 } },
  camminata: { nome: () => t('Camminata', 'Walking'), met: { leggera: 2.8, media: 3.8, intensa: 5 } },
  escursione: { nome: () => t('Escursione', 'Hiking'), met: { leggera: 4.5, media: 6, intensa: 7.8 } },
  nuoto: { nome: () => t('Nuoto', 'Swimming'), met: { leggera: 5.8, media: 7, intensa: 9.8 } },
  canottaggio: { nome: () => t('Canottaggio', 'Rowing'), met: { leggera: 4.8, media: 7, intensa: 8.5 } },
  yoga: { nome: () => 'Yoga', met: { leggera: 2.3, media: 3, intensa: 4 } },
  danza: { nome: () => t('Danza', 'Dance'), met: { leggera: 3.5, media: 5, intensa: 7 } },
  sci: { nome: () => t('Sci', 'Skiing'), met: { leggera: 4.3, media: 6.8, intensa: 8 } },
  forza: { nome: () => t('Allenamento di forza', 'Strength training'), met: { leggera: 3.5, media: 5, intensa: 6 } },
  hiit: { nome: () => 'HIIT', met: { leggera: 6, media: 8, intensa: 10 } },
  altro: { nome: () => t('Allenamento', 'Workout'), met: { leggera: 3.5, media: 5, intensa: 7 } },
}

// I codici di HealthKit (HKWorkoutActivityType) e i nomi che usano Oura e Polar, ridotti agli sport sopra.
const DA_CODICE: Record<string, keyof typeof SPORT> = {
  '13': 'bici', '37': 'corsa', '52': 'camminata', '24': 'escursione', '46': 'nuoto', '35': 'canottaggio', '57': 'yoga', '14': 'danza',
  '50': 'forza', '20': 'forza', '63': 'hiit', '60': 'altro',
}
const DA_NOME: [RegExp, keyof typeof SPORT][] = [
  [/cycl|bik|ciclis/, 'bici'], [/run|jog|corsa/, 'corsa'], [/walk|camm/, 'camminata'], [/hik|trek|escurs/, 'escursione'],
  [/swim|nuot/, 'nuoto'], [/row|canott/, 'canottaggio'], [/yoga|pilates/, 'yoga'], [/danc|danz/, 'danza'], [/ski|sci\b/, 'sci'],
  [/strength|weight|forza|gym/, 'forza'], [/hiit|interval|crossfit/, 'hiit'],
]

/** Lo sport di un allenamento come lo scrive la fonte (un numero di HealthKit, un nome, o uno dei nostri). */
export function sportDi(sport: string | null | undefined): keyof typeof SPORT {
  const s = (sport ?? '').toLowerCase().trim()
  if (s in SPORT) return s as keyof typeof SPORT
  if (DA_CODICE[s]) return DA_CODICE[s]
  return DA_NOME.find(([r]) => r.test(s))?.[1] ?? 'altro'
}

export const nomeSport = (sport: string | null | undefined): string => SPORT[sportDi(sport)].nome()

/** L'intensita' di un allenamento che non la dice: dal battito medio (rispetto ai 220 - eta' della formula classica), se no «media». */
export function intensitaDa(a: { intensita?: Intensita | null; fc_media?: number | null }, anni?: number | null): Intensita {
  if (a.intensita) return a.intensita
  if (a.fc_media && anni) {
    const q = a.fc_media / (220 - anni)
    return q < 0.6 ? 'leggera' : q < 0.78 ? 'media' : 'intensa'
  }
  return 'media'
}

/** Le calorie dell'allenamento e da dove vengono. Mai sotto zero e mai oltre 30 al minuto (come il controllo della funzione). */
export function stimaAllenamento(
  a: { sport: string | null; durata_minuti: number; calorie: number | null; fc_media: number | null; intensita?: Intensita | null },
  corpo: CorpoStima | null,
): { kcal: number; metodo: MetodoStima } | null {
  const tetto = a.durata_minuti * 30
  if (a.calorie != null && a.calorie > 0 && a.calorie <= tetto) return { kcal: Math.round(a.calorie), metodo: 'misurato' }
  if (!corpo) return null
  if (a.fc_media && a.fc_media >= 60 && a.fc_media <= 210) {
    // Keytel et al. 2005: kJ al minuto -> kcal. Vale per un battito da sforzo: sotto i 90 non e' affidabile, e allora si passa al valore standard.
    const kJ = corpo.sesso === 'f'
      ? -20.4022 + 0.4472 * a.fc_media - 0.1263 * corpo.kg + 0.074 * corpo.anni
      : -55.0969 + 0.6309 * a.fc_media + 0.1988 * corpo.kg + 0.2017 * corpo.anni
    const v = (kJ / 4.184) * a.durata_minuti
    if (a.fc_media >= 90 && v > 0 && v <= tetto) return { kcal: Math.round(v), metodo: 'battito' }
  }
  const met = SPORT[sportDi(a.sport)].met[intensitaDa(a, corpo.anni)]
  // Come per le lezioni: solo il di piu' sul riposo non si aggiunge, il contatore conta le calorie «del movimento» col MET intero.
  return { kcal: Math.round(kcal(metabolismoBasale(corpo), met, a.durata_minuti)), metodo: 'stimato' }
}

/** Quanti dei minuti del piu' breve dei due cadono nell'altro (0-1): sopra la meta' e' lo stesso allenamento. */
export function sovrapposizione(a: { inizio: string; minuti: number }, b: { inizio: string; minuti: number }): number {
  const ai = new Date(a.inizio).getTime()
  const bi = new Date(b.inizio).getTime()
  const comune = Math.min(ai + a.minuti * 60000, bi + b.minuti * 60000) - Math.max(ai, bi)
  const breve = Math.min(a.minuti, b.minuti) * 60000
  return breve > 0 && comune > 0 ? comune / breve : 0
}

/**
 * Gli allenamenti dei dispositivi e quelli scritti a mano che si contano: fra 5 minuti e 12 ore, e non gia' coperti da una
 * seduta o da una lezione (`gia`). Fra di loro, due che si sovrappongono sono lo stesso allenamento letto da due strade
 * (l'orologio e l'anello): si tiene quello con piu' dati (calorie misurate, poi battito).
 */
export function allenamentiContati(tutti: AllenamentoDispositivo[], gia: { inizio: string; minuti: number }[]): AllenamentoDispositivo[] {
  const buoni = tutti
    .filter((a) => a.durata_minuti >= 5 && a.durata_minuti <= 720)
    .map((a) => ({ a, m: { inizio: a.inizio, minuti: a.durata_minuti }, punti: (a.calorie ? 2 : 0) + (a.fc_media ? 1 : 0) + (a.fornitore === 'manuale' ? 0 : 0.5) }))
    .sort((x, y) => y.punti - x.punti)
  const presi: typeof buoni = []
  for (const x of buoni) {
    if (gia.some((g) => sovrapposizione(x.m, g) > 0.5)) continue
    if (presi.some((p) => sovrapposizione(x.m, p.m) > 0.5)) continue
    presi.push(x)
  }
  return presi.map((x) => x.a).sort((a, b) => a.inizio.localeCompare(b.inizio))
}
