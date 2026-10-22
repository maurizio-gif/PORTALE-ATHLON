import type { ReactNode, Ref } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Icona } from './Icona'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

/**
 * Un foglio che sale dal basso, con la maniglia, un titolo e la X per chiudere.
 * `scorrimento` e `onScorri` danno a chi lo usa il controllo dello scorrimento;
 * `flottante` e' un comando che resta fermo sopra il testo, in basso, mentre si scorre.
 */
export function Foglio({
  aperto,
  titolo,
  sottotitolo,
  onChiudi,
  scorrimento,
  onScorri,
  flottante,
  children,
}: {
  aperto: boolean
  titolo: string
  sottotitolo?: string
  onChiudi: () => void
  scorrimento?: Ref<ScrollView>
  onScorri?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
  flottante?: ReactNode
  children: ReactNode
}) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  return (
    <Modal visible={aperto} transparent animationType="slide" onRequestClose={onChiudi}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('Chiudi', 'Close')} />
        <View style={[stili.foglio, { backgroundColor: p.carta, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
          <View style={[stili.maniglia, { backgroundColor: p.incavo }]} />
          <ScrollView ref={scorrimento} onScroll={onScorri} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spazio.tre + 2, padding: spazio.quattro - 4, paddingTop: spazio.due }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
                  {titolo}
                </Text>
                {sottotitolo ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>{sottotitolo}</Text> : null}
              </View>
              <Tocco onPress={onChiudi} etichetta={t('Chiudi', 'Close')} style={[stili.chiudi, { backgroundColor: p.incavo }]}>
                <Icona nome="chiudi" size={17} colore={p.testo} />
              </Tocco>
            </View>
            {children}
          </ScrollView>
          {flottante ? (
            <View pointerEvents="box-none" style={[stili.flottante, { bottom: ins.bottom + spazio.tre }]}>
              {flottante}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, maxHeight: '92%', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  titolo: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.7 },
  sotto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  flottante: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chiudi: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
