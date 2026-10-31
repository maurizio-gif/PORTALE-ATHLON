// Apple Salute (HealthKit): sola lettura di passi, sonno e allenamenti, solo su iPhone.
// **Dal 31/10/2026 questo file e' anche il punto d'ingresso di Google Salute (Health Connect, `healthConnect.ts`) su Android**: le
// funzioni che le schermate gia' usano (`appSaluteDelTelefono`, `appleSaluteDisponibile`, `chiediPermessoSalute`, `sincronizzaSalute`)
// scelgono da sole l'app Salute del telefono, cosi' invito, carta «Da attivare» e guida non cambiano. I nomi restano «apple…» per non
// toccare ogni chiamata; il segno «attivo» (un file o il `localStorage`) vale per qualunque app Salute: un telefono ne ha una sola.
// Altrove (web) ogni funzione risponde "non disponibile" senza sollevare.
import { Platform } from 'react-native';

import { t } from '@/lib/lingua';

import { importaSalute, type DatiDispositivi } from '@/api/dispositivi';

import { chiediPermessoHealthConnect, healthConnectDisponibile, leggiHealthConnect } from './healthConnect';

export type GiornoSalute = {
  data: string; // AAAA-MM-GG, giorno di Roma/dispositivo
  passi: number | null;
  sonno_minuti: number | null;
  sonno_profondo_minuti: number | null;
  sonno_rem_minuti: number | null;
  /** Il battito a riposo del giorno (Apple Salute lo calcola e lo scrive anche per Oura, Fitbit…). */
  fc_notte: number | null;
  hrv_ms: number | null;
  /** Calorie attive del giorno (senza il metabolismo di riposo). */
  calorie_attive: number | null;
  /** Da quale app o dispositivo arrivano il sonno e gli altri dati («Oura», «Apple Watch»). */
  origine: string | null;
};

export type AllenamentoSalute = {
  inizio: string; // ISO
  fine: string;
  tipo: string;
  minuti: number;
  calorie: number | null;
  metri: number | null;
  fc_media: number | null;
  fc_max: number | null;
  origine: string | null;
};

export type LetturaSalute = { giorni: GiornoSalute[]; allenamenti: AllenamentoSalute[] };

type HK = typeof import('@kingstinct/react-native-healthkit');

function carica(): HK | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('@kingstinct/react-native-healthkit') as HK;
  } catch {
    return null;
  }
}

// Apple Salute fa da hub (28/10/2026): Oura, Apple Watch, Garmin, Fitbit… scrivono li' e noi leggiamo da un posto solo.
const LETTURE = [
  'HKQuantityTypeIdentifierStepCount',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
] as const;

export async function appleSaluteDisponibile(): Promise<boolean> {
  if (Platform.OS === 'android') return healthConnectDisponibile();
  const hk = carica();
  if (!hk) return false;
  try {
    return await hk.isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

/** Mostra il foglio di Apple: l'utente sceglie cosa condividere. Non dice cosa ha scelto. */
export async function chiediPermessoSalute(): Promise<boolean> {
  if (Platform.OS === 'android') return chiediPermessoHealthConnect();
  const hk = carica();
  if (!hk) return false;
  try {
    await hk.requestAuthorization({ toRead: [...LETTURE] });
    segnaPermessiEstesi();
    return true;
  } catch {
    return false;
  }
}

/** Il nome dell'app o del dispositivo che ha scritto il dato su Apple Salute. */
function nomeFonte(x: any): string | null {
  const n = x?.sourceRevision?.source?.name ?? x?.device?.name ?? null;
  return typeof n === 'string' && n.trim() ? n.trim() : null;
}

const dueCifre = (n: number) => String(n).padStart(2, '0');
const chiaveGiorno = (d: Date) => `${d.getFullYear()}-${dueCifre(d.getMonth() + 1)}-${dueCifre(d.getDate())}`;

/** Ultimi `giorni` giorni (al massimo 30). Non solleva: in caso d'errore risponde null. */
export async function leggiSalute(giorni = 14): Promise<LetturaSalute | null> {
  const hk = carica();
  if (!hk) return null;
  try {
    const n = Math.min(Math.max(giorni, 1), 30);
    const fine = new Date();
    const inizio = new Date(fine);
    inizio.setHours(0, 0, 0, 0);
    inizio.setDate(inizio.getDate() - (n - 1));
    const per: Record<string, GiornoSalute> = {};
    const giorno = (d: Date) =>
      (per[chiaveGiorno(d)] ??= { data: chiaveGiorno(d), passi: null, sonno_minuti: null, sonno_profondo_minuti: null, sonno_rem_minuti: null, fc_notte: null, hrv_ms: null, calorie_attive: null, origine: null });
    const opz = { filter: { date: { startDate: inizio, endDate: fine } } };

    // Una lettura che non riesce (permesso negato per quel dato) non ferma le altre.
    const sicuro = async <T,>(f: () => Promise<T>, ripiego: T): Promise<T> => {
      try {
        return await f();
      } catch {
        return ripiego;
      }
    };
    const perGiorno = async (id: string, stat: 'cumulativeSum' | 'discreteAverage', campo: 'sumQuantity' | 'averageQuantity', metti: (g: GiornoSalute, v: number) => void) => {
      const righe = await sicuro(() => (hk as any).queryStatisticsCollectionForQuantity(id, [stat], inizio, { day: 1 }, opz) as Promise<any[]>, []);
      for (const r of righe) {
        const q = r[campo]?.quantity;
        if (r.startDate && q != null) metti(giorno(new Date(r.startDate)), q);
      }
    };
    await perGiorno('HKQuantityTypeIdentifierStepCount', 'cumulativeSum', 'sumQuantity', (g, v) => (g.passi = Math.round(v)));
    await perGiorno('HKQuantityTypeIdentifierActiveEnergyBurned', 'cumulativeSum', 'sumQuantity', (g, v) => (g.calorie_attive = Math.round(v)));
    await perGiorno('HKQuantityTypeIdentifierRestingHeartRate', 'discreteAverage', 'averageQuantity', (g, v) => (g.fc_notte = Math.round(v)));
    await perGiorno('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'discreteAverage', 'averageQuantity', (g, v) => (g.hrv_ms = Math.round(v)));

    // Sonno: piu' app possono scrivere la stessa notte (l'anello e il telefono). I periodi si uniscono, cosi' un minuto
    // non conta due volte; profondo e REM contano solo dove c'e' un'app che li distingue. Giorno del risveglio.
    const sonno = await sicuro(
      () =>
        hk.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
          filter: { date: { startDate: new Date(inizio.getTime() - 12 * 3600_000), endDate: fine } },
          limit: 0,
        }) as Promise<any[]>,
      [],
    );
    type Per = [number, number];
    const unione = (v: Per[]): number => {
      const o = [...v].sort((x, y) => x[0] - y[0]);
      let tot = 0;
      let [a, b] = [-1, -1];
      for (const [x, y] of o) {
        if (a < 0) [a, b] = [x, y];
        else if (x <= b) b = Math.max(b, y);
        else {
          tot += b - a;
          [a, b] = [x, y];
        }
      }
      return a < 0 ? 0 : tot + (b - a);
    };
    const gruppi: Record<string, { tutto: Per[]; prof: Per[]; rem: Per[]; fonti: Record<string, number> }> = {};
    for (const x of sonno) {
      if (x.value === 0 /* inBed */ || x.value === 2 /* awake */) continue;
      const i = new Date(x.startDate).getTime();
      const f = new Date(x.endDate).getTime();
      if (!(f > i)) continue;
      const k = chiaveGiorno(new Date(f));
      const g = (gruppi[k] ??= { tutto: [], prof: [], rem: [], fonti: {} });
      g.tutto.push([i, f]);
      if (x.value === 4) g.prof.push([i, f]);
      if (x.value === 5) g.rem.push([i, f]);
      const n = nomeFonte(x);
      if (n) g.fonti[n] = (g.fonti[n] ?? 0) + (f - i);
    }
    for (const [k, g] of Object.entries(gruppi)) {
      const d = per[k] ?? (giorno(new Date(`${k}T12:00:00`)));
      d.sonno_minuti = Math.round(unione(g.tutto) / 60_000);
      const p = Math.round(unione(g.prof) / 60_000);
      const r = Math.round(unione(g.rem) / 60_000);
      d.sonno_profondo_minuti = p > 0 ? p : null;
      d.sonno_rem_minuti = r > 0 ? r : null;
      d.origine = Object.entries(g.fonti).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
    }

    const lavori = await sicuro(
      () => hk.queryWorkoutSamples({ filter: { date: { startDate: inizio, endDate: fine } }, limit: 0, ascending: false }) as Promise<any[]>,
      [],
    );
    // Il battito di ogni allenamento (media e massimo), per le calorie e per la fatica: al massimo 40, i piu' recenti.
    const allenamenti: AllenamentoSalute[] = await Promise.all(
      lavori.map(async (w: any, i: number) => {
        let fc_media: number | null = null;
        let fc_max: number | null = null;
        if (i < 40) {
          const r: any = await sicuro(
            () =>
              (hk as any).queryStatisticsForQuantity('HKQuantityTypeIdentifierHeartRate', ['discreteAverage', 'discreteMax'], {
                filter: { date: { startDate: new Date(w.startDate), endDate: new Date(w.endDate) } },
              }),
            null,
          );
          const m = r?.averageQuantity?.quantity;
          const x = r?.maximumQuantity?.quantity;
          fc_media = m != null ? Math.round(m) : null;
          fc_max = x != null ? Math.round(x) : null;
        }
        return {
          inizio: new Date(w.startDate).toISOString(),
          fine: new Date(w.endDate).toISOString(),
          tipo: String(w.workoutActivityType),
          minuti: Math.round((w.duration?.quantity ?? 0) / 60),
          calorie: w.totalEnergyBurned?.quantity != null ? Math.round(w.totalEnergyBurned.quantity) : null,
          metri: w.totalDistance?.quantity != null ? Math.round(w.totalDistance.quantity) : null,
          fc_media,
          fc_max,
          origine: nomeFonte(w),
        };
      }),
    );

    return { giorni: Object.values(per).sort((a, b) => a.data.localeCompare(b.data)), allenamenti };
  } catch {
    return null;
  }
}

// --- Il collegamento vive sul telefono: un segno nel browser/nell'app dice che il socio l'ha attivato. ---
const CHIAVE_ATTIVO = 'athlon:apple-salute'
const ogni = 10 * 60_000
let ultimaLettura = 0

// Sul telefono non esiste `localStorage`: il segno sta in un piccolo file nella cartella dell'app (expo-file-system). Prima stava
// solo nel browser, quindi su iPhone non restava mai acceso e non partiva nessuna lettura (28/10/2026).
function segnoFile() {
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system')
  return new File(Paths.document, 'apple-salute-attivo.txt')
}

export function appleSaluteAttivo(): boolean {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHIAVE_ATTIVO) === '1'
    return segnoFile().exists
  } catch {
    return false
  }
}
export function impostaAppleSalute(attivo: boolean) {
  try {
    if (Platform.OS === 'web') {
      if (attivo) globalThis.localStorage?.setItem(CHIAVE_ATTIVO, '1')
      else globalThis.localStorage?.removeItem(CHIAVE_ATTIVO)
      return
    }
    const f = segnoFile()
    if (attivo) {
      if (!f.exists) f.create()
    } else if (f.exists) f.delete()
  } catch {
    // senza memoria il segno non resta: si riattiva dalla schermata
  }
}

/**
 * Da quale app Salute del telefono si puo' leggere: Apple Salute su iPhone e, dal 31/10/2026, Health Connect su Android
 * (richiesta di Maurizio: l'invito e la carta «da attivare» devono valere anche per lui). Chi decide se mostrare l'invito
 * chiede a questa funzione, non a `Platform.OS`.
 */
export function appSaluteDelTelefono(): 'apple' | 'google' | null {
  return Platform.OS === 'ios' ? 'apple' : Platform.OS === 'android' ? 'google' : null
}

/** Come si chiama l'app Salute di questo telefono, per i testi («Apple Salute», «Health Connect»); Apple se non si sa. */
export function nomeAppSalute(): string {
  return appSaluteDelTelefono() === 'google' ? t('Health Connect', 'Health Connect') : t('Apple Salute', 'Apple Health')
}

// L'invito a collegare l'app Salute, all'apertura di Athlon Health System (29/10/2026): compare una volta sola per dispositivo,
// anche se la persona lo salta. Dopo, a ricordarlo resta la carta «Da attivare» in evidenza (fit/CartaDispositivi.tsx).
// Sul telefono il segno e' un file nella cartella dell'app, come quello dell'attivazione; nel browser, il `localStorage`.
const CHIAVE_INVITO = 'athlon:apple-salute-invito'
/** Mostrato in questa esecuzione dell'app: vale anche se il segno non si riesce a scrivere (niente invito ogni volta). */
let invitoMostrato = false

export function invitoSaluteVisto(): boolean {
  if (invitoMostrato) return true
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHIAVE_INVITO) === '1'
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system')
    return new File(Paths.document, 'apple-salute-invito.txt').exists
  } catch {
    // Senza memoria non si sa: meglio non insistere.
    return true
  }
}

export function segnaInvitoSaluteVisto() {
  invitoMostrato = true
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(CHIAVE_INVITO, '1')
      return
    }
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system')
    const f = new File(Paths.document, 'apple-salute-invito.txt')
    if (!f.exists) f.create()
  } catch {
    // resta il segno in memoria, valido fino alla chiusura dell'app
  }
}

const CHIAVE_PERMESSI = 'athlon:apple-salute-v2'
function permessiEstesi(): boolean {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHIAVE_PERMESSI) === '1'
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system')
    return new File(Paths.document, 'apple-salute-permessi-v2.txt').exists
  } catch {
    return true
  }
}
function segnaPermessiEstesi() {
  try {
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system')
    const f = new File(Paths.document, 'apple-salute-permessi-v2.txt')
    if (!f.exists) f.create()
  } catch {
    // al giro dopo si richiede
  }
}

/** L'ultimo motivo per cui Apple Salute non ha dato niente, in parole per chi guarda (null se tutto bene). */
export let ultimoErroreSalute: string | null = null

/** Legge da Apple Salute e manda al club. Al massimo una volta ogni 10 minuti, salvo `subito`. Non solleva mai. */
export async function sincronizzaSalute(subito = false): Promise<DatiDispositivi | null> {
  const app = appSaluteDelTelefono()
  if (!app || !appleSaluteAttivo()) return null
  if (!subito && Date.now() - ultimaLettura < ogni) return null
  ultimaLettura = Date.now()
  // Chi aveva attivato Apple Salute con l'elenco di prima non ha dato i permessi nuovi (battito, HRV, calorie): si chiedono una volta.
  // (Solo su iPhone: Health Connect e' nato con l'elenco intero.)
  if (app === 'apple' && !permessiEstesi()) {
    await chiediPermessoSalute()
    segnaPermessiEstesi()
  }
  const l = app === 'google' ? await leggiHealthConnect(14) : await leggiSalute(14)
  if (!l) return null
  if (!l.giorni.length && !l.allenamenti.length) {
    ultimoErroreSalute = 'nessun dato negli ultimi giorni'
    return null
  }
  const r = await importaSalute(
    {
      giorni: l.giorni,
      allenamenti: l.allenamenti.map((a) => ({ inizio: a.inizio, fine: a.fine, tipo: a.tipo, calorie: a.calorie, fc_media: a.fc_media, fc_max: a.fc_max, origine: a.origine })),
    },
    app === 'google' ? 'google_salute' : 'apple_salute',
  )
  if (!r.ok) ultimoErroreSalute = r.errore
  return r.ok ? r : null
}
