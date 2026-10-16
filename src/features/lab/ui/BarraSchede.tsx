import { BlurView } from 'expo-blur'
import { router, usePathname, type Href } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icona, type NomeIcona } from './Icona'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// La barra delle schede del laboratorio, agganciata al bordo in basso e larga
// quanto lo schermo, come nelle app (15/10/2026: prima era una pillola che
// galleggiava, e su iPhone lasciava sotto di se' una striscia di pagina). Sotto
// le icone c'e' lo spazio dell'indicatore Home (safe area). Dietro l'icona
// attiva scivola, con una molla, un velo arancio, e icona e nome si accendono.
// Si vede solo sulle quattro schermate principali (i pagamenti stanno nella Home).

const SCHEDE: { href: Href; percorso: string; titolo: string; icona: NomeIcona; anche?: string[] }[] = [
  { href: '/lab', percorso: '/lab', titolo: 'Home', icona: 'casa' },
  // Il personal training e' l'altra faccia di Prenotazioni (SceltaPrenotazioni).
  { href: '/lab/calendario', percorso: '/lab/calendario', titolo: 'Prenotazioni', icona: 'calendario', anche: ['/lab/personal'] },
  { href: '/lab/allenamento', percorso: '/lab/allenamento', titolo: 'Workout', icona: 'peso' },
  { href: '/lab/tv', percorso: '/lab/tv', titolo: 'TV', icona: 'play' },
]

const MOLLA = { damping: 20, stiffness: 220, mass: 0.7 }

export function schedaAttiva(percorso: string): number {
  const qui = percorso.replace(/\/+$/, '')
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

  // La prima volta il tondo si mette subito al suo posto; poi, cambiando
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
  return (
    <View style={[stili.ancora, { paddingBottom: Math.max(ins.bottom, 8), borderTopColor: p.linea, boxShadow: p.scuro ? '0 -8px 30px rgba(0,0,0,0.5)' : '0 -8px 30px rgba(20,20,40,0.08)' }]}>
      {/* Quasi piena, come una barra d'app: trasparente prendeva il colore delle schede sotto.
          Sull'app iOS il vetro vero; sul web (anche installata) un velo pieno con la sfocatura del browser. */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint={p.scuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: p.scuro ? 'rgba(18,18,20,0.94)' : 'rgba(255,255,255,0.95)' }, Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as object) : null]} />
      <View style={stili.fila} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {passo ? (
          <Animated.View style={[stili.cursore, { width: passo }, cursore]}>
            <View style={[stili.velo, { backgroundColor: p.scuro ? 'rgba(255,87,1,0.22)' : 'rgba(255,87,1,0.13)' }]} />
          </Animated.View>
        ) : null}
          {SCHEDE.map((s, i) => {
            const qui = i === attiva
            const colore = qui ? p.accento : p.testoSecondario
            return (
              <Tocco
                key={s.percorso}
                ruolo="tab"
                etichetta={s.titolo}
                stato={{ selected: qui }}
                vibra="scelta"
                scala={0.92}
                onPress={() => {
                  if (!qui) router.navigate(s.href)
                }}
                style={stili.scheda}
              >
                <Icona nome={s.icona} size={23} colore={colore} />
                <Text style={[stili.testo, { color: colore, fontFamily: qui ? F.extra : F.semi }]} numberOfLines={1}>
                  {s.titolo}
                </Text>
              </Tocco>
            )
          })}
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  ancora: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden', paddingTop: 6 },
  fila: { flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center' },
  // Il velo sta dietro l'icona, non dietro tutta la scheda: largo quanto basta.
  cursore: { position: 'absolute', top: 0, bottom: 0, left: 0, alignItems: 'center' },
  velo: { width: 58, height: 32, borderRadius: 16, marginTop: 2 },
  scheda: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 4, paddingTop: 6, paddingBottom: 4, minHeight: 56 },
  testo: { fontSize: 11, letterSpacing: -0.1 },
})
