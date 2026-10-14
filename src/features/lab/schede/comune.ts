import type { EsercizioScheda, GiornoSchedaLab } from '@/api/lab'

// Le schede di allenamento nel laboratorio: le etichette della libreria (le
// stesse chiavi di lib/esercizi.ts nel CRM) e il calcolo di cosa viene dopo
// una serie, col suo recupero.

export const MUSCOLI: Record<string, string> = {
  addominali: 'Addominali',
  abduttori: 'Abduttori',
  adduttori: 'Adduttori',
  bicipiti: 'Bicipiti',
  polpacci: 'Polpacci',
  pettorali: 'Pettorali',
  avambracci: 'Avambracci',
  glutei: 'Glutei',
  femorali: 'Femorali',
  dorsali: 'Dorsali',
  lombari: 'Lombari',
  schiena_centrale: 'Schiena',
  collo: 'Collo',
  quadricipiti: 'Quadricipiti',
  spalle: 'Spalle',
  trapezi: 'Trapezi',
  tricipiti: 'Tricipiti',
}

export const LIVELLI: Record<string, string> = { principiante: 'Principiante', intermedio: 'Intermedio', esperto: 'Esperto' }

export const TIPI: Record<string, string> = { standard: 'Del club', personalizzata: 'Del tuo trainer', ai: 'Agente AI' }

export function muscoli(lista: string[]): string {
  return lista.map((m) => MUSCOLI[m] ?? m).join(', ')
}

/** «90» → «1:30», «45» → «45″». */
export function recupero(secondi: number): string {
  if (secondi <= 0) return 'nessuno'
  const m = Math.floor(secondi / 60)
  const s = secondi % 60
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s}″`
}

/** «mar 14 ott, 18:30». */
export function quando(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

/** Gli esercizi a tempo («30 s», «45 sec», «1 min»): si registrano i secondi, non le ripetizioni. */
export function aTempo(ripetizioni: string): boolean {
  return /\b(s|sec|secondi|min|minuti)\b|″|"/i.test(ripetizioni)
}

/** Il gruppo di superserie di un esercizio del giorno: gli esercizi consecutivi con la stessa lettera. */
export function gruppo(giorno: GiornoSchedaLab, indice: number): number[] {
  const e = giorno.esercizi[indice]
  if (!e?.superserie) return [indice]
  let da = indice
  while (da > 0 && giorno.esercizi[da - 1].superserie === e.superserie) da--
  let a = indice
  while (a < giorno.esercizi.length - 1 && giorno.esercizi[a + 1].superserie === e.superserie) a++
  return Array.from({ length: a - da + 1 }, (_, i) => da + i)
}

export type Passo = { indice: number; serie: number }

/**
 * Dopo la serie `serie` dell'esercizio `indice`: quanto si recupera e cosa
 * viene dopo. Nella superserie si passa all'esercizio successivo del giro
 * senza recupero, e si recupera alla fine del giro (il recupero dell'ultimo
 * esercizio del gruppo); finite le serie, il recupero «dopo» e l'esercizio
 * successivo alla scheda.
 */
export function dopo(giorno: GiornoSchedaLab, indice: number, serie: number): { recupero: number; prossimo: Passo | null } {
  const g = gruppo(giorno, indice)
  const ultimo = g[g.length - 1]
  const e = giorno.esercizi[indice]
  if (g.length > 1 && indice !== ultimo) {
    return { recupero: 0, prossimo: { indice: indice + 1, serie } }
  }
  const serieGruppo = Math.max(...g.map((i) => giorno.esercizi[i].serie))
  if (serie < serieGruppo) {
    return { recupero: e.recupero_serie, prossimo: { indice: g[0], serie: serie + 1 } }
  }
  const successivo = ultimo + 1 < giorno.esercizi.length ? { indice: ultimo + 1, serie: 1 } : null
  return { recupero: successivo ? e.recupero_dopo : 0, prossimo: successivo }
}

/** «Panca piana · serie 2 di 4». */
export function descriviPasso(giorno: GiornoSchedaLab, p: Passo): string {
  const e: EsercizioScheda | undefined = giorno.esercizi[p.indice]
  return e ? `${e.nome} · serie ${p.serie} di ${e.serie}` : ''
}
