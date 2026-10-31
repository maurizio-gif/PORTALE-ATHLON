import type { TipoAbitudine } from '@/api/dispositivi'
import { locale, t } from '@/lib/lingua'

import { durata } from '../dispositivi/comune'
import type { NomeIcona } from '../ui/Icona'
import { CATALOGO, oraDaCoricamento } from './catalogoAbitudini'

// I testi delle abitudini (31/10/2026): nomi, frasi, unita' e icone. Le regole e i numeri stanno in `catalogoAbitudini.ts` (puro).
// **Si descrive, non si giudica**: «Cammina almeno 6.000 passi» e' quello che la persona ha scelto, non un'istruzione di allenamento. Nei testi
// «piegamenti», mai «flessioni» (il nome in codice e la chiave restano `flessioni`).

export const ICONE_ABITUDINI: Record<TipoAbitudine, NomeIcona> = {
  passi: 'passi',
  movimento: 'cronometro',
  sonno: 'luna',
  coricamento: 'luna',
  in_piedi: 'persona',
  mindfulness: 'foglia',
  luce: 'sole',
  plank: 'cronometro',
  squat: 'peso',
  flessioni: 'peso',
}

/** Il nome corto, per l'elenco in cui si sceglie. */
export function nomeAbitudine(tipo: TipoAbitudine): string {
  switch (tipo) {
    case 'passi': return t('Camminare', 'Walking')
    case 'movimento': return t('Muoversi', 'Moving')
    case 'sonno': return t('Dormire', 'Sleeping')
    case 'coricamento': return t('Andare a letto in orario', 'Going to bed on time')
    case 'in_piedi': return t('Ore in piedi', 'Hours standing')
    case 'mindfulness': return t('Mindfulness', 'Mindfulness')
    case 'luce': return t('Luce del giorno', 'Daylight')
    case 'plank': return t('Plank', 'Plank')
    case 'squat': return t('Squat', 'Squats')
    case 'flessioni': return t('Piegamenti', 'Push-ups')
  }
}

/** Una riga che dice cosa e' e da dove arriva, per chi sceglie. */
export function descrizioneAbitudine(tipo: TipoAbitudine): string {
  switch (tipo) {
    case 'passi': return t('Si spunta da sola con i passi del telefono.', 'It ticks itself off with your phone’s steps.')
    case 'movimento': return t('Si spunta da sola con gli allenamenti e i minuti di esercizio.', 'It ticks itself off with your workouts and exercise minutes.')
    case 'sonno': return t('Si spunta da sola con il sonno (o la notte che scrivi tu).', 'It ticks itself off with your sleep (or a night you write yourself).')
    case 'coricamento': return t('L’ora in cui ti metti a dormire, dal telefono o dalla notte che scrivi tu.', 'The time you go to sleep, from your phone or a night you write yourself.')
    case 'in_piedi': return t('Le ore in cui ti alzi in piedi: arrivano da Apple Watch e iPhone, non da Health Connect.', 'The hours you stand up: they come from Apple Watch and iPhone, not from Health Connect.')
    case 'mindfulness': return t('I minuti di meditazione o respiro che l’app Salute registra.', 'The minutes of meditation or breathing your Health app records.')
    case 'luce': return t('I minuti alla luce del giorno: li misura Apple Watch (iOS 17), non Health Connect.', 'Minutes in daylight: measured by Apple Watch (iOS 17), not by Health Connect.')
    case 'plank': return t('Lo fai col cronometro: parte da qui, con il video che mostra come si fa.', 'You time it here, with a video showing how it’s done.')
    case 'squat': return t('Lo conti qui, con il video che mostra come si fa.', 'You count them here, with a video showing how it’s done.')
    case 'flessioni': return t('Li conti qui, con il video che mostra come si fanno.', 'You count them here, with a video showing how it’s done.')
  }
}

/** Dove si misura: per dire a chi ha un Android che due non arrivano dal telefono. */
export const soloApple = (tipo: TipoAbitudine): boolean => tipo === 'in_piedi' || tipo === 'luce'

/** «6.000 passi», «20 min», «23:30», «45 s», «30 squat». */
export function formatoValore(tipo: TipoAbitudine, v: number): string {
  switch (tipo) {
    case 'passi': return t(`${v.toLocaleString(locale())} passi`, `${v.toLocaleString(locale())} steps`)
    case 'coricamento': return oraDaCoricamento(v)
    case 'in_piedi': return t(v === 1 ? '1 ora' : `${v} ore`, v === 1 ? '1 hour' : `${v} hours`)
    case 'plank': return v >= 120 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : `${v} s`
    case 'squat': return t(`${v} squat`, `${v} squats`)
    case 'flessioni': return t(`${v} piegamenti`, `${v} push-ups`)
    default: return durata(v)
  }
}

/** La frase dell'abitudine con la sua soglia: «Cammina almeno 6.000 passi». */
export function titoloAbitudine(tipo: TipoAbitudine, soglia: number): string {
  const v = formatoValore(tipo, soglia)
  switch (tipo) {
    case 'passi': return t(`Cammina almeno ${v}`, `Walk at least ${v}`)
    case 'movimento': return t(`Muoviti almeno ${v}`, `Move for at least ${v}`)
    case 'sonno': return t(`Dormi almeno ${v}`, `Sleep at least ${v}`)
    case 'coricamento': return t(`Vai a letto entro le ${v}`, `Go to bed by ${v}`)
    case 'in_piedi': return t(`Stai in piedi almeno ${v}`, `Stand for at least ${v}`)
    case 'mindfulness': return t(`Medita almeno ${v}`, `Meditate for at least ${v}`)
    case 'luce': return t(`Stai alla luce del giorno almeno ${v}`, `Spend at least ${v} in daylight`)
    case 'plank': return t(`Plank da almeno ${v}`, `Plank for at least ${v}`)
    case 'squat': return t(`Almeno ${v}`, `At least ${v}`)
    case 'flessioni': return t(`Almeno ${v}`, `At least ${v}`)
  }
}

/** Quanto si muove la soglia a ogni tocco: lo stesso del catalogo, qui per comodita' delle schermate. */
export const passoAbitudine = (tipo: TipoAbitudine) => CATALOGO[tipo].passo

/** Per un'abitudine che parte da una soglia: che verbo usare per i giorni («notti» per sonno e coricamento). */
export const giorniOnotti = (tipo: TipoAbitudine, n: number): string =>
  tipo === 'sonno' || tipo === 'coricamento' ? t(n === 1 ? '1 notte' : `${n} notti`, n === 1 ? '1 night' : `${n} nights`) : t(n === 1 ? '1 giorno' : `${n} giorni`, n === 1 ? '1 day' : `${n} days`)
