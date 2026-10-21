import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import Svg, { ClipPath, Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

import { t as tr } from '@/lib/lingua'

import { colpetto } from '../ui/Tocco'
import { ALTEZZA, FORME, LARGHEZZA, percorso, perimetro, puntoSu } from './logo'
import { avvioDaMostrare } from './mostra'
import { fase, impulso, rallenta, rimbalzo, scatta } from './tempi'

// L'avvio animato dell'app (richiesta del club, 19/10/2026; rivisto lo stesso giorno: solo il logo, niente
// scritte e niente coriandoli, piu' sobrio): il pittogramma di Athlon si disegna con una punta luminosa, le
// due meta' arrivano da lati opposti e si incastrano, il fuoco sale a riempirle, un riflesso le attraversa e
// il logo respira una volta. Poco piu' di tre secondi, poi la scena si dissolve nell'app; un tocco la salta.
//
// **Tutto e' una funzione pura del tempo** (tempi.ts): un solo orologio (requestAnimationFrame)
// scrive `t`, e ogni elemento si calcola da li'. Come per gli altri movimenti dell'app che arrivano
// a un valore, le forme SVG hanno semplici proprieta' e non sono animate da Reanimated (sul web non
// e' provato). Le tappe, in ms:
//    150-1200  il tratto si disegna, con la punta luminosa della «penna»
//    700-1300  le due forme arrivano da lati opposti e si incastrano (con un piccolo rimbalzo)
//        950   il riempimento sale; 1320 lo scatto: l'alone si accende e parte un anello sottile
//   1450-2150  il riflesso attraversa il logo; 1900 il respiro
//   2650-3250  l'uscita: la scena si ingrandisce un poco e si dissolve
// Con «riduci movimento» non si muove niente: la scena finita, in dissolvenza, per un secondo e mezzo.

export const DURATA_MS = 3250
const USCITA_DA = 2650
const SALTO_MS = 320
const DURATA_RIDOTTA_MS = 1500
const SCATTO = 1320

const FUOCO = ['#FFB070', '#FF8A2B', '#FF5701', '#E84300'] as const

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

  // Le misure: il logo e' al centro, e piu' piccolo sui telefoni stretti.
  const s = Math.min(1, (W * 0.5) / LARGHEZZA, (H * 0.3) / ALTEZZA)
  const cx = W / 2
  const cy = H / 2
  const meta = (LARGHEZZA * s) / 2

  // Le fasi del logo.
  const volo = rimbalzo(fase(t, 700, 600)) // 0 -> 1 (supera 1 e torna): le forme si incastrano
  const riempimento = rallenta(fase(t, 950, 450))
  const respiro = 1 + 0.035 * impulso(t, 1900, 190)
  const scalaLogo = s * respiro * (0.92 + 0.08 * rallenta(fase(t, 120, 800)))
  const alone = (0.2 + 0.8 * rallenta(fase(t, 900, 900))) * (1 + 0.3 * impulso(t, SCATTO, 220) + 0.1 * impulso(t, 1900, 190))
  const anello = fase(t, SCATTO, 1100)

  return (
    <Pressable
      onPress={() => salto === null && !fermo && setSalto(ms)}
      accessibilityRole="button"
      accessibilityLabel={tr('Athlon. Tocca per continuare.', 'Athlon. Tap to continue.')}
      style={[stili.radice, { opacity: opacita }]}
    >
      <View style={[StyleSheet.absoluteFill, { transform: [{ scale: 1 + 0.06 * rallenta(uscita) }] }]} pointerEvents="none">
        {/* Il fondo, l'alone di fuoco dietro il logo, un anello sottile allo scatto, il logo */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="alone" cx={cx} cy={cy} rx={Math.max(W, H) * 0.6} ry={Math.max(W, H) * 0.6} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FF5701" stopOpacity="0.5" />
              <Stop offset="0.35" stopColor="#E84300" stopOpacity="0.17" />
              <Stop offset="1" stopColor="#0E0F11" stopOpacity="0" />
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
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.7" />
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

          {/* L'anello sottile dello scatto: un solo filo che si allarga e svanisce */}
          {anello > 0 && anello < 1 ? (
            <Circle cx={cx} cy={cy} r={meta * (0.75 + 1.05 * scatta(anello))} fill="none" stroke="#FFB070" strokeWidth={1.4 * (1 - anello) + 0.4} opacity={0.5 * Math.pow(1 - anello, 1.6)} />
          ) : null}

          {/* Il logo: al centro */}
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
                    opacity={disegno > 0.002 ? 1 - rallenta(fase(t, 1250, 500)) : 0}
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
            {/* Il riflesso: un passaggio lento, fra le forme e solo sulle forme */}
            <G clipPath="url(#forme)">
              <Rect x={-160 + 600 * rallenta(fase(t, 1450, 700))} y={-30} width={90} height={ALTEZZA + 60} fill="url(#lama)" transform="skewX(-22)" opacity={fase(t, 1450, 80) * (1 - fase(t, 2000, 160))} />
            </G>
          </G>
        </Svg>
      </View>
    </Pressable>
  )
}

const stili = StyleSheet.create({
  radice: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999, backgroundColor: '#0E0F11', overflow: 'hidden' },
})
