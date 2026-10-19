import { useMemo } from 'react'

import { oggiRoma } from '../alimentazione/conti'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { calcolaPunteggio, type Ingressi, type Punteggio } from './calcoloPunteggio'
import type { DatiFit } from './useFit'

// L'Athlon Health Score (20/10/2026) dai dati che Fit e Relax gia' leggono: nessuna chiamata in
// piu', e niente si salva. Il calcolo sta in calcoloPunteggio.ts (puro); qui si decide solo cosa e' ancora
// «in arrivo» (null: meglio uno scheletro di un numero che poi cambia) e cosa non esiste per questa
// persona (la vista cliente dello staff e i minorenni vedono il solo allenamento).

export function usePunteggio(fit: DatiFit, disp: Dispositivi): Punteggio | null {
  return useMemo(() => {
    if (!fit.sessioni) return null

    // Food
    let food: Ingressi['food'] = null
    if (!fit.vista) {
      if (!fit.food && !fit.foodErrore) return null
      if (fit.food?.maggiorenne) {
        const consenso = !!fit.food.consenso
        if (consenso && !fit.diario) return null
        food = {
          consenso,
          escluso: !!fit.food.profilo?.nascondi_numeri,
          senzaColazione: fit.food.profilo?.questionario.colazione === 'mai',
          diario: fit.diario ?? [],
        }
      }
    }

    // Relax
    let relax: Ingressi['relax'] = null
    if (!disp.vista) {
      if (!disp.stato) return null
      if (disp.stato.ok && disp.stato.maggiorenne) {
        const consenso = !!disp.stato.consenso
        if (consenso && !disp.dati) return null
        relax = { consenso, giorni: disp.dati?.giorni ?? [] }
      }
    }

    return calcolaPunteggio({ oggi: oggiRoma(), sessioni: fit.sessioni, food, relax })
  }, [fit.sessioni, fit.vista, fit.food, fit.foodErrore, fit.diario, disp.vista, disp.stato, disp.dati])
}
