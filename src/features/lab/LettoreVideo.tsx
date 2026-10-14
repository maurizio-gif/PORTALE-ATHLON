import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { apriVideo, type VideoDaGuardare } from '@/api/lab'
import { spazio } from '@/theme'

import { Icona } from './ui/Icona'
import { Carta, Messaggio, Pulsante, Riga, Scheletro, Sezione } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { durata, vetrineInMemoria } from './Video'

// Il lettore di un video del club: il video in alto (HLS nell'app, MP4 sul
// web, dove Chrome non riproduce HLS da solo), poi titolo, descrizione e gli
// altri video dello stesso showcase. Si chiedono i link solo adesso, perche'
// quelli di Vimeo scadono.

function Lettore({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play()
  })
  return <VideoView player={player} style={stili.video} contentFit="contain" nativeControls allowsPictureInPicture fullscreenOptions={{ enable: true }} playsInline />
}

export function LettoreVideo() {
  const p = usePalette()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [v, setV] = useState<VideoDaGuardare | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    setV(null)
    const r = await apriVideo(String(id))
    if (r.ok) setV(r.video)
    else setErrore(r.errore)
  }, [id])

  useEffect(() => {
    carica()
  }, [carica])

  const sorgente = v ? (Platform.OS === 'web' ? v.mp4 ?? v.hls : v.hls ?? v.mp4) : null
  const altri = (vetrineInMemoria()?.find((x) => x.id === v?.vetrina.id)?.video ?? []).filter((x) => x.id !== v?.id)

  return (
    <Schermata titolo={v?.titolo ?? 'Video'} nascondiTitolo indietro="/lab/video" barra={false}>
      <View style={stili.cornice}>
        {sorgente ? (
          <Lettore key={sorgente} uri={sorgente} />
        ) : v?.copertina ? (
          <Image source={{ uri: v.copertina }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Scheletro altezza={9999} tondo={0} style={StyleSheet.absoluteFill} />
        )}
      </View>

      {errore ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
        </>
      ) : v ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.vetrina, { color: p.accento }]}>{v.vetrina.titolo.toUpperCase()}</Text>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {v.titolo}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icona nome="orologio" size={15} colore={p.testoSecondario} />
            <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13.5 }}>{durata(v.durata)}</Text>
          </View>
          {v.descrizione ? <Text style={[stili.descrizione, { color: p.testoSecondario }]}>{v.descrizione}</Text> : null}
        </View>
      ) : (
        <View style={{ gap: spazio.due }}>
          <Scheletro altezza={12} larghezza="30%" />
          <Scheletro altezza={26} larghezza="80%" />
          <Scheletro altezza={14} larghezza="50%" />
        </View>
      )}

      {altri.length ? (
        <Sezione titolo="Altri video" conteggio={altri.length}>
          <Carta style={{ paddingVertical: spazio.due }}>
            {altri.map((x, i) => (
              <Riga
                key={x.id}
                prima={i === 0}
                testa={
                  <View style={[stili.miniatura, { backgroundColor: p.incavo }]}>
                    {x.miniatura ? <Image source={{ uri: x.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                    <View style={stili.miniaturaDurata}>
                      <Text style={stili.miniaturaTesto}>{durata(x.durata)}</Text>
                    </View>
                  </View>
                }
                titolo={x.titolo}
                onPress={() => router.replace({ pathname: '/lab/video/[id]', params: { id: x.id } })}
              />
            ))}
          </Carta>
        </Sezione>
      ) : null}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  cornice: { aspectRatio: 16 / 9, borderRadius: 26, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  vetrina: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.4 },
  titolo: { fontFamily: F.extra, fontSize: 26, lineHeight: 31, letterSpacing: -0.8 },
  descrizione: { fontFamily: F.medio, fontSize: 15, lineHeight: 22, marginTop: spazio.uno },
  miniatura: { width: 112, aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' },
  miniaturaDurata: { position: 'absolute', right: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  miniaturaTesto: { color: '#fff', fontFamily: F.bold, fontSize: 10.5 },
})
