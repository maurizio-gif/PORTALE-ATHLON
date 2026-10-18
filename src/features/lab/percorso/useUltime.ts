import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'

import { presenzeLezioni, storicoAllenamenti, type SedutaStorico } from '@/api/lab'

import { inMemoria, prendi } from '../memoria'
import { useStatoCorpo, type StatoCorpo } from '../schede/CalorieLezione'
import { CHIAVE_PRESENZE, type Presenze } from '../schede/ContatoreCalorie'
import { vociCalorie } from '../schede/contatoreCalorie'
import { CHIAVE_STORICO } from '../schede/Storico'
import { ultimeQuattroSettimane, type Ultime } from './effetti'

// Cio' che serve agli effetti del Percorso oltre alle tappe: i quattro dati del corpo (per le calorie) e cosa
// ha fatto il socio nelle ultime quattro settimane. Le stesse letture e le stesse chiavi di memoria del
// contatore delle calorie e di `useFit` (le sedute chiuse nell'app e le lezioni con la presenza segnata dalla
// reception): niente di nuovo da leggere, e si apre subito con l'ultimo dato.
//
// Senza i dati del corpo le attivita' non si contano (il contatore le valuta in calorie): `ultime` resta null e
// `corpo` dice cosa manca.

export function useUltime(): { corpo: StatoCorpo; ultime: Ultime | null } {
  const corpo = useStatoCorpo()
  const [sedute, setSedute] = useState<SedutaStorico[] | null>(() => inMemoria<{ allenamenti: SedutaStorico[] }>(CHIAVE_STORICO)?.allenamenti ?? null)
  const [presenze, setPresenze] = useState<Presenze | null>(() => inMemoria<Presenze>(CHIAVE_PRESENZE) ?? null)

  useFocusEffect(
    useCallback(() => {
      let vivo = true
      prendi(CHIAVE_STORICO, storicoAllenamenti).then((r) => vivo && setSedute((s) => (r.ok ? r.allenamenti : (s ?? []))))
      prendi(CHIAVE_PRESENZE, presenzeLezioni).then((r) => vivo && setPresenze((prima) => (r.ok ? r : (prima ?? { ok: true, presenze: [], schede: {} }))))
      return () => {
        vivo = false
      }
    }, []),
  )

  const ultime = useMemo(() => {
    if (corpo.stato !== 'ok' || !sedute || !presenze) return null
    return ultimeQuattroSettimane(vociCalorie(sedute, presenze.presenze, presenze.schede, corpo.corpo))
  }, [corpo, sedute, presenze])

  return { corpo, ultime }
}
