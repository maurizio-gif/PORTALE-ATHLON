import { useEventListener } from 'expo'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import { urlEsercizio } from '@/api/lab'

import { Icona } from '../ui/Icona'
import { usePalette } from '../ui/tema'

// L'esercizio che si muove: il video breve del club (MP4 di pochi secondi,
// muto, in loop) quando c'e'; altrimenti le due foto di free-exercise-db (la
// posizione di partenza e quella d'arrivo) che si alternano in dissolvenza,
// come un'animazione a due fotogrammi. I video li carica il club dal CRM.

function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })
  // Sul web il play() della preparazione arriva prima del <video>: si riparte.
  useEffect(() => {
    player.play()
  }, [player])
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && !player.playing) player.play()
  })
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} playsInline />
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
        <Video uri={urlVideo} />
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
