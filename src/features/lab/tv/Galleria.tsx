import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { leggiVetrina, type VideoClub } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { spazio } from '@/theme'

import { posizione } from '../SchedaLezione'
import { Icona } from '../ui/Icona'
import { Entra, Messaggio, Pulsante, Scheletro } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { durata, memoria, quanti } from './comune'

// La galleria di uno showcase: la copertina col primo video da guardare,
// poi tutti i video in griglia. Toccandone uno si apre il lettore.

const META = 6

export function apriVideo(raccolta: string, v: VideoClub) {
  router.push({ pathname: '/tv/[raccolta]/[video]', params: { raccolta, video: v.id } })
}

function Locandina({ raccolta, v }: { raccolta: string; v: VideoClub }) {
  const p = usePalette()
  return (
    <Tocco onPress={() => apriVideo(raccolta, v)} ruolo="link" etichetta={`Guarda ${v.titolo}, ${durata(v.durata)}`} scala={0.97} style={{ gap: spazio.due }}>
      <View style={[stili.locandina, { backgroundColor: p.incavo }]}>
        {v.miniatura ? <Image source={{ uri: v.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <View style={stili.durata}>
          <Text style={stili.durataTesto}>{durata(v.durata)}</Text>
        </View>
      </View>
      <Text style={[stili.titolo, { color: p.testo }]} numberOfLines={2}>
        {v.titolo}
      </Text>
    </Tocco>
  )
}

export function Galleria() {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const colonne = width >= LARGO ? 4 : width >= 600 ? 3 : 2
  const { raccolta } = useLocalSearchParams<{ raccolta: string }>()
  const nota = memoria.vetrine?.find((x) => x.id === raccolta) ?? null
  const [video, setVideo] = useState<VideoClub[] | null>(memoria.video.get(String(raccolta)) ?? null)
  const [vetrina, setVetrina] = useState(nota)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await leggiVetrina(String(raccolta))
    if (!r.ok) return setErrore(r.errore)
    memoria.video.set(String(raccolta), r.video)
    setVetrina(r.vetrina)
    setVideo(r.video)
  }, [raccolta])

  useEffect(() => {
    carica()
  }, [carica])

  const primo = video?.[0]
  const larghezza = `${100 / colonne}%` as `${number}%`

  return (
    <Schermata
      sopratitolo="Athlon TV"
      titolo={vetrina?.titolo ?? 'Raccolta'}
      sottotitolo={vetrina ? [quanti(vetrina.totale), vetrina.descrizione].filter(Boolean).join(' · ') : undefined}
      indietro="/tv"
      barra={false}
    >
      {errore && !video ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
        </>
      ) : (
        <>
          <Tocco onPress={() => primo && apriVideo(String(raccolta), primo)} spento={!primo} ruolo="link" etichetta="Guarda dall’inizio" scala={0.985}>
            <View style={[stili.testata, { backgroundColor: p.incavo }]}>
              {vetrina?.copertina || primo?.copertina ? (
                <Image source={{ uri: (vetrina?.copertina ?? primo?.copertina)! }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={posizione(vetrina?.copertina ? vetrina.fuoco ?? null : null)} transition={250} />
              ) : null}
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
              <View style={stili.testataTesto}>
                <View style={stili.guarda}>
                  <Icona nome="play" size={18} colore="#141518" />
                  <Text style={stili.guardaTesto}>Guarda dall’inizio</Text>
                </View>
                {primo ? (
                  <Text style={stili.testataPrimo} numberOfLines={1}>
                    {primo.titolo}
                  </Text>
                ) : null}
              </View>
            </View>
          </Tocco>

          <View style={stili.griglia}>
            {video
              ? video.map((v, i) => (
                  <Entra key={v.id} indice={i} style={{ width: larghezza, padding: META }}>
                    <Locandina raccolta={String(raccolta)} v={v} />
                  </Entra>
                ))
              : Array.from({ length: 6 }, (_, i) => (
                  <View key={i} style={{ width: larghezza, padding: META, gap: spazio.due }}>
                    <Scheletro altezza={0} tondo={16} style={{ aspectRatio: 16 / 9, height: undefined }} />
                    <Scheletro altezza={12} larghezza="80%" />
                  </View>
                ))}
          </View>
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testata: { aspectRatio: 16 / 8, maxHeight: 380, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end' },
  testataTesto: { padding: spazio.tre + 2, gap: spazio.due },
  guarda: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: spazio.tre, paddingVertical: 10 },
  guardaTesto: { color: '#141518', fontFamily: F.extra, fontSize: 15 },
  testataPrimo: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 13 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', margin: -META },
  locandina: { aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden' },
  durata: { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  durataTesto: { color: '#fff', fontFamily: F.bold, fontSize: 11, fontVariant: ['tabular-nums'] },
  titolo: { fontFamily: F.bold, fontSize: 13.5, lineHeight: 18, paddingHorizontal: 2 },
})
