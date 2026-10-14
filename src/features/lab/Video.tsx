import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { leggiVetrine, type Vetrina, type VideoClub } from '@/api/lab'
import { spazio } from '@/theme'

import { Icona } from './ui/Icona'
import { Entra, Messaggio, Pulsante, Scheletro, Sezione } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// I video del club: gli showcase dell'account Vimeo, uno per fila, come nelle
// app di streaming. In alto il primo video del primo showcase, in grande.
// L'elenco resta in memoria fra una schermata e l'altra: tornando indietro dal
// lettore non si ricarica.

let inMemoria: Vetrina[] | null = null

/** «12:05», «1:02:30». */
export function durata(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Le vetrine gia' lette, per il lettore («altri video»). */
export function vetrineInMemoria(): Vetrina[] | null {
  return inMemoria
}

export function apri(v: VideoClub) {
  router.push({ pathname: '/lab/video/[id]', params: { id: v.id } })
}

function InEvidenza({ v, vetrina }: { v: VideoClub; vetrina: string }) {
  return (
    <Tocco onPress={() => apri(v)} ruolo="link" etichetta={`Guarda ${v.titolo}`} scala={0.985}>
      <View style={stili.evidenza}>
        {v.copertina ? <Image source={{ uri: v.copertina }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null}
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={stili.evidenzaTesto}>
          <Text style={stili.evidenzaVetrina}>{vetrina.toUpperCase()}</Text>
          <Text style={stili.evidenzaTitolo} numberOfLines={2}>
            {v.titolo}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre, marginTop: spazio.due }}>
            <View style={stili.guarda}>
              <Icona nome="play" size={18} colore="#141518" />
              <Text style={stili.guardaTesto}>Guarda</Text>
            </View>
            <Text style={stili.evidenzaDurata}>{durata(v.durata)}</Text>
          </View>
        </View>
      </View>
    </Tocco>
  )
}

function Locandina({ v }: { v: VideoClub }) {
  const p = usePalette()
  return (
    <Tocco onPress={() => apri(v)} ruolo="link" etichetta={`Guarda ${v.titolo}, ${durata(v.durata)}`} scala={0.97} style={{ width: 236, gap: spazio.due }}>
      <View style={[stili.locandina, { backgroundColor: p.incavo }]}>
        {v.miniatura ? <Image source={{ uri: v.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <View style={stili.play}>
          <Icona nome="play" size={20} colore="#fff" />
        </View>
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

function Fila({ vetrina }: { vetrina: Vetrina }) {
  return (
    <Sezione titolo={vetrina.titolo} conteggio={vetrina.video.length}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
        {vetrina.video.map((v) => (
          <Locandina key={v.id} v={v} />
        ))}
      </ScrollView>
    </Sezione>
  )
}

export function VideoLab() {
  const p = usePalette()
  const [vetrine, setVetrine] = useState<Vetrina[] | null>(inMemoria)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await leggiVetrine()
    if (!r.ok) return setErrore(r.errore)
    inMemoria = r.vetrine.filter((x) => x.video.length)
    setVetrine(inMemoria)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  const prima = vetrine?.[0]
  return (
    <Schermata larga sopratitolo="Laboratorio · i video del club" titolo="Video">
      {errore && !vetrine ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
        </>
      ) : !vetrine ? (
        <View style={{ gap: spazio.quattro }}>
          <Scheletro altezza={220} tondo={30} />
          {[0, 1].map((i) => (
            <View key={i} style={{ gap: spazio.tre }}>
              <Scheletro altezza={20} larghezza="40%" />
              <View style={{ flexDirection: 'row', gap: spazio.tre }}>
                <Scheletro altezza={133} larghezza={236} tondo={20} />
                <Scheletro altezza={133} larghezza={236} tondo={20} />
              </View>
            </View>
          ))}
        </View>
      ) : !prima ? (
        <View style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
          <Icona nome="play" size={36} colore={p.testoTerzo} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14 }}>Ancora nessun video negli showcase del club.</Text>
        </View>
      ) : (
        <>
          <Entra indice={0}>
            <InEvidenza v={prima.video[0]} vetrina={prima.titolo} />
          </Entra>
          {vetrine.map((x, i) => (
            <Entra key={x.id} indice={i + 1}>
              <Fila vetrina={x} />
            </Entra>
          ))}
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  evidenza: { aspectRatio: 16 / 10, minHeight: 220, maxHeight: 460, borderRadius: 30, overflow: 'hidden', backgroundColor: '#111', justifyContent: 'flex-end' },
  evidenzaTesto: { padding: spazio.quattro - 2, gap: 4 },
  evidenzaVetrina: { color: '#FF8A2B', fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.4 },
  evidenzaTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, maxWidth: 560 },
  evidenzaDurata: { color: 'rgba(255,255,255,0.8)', fontFamily: F.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  guarda: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: spazio.tre, paddingVertical: 10 },
  guardaTesto: { color: '#141518', fontFamily: F.extra, fontSize: 15 },
  fila: { gap: spazio.tre, paddingHorizontal: spazio.tre + 2 },
  fuori: { marginHorizontal: -(spazio.tre + 2) },
  locandina: { width: 236, aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  durata: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  durataTesto: { color: '#fff', fontFamily: F.bold, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  titolo: { fontFamily: F.bold, fontSize: 14.5, lineHeight: 19, paddingHorizontal: 2 },
})
