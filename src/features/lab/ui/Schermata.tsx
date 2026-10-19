import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { router, useIsFocused, type Href } from 'expo-router'
import type { ReactNode, Ref } from 'react'
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LARGO } from '@/components/Pagina'
import { spazio } from '@/theme'

import { useSegnaAzioneInAlto } from '../feedback/posizione'
import { ingombroBarra } from './BarraSchede'
import { Icona } from './Icona'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// La cornice delle schermate del laboratorio, come un'app: il titolo grande in
// alto che, scorrendo, lascia il posto a una testata sottile e sfocata col
// titolo piccolo; sotto, lo spazio per la barra delle schede. Niente dati
// legali in fondo, a differenza delle pagine pubbliche: nel laboratorio sotto
// c'e' solo il menu (scelta dell'utente, 14/10/2026).
//
// Il marchio Athlon e' sempre in vista (15/10/2026): nella riga in alto di ogni
// schermata e, scorrendo, nella testata sottile, cosi' e' sempre chiaro che e'
// l'app del club.

const PITTOGRAMMA = require('@/../assets/images/pittogramma.png')

/** Il marchio: il pittogramma arancio e il nome. */
export function Marchio({ piccolo = false }: { piccolo?: boolean }) {
  const p = usePalette()
  return (
    <View style={stili.marchio} accessibilityLabel="Athlon Club" accessibilityRole="image">
      <Image source={PITTOGRAMMA} style={piccolo ? stili.pittogrammaPiccolo : stili.pittogramma} contentFit="contain" />
      {piccolo ? null : <Text style={[stili.nomeClub, { color: p.testo }]}>Athlon Club</Text>}
    </View>
  )
}

/**
 * La larghezza della colonna da schermo largo, UNA per tutta l'app: la Home, le
 * sue sezioni, il dettaglio di un abbonamento o di una scheda stanno nella stessa
 * colonna. Prima c'era una colonna larga (1180) per le schermate a piu' colonne e
 * una stretta (760) per le altre, e passando dall'una all'altra il contenuto
 * saltava di larghezza (16/10/2026).
 */
export const LARGHEZZA_APP = 1180

export function Schermata({
  titolo,
  sopratitolo,
  sottotitolo,
  indietro,
  destra,
  barra = true,
  sopra,
  nascondiTitolo = false,
  scorrimento,
  children,
}: {
  /** Per far scorrere la schermata da fuori (la Home scende all'elenco dei certificati). */
  scorrimento?: Ref<Animated.ScrollView>
  /** Il titolo grande lo disegna `sopra`: qui resta solo quello piccolo della testata. */
  nascondiTitolo?: boolean
  titolo: string
  /** La riga piccola arancione sopra il titolo. */
  sopratitolo?: string
  sottotitolo?: string
  /** Dove porta la freccia in alto a sinistra; senza, niente freccia. */
  indietro?: Href
  /** Un'azione in alto a destra (un avatar, un bottone tondo). */
  destra?: ReactNode
  /** C'e' la barra delle schede sotto: si lascia il suo spazio. */
  barra?: boolean
  /** Qualcosa sopra il titolo, a tutta larghezza (la testata dell'accesso). */
  sopra?: ReactNode
  children: ReactNode
}) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const maxWidth = width < LARGO ? 640 : LARGHEZZA_APP
  // Il pulsante «Feedback» sta in alto a destra, nel posto di `destra`: se qui c'e' un comando, gli si fa posto
  // (solo finche' la schermata e' quella che si vede, vedi feedback/posizione.ts).
  useSegnaAzioneInAlto(!!destra, useIsFocused())
  const y = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y
  })
  const testata = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [30, 70], [0, 1], Extrapolation.CLAMP) }))
  const titoloPiccolo = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [50, 80], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [50, 80], [6, 0], Extrapolation.CLAMP) }],
  }))
  const titoloGrande = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 60], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(y.value, [-100, 0], [1.08, 1], Extrapolation.CLAMP) }],
  }))

  const freccia = indietro ? (
    <Tocco
      onPress={() => (router.canGoBack() ? router.back() : router.replace(indietro))}
      etichetta="Indietro"
      style={[stili.tondo, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}
    >
      <Icona nome="indietro" size={18} colore={p.testo} />
    </Tocco>
  ) : null

  return (
    <View style={[stili.fondo, { backgroundColor: p.fondo }]}>
      <Animated.ScrollView
        ref={scorrimento}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: barra ? ingombroBarra(ins.bottom) + spazio.tre : spazio.cinque + ins.bottom, paddingTop: sopra ? 0 : ins.top + spazio.tre }}
      >
        {sopra}
        <View style={[stili.colonna, { maxWidth }]}>
          <View style={stili.barraAlta}>
            <View style={stili.sinistra}>
              {freccia}
              <Marchio />
            </View>
            {destra}
          </View>
          {nascondiTitolo ? null : (
            <Animated.View style={[stili.titoli, titoloGrande, { transformOrigin: 'left' }]}>
              {sopratitolo ? <Text style={[stili.sopratitolo, { color: p.accento }]}>{sopratitolo.toUpperCase()}</Text> : null}
              <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
                {titolo}
              </Text>
              {sottotitolo ? <Text style={[stili.sottotitolo, { color: p.testoSecondario }]}>{sottotitolo}</Text> : null}
            </Animated.View>
          )}
          <View style={[stili.contenuto, nascondiTitolo && { marginTop: 0 }]}>{children}</View>
        </View>
      </Animated.ScrollView>

      {/* La testata sottile che compare scorrendo. Non prende i tocchi: anche
          trasparente, sopra la freccia indietro se li prendeva (14/10/2026). */}
      <Animated.View pointerEvents="none" style={[stili.testata, { paddingTop: ins.top, height: ins.top + 52 }, testata]}>
        {Platform.OS === 'android' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: p.vetro }]} />
        ) : (
          <BlurView intensity={60} tint={p.scuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { top: undefined, height: StyleSheet.hairlineWidth, backgroundColor: p.linea }]} />
        <View style={[stili.marchioTestata, { top: ins.top }]}>
          <Marchio piccolo />
        </View>
        <Animated.Text numberOfLines={1} style={[stili.titoloPiccolo, { color: p.testo }, titoloPiccolo]}>
          {titolo}
        </Animated.Text>
      </Animated.View>
    </View>
  )
}

/** Un bottone tondo con un'icona, per le testate. */
export function BottoneTondo({ icona, onPress, etichetta }: { icona: Parameters<typeof Icona>[0]['nome']; onPress: () => void; etichetta: string }) {
  const p = usePalette()
  return (
    <Tocco onPress={onPress} etichetta={etichetta} style={[stili.tondo, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
      <Icona nome={icona} size={18} colore={p.testo} />
    </Tocco>
  )
}

const stili = StyleSheet.create({
  fondo: { flex: 1 },
  colonna: { width: '100%', alignSelf: 'center', paddingHorizontal: spazio.tre + 2 },
  barraAlta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spazio.tre, minHeight: 44 },
  sinistra: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  marchio: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  pittogramma: { width: 30, height: 24 },
  pittogrammaPiccolo: { width: 24, height: 19 },
  nomeClub: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  marchioTestata: { position: 'absolute', left: spazio.tre + 2, height: 52, justifyContent: 'center' },
  tondo: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  titoli: { gap: 6, paddingHorizontal: 2 },
  sopratitolo: { fontSize: 12, fontFamily: F.extra, letterSpacing: 1.6 },
  titolo: { fontSize: 34, lineHeight: 40, fontFamily: F.extra, letterSpacing: -1.2 },
  sottotitolo: { fontSize: 15.5, lineHeight: 22, fontFamily: F.medio },
  contenuto: { marginTop: spazio.quattro, gap: spazio.quattro + 4 },
  testata: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  titoloPiccolo: { fontSize: 16, fontFamily: F.extra, letterSpacing: -0.3, paddingHorizontal: 64 },
})
