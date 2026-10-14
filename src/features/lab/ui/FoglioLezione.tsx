import { LinearGradient } from 'expo-linear-gradient'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { SchedaLezione } from '@/api/lab'
import { spazio } from '@/theme'

import { Descrizione, Video } from '../SchedaLezione'
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
// si allarga o si stringe, mai sotto i 200 punti. Lo scorrimento resta solo
// per gli schermi troppo bassi. Si chiude con la X sul video.

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
  return (
    <Modal visible={!!scheda} animationType="slide" onRequestClose={onChiudi}>
      <View style={[stili.pagina, { backgroundColor: p.carta, paddingTop: ins.top + spazio.due, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
        {scheda ? (
          <ScrollView style={stili.colonna} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={stili.media}>
              <Video scheda={scheda} style={stili.riempi} />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={stili.sulVideo} pointerEvents="none">
                {categoria ? <Tag testo={categoria} colore="#fff" fondo="rgba(0,0,0,0.3)" /> : null}
                <Text style={stili.titolo} numberOfLines={2} accessibilityRole="header">
                  {titolo}
                </Text>
              </View>
              <Tocco onPress={onChiudi} etichetta="Chiudi" style={stili.chiudi}>
                <Icona nome="chiudi" size={20} colore="#fff" />
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
    </Modal>
  )
}

const stili = StyleSheet.create({
  pagina: { flex: 1, alignItems: 'center' },
  colonna: { flex: 1, width: '100%', maxWidth: 760 },
  contenuto: { flexGrow: 1, gap: spazio.tre, paddingHorizontal: spazio.tre },
  media: { flexGrow: 1, minHeight: 200, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' },
  riempi: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', aspectRatio: undefined, borderRadius: 0 },
  sulVideo: { position: 'absolute', left: spazio.tre + 2, right: spazio.tre + 2, bottom: spazio.tre + 2, gap: 6, alignItems: 'flex-start' },
  chiudi: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  dettagli: { flexDirection: 'row', borderRadius: 18, paddingVertical: spazio.due + 2 },
  dettaglio: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: 4 },
  dettaglioValore: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.4 },
  dettaglioEtichetta: { fontFamily: F.semi, fontSize: 11 },
  descrizione: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19.5 },
  caratteristiche: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spazio.tre + 2, rowGap: spazio.due + 2 },
  caratteristica: { width: '47%', flexGrow: 1, gap: 5, justifyContent: 'flex-end' },
})
