import { Image, type ImageContentPosition } from 'expo-image'
import { createElement, Fragment } from 'react'
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { SchedaLezione } from '@/api/lab'
import { Bottone } from '@/components/Bottone'
import { Testo } from '@/components/Testo'
import { spazio, useColori } from '@/theme'

// La finestra di una lezione: video (o foto), descrizione e caratteristiche,
// come la apre il planning del sito. I contenuti sono quelli del sito
// (lezioni.json), quindi si aggiornano con lui.

/** Il punto focale del sito («50% 74%»), come lo vuole expo-image. */
function posizione(fuoco: string | null): ImageContentPosition {
  return (fuoco ?? 'center') as ImageContentPosition
}

/** La descrizione del sito e' HTML semplice: <b> per il grassetto, <br> per andare a capo. */
function Descrizione({ html }: { html: string }) {
  const c = useColori()
  const pezzi = html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/(<b>[\s\S]*?<\/b>)/gi)
    .filter(Boolean)
  return (
    <Text style={[stili.descrizione, { color: c.testo }]}>
      {pezzi.map((p, i) => {
        const grassetto = /^<b>/i.test(p)
        const testo = p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        return grassetto ? (
          <Text key={i} style={{ fontWeight: '700' }}>
            {testo}
          </Text>
        ) : (
          <Fragment key={i}>{testo}</Fragment>
        )
      })}
    </Text>
  )
}

function Video({ scheda }: { scheda: SchedaLezione }) {
  const c = useColori()
  if (!scheda.video) {
    return scheda.foto ? (
      <Image source={{ uri: scheda.foto }} style={stili.media} contentFit="cover" contentPosition={posizione(scheda.fuoco)} accessibilityLabel={scheda.nome} />
    ) : null
  }
  // Sul web il video gira nella finestra, come sul sito; nell'app, per ora,
  // si apre nel lettore del telefono.
  if (Platform.OS === 'web') {
    const sorgente = scheda.inizioVideo ? `${scheda.video}#t=${scheda.inizioVideo}` : scheda.video
    return createElement('video', {
      src: sorgente,
      poster: scheda.foto ?? undefined,
      controls: true,
      playsInline: true,
      autoPlay: true,
      muted: true,
      loop: true,
      style: { width: '100%', aspectRatio: '16 / 9', borderRadius: 12, background: '#000', objectFit: 'cover', display: 'block' },
    })
  }
  return (
    <Pressable onPress={() => Linking.openURL(scheda.video!)} accessibilityRole="button" accessibilityLabel={`Guarda il video di ${scheda.nome}`}>
      {scheda.foto ? <Image source={{ uri: scheda.foto }} style={stili.media} contentFit="cover" /> : null}
      <Text style={[stili.guarda, { color: c.accento }]}>▶ Guarda il video</Text>
    </Pressable>
  )
}

export function FinestraLezione({ scheda, titolo, onChiudi }: { scheda: SchedaLezione | null; titolo: string; onChiudi: () => void }) {
  const c = useColori()
  return (
    <Modal visible={!!scheda} transparent animationType="fade" onRequestClose={onChiudi}>
      <Pressable style={stili.velo} onPress={onChiudi} accessibilityLabel="Chiudi">
        <Pressable style={[stili.finestra, { backgroundColor: c.sfondo }]} onPress={() => {}} accessibilityViewIsModal>
          {scheda ? (
            <ScrollView contentContainerStyle={{ gap: spazio.tre }}>
              <View style={stili.testa}>
                <Testo variante="sottotitolo" style={{ flex: 1 }}>
                  {titolo}
                </Testo>
                <Pressable onPress={onChiudi} accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={12}>
                  <Text style={[stili.chiudi, { color: c.testo }]}>×</Text>
                </Pressable>
              </View>
              <Video scheda={scheda} />
              <Descrizione html={scheda.descrizione} />
              {scheda.caratteristiche.length ? (
                <View style={{ gap: spazio.due }}>
                  {scheda.caratteristiche.map((k) => (
                    <View key={k.l} style={{ gap: 4 }}>
                      <Testo variante="piccolo">{k.l}</Testo>
                      <View style={[stili.barra, { backgroundColor: c.superficie }]}>
                        <View style={[stili.pieno, { width: `${Math.max(0, Math.min(100, k.v))}%`, backgroundColor: c.accento }]} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              <Bottone testo="Chiudi" variante="contorno" onPress={onChiudi} />
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** La fotina accanto alla lezione: si tocca per aprire la finestra. */
export function Fotina({ scheda, onApri }: { scheda: SchedaLezione; onApri: () => void }) {
  const c = useColori()
  return (
    <Pressable onPress={onApri} accessibilityRole="button" accessibilityLabel={`Scheda di ${scheda.nome}: video e descrizione`} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {scheda.foto ? (
        <Image source={{ uri: scheda.foto }} style={stili.fotina} contentFit="cover" contentPosition={posizione(scheda.fuoco)} transition={150} />
      ) : (
        <View style={[stili.fotina, { backgroundColor: c.superficie, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: c.testoSecondario, fontSize: 12 }}>Scheda</Text>
        </View>
      )}
      {/* Una «i» ben visibile su ogni foto: dice che toccandola si apre la
          scheda (video, descrizione), non solo che c'e' un video. */}
      <View style={[stili.info, { backgroundColor: c.accento, borderColor: c.sfondo }]}>
        <Text style={stili.iconaInfo}>i</Text>
      </View>
    </Pressable>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spazio.tre },
  finestra: { width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: 16, padding: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  chiudi: { fontSize: 26, lineHeight: 28 },
  media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  guarda: { fontSize: 15, fontWeight: '700', marginTop: spazio.due },
  descrizione: { fontSize: 15, lineHeight: 22 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  pieno: { height: 8, borderRadius: 4 },
  fotina: { width: 56, height: 56, borderRadius: 10 },
  info: { position: 'absolute', right: -5, bottom: -5, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconaInfo: { color: '#fff', fontSize: 14, fontWeight: '800', fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: 16 },
})
