import { BlurView } from 'expo-blur'
import { router, usePathname, type Href } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icona, type NomeIcona } from './Icona'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// La barra delle schede del laboratorio: una pillola di vetro che galleggia in
// basso; dietro la scheda attiva scivola, con una molla, un tondo scuro, e la
// sua icona si accende d'arancio. Si vede solo sulle quattro schermate principali.

const SCHEDE: { href: Href; percorso: string; titolo: string; icona: NomeIcona }[] = [
  { href: '/lab', percorso: '/lab', titolo: 'Home', icona: 'casa' },
  { href: '/lab/calendario', percorso: '/lab/calendario', titolo: 'Prenotazioni', icona: 'calendario' },
  { href: '/lab/tv', percorso: '/lab/tv', titolo: 'TV', icona: 'play' },
  { href: '/lab/pagamenti', percorso: '/lab/pagamenti', titolo: 'Pagamenti', icona: 'carta' },
]

const MOLLA = { damping: 20, stiffness: 220, mass: 0.7 }

export function schedaAttiva(percorso: string): number {
  return SCHEDE.findIndex((s) => s.percorso === percorso.replace(/\/+$/, ''))
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
    <View pointerEvents="box-none" style={[stili.ancora, { paddingBottom: Math.max(ins.bottom, 12) }]}>
      <View style={[stili.pillola, { borderColor: p.linea, boxShadow: p.scuro ? '0 12px 40px rgba(0,0,0,0.6)' : '0 12px 40px rgba(20,20,40,0.16)' }]}>
        {Platform.OS === 'android' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: p.vetro }]} />
        ) : (
          <BlurView intensity={70} tint={p.scuro ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { backgroundColor: p.vetro }]} />
        )}
        <View style={stili.fila} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {passo ? <Animated.View style={[stili.cursore, { width: passo, backgroundColor: p.scuro ? '#F4F4F5' : p.carbone }, cursore]} /> : null}
          {SCHEDE.map((s, i) => {
            const qui = i === attiva
            const colore = qui ? p.accento : p.testoSecondario
            const coloreTesto = qui ? (p.scuro ? p.carbone : '#FFFFFF') : p.testoSecondario
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
                <Icona nome={s.icona} size={22} colore={colore} />
                <Text style={[stili.testo, { color: coloreTesto, fontFamily: qui ? F.extra : F.semi }]} numberOfLines={1}>
                  {s.titolo}
                </Text>
              </Tocco>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  ancora: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 14 },
  pillola: { width: '100%', maxWidth: 480, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: 6 },
  fila: { flexDirection: 'row' },
  cursore: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 22 },
  scheda: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 9, borderRadius: 22 },
  testo: { fontSize: 10.5 },
})
