import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useMemo, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import type { SchedaLezione } from '@/api/lab'
import { spazio } from '@/theme'

import { Descrizione, schedaPer, Video } from '../SchedaLezione'
import { Icona } from './Icona'
import { Barra, Tag } from './kit'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// La scheda di una lezione nel laboratorio, a tutto schermo: il video (o la
// foto) col nome sopra prende tutto lo spazio che resta, e sotto ci sono le
// tre cifre, la descrizione e le caratteristiche come barre su due colonne. I
// contenuti sono quelli del planning del sito (lezioni.json).
//
// Sul telefono sta tutto nello schermo, senza scorrere (14/10/2026): il video
// si allarga o si stringe, mai sotto i 180 punti. Lo scorrimento resta solo
// per gli schermi troppo bassi. Si chiude con la X sul video.
//
// Si apre scendendo dall'alto e si chiude risalendo; appena arrivata, le
// barre delle caratteristiche si riempiono una dopo l'altra (15/10/2026).
//
// Una lezione con una pagina sua sul sito (il Baby Nuoto) ha il video della pagina e un
// testo per fascia d'eta' al posto delle barre (17/10/2026), dal feed del sito.

export function FoglioLezione({
  scheda: schedaGrezza,
  titolo,
  categoria,
  dettagli,
  onChiudi,
}: {
  scheda: SchedaLezione | null
  titolo: string
  categoria?: string
  /** Le tre cifre in alto: ora, durata, istruttore (nome e cognome su due righe, con «\n»). */
  dettagli?: { valore: string; etichetta: string }[]
  onChiudi: () => void
}) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  // Il testo della fascia d'eta' della lezione, se la scheda ne ha: l'oggetto resta lo stesso
  // finche' non cambiano scheda o titolo, perche' l'animazione riparte a ogni nuova scheda.
  const scheda = useMemo(() => schedaPer(schedaGrezza, titolo), [schedaGrezza, titolo])
  // Mentre risale la scheda non c'e' piu' (il calendario l'ha gia' tolta):
  // si mostra l'ultima, finche' l'animazione non e' finita.
  const [ultima, setUltima] = useState({ scheda, titolo, categoria, dettagli })
  const [montata, setMontata] = useState(!!scheda)
  const [arrivata, setArrivata] = useState(false)
  const discesa = useSharedValue(0)

  useEffect(() => {
    if (scheda) {
      setUltima({ scheda, titolo, categoria, dettagli })
      setMontata(true)
      setArrivata(false)
      discesa.value = 0
      discesa.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }, (fatto) => {
        if (fatto) scheduleOnRN(setArrivata, true)
      })
    } else {
      discesa.value = withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (fatto) => {
        if (fatto) scheduleOnRN(setMontata, false)
      })
    }
    // Solo quando cambia la scheda: `dettagli` e' un array nuovo a ogni giro del calendario.
  }, [scheda])

  const pagina = useAnimatedStyle(() => ({ transform: [{ translateY: (discesa.value - 1) * height }] }))
  const velo = useAnimatedStyle(() => ({ opacity: discesa.value }))
  const v = ultima

  return (
    <Modal visible={montata} transparent animationType="none" onRequestClose={onChiudi}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }, velo]} />
      <Animated.View style={[stili.pagina, { backgroundColor: p.carta, paddingTop: ins.top + spazio.due, paddingBottom: ins.bottom + spazio.tre }, pagina]} accessibilityViewIsModal>
        {v.scheda ? (
          <ScrollView style={stili.colonna} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={stili.media}>
              <Video scheda={v.scheda} style={stili.riempi} />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={stili.sulVideo} pointerEvents="none">
                {v.categoria ? <Tag testo={v.categoria} colore="#fff" fondo="rgba(0,0,0,0.3)" /> : null}
                <Text style={stili.titolo} numberOfLines={2} accessibilityRole="header">
                  {v.titolo}
                </Text>
              </View>
              <Tocco onPress={onChiudi} etichetta="Chiudi" style={stili.chiudi}>
                <Icona nome="chiudi" size={20} colore="#fff" />
              </Tocco>
            </View>
            {v.dettagli?.length ? (
              <View style={[stili.dettagli, { backgroundColor: p.incavo }]}>
                {v.dettagli.map((d, i) => {
                  // Nome e cognome su due righe: la colonna piu' larga e il carattere un po' piu' piccolo.
                  const dueRighe = d.valore.includes('\n')
                  return (
                    <View key={d.etichetta} style={[stili.dettaglio, { flex: dueRighe ? 1.5 : 1 }, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
                      <Text style={[stili.dettaglioValore, { color: p.testo }, dueRighe && { fontSize: 15, lineHeight: 18 }]} numberOfLines={2}>
                        {d.valore}
                      </Text>
                      <Text style={[stili.dettaglioEtichetta, { color: p.testoSecondario }]}>{d.etichetta}</Text>
                    </View>
                  )
                })}
              </View>
            ) : null}
            <Descrizione html={v.scheda.descrizione} style={[stili.descrizione, { color: p.testoSecondario }]} grassetto={{ fontFamily: F.bold, color: p.testo }} />
            {v.scheda.caratteristiche.length ? (
              <View style={stili.caratteristiche}>
                {v.scheda.caratteristiche.map((k, i) => {
                  const valore = Math.max(0, Math.min(100, k.v))
                  return (
                    <View key={k.l} style={stili.caratteristica}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                        <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13.5, lineHeight: 17, flexShrink: 1 }}>{k.l}</Text>
                        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 14 }}>{valore}</Text>
                      </View>
                      <Barra valore={arrivata ? valore / 100 : 0} colore={i % 2 ? p.blu : p.accento} altezza={8} animata ritardo={i * 140} />
                    </View>
                  )
                })}
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </Animated.View>
    </Modal>
  )
}

const stili = StyleSheet.create({
  pagina: { flex: 1, alignItems: 'center' },
  colonna: { flex: 1, width: '100%', maxWidth: 760 },
  contenuto: { flexGrow: 1, gap: spazio.tre, paddingHorizontal: spazio.tre },
  media: { flexGrow: 1, minHeight: 180, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' },
  riempi: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', aspectRatio: undefined, borderRadius: 0 },
  sulVideo: { position: 'absolute', left: spazio.tre + 2, right: spazio.tre + 2, bottom: spazio.tre + 2, gap: 6, alignItems: 'flex-start' },
  chiudi: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  dettagli: { flexDirection: 'row', borderRadius: 18, paddingVertical: spazio.due + 2 },
  dettaglio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 4 },
  dettaglioValore: { fontFamily: F.extra, fontSize: 17, lineHeight: 20, letterSpacing: -0.4, textAlign: 'center' },
  dettaglioEtichetta: { fontFamily: F.semi, fontSize: 11 },
  descrizione: { fontFamily: F.medio, fontSize: 15, lineHeight: 21.5 },
  caratteristiche: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spazio.tre + 2, rowGap: spazio.due + 2 },
  caratteristica: { width: '47%', flexGrow: 1, gap: 5, justifyContent: 'flex-end' },
})
