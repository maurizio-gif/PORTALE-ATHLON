import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

// Il richiamo per la foto del Profilo e della testata della Home (20/10/2026): un anello che si allarga e svanisce, tre volte di fila, poi una
// pausa; tre raffiche in tutto (una trentina di secondi) e poi sta fermo fino alla prossima apertura.
//
// **Lampeggiante ma discreto**, e la discrezione e' fatta di quattro cose: piccolo (un anello, non un riquadro),
// lento (un secondo e mezzo per anello), nel colore del club, e **finisce da solo** - un'animazione che non si
// ferma mai e' una cosa che dopo una settimana si smette di vedere o si smette di sopportare. Con «riduci
// movimento» non si muove affatto: l'invito resta nel testo e nel pulsante, e il richiamo non c'e'.
//
// Un'unica animazione sul valore `t` (0 → 1 per anello): opacita' e scala se ne ricavano, come per gli altri
// effetti dell'app (`useProgresso`, la ruota di Fit): proprieta' semplici di una View, niente sull'SVG.

const COLPI_PER_RAFFICA = 3
const RAFFICHE = 3
const DURATA_COLPO_MS = 1500
const PAUSA_FRA_RAFFICHE_MS = 4500
/** Quanto e' visibile l'anello appena nato. */
const OPACITA = 0.7

/** L'anello. Si mette dentro una View delle misure del comando, e la riempie: `raggio` e' quello del comando. */
export function Richiamo({ raggio, colore, ingrandimento = 1.3, spessore = 2 }: { raggio: number; colore: string; /** Di quanto cresce prima di sparire. */ ingrandimento?: number; spessore?: number }) {
  const fermo = useReducedMotion()
  const t = useSharedValue(0)

  useEffect(() => {
    if (fermo) return
    const colpo = withSequence(withTiming(1, { duration: DURATA_COLPO_MS, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 }))
    const raffica = withSequence(withRepeat(colpo, COLPI_PER_RAFFICA, false), withDelay(PAUSA_FRA_RAFFICHE_MS, withTiming(0, { duration: 0 })))
    t.value = withRepeat(raffica, RAFFICHE, false)
    // Assegnare un valore ferma l'animazione: uscendo dalla schermata non resta niente che gira.
    return () => {
      t.value = 0
    }
  }, [fermo, t])

  const stile = useAnimatedStyle(() => ({
    // A riposo (t = 0) l'anello non si vede: dopo l'ultima raffica non resta un contorno fisso.
    opacity: t.value === 0 ? 0 : OPACITA * (1 - t.value),
    transform: [{ scale: 1 + (ingrandimento - 1) * t.value }],
  }))

  if (fermo) return null
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: raggio, borderWidth: spessore, borderColor: colore }, stile]} />
}
