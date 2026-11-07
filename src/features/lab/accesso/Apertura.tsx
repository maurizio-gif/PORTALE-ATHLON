import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, PanResponder, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

import { useWindowDimensions } from '@/lib/finestra'
import { PRIVACY_URL } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { LARGO } from '@/lib/schemaColori'

import { Icona } from '../ui/Icona'
import { useRiduciMovimento } from '../ui/movimento'
import { F, FUOCO } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { Bolle } from './Bolle'
import type { Puntatore } from './bolle'
import { SceltaLinguaApertura } from './SceltaLinguaApertura'

// L'apertura dell'accesso (07/11/2026, richiesta di Maurizio, da un video di un'app Flutter; provata prima come demo): prima della pagina con
// l'email, una schermata a tutto schermo in due tempi.
//
//   1. La foto della hero del sito (l'ingresso del club, la copertina del suo video) con un velo scuro, il marchio arancio e «scorri verso
//      l'alto per iniziare». Si sale col dito (o col mouse) oppure si tocca la manopola: il tocco serve a chi non puo' o non sa scorrere.
//   2. Lo sfondo arancio che sfuma nel nero, il titolo, le bolle da spingere e «Continua», che porta alla pagina di sempre (`Accesso.tsx`).
//
// **La pagina con l'email non cambia**: stessi campi, stesso codice, stessa registrazione. L'apertura sta davanti e si vede una volta per
// apertura dell'app (non dopo un'uscita). Sul totem non c'e'. Due foto, come il sito ha due video: la verticale per il telefono, l'orizzontale
// da `LARGO` in su e per il telefono girato di lato. I movimenti sono un orologio (requestAnimationFrame), come l'avvio, non Reanimated.

const FOTO_VERTICALE = require('@/../assets/images/accesso/hero-verticale.webp')
const FOTO_ORIZZONTALE = require('@/../assets/images/accesso/hero-orizzontale.webp')
const PITTOGRAMMA = require('@/../assets/images/pittogramma.png')

// Lo sfondo del secondo tempo: l'arancio del club in alto, scuro in basso, come la testata dell'app.
const SFONDO = ['#FF5E0A', '#E24A07', '#A93408', '#4A1A12', '#17100F', '#101113'] as const
const PUNTI_SFONDO = [0, 0.22, 0.42, 0.64, 0.84, 1] as const
const VELO = ['rgba(16,17,19,0.74)', 'rgba(16,17,19,0.68)', 'rgba(16,17,19,0.86)'] as const
const PUNTI_VELO = [0, 0.45, 1] as const

/**
 * Cambiare lingua ricarica la pagina (sul web, `lib/lingua.ts`): chi era gia' sulle bolle non deve ritrovarsi sulla foto e salire di nuovo.
 * Prima del cambio si lascia un segno nella sessione del browser, che alla pagina nuova si legge una volta sola. Sull'app nativa la sessione
 * del browser non c'e' e il riavvio riparte dalla foto.
 */
const CHIAVE_APERTA = 'athlon_apertura_aperta'
function ricordaApertura() {
  try {
    globalThis.sessionStorage?.setItem(CHIAVE_APERTA, '1')
  } catch {
    // senza sessione del browser si riparte dalla foto
  }
}
function eraAperta(): boolean {
  try {
    if (globalThis.sessionStorage?.getItem(CHIAVE_APERTA) === '1') {
      globalThis.sessionStorage.removeItem(CHIAVE_APERTA)
      return true
    }
  } catch {
    // come sopra
  }
  return false
}

/** Quanto dura il passaggio dalla foto alle bolle, in ms. */
const DURATA_MS = 1400
const USCITA_FOTO_MS = 700
const ARRESTO_MAX = 170
const SOGLIA_SALITA = 90

const ease = (x: number) => {
  const q = Math.min(1, Math.max(0, x))
  return 1 - (1 - q) * (1 - q)
}

/** I millisecondi dall'apertura, fino a `DURATA_MS` e poi fermo. Con «riduci movimento» il passaggio e' gia' finito. */
function useTransizione(attiva: boolean, fermo: boolean): number {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    if (!attiva || fermo) return
    let id = 0
    const inizio = Date.now()
    const giro = () => {
      const m = Date.now() - inizio
      setMs(Math.min(m, DURATA_MS))
      if (m < DURATA_MS) id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    return () => cancelAnimationFrame(id)
  }, [attiva, fermo])
  return attiva && fermo ? DURATA_MS : ms
}

/** L'anello che respira intorno alla manopola: dice che si puo' toccare. Con «riduci movimento» sta fermo. */
function Anello({ fermo }: { fermo: boolean }) {
  const [tempo, setTempo] = useState(0)
  useEffect(() => {
    if (fermo) return
    let id = 0
    const inizio = Date.now()
    const giro = () => {
      setTempo((Date.now() - inizio) / 1000)
      id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    return () => cancelAnimationFrame(id)
  }, [fermo])
  const f = (Math.sin((tempo * 2 * Math.PI) / 2.4 - Math.PI / 2) + 1) / 2
  return <View pointerEvents="none" style={[stili.anello, { opacity: fermo ? 0.7 : 0.9 - 0.65 * f, transform: [{ scale: fermo ? 1 : 0.94 + 0.18 * f }] }]} />
}

export function Apertura({ onContinua }: { onContinua: () => void }) {
  const { width, height } = useWindowDimensions()
  const ins = useSafeAreaInsets()
  const fermo = useRiduciMovimento()
  const largo = width >= LARGO
  const [aperta, setAperta] = useState(eraAperta)
  const [arrastro, setArrastro] = useState(0)
  const [suggerimento, setSuggerimento] = useState(true)
  const ms = useTransizione(aperta, fermo)
  const dito = useRef<Puntatore>({ x: 0, y: 0, attivo: false })
  const origine = useRef({ x: 0, y: 0 })
  const radice = useRef<View>(null)

  const apri = useCallback(() => {
    setArrastro(0)
    setAperta(true)
  }, [])
  // Il colpetto sul telefono, una volta, quando si apre (da un tocco o da una salita).
  useEffect(() => {
    if (aperta) colpetto('leggero')
  }, [aperta])

  // «Prova a spingere le bolle»: sparisce da solo, o appena si tocca lo schermo.
  useEffect(() => {
    if (!aperta) return
    const id = setTimeout(() => setSuggerimento(false), 6500)
    return () => clearTimeout(id)
  }, [aperta])

  // Salire col dito: una salita verticale su tutta la foto (non solo sulla manopola) prende il gesto; il tocco semplice resta alla manopola.
  const salita = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => undefined,
        onPanResponderMove: (_, g) => setArrastro(Math.max(0, Math.min(ARRESTO_MAX, -g.dy))),
        onPanResponderRelease: (_, g) => {
          if (-g.dy > SOGLIA_SALITA || g.vy < -0.8) apri()
          else setArrastro(0)
        },
        onPanResponderTerminate: () => setArrastro(0),
      }),
    [apri],
  )

  // Il dito sulle bolle: nelle coordinate dello schermo di questa vista (`clientX/Y` sono della finestra).
  const segui = (e: { nativeEvent: { clientX: number; clientY: number } }) => {
    if (!aperta) return
    dito.current.x = e.nativeEvent.clientX - origine.current.x
    dito.current.y = e.nativeEvent.clientY - origine.current.y
    dito.current.attivo = true
    if (suggerimento) setSuggerimento(false)
  }
  const rilascia = (e: { nativeEvent: { pointerType?: string } }) => {
    // Il mouse resta sullo schermo anche senza premere; il dito, alzato, non c'e' piu'.
    if (e.nativeEvent.pointerType !== 'mouse') dito.current.attivo = false
  }
  const lascia = () => {
    dito.current.attivo = false
  }

  const foto = largo || width > height ? FOTO_ORIZZONTALE : FOTO_VERTICALE
  const oFoto = aperta ? 1 - ease(ms / USCITA_FOTO_MS) : 1
  const sFoto = aperta ? 1 + 0.05 * ease(ms / USCITA_FOTO_MS) : 1
  const oBolle = aperta ? ease(ms / 900) : 0
  const oTesti = aperta ? ease((ms - 450) / 800) : 0
  const fotoVisibile = !aperta || ms < USCITA_FOTO_MS
  const parole = useMemo(() => [t('PRENOTA', 'BOOK'), t('ALLENATI', 'TRAIN'), t('PAGA', 'PAY')] as const, [])

  const loghi = largo ? { w: 140, h: 113 } : { w: 104, h: 84 }
  const titolo = largo ? Math.min(72, Math.max(48, width * 0.044)) : 40
  // Il riflesso caldo in alto a destra: un cerchio che sfuma, non una diagonale (su uno schermo largo una diagonale tingeva anche l'angolo in basso).
  const riflesso = Math.min(width * 0.62, height * 0.55)

  return (
    <View
      ref={radice}
      style={[stili.radice, { touchAction: 'none', userSelect: 'none' } as object]}
      onLayout={() => radice.current?.measureInWindow((x, y) => (origine.current = { x, y }))}
      onPointerDown={segui}
      onPointerMove={segui}
      onPointerUp={rilascia}
      onPointerCancel={lascia}
      onPointerLeave={lascia}
    >
      <StatusBar style="light" />

      {/* Il secondo tempo: lo sfondo arancio che sfuma nel nero, con un riflesso caldo in alto a destra. */}
      <LinearGradient colors={SFONDO} locations={PUNTI_SFONDO} style={StyleSheet.absoluteFill} />
      <Svg width={riflesso * 2} height={riflesso * 2} style={{ position: 'absolute', left: width * 0.88 - riflesso, top: height * 0.02 - riflesso }} pointerEvents="none">
        <Defs>
          <RadialGradient id="ac-riflesso" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFA046" stopOpacity="0.55" />
            <Stop offset="0.7" stopColor="#FFA046" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ac-riflesso)" />
      </Svg>

      {aperta ? (
        <>
          <View style={[StyleSheet.absoluteFill, { opacity: oBolle }]} pointerEvents="none">
            <Bolle larghezza={width} altezza={height} largo={largo} fermo={fermo} dito={dito} parole={parole} />
          </View>

          <View
            pointerEvents="box-none"
            style={[
              stili.testi,
              largo
                ? { width: Math.min(660, width * 0.56), justifyContent: 'center', gap: 44, paddingLeft: Math.min(150, Math.max(48, width * 0.08)) }
                : { justifyContent: 'space-between', paddingTop: ins.top + 64, paddingBottom: ins.bottom + 26, paddingHorizontal: 26 },
              { opacity: oTesti, transform: [{ translateY: 14 * (1 - oTesti) }] },
            ]}
          >
            <View pointerEvents="none">
              <View style={stili.chip}>
                <View style={stili.chipPunto} />
                <Text style={stili.chipTesto}>{t('LA TUA AREA ATHLON CLUB', 'YOUR ATHLON CLUB AREA')}</Text>
              </View>
              <Text style={[stili.titolo, { fontSize: titolo, lineHeight: titolo * 1.06 }]} accessibilityRole="header">
                {t('Il tuo club,\nsempre ', 'Your club,\nalways ')}
                <Text style={{ color: '#FFD9BF' }}>{t('con te.', 'with you.')}</Text>
              </Text>
              <Text style={[stili.sotto, largo && { fontSize: 17, lineHeight: 25, maxWidth: 430 }]}>
                {t('Prenotazioni, workout, abbonamenti e pagamenti in un posto solo. Entri con la tua email, senza password.', 'Bookings, workouts, memberships and payments all in one place. Sign in with your email, no password.')}
              </Text>
            </View>
            <View style={[stili.basso, largo && { maxWidth: 390 }]}>
              <Text style={[stili.suggerimento, { opacity: suggerimento ? 1 : 0 }, largo && { alignSelf: 'flex-start' }]} importantForAccessibility="no" accessibilityElementsHidden>
                {t('Prova a spingere le bolle', 'Try pushing the bubbles')}
              </Text>
              <Tocco onPress={onContinua} etichetta={t('Continua', 'Continue')} scala={0.98} style={stili.continua}>
                <Text style={stili.continuaTesto}>{t('Continua', 'Continue')}</Text>
                <Icona nome="avanti" size={20} colore={FUOCO[2]} />
              </Tocco>
              <Tocco onPress={() => Linking.openURL(PRIVACY_URL)} ruolo="link" etichetta={t('Informativa privacy del club', 'Club privacy notice')} vibra={null} scala={0.99}>
                <Text style={[stili.privacy, largo && { textAlign: 'left' }]}>
                  {t('Come trattiamo i tuoi dati:', 'How we handle your data:')} <Text style={stili.privacyLink}>{t('informativa privacy', 'privacy notice')}</Text>
                </Text>
              </Tocco>
            </View>
          </View>
        </>
      ) : null}

      {/* Il primo tempo: la foto della hero del sito, il velo scuro, il marchio arancio. Si dissolve quando si passa alle bolle. */}
      {fotoVisibile ? (
        <View style={[StyleSheet.absoluteFill, { opacity: oFoto, transform: [{ scale: sFoto }] }]} pointerEvents={aperta ? 'none' : 'auto'} {...salita.panHandlers}>
          <Image source={foto} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityElementsHidden aria-hidden />
          <LinearGradient colors={VELO} locations={PUNTI_VELO} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={stili.centro} pointerEvents="none">
            <Svg width={300} height={300} style={stili.bagliore}>
              <Defs>
                <RadialGradient id="ac-bagliore" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FF5701" stopOpacity="0.28" />
                  <Stop offset="1" stopColor="#FF5701" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#ac-bagliore)" />
            </Svg>
            <View accessibilityRole="image" accessibilityLabel="Athlon Club">
              <Image source={PITTOGRAMMA} style={{ width: loghi.w, height: loghi.h }} contentFit="contain" />
            </View>
            <Text style={stili.nome}>ATHLON CLUB</Text>
          </View>
          <View style={[stili.comando, { bottom: ins.bottom + 34, transform: [{ translateY: -arrastro }] }]}>
            <Tocco onPress={apri} etichetta={t('Inizia: scorri verso l’alto o tocca', 'Start: swipe up or tap')} scala={0.94} style={stili.manopola}>
              <Svg width={26} height={26} viewBox="0 0 24 24">
                <Path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke={FUOCO[2]} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Anello fermo={fermo} />
            </Tocco>
            <Text style={stili.invito}>{t('Scorri verso l’alto per iniziare', 'Swipe up to get started')}</Text>
          </View>
        </View>
      ) : null}

      {/* La lingua, in alto a destra, sia sulla foto sia sulle bolle. Per ultima: sta sopra tutto e prende i tocchi. */}
      <View style={[stili.lingua, { top: ins.top + 14, right: largo ? 28 : 16 }]} pointerEvents="box-none">
        <SceltaLinguaApertura prima={aperta ? ricordaApertura : undefined} />
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  lingua: { position: 'absolute' },
  radice: { flex: 1, overflow: 'hidden', backgroundColor: '#101113' },
  testi: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  chipPunto: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  chipTesto: { color: '#fff', fontSize: 10.5, fontFamily: F.extra, letterSpacing: 1.5 },
  titolo: { color: '#fff', fontFamily: F.extra, letterSpacing: -1.4, marginTop: 14, textShadowColor: 'rgba(120,30,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 22 },
  sotto: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 22.5, fontFamily: F.medio, marginTop: 12, maxWidth: 330 },
  basso: { gap: 12 },
  suggerimento: { alignSelf: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: F.semi },
  continua: { height: 58, borderRadius: 29, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 10px 40px rgba(255,160,90,0.45)' },
  continuaTesto: { color: FUOCO[2], fontSize: 17, fontFamily: F.extra, letterSpacing: -0.2 },
  privacy: { color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 17.5, fontFamily: F.medio, textAlign: 'center' },
  privacyLink: { color: '#fff', fontFamily: F.bold, textDecorationLine: 'underline' },
  centro: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  bagliore: { position: 'absolute' },
  nome: { marginTop: 22, color: 'rgba(255,255,255,0.92)', fontSize: 12, fontFamily: F.extra, letterSpacing: 3.1, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 },
  comando: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 14 },
  manopola: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(10,30,120,0.5)' },
  anello: { position: 'absolute', top: -9, left: -9, right: -9, bottom: -9, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  invito: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontFamily: F.semi, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 },
})
