import { funzione } from './lab'

// I livelli dell'Athlon Health Score (20/10/2026): il registro dei punti settimana per settimana, nella funzione
// portale-lab-livelli di APP-ATHLON. **I punti li calcola l'app** (fit/calcoloLivelli.ts, le stesse regole del punteggio); il
// server ne controlla la forma, li conserva e non li fa mai scendere. Le funzioni non sollevano mai: se la funzione non
// c'e' ancora o non risponde, `disponibile: false` e l'app non mostra i livelli (il punteggio resta com'e').

export type SettimanaRegistrata = { settimana: string; train: number; food: number; relax: number; giorni_attivi: number; minuti: number }
export type StatoRegistro = { settimane: SettimanaRegistrata[]; consensi: { food: boolean; relax: boolean } }
export type EsitoRegistro = ({ ok: true } & StatoRegistro) | { ok: false; errore: string; /** La funzione non c'e' (ancora): i livelli non si mostrano. */ disponibile: boolean }

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)

function leggi(r: Awaited<ReturnType<typeof funzione>>): EsitoRegistro {
  if (!r.ok) {
    // 404 o «azione sconosciuta»: la funzione non e' ancora pubblicata.
    const manca = r.stato === 404 || String(r.dati.errore ?? '').startsWith('Azione sconosciuta')
    return { ok: false, errore: String(r.dati.errore ?? 'Non riusciamo a leggere i tuoi livelli adesso.'), disponibile: !manca }
  }
  const settimane = Array.isArray(r.dati.settimane) ? (r.dati.settimane as Record<string, unknown>[]) : []
  return {
    ok: true,
    settimane: settimane
      .filter((s) => typeof s.settimana === 'string')
      .map((s) => ({ settimana: s.settimana as string, train: n(s.train), food: n(s.food), relax: n(s.relax), giorni_attivi: n(s.giorni_attivi), minuti: n(s.minuti) })),
    consensi: { food: !!(r.dati.consensi as Record<string, unknown> | undefined)?.food, relax: !!(r.dati.consensi as Record<string, unknown> | undefined)?.relax },
  }
}

export async function registroLivelli(): Promise<EsitoRegistro> {
  return leggi(await funzione('portale-lab-livelli', { azione: 'stato' }))
}

/** Registra le settimane finite (al massimo 12 per volta) e risponde col registro aggiornato. */
export async function registraSettimane(settimane: SettimanaRegistrata[]): Promise<EsitoRegistro> {
  return leggi(await funzione('portale-lab-livelli', { azione: 'registra', settimane }))
}
