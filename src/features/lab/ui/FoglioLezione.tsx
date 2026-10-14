import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { SchedaLezione } from '@/api/lab'
import { spazio } from '@/theme'

import { Descrizione, Video } from '../SchedaLezione'
import { Icona } from './Icona'
import { Barra, Pulsante, Tag } from './kit'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// La scheda di una lezione nel laboratorio: un foglio che sale dal basso, col
// video (o la foto) in cima, la descrizione e le caratteristiche come barre
// numerate. I contenuti sono quelli del planning del sito (lezioni.json).

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
    <Modal visible={!!scheda} transparent animationType="slide" onRequestClose={onChiudi}>
      <View style={stili.velo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel="Chiudi" />
        <View style={[stili.foglio, { backgroundColor: p.carta, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
          <View style={[stili.maniglia, { backgroundColor: p.incavo }]} />
          {scheda ? (
            <ScrollView contentContainerStyle={{ gap: spazio.tre + 2, padding: spazio.tre + 4, paddingTop: spazio.due }} showsVerticalScrollIndicator={false}>
              <View style={stili.media}>
                <Video scheda={scheda} />
                <Tocco onPress={onChiudi} etichetta="Chiudi" style={stili.chiudi}>
                  <Icona nome="chiudi" size={18} colore="#fff" />
                </Tocco>
              </View>
              <View style={{ gap: spazio.due }}>
                {categoria ? <Tag testo={categoria} colore={p.accento} /> : null}
                <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
                  {titolo}
                </Text>
              </View>
              {dettagli?.length ? (
                <View style={[stili.dettagli, { backgroundColor: p.incavo }]}>
                  {dettagli.map((d, i) => (
                    <View key={d.etichetta} style={[stili.dettaglio, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
                      <Text style={[stili.dettaglioValore, { color: p.testo }]}>{d.valore}</Text>
                      <Text style={[stili.dettaglioEtichetta, { color: p.testoSecondario }]}>{d.etichetta}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Descrizione html={scheda.descrizione} />
              {scheda.caratteristiche.length ? (
                <View style={{ gap: spazio.tre }}>
                  {scheda.caratteristiche.map((k, i) => {
                    const v = Math.max(0, Math.min(100, k.v))
                    return (
                      <View key={k.l} style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 13 }}>{k.l}</Text>
                          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 13 }}>{v}</Text>
                        </View>
                        <Barra valore={v / 100} colore={i % 2 ? p.blu : p.accento} altezza={8} />
                      </View>
                    )
                  })}
                </View>
              ) : null}
              <Pulsante testo="Chiudi" variante="secondario" onPress={onChiudi} />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, maxHeight: '92%', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  media: { borderRadius: 24, overflow: 'hidden' },
  chiudi: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  dettagli: { flexDirection: 'row', borderRadius: 20, paddingVertical: spazio.tre },
  dettaglio: { flex: 1, alignItems: 'center', gap: 2 },
  dettaglioValore: { fontFamily: F.extra, fontSize: 19, letterSpacing: -0.4 },
  dettaglioEtichetta: { fontFamily: F.semi, fontSize: 11.5 },
})
