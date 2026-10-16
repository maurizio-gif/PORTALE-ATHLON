import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { leggiVetrine, type Vetrina } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { spazio } from '@/theme'

import { posizione } from '../SchedaLezione'
import { Icona } from '../ui/Icona'
import { Entra, Messaggio, Pulsante, Scheletro } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { memoria, quanti } from './comune'

// Athlon TV: gli showcase di Vimeo del club, una ventina, come copertine.
// Toccandone uno si apre la sua galleria (tv/[raccolta]).

const META = 6

function Copertina({ v, larghezza }: { v: Vetrina; larghezza: number | `${number}%` }) {
  const p = usePalette()
  return (
    <Tocco
      onPress={() => router.push({ pathname: '/tv/[raccolta]', params: { raccolta: v.id } })}
      ruolo="link"
      etichetta={`${v.titolo}, ${quanti(v.totale)}`}
      scala={0.97}
      style={{ width: larghezza }}
    >
      <View style={[stili.copertina, { backgroundColor: p.incavo }]}>
        {v.copertina ? <Image source={{ uri: v.copertina }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={posizione(v.fuoco ?? null)} transition={250} /> : null}
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={stili.testo}>
          <Text style={stili.titolo} numberOfLines={2}>
            {v.titolo}
          </Text>
          <View style={stili.conta}>
            <Icona nome="play" size={12} colore="#fff" />
            <Text style={stili.contaTesto}>{quanti(v.totale)}</Text>
          </View>
        </View>
      </View>
    </Tocco>
  )
}

export function AthlonTv() {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const colonne = width >= LARGO ? 4 : width >= 600 ? 3 : 2
  const [vetrine, setVetrine] = useState<Vetrina[] | null>(memoria.vetrine)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await leggiVetrine()
    if (!r.ok) return setErrore(r.errore)
    memoria.vetrine = r.vetrine
    setVetrine(r.vetrine)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  const larghezza = `${100 / colonne}%` as `${number}%`
  const totale = vetrine?.reduce((t, v) => t + v.totale, 0) ?? 0

  return (
    <Schermata larga sopratitolo="I video del club" titolo="Athlon TV" sottotitolo={vetrine ? `${vetrine.length} raccolte · ${quanti(totale)}` : undefined}>
      {errore && !vetrine ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
        </>
      ) : !vetrine ? (
        <View style={stili.griglia}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: larghezza, padding: META }}>
              <Scheletro altezza={0} tondo={22} style={{ aspectRatio: 16 / 11, height: undefined }} />
            </View>
          ))}
        </View>
      ) : vetrine.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
          <Icona nome="play" size={36} colore={p.testoTerzo} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14 }}>Ancora nessun video del club.</Text>
        </View>
      ) : (
        <View style={stili.griglia}>
          {vetrine.map((v, i) => (
            <Entra key={v.id} indice={i} style={{ width: larghezza, padding: META }}>
              <Copertina v={v} larghezza="100%" />
            </Entra>
          ))}
        </View>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  griglia: { flexDirection: 'row', flexWrap: 'wrap', margin: -META },
  copertina: { aspectRatio: 16 / 11, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end' },
  testo: { padding: spazio.tre - 2, gap: 6 },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 16, lineHeight: 19, letterSpacing: -0.3 },
  conta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  contaTesto: { color: '#fff', fontFamily: F.bold, fontSize: 11 },
})
