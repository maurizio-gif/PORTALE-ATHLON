import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react'
import { Image, Modal, PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect } from 'react-native-svg'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { contaPunto, controllaPng, dentro, firmaSufficiente, percorso, pulisciPng, type Punto } from './firmaTratti'
import { Icona } from './ui/Icona'
import { Messaggio, Pulsante } from './ui/kit'
import { F, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// Il campo firma sul telefono (08/11/2026). Fino a oggi qui c'era solo un avviso, «apri il portale dal browser», e sul
// telefono «Firma il contratto» restava spento per sempre: nessuno poteva firmare dall'app (iPhone compreso).
//
// **Come e' fatto, e perche':**
// - **Il riquadro nella pagina si tocca, e la firma si fa in uno spazio a schermo intero.** Un campo da disegnare dentro
//   uno ScrollView (o dentro un foglio che scorre, come quello del contratto) litiga con lo scorrimento: il dito che
//   disegna verso il basso fa scorrere la pagina, e la firma viene a pezzi. Fuori da ogni scorrimento il problema non c'e',
//   per tutte e quattro le schermate che usano il campo, e senza toccarle.
// - **Il dito e' un `PanResponder`, il disegno e' un <Svg>, il file e' `Svg.toDataURL`.** Sono tutti pezzi gia' dentro
//   l'app installata (`react-native-svg` disegna i QR, i grafici e la ruota): niente modulo nativo nuovo, quindi niente
//   nuova build dell'App Store. Questo file arriva con un aggiornamento.
// - **La firma esce come sul web: un PNG su fondo bianco, in base64 senza prefisso**, quello che il server mette nel
//   contratto (`firma_png`, `portale-abbonamento`). Il fondo bianco e' un <Rect> dentro l'Svg: senza, il PNG e'
//   trasparente e sul PDF scuro o su uno sfondo scuro l'inchiostro non si vedrebbe.
// - **La logica pura** (il percorso, quando una firma conta, cosa accetta il server) sta in `firmaTratti.ts` ed e'
//   provata da Node: `npx tsx scripts/prova-firma.ts`.
//
// Sul web c'e' un <canvas> (`FirmaPad.web.tsx`).

const INCHIOSTRO = '#1a1a1a'
const SPESSORE = 2.6
/** L'altezza del riquadro nella pagina, con la firma dentro o in attesa. */
const ALTEZZA_RIQUADRO = 150
const MARGINE = spazio.tre
/** La zona di firma e' circa 2:1, come lo spazio che il contratto le da' (al massimo 260×110). */
const PROPORZIONE = 0.55

export function FirmaPad({ onCambia }: { onCambia: (png: string | null) => void }) {
  const p = usePalette()
  const [png, setPng] = useState<string | null>(null)
  const [aperto, setAperto] = useState(false)

  // Come sul web: un campo che nasce vuoto lo dice a chi lo ospita. Se la tendina del contratto si chiude e si riapre il
  // campo ricomincia, e il padre non deve restare con una firma che qui non si vede piu'.
  useEffect(() => {
    onCambia(null)
  }, [onCambia])

  const fatto = (nuova: string) => {
    setPng(nuova)
    onCambia(nuova)
    setAperto(false)
  }
  const rifai = () => {
    setPng(null)
    onCambia(null)
    setAperto(true)
  }

  return (
    <View style={{ gap: spazio.due }}>
      {png ? (
        <View style={[stili.riquadro, { borderColor: p.linea, backgroundColor: '#fff' }]}>
          <Image source={{ uri: `data:image/png;base64,${png}` }} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={t('La tua firma', 'Your signature')} />
          <View style={stili.acquisita} pointerEvents="none">
            <Icona nome="ok" size={14} colore={p.ok} />
            <Text style={{ color: '#6b6b6b', fontFamily: F.semi, fontSize: 12 }}>{t('Firma acquisita', 'Signature captured')}</Text>
          </View>
        </View>
      ) : (
        <Tocco
          onPress={() => setAperto(true)}
          etichetta={t('Firma qui. Si apre lo spazio per firmare con il dito.', 'Sign here. Opens the space to sign with your finger.')}
          scala={0.985}
          style={[stili.riquadro, stili.vuoto, { borderColor: p.accento, backgroundColor: '#fff' }]}
        >
          <Icona nome="modifica" size={26} colore={p.accento} />
          <Text style={{ color: '#1a1a1a', fontFamily: F.extra, fontSize: 16, marginTop: 6 }}>{t('Tocca qui per firmare', 'Tap here to sign')}</Text>
          <Text style={{ color: '#6b6b6b', fontFamily: F.medio, fontSize: 12.5, marginTop: 2, textAlign: 'center' }}>{t('Si apre uno spazio a schermo intero, dove firmi con il dito.', 'A full-screen space opens, where you sign with your finger.')}</Text>
        </Tocco>
      )}
      {png ? <Pulsante testo={t('Cancella e rifai', 'Clear and redo')} variante="fantasma" piccolo pieno={false} onPress={rifai} /> : null}
      <SpazioFirma aperto={aperto} onChiudi={() => setAperto(false)} onFatto={fatto} />
    </View>
  )
}

/** Lo spazio a schermo intero dove si firma. */
function SpazioFirma({ aperto, onChiudi, onFatto }: { aperto: boolean; onChiudi: () => void; onFatto: (png: string) => void }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const larghezza = Math.min(width - MARGINE * 2, 560)
  const altezza = Math.min(Math.max(Math.round(larghezza * PROPORZIONE), 150), 260)

  const svg = useRef<Svg>(null)
  const tratti = useRef<Punto[][]>([])
  const [versione, setVersione] = useState(0)
  const [lunga, setLunga] = useState(false)
  const [corta, setCorta] = useState(false)
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Ogni volta che si apre si parte da un foglio bianco.
  useEffect(() => {
    if (!aperto) return
    tratti.current = []
    setLunga(false)
    setCorta(false)
    setErrore(null)
    setVersione((v) => v + 1)
  }, [aperto])

  function cancella() {
    tratti.current = []
    setLunga(false)
    setCorta(false)
    setErrore(null)
    setVersione((v) => v + 1)
  }

  /** Il dito si e' staccato: la firma conta se la strada fatta e' abbastanza lunga. */
  function finito() {
    const ok = firmaSufficiente(tratti.current)
    setLunga(ok)
    setCorta(!ok && tratti.current.length > 0)
  }

  async function conferma() {
    if (!svg.current || lavoro || !lunga) return
    setErrore(null)
    setLavoro(true)
    try {
      const png = pulisciPng(await catturaPng(svg.current, larghezza, altezza))
      const esito = controllaPng(png)
      if (esito === 'troppo_grande') {
        setErrore(t('La firma è troppo complessa: cancella e rifalla con un tratto più semplice.', 'The signature is too complex: clear it and sign again with a simpler stroke.'))
        return
      }
      if (esito !== 'ok') throw new Error(`png ${esito}`)
      colpetto('ok')
      onFatto(png)
    } catch {
      setErrore(t('Non siamo riusciti a registrare la firma. Riprova; se continua, firma dal browser: app.athlonroma.it.', 'We couldn’t capture the signature. Try again; if it keeps failing, sign from your browser: app.athlonroma.it.'))
      colpetto('errore')
    } finally {
      setLavoro(false)
    }
  }

  return (
    <Modal visible={aperto} animationType="slide" onRequestClose={onChiudi} statusBarTranslucent>
      <View style={[stili.fondo, { backgroundColor: p.fondo, paddingTop: ins.top + spazio.tre, paddingBottom: ins.bottom + spazio.tre }]}>
        <View style={stili.testa}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
              {t('Firma qui', 'Sign here')}
            </Text>
            <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('Usa il dito, dentro lo spazio bianco.', 'Use your finger, inside the white area.')}</Text>
          </View>
          <Tocco onPress={onChiudi} etichetta={t('Chiudi senza firmare', 'Close without signing')} style={[stili.chiudi, { backgroundColor: p.incavo }]}>
            <Icona nome="chiudi" size={17} colore={p.testo} />
          </Tocco>
        </View>

        <View style={stili.centro}>
          <Zona larghezza={larghezza} altezza={altezza} versione={versione} tratti={tratti} svg={svg} onFine={finito} />
          {corta ? (
            <Text style={[stili.nota, { color: p.attenzione }]} accessibilityLiveRegion="polite">
              {t('La firma è troppo breve: riprova.', 'The signature is too short: try again.')}
            </Text>
          ) : null}
          {errore ? <Messaggio>{errore}</Messaggio> : null}
        </View>

        <View style={{ gap: spazio.due, paddingHorizontal: MARGINE }}>
          <Pulsante testo={t('Conferma la firma', 'Confirm signature')} icona="ok" onPress={conferma} inCorso={lavoro} disabilitato={!lunga} />
          <Pulsante testo={t('Cancella', 'Clear')} variante="secondario" piccolo onPress={cancella} disabilitato={lavoro || (tratti.current.length === 0 && !corta)} />
        </View>
      </View>
    </Modal>
  )
}

/**
 * La zona bianca dove il dito disegna. Si ridisegna da sola a ogni movimento: il resto dello spazio (pulsanti, titolo)
 * non si ridisegna a ogni tocco.
 */
function Zona({ larghezza, altezza, versione, tratti, svg, onFine }: { larghezza: number; altezza: number; versione: number; tratti: RefObject<Punto[][]>; svg: RefObject<Svg | null>; onFine: () => void }) {
  const [, ridisegna] = useReducer((n: number) => n + 1, 0)
  // I gesti leggono sempre le misure di adesso, senza far rinascere il `PanResponder` a ogni giro.
  const misure = useRef({ larghezza, altezza })
  misure.current = { larghezza, altezza }
  const fine = useRef(onFine)
  fine.current = onFine

  const pan = useMemo(() => {
    const punto = (e: { nativeEvent: { locationX: number; locationY: number } }) => dentro({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }, misure.current.larghezza, misure.current.altezza)
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Una volta cominciato il tratto non si cede il gesto a nessuno (nemmeno a uno scorrimento sotto il foglio).
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        tratti.current.push([punto(e)])
        ridisegna()
      },
      onPanResponderMove: (e) => {
        const corrente = tratti.current[tratti.current.length - 1]
        if (!corrente) return
        const nuovo = punto(e)
        if (!contaPunto(corrente[corrente.length - 1], nuovo)) return
        corrente.push(nuovo)
        ridisegna()
      },
      onPanResponderRelease: () => fine.current(),
      onPanResponderTerminate: () => fine.current(),
    })
    // `tratti` e' un ref: non cambia mai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `versione` cambia a ogni «cancella»: serve solo a far ridisegnare la zona vuota.
  void versione
  const vuota = tratti.current.length === 0

  return (
    <View
      {...pan.panHandlers}
      collapsable={false}
      accessibilityLabel={t('Spazio per la firma', 'Signature area')}
      style={[stili.zona, { width: larghezza, height: altezza }]}
    >
      {/* I figli non prendono il tocco: il gesto resta della zona, e `locationX/Y` e' sempre relativo a lei. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg ref={svg} width={larghezza} height={altezza}>
          <Rect x={0} y={0} width={larghezza} height={altezza} fill="#ffffff" />
          {tratti.current.map((tratto, i) => (
            <Path key={i} d={percorso(tratto)} stroke={INCHIOSTRO} strokeWidth={SPESSORE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      </View>
      {/* La riga e la scritta non sono nel PNG: stanno sopra l'Svg, non dentro. */}
      <View pointerEvents="none" style={stili.riga}>
        <Text style={{ color: '#9a9a9a', fontFamily: F.medio, fontSize: 12 }}>{vuota ? t('Firma qui con il dito', 'Sign here with your finger') : ' '}</Text>
      </View>
    </View>
  )
}

/**
 * Il disegno come PNG, in base64.
 * - iOS: `RNSVGSvgView` usa `boundingBox`, che vale zero finche' la vista non e' stata disegnata una volta: si passano le
 *   misure. L'immagine esce a scala piena dello schermo (3× su un iPhone).
 * - Android: le misure sono pixel veri, e noi le abbiamo in punti. Senza, prende la vista com'e', a pixel pieni.
 */
function catturaPng(svg: Svg, larghezza: number, altezza: number): Promise<string> {
  return new Promise((ok, no) => {
    const timer = setTimeout(() => no(new Error('tempo scaduto')), 10_000)
    try {
      const misure = Platform.OS === 'ios' ? { width: Math.round(larghezza), height: Math.round(altezza) } : undefined
      svg.toDataURL((b64?: string) => {
        clearTimeout(timer)
        if (b64) ok(b64)
        else no(new Error('immagine vuota'))
      }, misure)
    } catch (e) {
      clearTimeout(timer)
      no(e)
    }
  })
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden', height: ALTEZZA_RIQUADRO },
  vuoto: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  acquisita: { position: 'absolute', left: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  fondo: { flex: 1, paddingHorizontal: 0 },
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, paddingHorizontal: MARGINE },
  titolo: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.7 },
  sotto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  chiudi: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spazio.tre, paddingHorizontal: MARGINE },
  zona: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  riga: { position: 'absolute', left: 16, right: 16, bottom: 14, borderTopWidth: 1, borderTopColor: '#cfcfcf', paddingTop: 4 },
  nota: { fontFamily: F.semi, fontSize: 13.5, textAlign: 'center' },
})
