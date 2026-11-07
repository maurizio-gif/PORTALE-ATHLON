import { LinearGradient } from 'expo-linear-gradient'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'

import { Icona } from './Icona'
import { useRiduciMovimento } from './movimento'
import { F, FUOCO, NOTTE } from './tema'

// L'esito di un pagamento con carta, raccontato da una carta (07/11/2026, dal reel «Glassy Payment Checkout» che Maurizio ha
// mandato come spunto): scura, col bordo arancio che pulsa mentre si aspetta la banca («Processing Secure Transaction…»); poi
// diventa verde con la spunta se il pagamento e' andato, o rossa, con una scossa e la croce, se la banca l'ha rifiutato.
//
// **E' solo un disegno dell'esito**: le cifre sono quelle che il server conosce (le ultime quattro di una carta salvata o del
// pagamento), mai quelle che la persona scrive. Il numero, la scadenza e il CVC stanno nei campi sicuri di Adyen, che la nostra
// pagina non puo' leggere e non deve leggere. Non e' un'anteprima della carta che si compila.
//
// «Riduci movimento»: niente pulsazione, riflesso, scossa ne' saltelli. Il cambio di colore, che porta l'informazione, resta ma
// senza transizione.

export type StatoCartaEsito = 'in_corso' | 'ok' | 'attenzione' | 'errore'

const LARGHEZZA = 264
const ALTEZZA = 166
const RAGGIO = 20

// 0 = scura con bordo arancio, 1 = verde, 2 = rossa.
const COLORE: Record<StatoCartaEsito, 0 | 1 | 2> = { in_corso: 0, attenzione: 0, ok: 1, errore: 2 }
const BORDO = [FUOCO[0], '#3DDC84', '#FF6B5E'] as const
const VERDE = ['#1FA463', '#0F6E3F', '#0A4F2D'] as const
const ROSSO = ['#E0483D', '#A8261D', '#6E140F'] as const
const ORO = ['#F6D272', '#C79A2E'] as const
const TONO_BOLLINO: Record<StatoCartaEsito, string> = { in_corso: '#18191C', ok: '#2BB673', attenzione: '#E8A317', errore: '#E5484D' }

const MARCHE: Record<string, string> = {
  visa: 'VISA',
  mc: 'MASTERCARD',
  mastercard: 'MASTERCARD',
  amex: 'AMEX',
  maestro: 'MAESTRO',
  diners: 'DINERS',
  discover: 'DISCOVER',
  jcb: 'JCB',
  cartebancaire: 'CARTE BANCAIRE',
}

/** La sigla della marca di una carta, in stampatello, se la si conosce (un metodo che non e' una carta non ne ha). */
export function siglaMarca(marca?: string | null): string | null {
  return marca ? (MARCHE[marca.toLowerCase().replace(/[\s_-]/g, '')] ?? null) : null
}

export function CartaEsito({ stato, cifre, marca }: { stato: StatoCartaEsito; cifre?: string | null; marca?: string | null }) {
  const fermo = useRiduciMovimento()
  const colore = useSharedValue(COLORE[stato])
  const alone = useSharedValue(0)
  const scalaAlone = useSharedValue(1)
  const luce = useSharedValue(0)
  const scossa = useSharedValue(0)
  const scala = useSharedValue(1)
  const giro = useSharedValue(0)

  useEffect(() => {
    const destinazione = COLORE[stato]
    for (const v of [alone, scalaAlone, luce, scossa, scala, giro]) cancelAnimation(v)
    luce.value = 0
    scossa.value = 0
    scala.value = 1
    scalaAlone.value = 1
    giro.value = 0

    if (fermo) {
      colore.value = destinazione
      alone.value = stato === 'ok' || stato === 'errore' ? 0.28 : 0.16
      return
    }

    colore.value = withTiming(destinazione, { duration: 600 })
    if (stato === 'in_corso') {
      alone.value = withRepeat(withSequence(withTiming(0.4, { duration: 900 }), withTiming(0.14, { duration: 900 })), -1)
      scalaAlone.value = withRepeat(withSequence(withTiming(1.05, { duration: 900 }), withTiming(1, { duration: 900 })), -1)
      luce.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1)
      giro.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1)
    } else if (stato === 'ok') {
      alone.value = withSequence(withTiming(0.5, { duration: 250 }), withTiming(0.26, { duration: 900 }))
      scala.value = withSequence(withTiming(1.05, { duration: 180 }), withSpring(1, { damping: 10 }))
      luce.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) })
    } else if (stato === 'errore') {
      alone.value = withSequence(withTiming(0.5, { duration: 200 }), withTiming(0.24, { duration: 800 }))
      scossa.value = withSequence(
        withTiming(-9, { duration: 50 }),
        withTiming(9, { duration: 90 }),
        withTiming(-7, { duration: 90 }),
        withTiming(7, { duration: 90 }),
        withTiming(-3, { duration: 80 }),
        withTiming(0, { duration: 60 }),
      )
    } else {
      alone.value = withTiming(0.16, { duration: 400 })
    }
  }, [stato, fermo, colore, alone, scalaAlone, luce, scossa, scala, giro])

  const stileCarta = useAnimatedStyle(() => ({ transform: [{ translateX: scossa.value }, { scale: scala.value }] }))
  const stileAlone = useAnimatedStyle(() => ({
    opacity: alone.value,
    backgroundColor: interpolateColor(colore.value, [0, 1, 2], BORDO as unknown as string[]),
    transform: [{ scale: scalaAlone.value }],
  }))
  const stileBordo = useAnimatedStyle(() => ({ borderColor: interpolateColor(colore.value, [0, 1, 2], BORDO as unknown as string[]) }))
  const stileVerde = useAnimatedStyle(() => ({ opacity: interpolate(colore.value, [0, 1, 2], [0, 1, 0]) }))
  const stileRosso = useAnimatedStyle(() => ({ opacity: interpolate(colore.value, [0, 1, 2], [0, 0, 1]) }))
  const stileLuce = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(luce.value, [0, 1], [-110, LARGHEZZA + 20]) }, { skewX: '-18deg' }] }))
  const stileGiro = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }))

  const cifreVere = (cifre ?? '').replace(/\D/g, '').slice(-4)
  const sigla = siglaMarca(marca)
  // Con «riduci movimento» il cerchio che gira non c'e': si mette la clessidra.
  const girando = stato === 'in_corso' && !fermo
  const icona = stato === 'ok' ? 'spunta' : stato === 'errore' ? 'chiudi' : 'clessidra'

  return (
    <View style={stili.scena} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[stili.alone, stileAlone]} />
      <Animated.View entering={fermo ? undefined : FadeIn.duration(350)} style={[stili.carta, stileCarta]}>
        <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, stileVerde]}>
          <LinearGradient colors={VERDE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, stileRosso]}>
          <LinearGradient colors={ROSSO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        {/* Il vetro: un velo piu' chiaro in alto. */}
        <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }} style={StyleSheet.absoluteFill} />

        <View style={stili.testa}>
          <LinearGradient colors={ORO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.chip} />
          <Text style={stili.club}>ATHLON</Text>
        </View>
        <Text style={stili.numero} numberOfLines={1}>
          {`•••• •••• •••• ${cifreVere.length === 4 ? cifreVere : '••••'}`}
        </Text>
        <View style={stili.piede}>
          {sigla ? <Text style={stili.marca}>{sigla}</Text> : null}
        </View>

        <Animated.View style={[stili.luce, stileLuce]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.26)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[stili.bordo, stileBordo]} />
      </Animated.View>

      <Animated.View key={stato} entering={fermo ? undefined : ZoomIn.springify().damping(12)} style={[stili.bollino, { backgroundColor: TONO_BOLLINO[stato] }]}>
        {girando ? <Animated.View style={[stili.cerchio, stileGiro]} /> : <Icona nome={icona} size={22} colore="#fff" />}
      </Animated.View>
    </View>
  )
}

const stili = StyleSheet.create({
  // Sotto la carta c'e' posto per il bollino, che la sfiora dal basso.
  scena: { width: LARGHEZZA, height: ALTEZZA + 26, alignSelf: 'center', alignItems: 'center' },
  alone: { position: 'absolute', top: -4, left: -6, width: LARGHEZZA + 12, height: ALTEZZA + 8, borderRadius: RAGGIO + 6 },
  carta: { width: LARGHEZZA, height: ALTEZZA, borderRadius: RAGGIO, overflow: 'hidden', padding: 18, justifyContent: 'space-between' },
  bordo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RAGGIO, borderWidth: 1.5 },
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { width: 36, height: 27, borderRadius: 6 },
  club: { fontFamily: F.extra, fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.75)' },
  numero: { fontFamily: F.bold, fontSize: 17, letterSpacing: 2, color: 'rgba(255,255,255,0.94)' },
  piede: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minHeight: 20 },
  marca: { fontFamily: F.extra, fontSize: 14, fontStyle: 'italic', letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
  luce: { position: 'absolute', top: -10, bottom: -10, left: 0, width: 90 },
  bollino: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
  },
  cerchio: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: FUOCO[0], borderTopColor: 'transparent' },
})
