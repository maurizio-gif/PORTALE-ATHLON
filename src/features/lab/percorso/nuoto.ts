import type { PianoNuotoBozza, Tappa } from '@/api/percorso'

import { metriDelGiorno } from '../schede/nuoto'

// Il piano di nuoto dentro il Percorso (20/10/2026), dalla parte dell'app. Chi dice di voler nuotare ha, nella settimana,
// dei turni di **Nuoto Libero** e **un piano di nuoto** scritto insieme al percorso: ogni turno apre un suo giorno, «cosa fai
// in vasca oggi». Il piano si conferma con il percorso e poi e' un piano del socio come gli altri; si legge e non si registra.
//
// **Chi aggancia le tappe ai giorni del piano e' il codice, non il modello**, e `agganciaNuoto` e' lo specchio di
// `_shared/percorso/nuoto.ts` della funzione: le tappe di Nuoto Libero si mettono in fila per giorno e ora e si assegnano alle
// sedute del piano **in ordine**, ricominciando se le tappe sono piu' delle sedute. Serve qui perche' il socio, nell'editor,
// aggiunge e sposta i turni, e vuole vedere subito quale seduta apre ognuno. **La funzione resta l'autorita'**: al
// salvataggio rifa lo stesso conto dai legami che le arrivano, e se le due copie divergono vince lei.

/** La categoria di PerfectGym del nuoto libero: e' da qui che si riconosce una tappa che apre il piano di nuoto. */
export const NUOTO_LIBERO = 'Nuoto Libero'

export const eNuotoLibero = (t: Pick<Tappa, 'tipo' | 'lezione'>): boolean => t.tipo === 'lezione' && t.lezione?.categoria === NUOTO_LIBERO

/** I metri di ogni seduta del piano, nell'ordine: una somma di serie per distanza. */
export const metriDelleSedute = (piano: PianoNuotoBozza): number[] => piano.giorni.map((g) => metriDelGiorno(g))

const pianoDi = (piano: PianoNuotoBozza, posizione: number): NonNullable<Tappa['piano']> => ({
  scheda_id: null,
  giorno_posizione: posizione,
  scheda_titolo: piano.titolo,
  giorno_nome: piano.giorni[posizione - 1]?.nome ?? null,
  metri: metriDelleSedute(piano)[posizione - 1] ?? 0,
})

const perGiornoEOra = (a: Tappa, b: Tappa) => a.giorno - b.giorno || (a.ora ?? '').localeCompare(b.ora ?? '')

/**
 * Alle tappe di Nuoto Libero **che non hanno ancora un giorno del piano**, in ordine di giorno e ora, le sedute del piano:
 * la prima tappa la prima seduta, e cosi' via. Quelle che ce l'hanno restano come sono (il socio ha spostato un turno,
 * la seduta e' sempre la sua). Le altre tappe non cambiano.
 */
export function riagganciaNuoto(tappe: Tappa[], piano: PianoNuotoBozza): Tappa[] {
  const sedute = piano.giorni.length
  if (!sedute) return tappe
  const senza = tappe.filter((t) => eNuotoLibero(t) && !t.piano).sort(perGiornoEOra)
  if (!senza.length) return tappe
  const posto = new Map(senza.map((t, i) => [t, (i % sedute) + 1]))
  return tappe.map((t) => (posto.has(t) ? { ...t, piano: pianoDi(piano, posto.get(t) as number) } : t))
}

/**
 * Cambiando una tappa di Nuoto Libero (il giorno, l'ora) la seduta del piano resta quella: la nuova tappa la riprende dalla
 * vecchia, se e' ancora un turno di Nuoto Libero e il piano della vecchia esiste ancora. Se no, la tappa e' senza seduta.
 */
export function ereditaPiano(vecchia: Tappa | null, nuova: Tappa): Tappa {
  if (!vecchia?.piano || vecchia.piano.disponibile === false || !eNuotoLibero(nuova)) return nuova
  return { ...nuova, piano: vecchia.piano }
}
