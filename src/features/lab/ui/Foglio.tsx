import { useEffect, useId, type ReactNode, type Ref } from 'react'
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'
import { mettiInHost, togliDalHost } from '@/lib/portaleFogli'
import { useSollevamentoTastiera } from '@/lib/tastiera'

import { useHostFogliMontato } from './FoglioHost'
import { Icona } from './Icona'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

type PropsFoglio = {
  aperto: boolean
  titolo: string
  sottotitolo?: string
  onChiudi: () => void
  scorrimento?: Ref<ScrollView>
  onScorri?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
  flottante?: ReactNode
  /** Un livello a tutto schermo nella finestra dove e' montato, non un `Modal`. Vedi sopra. */
  livello?: boolean
  /** Il foglio ha un campo di testo: su Android lo disegna `FoglioHost`, alla radice, dove la tastiera lo alza. Vedi sopra. */
  tastiera?: boolean
  children: ReactNode
}

/**
 * Un foglio che sale dal basso, con la maniglia, un titolo e la X per chiudere.
 * `scorrimento` e `onScorri` danno a chi lo usa il controllo dello scorrimento;
 * `flottante` e' un comando che resta fermo sopra il testo, in basso, mentre si scorre.
 *
 * **La tastiera su Android** (14/11/2026). Da Android 16 (`targetSdk` 36) la finestra di un `Modal` non si ridimensiona piu' con la tastiera, e
 * l'altezza della tastiera (`Keyboard`) arriva solo alla finestra dell'attivita', non a quella di un `Modal` (note 182 e 236): un campo in fondo a un
 * foglio restava coperto. Due strade, una per caso:
 * - `tastiera`: il foglio ha un campo di testo. **Su Android** lo disegna `FoglioHost` (`lib/portaleFogli`), alla radice del layout del portale, nella
 *   finestra dell'attivita' e sopra a tutto: li' la tastiera si sente e il foglio si alza (`useSollevamentoTastiera`). Altrove (iOS, web, o senza un host
 *   montato, cioe' fuori dal layout del portale) e' il `Modal` di sempre. **Non si mette su un foglio che si apre da dentro un `Modal`** (la scheda di una
 *   lezione): in cima alla radice starebbe sotto quella finestra, e non si vedrebbe.
 * - `livello`: il foglio e' montato gia' dove serve (alla radice, o dentro un `Modal` aperto come la chat dell'assistente, dove su iOS un secondo `Modal`
 *   non si apre) e si disegna li', a tutto schermo, senza `Modal`. Su Android si alza con la tastiera e il tasto «indietro» lo chiude.
 * Senza nessuno dei due il foglio e' quello di sempre.
 */
export function Foglio(props: PropsFoglio) {
  const { aperto, livello = false, tastiera = false } = props
  const id = useId()
  const hostPronto = useHostFogliMontato()
  const viaHost = tastiera && !livello && Platform.OS === 'android' && hostPronto
  // Il foglio manda all'host quello che deve disegnare a ogni giro, e lo toglie quando si chiude: dentro l'host lo stato dei figli resta (stesso `key`).
  useEffect(() => {
    if (viaHost && aperto) mettiInHost(id, <CorpoFoglio {...props} livello tastiera={false} />)
    else togliDalHost(id)
  })
  useEffect(() => () => togliDalHost(id), [id])
  return viaHost ? null : <CorpoFoglio {...props} />
}

function CorpoFoglio({
  aperto,
  titolo,
  sottotitolo,
  onChiudi,
  scorrimento,
  onScorri,
  flottante,
  livello = false,
  children,
}: PropsFoglio) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const android = Platform.OS === 'android'
  // Solo un livello su Android nativo si alza da se': un `Modal` o iOS/web hanno gia' la loro strada.
  const { sollevamento, alLayout } = useSollevamentoTastiera(livello && android && aperto, ins.bottom)
  // Senza `Modal` il tasto «indietro» di Android non chiude piu' niente da solo. Registrato dopo quello dell'assistente (se e' aperto), va per primo.
  useEffect(() => {
    if (!livello || !android || !aperto) return
    const ascolto = BackHandler.addEventListener('hardwareBackPress', () => {
      onChiudi()
      return true
    })
    return () => ascolto.remove()
  }, [livello, android, aperto, onChiudi])

  const corpo = (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('Chiudi', 'Close')} />
      {/* Con la tastiera su, `sollevamento` comprende gia' la barra di navigazione: il fondo del foglio non la conta due volte. */}
      <View style={[stili.foglio, { backgroundColor: p.carta, paddingBottom: (sollevamento > 0 ? 0 : ins.bottom) + spazio.tre }]} accessibilityViewIsModal>
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
    </>
  )

  if (livello) {
    return aperto ? (
      <Animated.View entering={FadeIn.duration(160)} onLayout={alLayout} style={[stili.livello, { paddingBottom: sollevamento }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
          {corpo}
        </KeyboardAvoidingView>
      </Animated.View>
    ) : null
  }

  return (
    <Modal visible={aperto} transparent animationType="slide" onRequestClose={onChiudi}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stili.velo}>
        {corpo}
      </KeyboardAvoidingView>
    </Modal>
  )
}

const stili = StyleSheet.create({
  // Il livello: sopra a tutto nella finestra, anche sopra al livello dell'assistente su Android (`zIndex` e `elevation` 100).
  livello: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, elevation: 200 },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, maxHeight: '92%', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  titolo: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.7 },
  sotto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  flottante: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chiudi: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
