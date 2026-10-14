import { LinearGradient } from 'expo-linear-gradient'
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { SchedaLezione } from '@/api/lab'
import { spazio } from '@/theme'

import { Descrizione, Video } from '../SchedaLezione'
import { Icona } from './Icona'
import { Barra, Tag } from './kit'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// La scheda di una lezione nel laboratorio: un foglio che sale dal basso, col
// video (o la foto) in cima e il nome sopra, le tre cifre, la descrizione e
// le caratteristiche come barre su due colonne. I contenuti sono quelli del
// planning del sito (lezioni.json).
//
// Sul telefono sta tutto nello schermo, senza scorrere (14/10/2026): il nome
// sta sul video, il video non supera un quarto abbondante dell'altezza, e si
// chiude con la X, col tocco fuori o tirando giu'. Lo scorrimento resta solo
// per gli schermi piu' bassi di un telefono.

export function FoglioLezione({
  scheda,
  titolo,
  categoria,
  dettagli,
  onChiudi,
}: {
  scheda: SchedaLezione | null
  titolo: string
  categoria?: string
  /** Le tre cifre in alto: ora, durata, posti. */
  dettagli?: { valore: string; etichetta: string }[]
  onChiudi: () => void
}) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const larghezza = Math.min(width, 560) - 2 * spazio.tre
  const altezzaMedia = Math.round(Math.min((larghezza * 9) / 16, height * 0.3))
  return (
    <Modal visible={!!scheda} transparent animationType="slide" onRequestClose={onChiudi}>
      <View style={stili.velo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel="Chiudi" />
        <View style={[stili.foglio, { backgroundColor: p.carta, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
          <View style={[stili.maniglia, { backgroundColor: p.incavo }]} />
          {scheda ? (
            <ScrollView contentContainerStyle={{ gap: spazio.tre, paddingHorizontal: spazio.tre, paddingTop: spazio.uno }} showsVerticalScrollIndicator={false} bounces={false}>
              <View style={[stili.media, { height: altezzaMedia }]}>
                <Video scheda={scheda} style={stili.riempi} />
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={stili.sulVideo} pointerEvents="none">
                  {categoria ? <Tag testo={categoria} colore="#fff" fondo="rgba(0,0,0,0.3)" /> : null}
                  <Text style={stili.titolo} numberOfLines={2} accessibilityRole="header">
                    {titolo}
                  </Text>
                </View>
                <Tocco onPress={onChiudi} etichetta="Chiudi" style={stili.chiudi}>
                  <Icona nome="chiudi" size={18} colore="#fff" />
                </Tocco>
              </View>
              {dettagli?.length ? (
                <View style={[stili.dettagli, { backgroundColor: p.incavo }]}>
                  {dettagli.map((d, i) => (
                    <View key={d.etichetta} style={[stili.dettaglio, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
                      <Text style={[stili.dettaglioValore, { color: p.testo }]} numberOfLines={1}>
                        {d.valore}
                      </Text>
                      <Text style={[stili.dettaglioEtichetta, { color: p.testoSecondario }]}>{d.etichetta}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Descrizione html={scheda.descrizione} style={[stili.descrizione, { color: p.testoSecondario }]} grassetto={{ fontFamily: F.bold, color: p.testo }} />
              {scheda.caratteristiche.length ? (
                <View style={stili.caratteristiche}>
                  {scheda.caratteristiche.map((k, i) => {
                    const v = Math.max(0, Math.min(100, k.v))
                    return (
                      <View key={k.l} style={stili.caratteristica}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                          <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 12, lineHeight: 15, flexShrink: 1 }}>{k.l}</Text>
                          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 12 }}>{v}</Text>
                        </View>
                        <Barra valore={v / 100} colore={i % 2 ? p.blu : p.accento} altezza={6} />
                      </View>
                    )
                  })}
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, maxHeight: '96%', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  media: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' },
  riempi: { width: '100%', height: '100%', aspectRatio: undefined, borderRadius: 0 },
  sulVideo: { position: 'absolute', left: spazio.tre, right: spazio.tre, bottom: spazio.tre, gap: 6, alignItems: 'flex-start' },
  chiudi: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 24, lineHeight: 28, letterSpacing: -0.8 },
  dettagli: { flexDirection: 'row', borderRadius: 18, paddingVertical: spazio.due + 2 },
  dettaglio: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: 4 },
  dettaglioValore: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.4 },
  dettaglioEtichetta: { fontFamily: F.semi, fontSize: 11 },
  descrizione: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19.5 },
  caratteristiche: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spazio.tre + 2, rowGap: spazio.due + 2 },
  caratteristica: { width: '47%', flexGrow: 1, gap: 5, justifyContent: 'flex-end' },
})
