// Apple Salute (HealthKit): sola lettura di passi, sonno e allenamenti, solo su iPhone.
// Altrove (web, Android) ogni funzione risponde "non disponibile" senza sollevare.
import { Platform } from 'react-native';

import { importaSalute, type DatiDispositivi } from '@/api/dispositivi';

export type GiornoSalute = {
  data: string; // AAAA-MM-GG, giorno di Roma/dispositivo
  passi: number | null;
  sonno_minuti: number | null;
};

export type AllenamentoSalute = {
  inizio: string; // ISO
  fine: string;
  tipo: string;
  minuti: number;
  calorie: number | null;
  metri: number | null;
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

const LETTURE = [
  'HKQuantityTypeIdentifierStepCount',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

export async function appleSaluteDisponibile(): Promise<boolean> {
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
  const hk = carica();
  if (!hk) return false;
  try {
    await hk.requestAuthorization({ toRead: [...LETTURE] });
    return true;
  } catch {
    return false;
  }
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
    const giorno = (d: Date) => (per[chiaveGiorno(d)] ??= { data: chiaveGiorno(d), passi: null, sonno_minuti: null });

    // Passi: un totale per giorno.
    const passi = await hk.queryStatisticsCollectionForQuantity(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      inizio,
      { day: 1 },
      { filter: { date: { startDate: inizio, endDate: fine } } },
    );
    for (const r of passi) {
      const q = r.sumQuantity?.quantity;
      if (r.startDate && q != null) giorno(new Date(r.startDate)).passi = Math.round(q);
    }

    // Sonno: si sommano i soli periodi "addormentato" (non "a letto") e si attribuiscono al giorno del risveglio.
    const sonno = await hk.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      filter: { date: { startDate: new Date(inizio.getTime() - 12 * 3600_000), endDate: fine } },
      limit: 0,
    });
    for (const s of sonno) {
      if (s.value === 0 /* inBed */ || s.value === 2 /* awake */) continue;
      const min = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60_000;
      const g = giorno(new Date(s.endDate));
      g.sonno_minuti = (g.sonno_minuti ?? 0) + Math.round(min);
    }

    const lavori = await hk.queryWorkoutSamples({
      filter: { date: { startDate: inizio, endDate: fine } },
      limit: 0,
      ascending: false,
    });
    const allenamenti: AllenamentoSalute[] = lavori.map((w) => ({
      inizio: new Date(w.startDate).toISOString(),
      fine: new Date(w.endDate).toISOString(),
      tipo: String(w.workoutActivityType),
      minuti: Math.round((w.duration?.quantity ?? 0) / 60),
      calorie: w.totalEnergyBurned?.quantity != null ? Math.round(w.totalEnergyBurned.quantity) : null,
      metri: w.totalDistance?.quantity != null ? Math.round(w.totalDistance.quantity) : null,
    }));

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

/** L'ultimo motivo per cui Apple Salute non ha dato niente, in parole per chi guarda (null se tutto bene). */
export let ultimoErroreSalute: string | null = null

/** Legge da Apple Salute e manda al club. Al massimo una volta ogni 10 minuti, salvo `subito`. Non solleva mai. */
export async function sincronizzaSalute(subito = false): Promise<DatiDispositivi | null> {
  if (Platform.OS !== 'ios' || !appleSaluteAttivo()) return null
  if (!subito && Date.now() - ultimaLettura < ogni) return null
  ultimaLettura = Date.now()
  const l = await leggiSalute(14)
  if (!l) return null
  if (!l.giorni.length && !l.allenamenti.length) {
    ultimoErroreSalute = 'nessun dato negli ultimi giorni'
    return null
  }
  const r = await importaSalute({
    giorni: l.giorni,
    allenamenti: l.allenamenti.map((a) => ({ inizio: a.inizio, fine: a.fine, tipo: a.tipo, calorie: a.calorie })),
  })
  if (!r.ok) ultimoErroreSalute = r.errore
  return r.ok ? r : null
}
