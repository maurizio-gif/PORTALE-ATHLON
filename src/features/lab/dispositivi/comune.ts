import type { AllenamentoDispositivo, GiornoDispositivo } from '@/api/dispositivi'
import { locale, t } from '@/lib/lingua'

// Quello che le schermate dei dispositivi (Dispositivi.tsx, fit/Relax.tsx) hanno in
// comune: gli sport in italiano, i giorni, da chi arrivano i dati. Niente qui parla con la rete.
// **Dal 29/10/2026 non ci sono piu' i fornitori Oura e Polar ne' il «recupero» in parole** (era la prontezza di Oura e il Nightly
// Recharge di Polar: da Apple Salute e Health Connect non arrivano): il pilastro Recover descrive il sonno, non da' un giudizio.

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
  [/(run|jog|treadmill)/, t('Corsa', 'Running')],
  [/walk|nordic/, t('Camminata', 'Walking')],
  [/(cycl|bik|spin)/, t('Bicicletta', 'Cycling')],
  [/(strength|weight|gym|resistance|crossfit)/, t('Pesi', 'Weights')],
  [/swim/, t('Nuoto', 'Swimming')],
  [/yoga/, 'Yoga'],
  [/pilates/, 'Pilates'],
  [/hiit|interval|circuit/, t('Allenamento a intervalli', 'Interval training')],
  [/row|kayak|paddle/, t('Canottaggio', 'Rowing')],
  [/hik|trek|mountain/, t('Escursione', 'Hiking')],
  [/danc/, t('Danza', 'Dance')],
  [/stretch|mobility/, 'Stretching'],
  [/(fitness|class|aerob|zumba|group)/, t('Lezione', 'Class')],
  [/(football|soccer|tennis|padel|basket|volley|golf)/, t('Sport', 'Sport')],
]

/** Lo sport del fornitore in italiano; se non lo conosciamo, «Allenamento». */
export function nomeSport(sport: string | null): string {
  const s = (sport ?? '').toLowerCase()
  return SPORT.find(([re]) => re.test(s))?.[1] ?? t('Allenamento', 'Workout')
}

const giornoUTC = new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
/** «dom 18 ott» da AAAA-MM-GG. */
export function giornoBreve(giorno: string): string {
  return giornoUTC.format(new Date(`${giorno}T12:00:00Z`)).replace('.', '')
}

const lettera = new Intl.DateTimeFormat(locale(), { weekday: 'narrow', timeZone: 'UTC' })
/** L'iniziale del giorno della settimana, per le barre. */
export const inizialeGiorno = (giorno: string) => lettera.format(new Date(`${giorno}T12:00:00Z`)).toUpperCase()

const orario = new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
const giornoRoma = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })

/** «oggi alle 17:30», «ieri alle 07:10», «dom 18 ott, 17:30» (a Roma). */
export function quando(iso: string, oggi: string, ieri: string): string {
  const d = new Date(iso)
  const g = giornoRoma.format(d)
  const ora = orario.format(d)
  if (g === oggi) return t(`oggi alle ${ora}`, `today at ${ora}`)
  if (g === ieri) return t(`ieri alle ${ora}`, `yesterday at ${ora}`)
  return `${giornoBreve(g)}, ${ora}`
}

export const giornoDi = (iso: string) => giornoRoma.format(new Date(iso))

/** Gli allenamenti del dispositivo, dal piu' recente. */
export const piuRecenti = (a: AllenamentoDispositivo[], n: number) => [...a].sort((x, y) => y.inizio.localeCompare(x.inizio)).slice(0, n)

/** Da quanto e' stato letto: «adesso», «5 minuti fa», «3 ore fa», «ieri». */
export function dopo(iso: string | null, adesso = Date.now()): string {
  if (!iso) return t('mai', 'never')
  const min = Math.max(0, Math.round((adesso - Date.parse(iso)) / 60000))
  if (min < 2) return t('adesso', 'just now')
  if (min < 60) return t(`${min} minuti fa`, `${min} minutes ago`)
  const ore = Math.round(min / 60)
  if (ore < 24) return ore === 1 ? t('1 ora fa', '1 hour ago') : t(`${ore} ore fa`, `${ore} hours ago`)
  const giorni = Math.round(ore / 24)
  return giorni === 1 ? t('ieri', 'yesterday') : t(`${giorni} giorni fa`, `${giorni} days ago`)
}

/**
 * Apple Salute visto dal web (28/10/2026): i dati ci sono se l'app iPhone li ha mandati al club, e arrivano solo quando
 * l'app si apre. `ultimo` e' l'ultimo giorno (AAAA-MM-GG) per cui il club ha ricevuto qualcosa da Apple Salute.
 */
export function datiAppleSalute(d: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] } | null | undefined): { ha: boolean; ultimo: string | null } {
  if (!d) return { ha: false, ultimo: null }
  const giorni = [
    ...d.giorni.filter((g) => g.fornitore === 'apple_salute').map((g) => g.data),
    ...d.allenamenti.filter((a) => a.fornitore === 'apple_salute').map((a) => giornoDi(a.inizio)),
  ].sort()
  return { ha: giorni.length > 0, ultimo: giorni.at(-1) ?? null }
}

/** La frase per chi guarda Apple Salute dal web o da un telefono senza HealthKit. */
export function notaAppleSaluteDalWeb(ultimo: string | null): string {
  const quale = ultimo ? t(` (ultimo giorno ricevuto: ${giornoBreve(ultimo)})`, ` (last day received: ${giornoBreve(ultimo)})`) : ''
  return t(
    `I dati di Apple Salute sono quelli dell’ultima volta che hai aperto l’app sull’iPhone${quale}. Da qui non si aggiornano da soli: per sincronizzarli usa sempre l’app, aprendola ogni tanto.`,
    `Apple Health data is as of the last time you opened the app on your iPhone${quale}. It doesn’t refresh from here: to keep it in sync, always use the app and open it every now and then.`,
  )
}

type DatiDisp = { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] }

/** Passi e calorie di movimento dell'ultimo giorno che ne ha (da qualunque dispositivo), per la sezione Train. */
export function ultimoMovimento(giorni: GiornoDispositivo[]): { data: string; passi: number | null; calorie: number | null } | null {
  const con = giorni.filter((g) => g.passi !== null || g.calorie_attive !== null).sort((a, b) => b.data.localeCompare(a.data))
  if (!con.length) return null
  const data = con[0].data
  const stessi = con.filter((g) => g.data === data)
  return { data, passi: stessi.find((g) => g.passi !== null)?.passi ?? null, calorie: stessi.find((g) => g.calorie_attive !== null)?.calorie_attive ?? null }
}

export type VoceApple = { id: string; etichetta: string; valore: string | null; giorno: string | null }

/** Tutto quello che arriva da Apple Salute, una voce per dato, con l'ultimo valore e il giorno; `valore` nullo = non ancora ricevuto. */
export function riepilogoAppleSalute(d: DatiDisp | null | undefined): VoceApple[] {
  const g = (d?.giorni ?? []).filter((x) => x.fornitore === 'apple_salute').sort((a, b) => b.data.localeCompare(a.data))
  const w = (d?.allenamenti ?? []).filter((x) => x.fornitore === 'apple_salute').sort((a, b) => b.inizio.localeCompare(a.inizio))
  const ultimo = (f: (x: GiornoDispositivo) => number | null, fmt: (n: number) => string): { valore: string | null; giorno: string | null } => {
    const r = g.find((x) => f(x) !== null)
    return r ? { valore: fmt(f(r) as number), giorno: r.data } : { valore: null, giorno: null }
  }
  return [
    { id: 'passi', etichetta: t('Passi', 'Steps'), ...ultimo((x) => x.passi, (n) => n.toLocaleString(locale())) },
    { id: 'calorie', etichetta: t('Calorie di movimento', 'Active calories'), ...ultimo((x) => x.calorie_attive, (n) => `${n.toLocaleString(locale())} kcal`) },
    { id: 'sonno', etichetta: t('Sonno', 'Sleep'), ...ultimo((x) => x.sonno_minuti, (n) => durata(n)) },
    { id: 'fc', etichetta: t('Battito a riposo', 'Resting heart rate'), ...ultimo((x) => x.fc_notte, (n) => `${Math.round(n)}`) },
    { id: 'hrv', etichetta: 'HRV', ...ultimo((x) => x.hrv_ms, (n) => `${Math.round(n)} ms`) },
    {
      id: 'allenamenti',
      etichetta: t('Allenamenti', 'Workouts'),
      valore: w.length ? t(`${w.length} ricevuti`, `${w.length} received`) : null,
      giorno: w.length ? giornoDi(w[0].inizio) : null,
    },
  ]
}

/**
 * Il nome di chi ha scritto un dato su Apple Salute, ripulito: HealthKit da' alla fonte il nome del dispositivo con quello della
 * persona («Apple Watch di Marco»), e qui interessa solo il dispositivo o l'app («Apple Watch», «Garmin Connect», «Oura»).
 */
export function nomeFonte(origine: string | null | undefined): string | null {
  const o = (origine ?? '').trim()
  if (!o) return null
  const nativo = /^(iphone|ipad|apple watch)\b/i.exec(o)
  if (nativo) return nativo[1].toLowerCase() === 'iphone' ? 'iPhone' : nativo[1].toLowerCase() === 'ipad' ? 'iPad' : 'Apple Watch'
  return o.length > 40 ? `${o.slice(0, 39)}…` : o
}

/** Da chi arrivano i dati di Apple Salute: i nomi delle fonti, i piu' frequenti prima, al massimo sei. Serve a dire «ricevi da…». */
export function fontiRicevute(d: { giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] } | null | undefined): string[] {
  const conta = new Map<string, number>()
  const aggiungi = (o: string | null | undefined) => {
    const n = nomeFonte(o)
    if (n) conta.set(n, (conta.get(n) ?? 0) + 1)
  }
  for (const g of d?.giorni ?? []) if (g.fornitore === 'apple_salute') aggiungi(g.origine)
  for (const a of d?.allenamenti ?? []) if (a.fornitore === 'apple_salute') aggiungi(a.origine)
  return [...conta.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 6).map(([n]) => n)
}
