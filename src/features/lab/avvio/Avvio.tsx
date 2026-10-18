import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import Svg, { ClipPath, Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

import { F } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { ALTEZZA, FORME, LARGHEZZA, percorso, perimetro, puntoSu } from './logo'
import { avvioDaMostrare } from './mostra'
import { casuale, fase, impulso, limita, mescola, rallenta, rimbalzo, scatta } from './tempi'

// L'avvio animato dell'app (richiesta del club, 19/10/2026): il pittogramma di Athlon si disegna,
// si riempie di fuoco, le due meta' si incastrano con un lampo e una scossa, il logo «prende vita»
// (due battiti, un respiro), e compaiono «Athlon Club 4.0» e il motto. Quattro secondi e un poco,
// poi la scena si dissolve nell'app; un tocco la salta.
//
// **Tutto e' una funzione pura del tempo** (tempi.ts): un solo orologio (requestAnimationFrame)
// scrive `t`, e ogni elemento si calcola da li'. Come per gli altri movimenti dell'app che arrivano
// a un valore, le forme SVG hanno semplici proprieta' e non sono animate da Reanimated (sul web non
// e' provato). Le tappe, in ms:
//    150-1200  il tratto si disegna, con la punta luminosa della «penna»
//    700-1300  le due forme arrivano da lati opposti e si incastrano (con un piccolo rimbalzo)
//        950   il riempimento sale; 1320 lo scatto: lampo, tre onde, diciotto scintille
//   1400-1950  il riflesso attraversa il logo; 1900 e 2250 i due battiti
//   1750-2650  «ATHLON CLUB» a lettere; 2300 «4.0» con un colpo, bianco incandescente che si raffredda
//   2750-3500  il motto, parola per parola, sotto una linea che si apre
//   3650-4200  l'uscita: la scena si ingrandisce un poco e si dissolve
// Con «riduci movimento» non si muove niente: la scena finita, in dissolvenza, per un secondo e mezzo.

export const DURATA_MS = 4200
const USCITA_DA = 3650
const SALTO_MS = 320
const DURATA_RIDOTTA_MS = 1500
const SCATTO = 1320

const FUOCO = ['#FFB070', '#FF8A2B', '#FF5701', '#E84300'] as const
const TITOLO = 'ATHLON CLUB'
const MOTTO = ['Innovare', 'è', 'la', 'nostra', 'miglior', 'tradizione']

const LUNGHEZZE = FORME.map((f) => perimetro(f.punti))
const TRACCIATI = FORME.map((f) => percorso(f.punti))

/** Mostra l'avvio se e' il momento (mostra.ts), poi si toglie da solo. */
export function Avvio() {
  const [attivo, setAttivo] = useState(() => avvioDaMostrare())
  if (!attivo) return null
  return <Scena onFine={() => setAttivo(false)} />
}

function useOrologio(salto: number | null, durata: number, onFine: () => void): number {
  const [t, setT] = useState(0)
  const fine = useRef(onFine)
  fine.current = onFine
  const sal = useRef(salto)
  sal.current = salto
  useEffect(() => {
    let id = 0
    const partenza = Date.now()
    const giro = () => {
      const ms = Date.now() - partenza
      setT(ms)
      const termine = sal.current !== null ? sal.current + SALTO_MS : durata
      if (ms >= termine) fine.current()
      else id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    // Una rete di sicurezza: qualunque cosa succeda, l'app non resta sotto il sipario.
    const sicurezza = setTimeout(() => fine.current(), durata + 3000)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(sicurezza)
    }
  }, [durata])
  return t
}

function Scena({ onFine }: { onFine: () => void }) {
  const fermo = useReducedMotion()
  const { width: W, height: H } = useWindowDimensions()
  const [salto, setSalto] = useState<number | null>(null)
  const durata = fermo ? DURATA_RIDOTTA_MS : DURATA_MS
  const ms = useOrologio(salto, durata, onFine)

  // Con «riduci movimento» la scena e' sempre quella finita, che entra ed esce in dissolvenza.
  const t = fermo ? USCITA_DA - 50 : ms
  const uscita = fermo ? fase(ms, 1250, 250) : salto !== null ? fase(ms, salto, SALTO_MS) : fase(ms, USCITA_DA, DURATA_MS - USCITA_DA)
  const ingresso = fermo ? fase(ms, 0, 250) : 1
  const opacita = ingresso * (1 - uscita)

  const scattato = useRef(false)
  useEffect(() => {
    if (!fermo && !scattato.current && t >= SCATTO) {
      scattato.current = true
      colpetto('ok')
    }
  }, [t, fermo])

  // Le misure: il logo sta nel terzo alto, il testo sotto.
  const s = Math.min(0.9, (W * 0.46) / LARGHEZZA, (H * 0.22) / ALTEZZA)
  const cx = W / 2
  const cy = H * 0.37
  const logoAlt = ALTEZZA * s
  const R = (LARGHEZZA * s) / 2 + 40

  // Polvere, onde e scintille: sempre le stesse a ogni apertura.
  const polvere = useMemo(() => {
    const r = casuale(7)
    return Array.from({ length: 34 }, () => ({ x: r() * W, y0: r() * H, v: 7 + r() * 22, r: 0.8 + r() * 1.8, f: r() * 6.28, c: r() < 0.25 ? '#FF8A2B' : '#FFFFFF' }))
  }, [W, H])
  const scintille = useMemo(() => {
    const r = casuale(31)
    return Array.from({ length: 18 }, (_, i) => ({
      a: (i / 18) * Math.PI * 2 + (r() - 0.5) * 0.25,
      v: 120 + r() * 210,
      l: 12 + r() * 30,
      ritardo: r() * 90,
      durata: 650 + r() * 450,
      c: ['#FFD166', '#FF8A2B', '#FFFFFF', '#FF5701'][i % 4],
      w: 1.6 + r() * 2.2,
    }))
  }, [])

  // Le fasi del logo.
  const volo = rimbalzo(fase(t, 700, 600)) // 0 -> 1 (supera 1 e torna): le forme si incastrano
  const riempimento = rallenta(fase(t, 950, 450))
  const battito = 1 + 0.06 * impulso(t, 1900, 110) + 0.04 * impulso(t, 2250, 110)
  const respiro = fase(t, 2400, 1000) * Math.sin((t - 2400) / 520) // sale piano, poi ondeggia
  const scalaLogo = s * battito * (0.9 + 0.1 * rallenta(fase(t, 120, 700))) * (1 + 0.012 * respiro)
  const alone = (0.22 + 0.78 * rallenta(fase(t, 900, 800))) * (1 + 0.5 * impulso(t, 1320, 160) + 0.18 * impulso(t, 1900, 120) + 0.12 * impulso(t, 2250, 120))
  const lampo = impulso(t, SCATTO + 10, 85)

  const titolo = TITOLO.split('')
  const corpoTitolo = Math.min(30, W * 0.075)
  const corpo40 = Math.min(92, W * 0.235)
  const popQuattro = rimbalzo(fase(t, 2300, 520))
  const calore = rallenta(fase(t, 2300, 900)) // 0 bianco incandescente -> 1 arancio
  const linea = rallenta(fase(t, 2600, 450))
  const sopraTesto = cy + logoAlt / 2 + 30

  return (
    <Pressable
      onPress={() => salto === null && !fermo && setSalto(ms)}
      accessibilityRole="button"
      accessibilityLabel="Athlon Club 4.0. Innovare è la nostra miglior tradizione. Tocca per continuare."
      style={[stili.radice, { opacity: opacita }]}
    >
      <View style={[StyleSheet.absoluteFill, { transform: [{ scale: 1 + 0.12 * rallenta(uscita) }] }]} pointerEvents="none">
        {/* Il fondo e l'alone di fuoco dietro il logo, la polvere, le onde, le scintille, il logo */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="alone" cx={cx} cy={cy} rx={Math.max(W, H) * 0.62} ry={Math.max(W, H) * 0.62} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FF5701" stopOpacity="0.55" />
              <Stop offset="0.35" stopColor="#E84300" stopOpacity="0.2" />
              <Stop offset="1" stopColor="#0E0F11" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="lampo" cx={cx} cy={cy} rx={Math.max(W, H) * 0.5} ry={Math.max(W, H) * 0.5} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
              <Stop offset="0.25" stopColor="#FFB070" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#FF5701" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="fuoco" x1="0" y1="0" x2={LARGHEZZA} y2={ALTEZZA} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={FUOCO[1]} />
              <Stop offset="0.55" stopColor={FUOCO[2]} />
              <Stop offset="1" stopColor={FUOCO[3]} />
            </LinearGradient>
            <LinearGradient id="tratto" x1="0" y1="0" x2={LARGHEZZA} y2={ALTEZZA} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFE9CC" />
              <Stop offset="1" stopColor="#FF9A4D" />
            </LinearGradient>
            <LinearGradient id="lama" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            <ClipPath id="forme">
              {TRACCIATI.map((d, i) => (
                <Path key={FORME[i].id} d={d} />
              ))}
            </ClipPath>
          </Defs>

          <Rect x={0} y={0} width={W} height={H} fill="#0E0F11" />
          <Rect x={0} y={0} width={W} height={H} fill="url(#alone)" opacity={Math.min(1, alone)} />

          {/* Polvere che sale piano */}
          {polvere.map((p, i) => {
            const y = (((p.y0 - (p.v * t) / 1000) % H) + H) % H
            return <Circle key={i} cx={p.x} cy={y} r={p.r} fill={p.c} opacity={0.5 * fase(t, 0, 600) * (0.35 + 0.65 * Math.abs(Math.sin(t / 700 + p.f)))} />
          })}

          {/* Il cerchio che ruota attorno al logo, e tre punti in orbita */}
          <Circle cx={cx} cy={cy} r={R} fill="none" stroke="#FF8A2B" strokeWidth={1.2} strokeDasharray="2 9" strokeDashoffset={-t * 0.03} opacity={0.38 * fase(t, 1500, 600)} />
          {[0, 1, 2].map((k) => {
            const a = t * 0.0019 + (k * Math.PI * 2) / 3
            return <Circle key={k} cx={cx + R * Math.cos(a)} cy={cy + R * Math.sin(a)} r={k === 0 ? 3.4 : 2.4} fill={k === 0 ? '#FFFFFF' : '#FF8A2B'} opacity={0.9 * fase(t, 1600, 500)} />
          })}

          {/* Le tre onde dello scatto */}
          {[0, 1, 2].map((i) => {
            const p = fase(t, SCATTO + i * 130, 950)
            if (p <= 0 || p >= 1) return null
            return <Circle key={i} cx={cx} cy={cy} r={30 + scatta(p) * (250 + i * 70)} fill="none" stroke={i === 0 ? '#FFD9A8' : '#FF8A2B'} strokeWidth={0.6 + 4 * (1 - p)} opacity={0.65 * Math.pow(1 - p, 1.4)} />
          })}

          {/* Le scintille */}
          {scintille.map((sc, i) => {
            const p = fase(t, SCATTO + 10 + sc.ritardo, sc.durata)
            if (p <= 0 || p >= 1) return null
            const r0 = 56 + sc.v * scatta(p)
            const r1 = r0 + sc.l * (1 - p)
            return <Line key={i} x1={cx + r0 * Math.cos(sc.a)} y1={cy + r0 * Math.sin(sc.a)} x2={cx + r1 * Math.cos(sc.a)} y2={cy + r1 * Math.sin(sc.a)} stroke={sc.c} strokeWidth={sc.w * (1 - p * 0.6)} strokeLinecap="round" opacity={1 - p} />
          })}

          {/* Il logo: al centro, con il battito */}
          <G transform={`translate(${cx} ${cy}) scale(${scalaLogo}) translate(${-LARGHEZZA / 2} ${-ALTEZZA / 2})`}>
            {FORME.map((f, i) => {
              const inizio = i === 0 ? 150 : 330
              const disegno = rallenta(fase(t, inizio, 950))
              const L = LUNGHEZZE[i]
              const dx = f.da[0] * (1 - volo)
              const dy = f.da[1] * (1 - volo)
              const punta = puntoSu(f.punti, disegno * L)
              const penna = disegno > 0.005 && disegno < 0.995
              return (
                <G key={f.id} transform={`translate(${dx} ${dy})`}>
                  <Path d={TRACCIATI[i]} fill="url(#fuoco)" fillOpacity={riempimento} />
                  <Path
                    d={TRACCIATI[i]}
                    fill="none"
                    stroke="url(#tratto)"
                    strokeWidth={5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={`${L} ${L}`}
                    strokeDashoffset={L * (1 - disegno)}
                    opacity={disegno > 0.002 ? 1 - 0.85 * rallenta(fase(t, 1250, 500)) : 0}
                  />
                  {penna ? (
                    <>
                      <Circle cx={punta[0]} cy={punta[1]} r={16} fill="#FF8A2B" opacity={0.28} />
                      <Circle cx={punta[0]} cy={punta[1]} r={7} fill="#FFD9A8" opacity={0.7} />
                      <Circle cx={punta[0]} cy={punta[1]} r={3.2} fill="#FFFFFF" />
                    </>
                  ) : null}
                </G>
              )
            })}
            {/* I due riflessi, fra le forme e solo sulle forme */}
            <G clipPath="url(#forme)">
              <Rect x={-140 + 560 * rallenta(fase(t, 1400, 560))} y={-30} width={78} height={ALTEZZA + 60} fill="url(#lama)" transform="skewX(-22)" opacity={fase(t, 1400, 60) * (1 - fase(t, 1850, 120))} />
              <Rect x={-140 + 560 * rallenta(fase(t, 2950, 520))} y={-30} width={56} height={ALTEZZA + 60} fill="url(#lama)" transform="skewX(-22)" opacity={0.55 * fase(t, 2950, 60) * (1 - fase(t, 3380, 120))} />
            </G>
          </G>

          {/* Il lampo dello scatto, sopra tutto */}
          <Rect x={0} y={0} width={W} height={H} fill="url(#lampo)" opacity={0.7 * lampo} />
        </Svg>

        {/* Il nome e il motto */}
        <View style={[stili.testo, { top: sopraTesto }]} pointerEvents="none">
          <View style={stili.titolo}>
            {titolo.map((c, i) => {
              const p = rallenta(fase(t, 1750 + i * 52, 460))
              return (
                <Text
                  key={i}
                  style={[stili.lettera, { fontSize: corpoTitolo, letterSpacing: corpoTitolo * 0.16, opacity: p, transform: [{ translateY: (1 - p) * 26 }, { scale: 0.88 + 0.12 * p }] }]}
                >
                  {c === ' ' ? ' ' : c}
                </Text>
              )
            })}
          </View>
          <Text
            style={[
              stili.quattro,
              {
                fontSize: corpo40,
                lineHeight: corpo40 * 1.08,
                color: mescola('#FFFFFF', '#FF5701', calore),
                opacity: limita(popQuattro * 1.4),
                transform: [{ scale: 0.35 + 0.65 * popQuattro }],
                textShadowColor: 'rgba(255, 87, 1, 0.85)',
                textShadowRadius: 8 + 30 * (1 - calore * 0.6) * limita(popQuattro),
                textShadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            4.0
          </Text>
          <View style={[stili.linea, { width: 84 * linea, opacity: linea }]} />
          <View style={[stili.motto, { maxWidth: Math.min(W - 48, 380) }]}>
            {MOTTO.map((parola, i) => {
              const p = rallenta(fase(t, 2750 + i * 78, 460))
              return (
                <Text key={i} style={[stili.parola, { fontSize: Math.min(17, W * 0.044), opacity: p, transform: [{ translateY: (1 - p) * 14 }] }]}>
                  {parola}
                </Text>
              )
            })}
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const stili = StyleSheet.create({
  radice: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999, backgroundColor: '#0E0F11', overflow: 'hidden' },
  testo: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  titolo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  lettera: { color: '#FFFFFF', fontFamily: F.extra, textAlign: 'center' },
  quattro: { fontFamily: F.extra, textAlign: 'center', marginTop: 2, letterSpacing: -2 },
  linea: { height: 2.5, borderRadius: 2, backgroundColor: '#FF5701', marginTop: 10, marginBottom: 14 },
  motto: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 6, rowGap: 2 },
  parola: { color: 'rgba(255,255,255,0.82)', fontFamily: F.semi },
})
