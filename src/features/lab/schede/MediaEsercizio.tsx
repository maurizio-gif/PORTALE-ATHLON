import { useEventListener } from 'expo'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect, useState } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import { urlEsercizio } from '@/api/lab'

import { Icona } from '../ui/Icona'
import { usePalette } from '../ui/tema'

// L'esercizio che si muove: il video breve (MP4 di pochi secondi, muto, in
// loop) quando c'e'. Quelli della libreria MoveKit hanno tutti il video e un
// poster (`immagini[0]`), che sta sotto: si vede mentre il video si carica e
// nelle miniature ferme. Se il video non c'e' (un esercizio del club che non
// l'ha ancora) restano le due foto in dissolvenza, come un'animazione a due
// fotogrammi; senza niente, il segnaposto. Il club carica i suoi video dal CRM.

function Video({ uri }: { uri: string }) {
  // Il video appare quando e' pronto: prima si vede il poster, non un riquadro nero.
  const [pronto, setPronto] = useState(false)
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })
  // Sul web il play() della preparazione arriva prima del <video>: si riparte.
  useEffect(() => {
    player.play()
    if (player.status === 'readyToPlay') setPronto(true)
    // Se l'evento di «pronto» non arriva (sul web puo' precedere l'ascolto) il video si mostra lo stesso.
    const t = setTimeout(() => setPronto(true), 1500)
    return () => clearTimeout(t)
  }, [player])
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      setPronto(true)
      if (!player.playing) player.play()
    }
  })
  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFill, { opacity: pronto ? 1 : 0 }]}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      playsInline
    />
  )
}

function DueFotogrammi({ prima, seconda, ferma }: { prima: string; seconda: string | null; ferma: boolean }) {
  const o = useSharedValue(0)
  useEffect(() => {
    if (!seconda || ferma) {
      o.value = 0
      return
    }
    // Un secondo in partenza, la dissolvenza, un secondo in arrivo, e indietro.
    o.value = withRepeat(
      withSequence(
        withDelay(900, withTiming(1, { duration: 450, easing: Easing.inOut(Easing.quad) })),
        withDelay(900, withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) })),
      ),
      -1,
    )
  }, [seconda, ferma, o])
  const stile = useAnimatedStyle(() => ({ opacity: o.value }))
  return (
    <>
      <Image source={{ uri: prima }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      {seconda ? (
        <Animated.View style={[StyleSheet.absoluteFill, stile]}>
          <Image source={{ uri: seconda }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ) : null}
    </>
  )
}

export function MediaEsercizio({
  immagini,
  video,
  style,
  ferma = false,
}: {
  immagini: string[]
  video: string | null
  style?: StyleProp<ViewStyle>
  /** Le miniature negli elenchi stanno ferme: si muove solo l'esercizio aperto. */
  ferma?: boolean
}) {
  const p = usePalette()
  const urlVideo = ferma ? null : urlEsercizio(video)
  const prima = urlEsercizio(immagini[0])
  return (
    <View style={[stili.cornice, { backgroundColor: p.incavo }, style]}>
      {urlVideo ? (
        <>
          {prima ? <Image source={{ uri: prima }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <Video uri={urlVideo} />
        </>
      ) : prima ? (
        <DueFotogrammi prima={prima} seconda={urlEsercizio(immagini[1])} ferma={ferma} />
      ) : (
        <View style={[StyleSheet.absoluteFill, stili.vuoto]}>
          <Icona nome="peso" size={28} colore={p.testoTerzo} />
        </View>
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  cornice: { overflow: 'hidden', backgroundColor: '#fff' },
  vuoto: { alignItems: 'center', justifyContent: 'center' },
})
