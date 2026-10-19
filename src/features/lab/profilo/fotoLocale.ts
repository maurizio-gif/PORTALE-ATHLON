import type { Anagrafica } from '@/api/lab'

import { inMemoria, ricorda } from '../memoria'

// La foto appena scelta, tenuta in memoria finche' PerfectGym non ha pronte le sue misure (20/10/2026).
//
// Di norma la funzione risponde gia' col link della foto nuova. Se le misure non sono ancora pronte (`in_arrivo`) la
// foto e' salvata ma il link non c'e', e una schermata che rilegge subito l'anagrafica la vedrebbe sparire - e
// l'invito a metterla riapparire, a una persona che l'ha appena messa. Quindi per dieci minuti (il giro del sync e'
// di cinque-sei) l'anagrafica che si mostra porta quella scelta, al posto di quella del server.
//
// Solo in memoria, come ogni dato del laboratorio: esce con l'uscita dall'app (`dimentica`).

const CHIAVE = 'anagrafica:foto_locale'
const DURATA_MS = 10 * 60_000

type FotoLocale = { anteprima: string; fino: number }

/** `null` toglie quella che c'era: un cambio riuscito per intero non deve lasciare quella di prima. */
export function ricordaFotoLocale(anteprima: string | null) {
  ricorda<FotoLocale | null>(CHIAVE, anteprima ? { anteprima, fino: Date.now() + DURATA_MS } : null)
}

/** L'anagrafica con la foto appena scelta al posto di quella del server, se e' ancora nei dieci minuti. */
export function conFotoLocale(a: Anagrafica): Anagrafica {
  const l = inMemoria<FotoLocale | null>(CHIAVE)
  return l && Date.now() < l.fino ? { ...a, foto: l.anteprima } : a
}
