import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'

import { statoAlimentazione, type StatoAlimentazione, type VoceDiario } from '@/api/alimentazione'
import { presenzeLezioni, storicoAllenamenti, type SedutaStorico } from '@/api/lab'

import { useDispositivi } from '../dispositivi/useDispositivi'
import { CHIAVE_DIARIO, CHIAVE_STATO, leggiDiarioRecente } from '../alimentazione/chiavi'
import { inMemoria, prendi } from '../memoria'
import { useStatoCorpo, type StatoCorpo } from '../schede/CalorieLezione'
import { CHIAVE_PRESENZE, type Presenze } from '../schede/ContatoreCalorie'
import { contaCalorie, vociCalorie, type Voce } from '../schede/contatoreCalorie'
import { CHIAVE_STORICO } from '../schede/Storico'
import { vistaCorrente } from '../vista'
import { sessioniDa, type Sessione } from './calcoloPunteggio'

// I dati di Fit (19/10/2026), per il riquadro Balance, la sua schermata e l'area
// Food: lo stato di Food (consenso, questionario, numeri nascosti), il diario,
// e le attivita' contate dal contatore delle calorie. Tutto dalla memoria del
// laboratorio, con le stesse chiavi del diario e del contatore: si apre subito
// con l'ultimo dato e, ogni volta che si torna su Fit, si rilegge (scrivere un
// pasto nel diario deve cambiare il Balance appena si torna indietro).

type Stato = { ok: true } & StatoAlimentazione

export type DatiFit = {
  /** La vista cliente dello staff: Food non si apre, e il Balance mostra solo il consumo. */
  vista: boolean
  /** null finche' non si sa; nella vista cliente resta null. */
  food: Stato | null
  foodErrore: string | null
  diario: VoceDiario[] | null
  corpo: StatoCorpo
  /** Le attivita' del contatore; null finche' non arrivano o se mancano i dati del corpo. */
  attivita: Voce[] | null
  /** Il consenso c'e' e i numeri non sono nascosti: si possono confrontare le due cifre. */
  conDiario: boolean
  /**
   * Le sessioni di allenamento (sedute chiuse e lezioni con la presenza) per l'Athlon Health Score: a differenza di
   * `attivita` non servono peso, altezza e sesso, perche' il punteggio conta i giorni e non le calorie. null finche' non arrivano.
   */
  sessioni: Sessione[] | null
}

export function useFit(): DatiFit {
  const vista = !!vistaCorrente()
  const corpo = useStatoCorpo()
  // Gli allenamenti dei dispositivi e quelli scritti a mano (28/10/2026): solo con il consenso ai dispositivi (altrimenti `dati` e' null).
  const dispositivi = useDispositivi().dati?.allenamenti ?? null
  const [food, setFood] = useState<Stato | null>(() => (vista ? null : (inMemoria<Stato>(CHIAVE_STATO) ?? null)))
  const [foodErrore, setFoodErrore] = useState<string | null>(null)
  const [diario, setDiario] = useState<VoceDiario[] | null>(() => inMemoria<{ voci: VoceDiario[] }>(CHIAVE_DIARIO)?.voci ?? null)
  const [sedute, setSedute] = useState<SedutaStorico[] | null>(() => inMemoria<{ allenamenti: SedutaStorico[] }>(CHIAVE_STORICO)?.allenamenti ?? null)
  const [presenze, setPresenze] = useState<Presenze | null>(() => inMemoria<Presenze>(CHIAVE_PRESENZE) ?? null)

  useFocusEffect(
    useCallback(() => {
      let vivo = true
      // Prima quello che c'e' in memoria (il diario appena cambiato), poi la lettura nuova.
      setDiario((d) => inMemoria<{ voci: VoceDiario[] }>(CHIAVE_DIARIO)?.voci ?? d)
      if (!vista) {
        setFood((f) => inMemoria<Stato>(CHIAVE_STATO) ?? f)
        prendi(CHIAVE_STATO, statoAlimentazione).then((r) => {
          if (!vivo) return
          if (!r.ok) return setFoodErrore(r.errore)
          setFoodErrore(null)
          setFood(r)
          if (r.consenso) prendi(CHIAVE_DIARIO, leggiDiarioRecente).then((d) => vivo && d.ok && setDiario(d.voci))
        })
      }
      prendi(CHIAVE_STORICO, storicoAllenamenti).then((r) => vivo && setSedute((s) => (r.ok ? r.allenamenti : (s ?? []))))
      prendi(CHIAVE_PRESENZE, presenzeLezioni).then((r) => vivo && setPresenze((prima) => (r.ok ? r : (prima ?? { ok: true, presenze: [], schede: {} }))))
      return () => {
        vivo = false
      }
    }, [vista]),
  )

  const attivita = useMemo(() => {
    if (corpo.stato !== 'ok' || !sedute || !presenze) return null
    return contaCalorie(vociCalorie(sedute, presenze.presenze, presenze.schede, corpo.corpo, dispositivi ?? []), corpo.corpo).voci
  }, [corpo, sedute, presenze, dispositivi])

  const sessioni = useMemo(() => (sedute && presenze ? sessioniDa(sedute, presenze.presenze, dispositivi ?? []) : null), [sedute, presenze, dispositivi])

  const conDiario = !vista && !!food?.consenso && !!food.profilo && !food.profilo.nascondi_numeri && food.maggiorenne
  return { vista, food, foodErrore, diario: food?.consenso ? diario : null, corpo, attivita, conDiario, sessioni }
}
