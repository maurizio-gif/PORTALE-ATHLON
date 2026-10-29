import type { ConsensoCorpo, Misura, SessoCalcolo } from '@/api/lab'

import { altezzaAl } from '../dati/calcoli'
import { etaDa } from '../schede/stimaCalorie'

// I dati del corpo da compilare in Athlon Health System (29/10/2026, richiesta di Maurizio): altezza, peso e sesso. Sono quelli con cui
// si stimano le calorie di lezioni e allenamenti. **Non bloccano la sezione** (all'inizio erano obbligatori: la sezione restava chiusa
// finche' mancavano; poi si e' scelto il blocco morbido, perche' un consenso a dati sulla salute da cui dipende tutto l'uso della
// sezione non e' libero e il resto non li usa): finche' mancano, sotto il video c'e' la carta «Da compilare» (`fit/DatiDaCompilare.tsx`)
// e calorie e Balance restano chiusi, che e' quello che davvero dipende da questi dati. **Puro**, si prova con `npx tsx`.
//
// **L'eta' non e' fra questi**: viene dalla scheda del club e la persona non puo' scriverla da qui (le stime dicono da sole che manca).
// **Non si mostra la carta** (`non-richiesti`) in vista cliente (lo staff guarda e non scrive), ai minorenni (le stime sono per gli
// adulti), e se la lettura non riesce: un guasto della rete non deve far apparire un invito a chi i dati li ha gia' scritti.

export type DatoMancante = 'altezza' | 'peso' | 'sesso'

export type LettureCorpo = {
  /** La vista cliente dello staff. */
  vista: boolean
  /** null finche' non arrivano. */
  misure: Misura[] | null
  sesso: SessoCalcolo
  /** `null`: la funzione dice che manca il consenso alle misure; `undefined`: non si sa, o una funzione che non lo conosce. */
  consenso: ConsensoCorpo | null | undefined
  /** L'ultima lettura delle misure non e' riuscita (e non ce n'e' una in memoria). */
  errore: boolean
  dataNascita: string | null | undefined
  /** L'anagrafica e' stata letta (o ha dato errore): prima non si sa se la persona e' maggiorenne. */
  anagraficaLetta: boolean
}

export type StatoDati =
  | { stato: 'attesa' }
  | { stato: 'non-richiesti' }
  | { stato: 'completi' }
  | { stato: 'mancano'; mancano: DatoMancante[]; senzaConsenso: boolean }

/** Cosa manca fra altezza, peso e sesso. */
export function datiMancanti(misure: Misura[], sesso: SessoCalcolo): DatoMancante[] {
  const m: DatoMancante[] = []
  if (!misure.length || !altezzaAl(misure, misure.length - 1)) m.push('altezza')
  if (!misure.some((x) => x.peso_kg != null && x.peso_kg > 0)) m.push('peso')
  if (!sesso) m.push('sesso')
  return m
}

export function statoDati(l: LettureCorpo, oggi = new Date()): StatoDati {
  if (l.vista) return { stato: 'non-richiesti' }
  const anni = etaDa(l.dataNascita, oggi)
  if (anni != null && anni < 18) return { stato: 'non-richiesti' }
  if (!l.misure) return l.errore ? { stato: 'non-richiesti' } : { stato: 'attesa' }
  const mancano = datiMancanti(l.misure, l.sesso)
  if (!mancano.length) return { stato: 'completi' }
  // Prima di bloccare bisogna sapere che e' un adulto: un minorenne non va fermato, nemmeno per un attimo.
  if (!l.anagraficaLetta) return { stato: 'attesa' }
  return { stato: 'mancano', mancano, senzaConsenso: l.consenso === null }
}
