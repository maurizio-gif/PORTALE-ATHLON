import { memo, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

import { F } from '../ui/tema'
import { aRiposo, creaBolle, disposizione, passo, scoppio, seme, unita, visibilitaParola, type Bolla, type Forma, type Misure, type Puntatore, type Tono } from './bolle'

// Le bolle dell'apertura dell'accesso (07/11/2026, richiesta di Maurizio, da un video di un'app Flutter): bolle di sapone con dentro i
// simboli delle attivita' e delle funzioni dell'app, che galleggiano e si scostano dal dito o dal mouse. La fisica sta in `bolle.ts`.
//
// Come l'avvio animato (`avvio/Avvio.tsx`) **non usa Reanimated**: un solo orologio (requestAnimationFrame) fa un passo della fisica e
// ridisegna, perche' sul web i movimenti continui con Reanimated non sono provati. Le bolle sono semplici `View` con `transform`, e il
// vetro e' un disegno SVG fermo (`Vetro`, memorizzato: non si ridisegna a ogni passo, cambia solo la posizione).

/** I simboli, in un riquadro da 24 (tratto sottile, come le icone dell'app). */
const SIMBOLI: Record<Exclude<Forma, 'etichetta' | 'vuota'>, () => React.ReactElement> = {
  nuoto: () => (
    <>
      <Path d="M2 16c2.2-2.2 4.2-2.2 6.4 0s4.2 2.2 6.4 0 4.2-2.2 6.4 0" />
      <Path d="M2 11c2.2-2.2 4.2-2.2 6.4 0s4.2 2.2 6.4 0 4.2-2.2 6.4 0" />
      <Circle cx="16.5" cy="5.5" r="1.7" />
    </>
  ),
  pesi: () => <Path d="M7 6v12M17 6v12M3.5 9v6M20.5 9v6M7 12h10" />,
  yoga: () => (
    <>
      <Circle cx="12" cy="5" r="1.9" />
      <Path d="M12 8.2v5.3M12 13.5l-4.2 5.6M12 13.5l4.2 5.6M5.5 10.6 12 9.4l6.5 1.2" />
    </>
  ),
  spinning: () => (
    <>
      <Circle cx="6" cy="16.5" r="3.6" />
      <Circle cx="18" cy="16.5" r="3.6" />
      <Path d="M6 16.5 9.8 8.8h5.2l3 7.7M9.8 8.8l3.4 7.7M8 6h3" />
    </>
  ),
  junior: () => (
    <>
      <Circle cx="12" cy="12" r="8.6" />
      <Path d="M8.7 10.2h.01M15.3 10.2h.01M8.4 14.2c1.6 2.2 5.6 2.2 7.2 0" />
    </>
  ),
  calendario: () => (
    <>
      <Rect x="4" y="5.5" width="16" height="14.5" rx="2.6" />
      <Path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  cuore: () => <Path d="M12 19.5s-7-4.3-7-9.6a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 5.3-7 9.6-7 9.6z" />,
  tessera: () => (
    <>
      <Rect x="3.5" y="6" width="17" height="12" rx="2.6" />
      <Path d="M3.5 10.5h17M7 15h4" />
    </>
  ),
  fulmine: () => <Path d="M13 3 5.5 13.5H11l-1 7.5 7.5-10.5H12z" />,
}

/** Il disco colorato dietro il simbolo: [chiaro, medio, scuro] e il colore del tratto. */
const DISCHI: Record<Tono, { colori: [string, string, string]; tratto: string }> = {
  fuoco: { colori: ['#FF8A2B', '#FF5701', '#E84300'], tratto: '#FFFFFF' },
  mare: { colori: ['#5C8DFF', '#2F6BFF', '#1F4FD8'], tratto: '#FFFFFF' },
  bianco: { colori: ['#FFFFFF', '#FFE3D0', '#FFCFB0'], tratto: '#E84300' },
}

/** Il corpo del vetro, dal centro al bordo: [posizione, colore, opacita']. La bolla vuota e' rossastra, quella con la scritta piu' scura. */
const CORPI: Record<'n' | 'v' | 'e', [number, string, number][]> = {
  n: [[0.56, '#FFFFFF', 0], [0.76, '#FFFFFF', 0.12], [1, '#FFFFFF', 0.34]],
  v: [[0, '#FF5028', 0.3], [0.6, '#FF3C1E', 0.18], [1, '#FFFFFF', 0.22]],
  e: [[0, '#D22814', 0.55], [0.7, '#780F14', 0.55], [1, '#FFFFFF', 0.25]],
}

/**
 * Il vetro: il corpo trasparente con il bordo che cambia colore da un lato all'altro (come una bolla di sapone) e il riflesso in alto a
 * sinistra; dentro, il disco con il simbolo. Un disegno SVG fermo, uguale sul web e sull'app (niente `boxShadow` inset, che non e' ovunque).
 */
const Vetro = memo(function Vetro({ forma, tono, d }: { forma: Forma; tono: Tono | null; d: number }) {
  const tipo = forma === 'etichetta' ? 'e' : forma === 'vuota' ? 'v' : 'n'
  const disco = tono ? DISCHI[tono] : null
  const Simbolo = forma === 'etichetta' || forma === 'vuota' ? null : SIMBOLI[forma]
  return (
    <Svg width={d} height={d} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`ac-corpo-${tipo}`} cx="50" cy="55" r="50" gradientUnits="userSpaceOnUse">
          {CORPI[tipo].map(([o, colore, alfa]) => (
            <Stop key={o} offset={o} stopColor={colore} stopOpacity={alfa} />
          ))}
        </RadialGradient>
        <LinearGradient id="ac-iride" x1="0" y1="50" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FF8CDD" stopOpacity="0.55" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.2" />
          <Stop offset="1" stopColor="#6EDCFF" stopOpacity="0.55" />
        </LinearGradient>
        <LinearGradient id="ac-oro" x1="50" y1="100" x2="50" y2="62" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFD678" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#FFD678" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="ac-luce" cx="32" cy="24" r="14" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        {disco ? (
          <RadialGradient id={`ac-disco-${tono}`} cx="40" cy="38" r="42" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={disco.colori[0]} />
            <Stop offset="0.6" stopColor={disco.colori[1]} />
            <Stop offset="1" stopColor={disco.colori[2]} />
          </RadialGradient>
        ) : null}
      </Defs>
      <Circle cx="50" cy="50" r="49" fill={`url(#ac-corpo-${tipo})`} />
      {disco && tono && Simbolo ? (
        <>
          <Circle cx="50" cy="54" r="34" fill="#500A00" fillOpacity="0.28" />
          <Circle cx="50" cy="50" r="34" fill={`url(#ac-disco-${tono})`} />
          <G transform="translate(31 31) scale(1.5833)" fill="none" stroke={disco.tratto} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            {[<Simbolo key="s" />]}
          </G>
        </>
      ) : null}
      <Circle cx="50" cy="50" r="47.5" fill="none" stroke="url(#ac-iride)" strokeWidth="3.2" />
      <Circle cx="50" cy="50" r="47.5" fill="none" stroke="url(#ac-oro)" strokeWidth="3.2" />
      <Circle cx="50" cy="50" r="48.8" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1.5" />
      <Ellipse cx="32" cy="24" rx="13" ry="8.5" fill="url(#ac-luce)" transform="rotate(-28 32 24)" />
    </Svg>
  )
})

function BollaVista({ b, u, tempo, parole, fermo }: { b: Bolla; u: number; tempo: number; parole: readonly string[]; fermo: boolean }) {
  const d = b.r * 2 * u
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: d,
        height: d,
        // Prima di comparire la scala e' 0: una scala davvero nulla su alcuni dispositivi non disegna piu' niente quando poi cresce.
        transform: [{ translateX: b.x - d / 2 }, { translateY: b.y - d / 2 }, { scale: Math.max(b.s, 0.001) }],
      }}
    >
      <Vetro forma={b.forma} tono={b.tono} d={d} />
      {b.forma === 'etichetta'
        ? parole.map((p, k) => (
            <View key={p} style={[StyleSheet.absoluteFill, stili.parola, { opacity: fermo ? (k === 0 ? 1 : 0) : visibilitaParola(tempo, k, parole.length) }]}>
              <Text style={[stili.testoParola, { fontSize: 11 * u, letterSpacing: 1.7 * u }]}>{p}</Text>
            </View>
          ))
        : null}
    </View>
  )
}

/**
 * Lo strato delle bolle: occupa tutto lo schermo e non prende i tocchi (`pointerEvents="none"`), il dito arriva da fuori in `dito`.
 * Parte con lo scoppio dal basso quando compare; con `fermo` («riduci movimento») sta a riposo senza muoversi.
 */
export function Bolle({ larghezza, altezza, largo, fermo, dito, parole }: { larghezza: number; altezza: number; largo: boolean; fermo: boolean; dito: MutableRefObject<Puntatore>; parole: readonly string[] }) {
  // La simulazione e' mutabile e sta in un ref; a ogni passo se ne scatta un'istantanea in stato, ed e' da quella che si disegna.
  const sim = useRef<Bolla[] | null>(null)
  const tempo = useRef(0)
  const iniziato = useRef(false)
  const [quadro, setQuadro] = useState<{ tempo: number; bolle: Bolla[] } | null>(null)

  useEffect(() => {
    if (!sim.current) sim.current = creaBolle()
    const b = sim.current
    const m: Misure = { larghezza, altezza, largo }
    const scatta = () => setQuadro({ tempo: tempo.current, bolle: b.map((x) => ({ ...x })) })
    disposizione(b, m)
    if (fermo) {
      aRiposo(b)
      const id = requestAnimationFrame(scatta)
      return () => cancelAnimationFrame(id)
    }
    // Lo scoppio solo la prima volta: dopo un ridimensionamento le bolle si portano da sole ai posti nuovi, con la molla.
    if (!iniziato.current) {
      iniziato.current = true
      scoppio(b, m, seme(11))
    }
    let id = 0
    const partenza = Date.now() - tempo.current * 1000
    let ultimo = Date.now()
    const giro = () => {
      const ora = Date.now()
      tempo.current = (ora - partenza) / 1000
      passo(b, m, tempo.current, (ora - ultimo) / 1000, dito.current, false)
      ultimo = ora
      scatta()
      id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    return () => cancelAnimationFrame(id)
  }, [larghezza, altezza, largo, fermo, dito])

  if (!quadro) return null
  const u = unita({ larghezza, altezza, largo })
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {quadro.bolle.map((x) => (
        <BollaVista key={x.indice} b={x} u={u} tempo={quadro.tempo} parole={parole} fermo={fermo} />
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  parola: { alignItems: 'center', justifyContent: 'center' },
  testoParola: { color: '#FFFFFF', fontFamily: F.extra, textShadowColor: 'rgba(80,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
})
