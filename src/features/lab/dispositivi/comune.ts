import type { AllenamentoDispositivo, GiornoDispositivo, IdFornitore, ScalaRecupero } from '@/api/dispositivi'

// Quello che le schermate dei dispositivi (Dispositivi.tsx, fit/Relax.tsx) hanno in
// comune: i fornitori, il recupero in parole nostre, gli sport in italiano, i giorni.
// Niente qui parla con la rete.

export const FORNITORI: Record<IdFornitore, { nome: string; cosa: string; testo: string }> = {
  oura: { nome: 'Oura', cosa: 'Anello', testo: 'Sonno, recupero, battito e variabilità dalla notte, passi e allenamenti.' },
  polar: { nome: 'Polar', cosa: 'Orologi e fasce', testo: 'Sonno, recupero notturno, battito e variabilità, e gli allenamenti con il battito.' },
}

export type Recupero = {
  /** In parole morbide, nostre: il fornitore ha le sue («Optimal», «Pay attention»). */
  parole: 'Ottimo' | 'Buono' | 'Discreto' | 'Da ricaricare'
  /** 0-1, per un anello o una barra. */
  quota: number
  /** Il numero del fornitore, com'e': «88 su 100», «4 su 6». */
  valore: string
}

/**
 * Il recupero del dispositivo in parole. Le soglie sono nostre (le due scale non si somigliano):
 * Oura «prontezza» 0-100 da 85 in su e' ottimo, da 70 buono, da 60 discreto; Polar «Nightly
 * Recharge» 1-6: 6 ottimo, 5 buono, 4 discreto. Sotto, «da ricaricare»: mai una parola che
 * allarmi, e niente consigli sul cosa fare. Il numero del fornitore resta sempre accanto.
 */
export function recupero(scala: ScalaRecupero | null, valore: number | null): Recupero | null {
  if (scala === null || valore === null) return null
  if (scala === 'oura_prontezza') {
    const parole = valore >= 85 ? 'Ottimo' : valore >= 70 ? 'Buono' : valore >= 60 ? 'Discreto' : 'Da ricaricare'
    return { parole, quota: Math.max(0, Math.min(1, valore / 100)), valore: `${Math.round(valore)} su 100` }
  }
  const parole = valore >= 6 ? 'Ottimo' : valore >= 5 ? 'Buono' : valore >= 4 ? 'Discreto' : 'Da ricaricare'
  return { parole, quota: Math.max(0, Math.min(1, valore / 6)), valore: `${Math.round(valore)} su 6` }
}

const quantiDati = (g: GiornoDispositivo) => Object.entries(g).filter(([k, v]) => k !== 'data' && k !== 'fornitore' && v !== null).length

/** Un giorno solo per data: con due dispositivi vale quello che ha piu' dati. Dal piu' recente. */
export function giorniUnici(giorni: GiornoDispositivo[]): GiornoDispositivo[] {
  const per = new Map<string, GiornoDispositivo>()
  for (const g of giorni) {
    const c = per.get(g.data)
    if (!c || quantiDati(g) > quantiDati(c)) per.set(g.data, g)
  }
  return [...per.values()].sort((a, b) => b.data.localeCompare(a.data))
}

/** Minuti dalla mezzanotte di «HH:MM». */
export const minutiDelGiorno = (ora: string) => Number(ora.slice(0, 2)) * 60 + Number(ora.slice(3, 5))

/** Quanto si e' dormito fra le due ore, anche attraverso la mezzanotte (23:30 -> 07:00 = 450); 0 se sono uguali. Come `durataFra` della funzione. */
export const durataFra = (letto: string, sveglia: string) => (minutiDelGiorno(sveglia) - minutiDelGiorno(letto) + 1440) % 1440

/** «7 h 30», «45 min». */
export function durata(minuti: number): string {
  const m = Math.max(0, Math.round(minuti))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`
}

const SPORT: [RegExp, string][] = [
  [/(run|jog|treadmill)/, 'Corsa'],
  [/walk|nordic/, 'Camminata'],
  [/(cycl|bik|spin)/, 'Bicicletta'],
  [/(strength|weight|gym|resistance|crossfit)/, 'Pesi'],
  [/swim/, 'Nuoto'],
  [/yoga/, 'Yoga'],
  [/pilates/, 'Pilates'],
  [/hiit|interval|circuit/, 'Allenamento a intervalli'],
  [/row|kayak|paddle/, 'Canottaggio'],
  [/hik|trek|mountain/, 'Escursione'],
  [/danc/, 'Danza'],
  [/stretch|mobility/, 'Stretching'],
  [/(fitness|class|aerob|zumba|group)/, 'Lezione'],
  [/(football|soccer|tennis|padel|basket|volley|golf)/, 'Sport'],
]

/** Lo sport del fornitore in italiano; se non lo conosciamo, «Allenamento». */
export function nomeSport(sport: string | null): string {
  const s = (sport ?? '').toLowerCase()
  return SPORT.find(([re]) => re.test(s))?.[1] ?? 'Allenamento'
}

const giornoUTC = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
/** «dom 18 ott» da AAAA-MM-GG. */
export function giornoBreve(giorno: string): string {
  return giornoUTC.format(new Date(`${giorno}T12:00:00Z`)).replace('.', '')
}

const lettera = new Intl.DateTimeFormat('it-IT', { weekday: 'narrow', timeZone: 'UTC' })
/** L'iniziale del giorno della settimana, per le barre. */
export const inizialeGiorno = (giorno: string) => lettera.format(new Date(`${giorno}T12:00:00Z`)).toUpperCase()

const orario = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
const giornoRoma = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })

/** «oggi alle 17:30», «ieri alle 07:10», «dom 18 ott, 17:30» (a Roma). */
export function quando(iso: string, oggi: string, ieri: string): string {
  const d = new Date(iso)
  const g = giornoRoma.format(d)
  const ora = orario.format(d)
  if (g === oggi) return `oggi alle ${ora}`
  if (g === ieri) return `ieri alle ${ora}`
  return `${giornoBreve(g)}, ${ora}`
}

export const giornoDi = (iso: string) => giornoRoma.format(new Date(iso))

/** Gli allenamenti del dispositivo, dal piu' recente. */
export const piuRecenti = (a: AllenamentoDispositivo[], n: number) => [...a].sort((x, y) => y.inizio.localeCompare(x.inizio)).slice(0, n)

/** Da quanto e' stato letto: «adesso», «5 minuti fa», «3 ore fa», «ieri». */
export function dopo(iso: string | null, adesso = Date.now()): string {
  if (!iso) return 'mai'
  const min = Math.max(0, Math.round((adesso - Date.parse(iso)) / 60000))
  if (min < 2) return 'adesso'
  if (min < 60) return `${min} minuti fa`
  const ore = Math.round(min / 60)
  if (ore < 24) return ore === 1 ? '1 ora fa' : `${ore} ore fa`
  const giorni = Math.round(ore / 24)
  return giorni === 1 ? 'ieri' : `${giorni} giorni fa`
}
