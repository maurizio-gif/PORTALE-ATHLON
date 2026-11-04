import type { CorsoDelSito } from '@/api/lab'
import { SITO_URL } from '@/config'

import { corsiPerNome, type CorsiPerNome } from './copertine'

// I corsi del club con la loro foto, letti da https://www.athlonroma.it/lezioni.json (lo stesso file del
// Calendario e del planning del sito). E' un contenuto pubblico e il sito risponde a chiunque (CORS aperto,
// come per club-life.json): si legge dall'app senza passare dalla funzione. Si tiene in memoria un'ora;
// se il sito non risponde si usa l'ultima copia, e senza copia `null`: le copertine restano quelle del server.

const UN_ORA = 60 * 60 * 1000
const ATTESA = 4000

let ultima: { quando: number; corsi: CorsiPerNome } | null = null
let inCorso: Promise<CorsiPerNome | null> | null = null

async function leggi(): Promise<CorsiPerNome | null> {
  const stop = new AbortController()
  const scaduto = setTimeout(() => stop.abort(), ATTESA)
  try {
    const r = await fetch(`${SITO_URL}/lezioni.json`, { headers: { Accept: 'application/json' }, signal: stop.signal })
    if (!r.ok) return ultima?.corsi ?? null
    const d = (await r.json()) as { lezioni?: Record<string, { foto?: unknown; fuoco?: unknown } | null>; alias?: Record<string, string> } | null
    if (!d?.lezioni || typeof d.lezioni !== 'object') return ultima?.corsi ?? null
    const lezioni: Record<string, CorsoDelSito> = {}
    for (const [nome, l] of Object.entries(d.lezioni)) {
      lezioni[nome] = { foto: typeof l?.foto === 'string' && l.foto ? l.foto : null, fuoco: typeof l?.fuoco === 'string' && l.fuoco ? l.fuoco : null }
    }
    const corsi = corsiPerNome(lezioni, d.alias && typeof d.alias === 'object' ? d.alias : {})
    ultima = { quando: Date.now(), corsi }
    return corsi
  } catch {
    return ultima?.corsi ?? null
  } finally {
    clearTimeout(scaduto)
  }
}

/** I corsi per nome, o `null` se il sito non risponde e non c'e' una copia. Non solleva mai. */
export function leggiCorsiDelSito(): Promise<CorsiPerNome | null> {
  if (ultima && Date.now() - ultima.quando < UN_ORA) return Promise.resolve(ultima.corsi)
  if (!inCorso) inCorso = leggi().finally(() => (inCorso = null))
  return inCorso
}
