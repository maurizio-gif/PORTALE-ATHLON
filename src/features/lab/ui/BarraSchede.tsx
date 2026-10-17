import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { router, usePathname, type Href } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { tinta } from '@/theme'

import { clubLifeDaCapo } from '../clublife/daCapo'
import { Icona, type NomeIcona } from './Icona'
import { usePalette } from './tema'
import { Tocco } from './Tocco'

// La barra delle schede del laboratorio, come quella di Instagram (17/10/2026):
// una pillola di vetro che galleggia sopra la pagina, staccata dai bordi e dal
// bordo dello schermo, con le sole icone. Dietro l'icona attiva scivola, con una
// molla, un velo tondo piu' chiaro. Il 15/10 era stata agganciata al bordo perche'
// su iPhone sotto la pillola restava una striscia di pagina tagliata a meta': ora
// sotto c'e' una sfumatura del colore del fondo, che quella striscia la copre.
// Si vede solo sulle cinque schermate principali (i pagamenti stanno nella Home).
// Senza nomi sotto le icone: il nome resta per chi usa lo screen reader.

const SCHEDE: { href: Href; percorso: string; titolo: string; icona: NomeIcona; anche?: string[] }[] = [
  { href: '/', percorso: '/', titolo: 'Home', icona: 'casa' },
  // Il personal training e' l'altra faccia di Prenotazioni (SceltaPrenotazioni).
  { href: '/calendario', percorso: '/calendario', titolo: 'Prenotazioni', icona: 'calendario', anche: ['/personal'] },
  { href: '/allenamento', percorso: '/allenamento', titolo: 'Workout', icona: 'peso' },
  { href: '/tv', percorso: '/tv', titolo: 'TV', icona: 'play' },
  // News, eventi e Help Desk, coi dati del sito (clublife/ClubLife).
  { href: '/club-life', percorso: '/club-life', titolo: 'Club Life', icona: 'persone' },
]

const MOLLA = { damping: 20, stiffness: 220, mass: 0.7 }

/** La pillola: 46 di scheda da toccare e 6 di respiro sopra e sotto. */
export const ALTEZZA_BARRA = 58
const RESPIRO = 6
/** Quanto resta libero a destra e a sinistra della pillola. */
const MARGINE_LATO = 20
/** Quanto sale la sfumatura sopra la pillola. */
const SFUMATURA = 28

/**
 * Da quanto in basso sta la pillola: un poco sotto l'indicatore Home, come in
 * iOS 26, dove le barre seguono l'angolo tondo dello schermo; almeno 14.
 */
export const bassoBarra = (bottom: number) => Math.max(bottom - 12, 14)

/**
 * Quanto spazio prende la barra dal bordo in basso: chi scorre sotto di lei lascia
 * almeno questo, o l'ultima riga finisce nascosta.
 */
export const ingombroBarra = (bottom: number) => bassoBarra(bottom) + ALTEZZA_BARRA

export function schedaAttiva(percorso: string): number {
  // La Home e' la radice: tolto lo slash finale resterebbe una stringa vuota.
  const qui = percorso.replace(/\/+$/, '') || '/'
  return SCHEDE.findIndex((s) => s.percorso === qui || s.anche?.includes(qui))
}

export function BarraSchede() {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const percorso = usePathname()
  const attiva = schedaAttiva(percorso)
  const [larghezza, setLarghezza] = useState(0)
  const x = useSharedValue(0)
  const passo = larghezza / SCHEDE.length

  // La prima volta il velo si mette subito al suo posto; poi, cambiando
  // scheda, ci scivola con la molla.
  const piazzato = useRef(false)
  useEffect(() => {
    if (attiva < 0 || !passo) return
    if (!piazzato.current) {
      x.value = attiva * passo
      piazzato.current = true
    } else x.value = withSpring(attiva * passo, MOLLA)
  }, [attiva, passo, x])

  const cursore = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  if (attiva < 0) return null

  // Il vetro vero sull'app iOS; sul web (anche installata) un velo con la sfocatura
  // del browser; su Android niente sfocatura, quindi un velo quasi pieno.
  const sfocato = Platform.OS !== 'android'
  const velo = sfocato ? (p.scuro ? 'rgba(24,24,27,0.58)' : 'rgba(255,255,255,0.72)') : p.scuro ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.96)'
  const web = Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } as object) : null

  return (
    <View pointerEvents="box-none" style={[stili.sopra, { height: ingombroBarra(ins.bottom) + SFUMATURA }]}>
      <LinearGradient pointerEvents="none" colors={[tinta(p.fondo, 0), tinta(p.fondo, 0.92)]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={[stili.ancora, { bottom: bassoBarra(ins.bottom) }]}>
        <View style={[stili.pillola, { boxShadow: p.scuro ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(18,19,22,0.16)' }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, stili.vetro, { borderColor: p.scuro ? 'rgba(255,255,255,0.14)' : 'rgba(18,19,22,0.07)' }]}>
            {Platform.OS === 'ios' ? <BlurView intensity={60} tint={p.scuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: velo }, web]} />
          </View>
          <View style={stili.fila} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} accessibilityRole="tablist">
            {passo ? (
              <Animated.View pointerEvents="none" style={[stili.cursore, { width: passo }, cursore]}>
                <View style={[stili.velo, { backgroundColor: p.scuro ? 'rgba(255,255,255,0.16)' : 'rgba(18,19,22,0.08)' }]} />
              </Animated.View>
            ) : null}
            {SCHEDE.map((s, i) => {
              const qui = i === attiva
              const colore = qui ? p.testo : p.scuro ? 'rgba(255,255,255,0.72)' : 'rgba(18,19,22,0.6)'
              return (
                <Tocco
                  key={s.percorso}
                  ruolo="tab"
                  etichetta={s.titolo}
                  stato={{ selected: qui }}
                  vibra="scelta"
                  scala={0.88}
                  onPress={() => {
                    if (!qui) router.navigate(s.href)
                    else if (s.percorso === '/club-life') clubLifeDaCapo()
                  }}
                  style={stili.scheda}
                >
                  <Icona nome={s.icona} size={24} colore={colore} />
                </Tocco>
              )
            })}
          </View>
        </View>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  // Sopra le schermate, ma senza prendere i tocchi: solo la pillola li prende.
  sopra: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ancora: { position: 'absolute', left: MARGINE_LATO, right: MARGINE_LATO, alignItems: 'center' },
  pillola: { width: '100%', maxWidth: 420, height: ALTEZZA_BARRA, borderRadius: ALTEZZA_BARRA / 2, padding: RESPIRO },
  vetro: { borderRadius: ALTEZZA_BARRA / 2, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  fila: { flex: 1, flexDirection: 'row' },
  // Il velo sta dietro l'icona attiva: una scheda intera, tonda come la pillola.
  cursore: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  velo: { flex: 1, borderRadius: 999 },
  scheda: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
