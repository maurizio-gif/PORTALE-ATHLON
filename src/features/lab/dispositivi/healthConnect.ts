// Google Salute = Health Connect (31/10/2026, richiesta di Maurizio: «stessa cosa per Google Health che dobbiamo attivare»).
// Sola lettura di passi, sonno, allenamenti, battito a riposo e calorie attive, **solo su Android nativo**: come Apple Salute e'
// un hub, perche' Fitbit, Samsung Health, Garmin, Oura e altre app scrivono su Health Connect e noi leggiamo da un posto solo.
// Altrove (web, iPhone) ogni funzione risponde «non disponibile» senza sollevare. **Ha la stessa forma di `appleSalute.ts`**
// (`LetturaSalute`): quello che esce di qui entra nella stessa funzione del server, con `fonte = 'google_salute'`.
//
// **Non provato su un telefono vero**: le API sono quelle della libreria (`react-native-health-connect` 4.1.3, controllate sui
// suoi tipi), non viste girare. Serve una build nativa Android nuova (il modulo e il suo plugin sono in `app.json`) e, per il
// Play Store, la dichiarazione sull'uso dei dati di salute (`docs/analisi-wearable-salute.md`).
//
// **L'HRV non si manda**: Health Connect la da' come RMSSD, Apple Salute come SDNN. Sono due misure diverse e finirebbero nella
// stessa colonna (`hrv_ms`): un confronto fra persone o nel tempo sarebbe falso. Si aggiunge quando c'e' una colonna per ciascuna.
import { Platform } from 'react-native'

import type { AllenamentoSalute, GiornoSalute, LetturaSalute } from './appleSalute'

type HC = typeof import('react-native-health-connect')

function carica(): HC | null {
  if (Platform.OS !== 'android') return null
  try {
    return require('react-native-health-connect') as HC
  } catch {
    return null
  }
}

const LETTURE = ['Steps', 'SleepSession', 'ExerciseSession', 'RestingHeartRate', 'ActiveCaloriesBurned', 'HeartRate'] as const

export async function healthConnectDisponibile(): Promise<boolean> {
  const hc = carica()
  if (!hc) return false
  try {
    // 3 = SDK_AVAILABLE. Con l'aggiornamento di Health Connect richiesto (2) o senza (1) non si offre il collegamento.
    return (await hc.getSdkStatus()) === hc.SdkAvailabilityStatus.SDK_AVAILABLE
  } catch {
    return false
  }
}

/** Mostra la richiesta di Android: la persona sceglie cosa condividere. Non dice cosa ha scelto. */
export async function chiediPermessoHealthConnect(): Promise<boolean> {
  const hc = carica()
  if (!hc) return false
  try {
    if (!(await hc.initialize())) return false
    await hc.requestPermission(LETTURE.map((recordType) => ({ accessType: 'read' as const, recordType })))
    return true
  } catch {
    return false
  }
}

const dueCifre = (n: number) => String(n).padStart(2, '0')
const chiaveGiorno = (d: Date) => `${d.getFullYear()}-${dueCifre(d.getMonth() + 1)}-${dueCifre(d.getDate())}`

/** Le app che scrivono su Health Connect si riconoscono dal nome del pacchetto: al club arriva solo un nome leggibile, mai il pacchetto. */
const FONTI: [RegExp, string][] = [
  [/fitbit/i, 'Fitbit'],
  [/samsung.*health|shealth/i, 'Samsung Health'],
  [/garmin/i, 'Garmin Connect'],
  [/ouraring|oura/i, 'Oura'],
  [/polar/i, 'Polar Flow'],
  [/withings/i, 'Withings'],
  [/whoop/i, 'WHOOP'],
  [/huawei/i, 'Huawei Health'],
  [/xiaomi|zepp|amazfit/i, 'Zepp'],
  [/google.*fit|apps\.fitness/i, 'Google Fit'],
  [/wearos|google.*wear/i, 'Wear OS'],
]
export function nomeFonteAndroid(pacchetto: unknown): string | null {
  const p = typeof pacchetto === 'string' ? pacchetto : ''
  return FONTI.find(([re]) => re.test(p))?.[1] ?? null
}

/** I numeri di `ExerciseType` letti al rovescio: «STRENGTH_TRAINING» -> «strength_training», che `nomeSport` riconosce. */
function nomeEsercizio(hc: HC, codice: unknown): string {
  const inverso = Object.entries(hc.ExerciseType).find(([, v]) => v === codice)?.[0]
  return inverso ? inverso.toLowerCase() : String(codice ?? '')
}

/** Ultimi `giorni` giorni (al massimo 30), come `leggiSalute` di Apple. Non solleva: in caso d'errore risponde null. */
export async function leggiHealthConnect(giorni = 14): Promise<LetturaSalute | null> {
  const hc = carica()
  if (!hc) return null
  try {
    if (!(await hc.initialize())) return null
    const n = Math.min(Math.max(giorni, 1), 30)
    const fine = new Date()
    const inizio = new Date(fine)
    inizio.setHours(0, 0, 0, 0)
    inizio.setDate(inizio.getDate() - (n - 1))
    const per: Record<string, GiornoSalute> = {}
    const giorno = (d: Date) =>
      (per[chiaveGiorno(d)] ??= { data: chiaveGiorno(d), passi: null, sonno_minuti: null, sonno_profondo_minuti: null, sonno_rem_minuti: null, fc_notte: null, hrv_ms: null, calorie_attive: null, origine: null })
    const intervallo = { operator: 'between' as const, startTime: inizio.toISOString(), endTime: fine.toISOString() }
    const periodo = { period: 'DAYS' as const, length: 1 }

    // Una lettura che non riesce (permesso negato per quel dato) non ferma le altre.
    const sicuro = async <T,>(f: () => Promise<T>, ripiego: T): Promise<T> => {
      try {
        return await f()
      } catch {
        return ripiego
      }
    }

    // Passi e calorie: l'aggregato di Health Connect unisce da solo le app che scrivono la stessa cosa (nessun conteggio doppio).
    const passi = await sicuro(() => hc.aggregateGroupByPeriod({ recordType: 'Steps', timeRangeFilter: intervallo, timeRangeSlicer: periodo }) as Promise<any[]>, [])
    for (const r of passi) {
      const v = r?.result?.COUNT_TOTAL
      if (r?.startTime && typeof v === 'number') giorno(new Date(r.startTime)).passi = Math.round(v)
    }
    const calorie = await sicuro(() => hc.aggregateGroupByPeriod({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: intervallo, timeRangeSlicer: periodo }) as Promise<any[]>, [])
    for (const r of calorie) {
      const v = r?.result?.ACTIVE_CALORIES_TOTAL?.inKilocalories
      if (r?.startTime && typeof v === 'number') giorno(new Date(r.startTime)).calorie_attive = Math.round(v)
    }

    // Battito a riposo: la media dei valori del giorno.
    const riposo = await sicuro(() => hc.readRecords('RestingHeartRate', { timeRangeFilter: intervallo }) as Promise<{ records: any[] }>, { records: [] })
    const somme: Record<string, [number, number]> = {}
    for (const r of riposo.records) {
      if (!r?.time || typeof r.beatsPerMinute !== 'number') continue
      const k = chiaveGiorno(new Date(r.time))
      const s = (somme[k] ??= [0, 0])
      s[0] += r.beatsPerMinute
      s[1] += 1
    }
    for (const [k, [tot, c]] of Object.entries(somme)) giorno(new Date(`${k}T12:00:00`)).fc_notte = Math.round(tot / c)

    // Sonno: giorno del risveglio. Le fasi che contano sono dormire, leggero, profondo e REM; sveglio e fuori dal letto no.
    // Piu' sessioni nella stessa notte si uniscono, cosi' un minuto non conta due volte (come per Apple).
    const sessioni = await sicuro(
      () => hc.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: new Date(inizio.getTime() - 12 * 3600_000).toISOString(), endTime: fine.toISOString() } }) as Promise<{ records: any[] }>,
      { records: [] },
    )
    type Per = [number, number]
    const unione = (v: Per[]): number => {
      const o = [...v].sort((x, y) => x[0] - y[0])
      let tot = 0
      let [a, b] = [-1, -1]
      for (const [x, y] of o) {
        if (a < 0) [a, b] = [x, y]
        else if (x <= b) b = Math.max(b, y)
        else {
          tot += b - a;
          [a, b] = [x, y];
        }
      }
      return a < 0 ? 0 : tot + (b - a)
    }
    const S = hc.SleepStageType
    const notti: Record<string, { tutto: Per[]; prof: Per[]; rem: Per[]; fonti: Record<string, number> }> = {}
    for (const s of sessioni.records) {
      const fineSessione = new Date(s.endTime).getTime()
      if (!(fineSessione > new Date(s.startTime).getTime())) continue
      const k = chiaveGiorno(new Date(fineSessione))
      const g = (notti[k] ??= { tutto: [], prof: [], rem: [], fonti: {} })
      const fasi: any[] = Array.isArray(s.stages) && s.stages.length ? s.stages : [{ startTime: s.startTime, endTime: s.endTime, stage: S.SLEEPING }]
      for (const f of fasi) {
        const i = new Date(f.startTime).getTime()
        const e = new Date(f.endTime).getTime()
        if (!(e > i) || f.stage === S.AWAKE || f.stage === S.OUT_OF_BED || f.stage === S.UNKNOWN) continue
        g.tutto.push([i, e])
        if (f.stage === S.DEEP) g.prof.push([i, e])
        if (f.stage === S.REM) g.rem.push([i, e])
      }
      const nome = nomeFonteAndroid(s.metadata?.dataOrigin)
      if (nome) g.fonti[nome] = (g.fonti[nome] ?? 0) + (fineSessione - new Date(s.startTime).getTime())
    }
    for (const [k, g] of Object.entries(notti)) {
      const minuti = Math.round(unione(g.tutto) / 60_000)
      if (minuti <= 0) continue
      const d = per[k] ?? giorno(new Date(`${k}T12:00:00`))
      d.sonno_minuti = minuti
      const p = Math.round(unione(g.prof) / 60_000)
      const r = Math.round(unione(g.rem) / 60_000)
      d.sonno_profondo_minuti = p > 0 ? p : null
      d.sonno_rem_minuti = r > 0 ? r : null
      d.origine = Object.entries(g.fonti).sort((x, y) => y[1] - x[1])[0]?.[0] ?? d.origine
    }

    const lavori = await sicuro(() => hc.readRecords('ExerciseSession', { timeRangeFilter: intervallo }) as Promise<{ records: any[] }>, { records: [] })
    // Il battito di ogni allenamento (media e massimo), come per Apple: al massimo 40, i piu' recenti.
    const recenti = [...lavori.records].sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)))
    const allenamenti: AllenamentoSalute[] = await Promise.all(
      recenti.map(async (w: any, i: number) => {
        let fc_media: number | null = null
        let fc_max: number | null = null
        let calorie: number | null = null
        if (i < 40) {
          const range = { operator: 'between' as const, startTime: new Date(w.startTime).toISOString(), endTime: new Date(w.endTime).toISOString() }
          const r: any = await sicuro(() => hc.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: range }) as Promise<any>, null)
          fc_media = typeof r?.BPM_AVG === 'number' ? Math.round(r.BPM_AVG) : null
          fc_max = typeof r?.BPM_MAX === 'number' ? Math.round(r.BPM_MAX) : null
          const c: any = await sicuro(() => hc.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: range }) as Promise<any>, null)
          const kcal = c?.ACTIVE_CALORIES_TOTAL?.inKilocalories
          calorie = typeof kcal === 'number' && kcal > 0 ? Math.round(kcal) : null
        }
        const inizioMs = new Date(w.startTime).getTime()
        const fineMs = new Date(w.endTime).getTime()
        return {
          inizio: new Date(w.startTime).toISOString(),
          fine: new Date(w.endTime).toISOString(),
          tipo: nomeEsercizio(hc, w.exerciseType),
          minuti: Math.max(0, Math.round((fineMs - inizioMs) / 60_000)),
          calorie,
          metri: null,
          fc_media,
          fc_max,
          origine: nomeFonteAndroid(w.metadata?.dataOrigin),
        }
      }),
    )

    return { giorni: Object.values(per).sort((a, b) => a.data.localeCompare(b.data)), allenamenti }
  } catch {
    return null
  }
}
