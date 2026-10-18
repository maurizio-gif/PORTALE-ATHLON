import { leggiDiario } from '@/api/alimentazione'

import { spostaGiorno } from '../schede/contatoreCalorie'
import { oggiRoma } from './conti'

// Le chiavi della memoria di Food, e la lettura del diario: le usano il diario
// (Alimentazione.tsx) e Fit (il riquadro Balance e l'area Food), che cosi'
// leggono la stessa cosa e si aggiornano a vicenda.

export const CHIAVE_STATO = 'alimentazione:stato'
export const CHIAVE_CATALOGO = 'alimentazione:catalogo'
export const CHIAVE_DIARIO = 'alimentazione:diario'
/** Quanti giorni del diario si leggono e si possono sfogliare. */
export const GIORNI_DIARIO = 31

/** Il diario degli ultimi GIORNI_DIARIO giorni, oggi compreso. */
export const leggiDiarioRecente = () => {
  const oggi = oggiRoma()
  return leggiDiario(spostaGiorno(oggi, -(GIORNI_DIARIO - 1)), oggi)
}
