import { useCallback, useEffect } from 'react'
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { useIsFocused } from 'expo-router'
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated'
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg'

import { t } from '@/lib/lingua'

import { F, usePalette } from '../ui/tema'
import { ALTEZZA, POSA_FERMA_S, RIPOSO, alzata, coloreStrato, profilo, proietta, scenaDa, type Scena } from './ruota3d'

// La ruota dell'Athlon Health System (richiesta del club, 19/10/2026): tre frecce
// che si rincorrono in cerchio, Train, Food e Relax. Nessuna viene prima: e' un
// equilibrio che gira.
//
// **In 3D (24/10/2026, richiesta di Maurizio: «piu' fluida e tridimensionale»).** Ogni
// freccia e' un tubo: una pila di strati dello stesso disegno, ognuno piu' stretto e piu'
// chiaro di quello sotto (come le curve di livello di una cupola) e alzato lungo la
// normale del disco. Ogni strato e' una View con la sua **matrice 4x4 con prospettiva**
// (vedi ruota3d.ts), quindi la ruota ha spessore, un lato vicino e uno lontano, e ruota
// inclinata. Niente librerie 3D e niente canvas: sono View con una trasformazione, che
// il browser e il telefono compongono con la scheda grafica.
//
// **Fluida.** Un solo orologio (`useFrameCallback`) somma i secondi veri fra un fotogramma
// e l'altro, e da quel numero discendono rotazione (con un respiro di velocita'),
// inclinazione e precessione, galleggiamento, respiro e ombra: nessun tween che riparte,
// quindi nessuno scatto al giro, e niente passa da React (la schermata non si ridisegna
// mai mentre la ruota si muove). L'orologio si ferma quando la scheda non e' in primo
// piano o l'app e' in secondo piano, e riparte da dove era.
//
// Le etichette restano diritte (non ruotano con il disco, o in basso si leggerebbero
// capovolte) ma seguono la profondita': piu' piccole e un po' piu' tenui sul lato
// lontano. «Equilibrio» sta un po' sopra il disco e si sposta rispetto a lui (parallasse).
// Con «riduci movimento» la ruota resta ferma, in posa e inclinata, senza arrivo.

const LATO = 220
const C = LATO / 2
const R = 78
const SPESSORE = 20
/** Lo spazio fra una freccia e la successiva, in gradi. */
const VUOTO = 14
/** Quanti strati ha un tubo. Piu' strati = fianchi piu' lisci; ognuno e' una View composta a parte. */
const N_STRATI = 18
/** Quota delle etichette e del testo centrale sopra il disco, in punti. */
const Z_ETICHETTA = ALTEZZA + 5
const Z_CENTRO = ALTEZZA + 28
/** L'ombra a terra. */
const OMBRA_L = 214
const OMBRA_A = 62

export const SPICCHI = [
  { nome: 'Train', colore: '#FF5701' },
  { nome: 'Food', colore: '#18A957' },
  { nome: 'Relax', colore: '#14B8A6' },
] as const

const rad = (g: number) => ((g - 90) * Math.PI) / 180
const punto = (g: number, r = R) => [C + r * Math.cos(rad(g)), C + r * Math.sin(rad(g))] as const

/** Una freccia: l'arco da `da` ad `a` gradi (in senso orario, 0 in alto) e i tre vertici della punta alla fine. */
function freccia(da: number, a: number) {
  const testa = 12 // gradi che occupa la punta
  const fine = a - testa
  const [x0, y0] = punto(da)
  const [x1, y1] = punto(fine)
  return {
    arco: `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`,
    punta: [punto(fine, R + SPESSORE * 0.9), punto(a), punto(fine, R - SPESSORE * 0.9)] as const,
  }
}

/** La punta ristretta di `f` verso il suo baricentro: in cima alla cupola e' piu' piccola, come il resto del tubo. */
function puntaScalata(v: ReturnType<typeof freccia>['punta'], f: number): string {
  const cx = (v[0][0] + v[1][0] + v[2][0]) / 3
  const cy = (v[0][1] + v[1][1] + v[2][1]) / 3
  const p = v.map(([x, y]) => `${(cx + (x - cx) * f).toFixed(2)} ${(cy + (y - cy) * f).toFixed(2)}`)
  return `M ${p[0]} L ${p[1]} L ${p[2]} Z`
}

const FRECCE = SPICCHI.map((s, i) => ({ ...s, ...freccia(i * 120 + VUOTO / 2, (i + 1) * 120 - VUOTO / 2), mezzo: i * 120 + 60 }))

type DatiStrato = { k: number; h: number; frecce: { nome: string; arco: string; punta: string; colore: string; spessore: number }[] }

/** Gli strati, dal fondo al dorso: sono costanti, si calcolano una volta sola. */
const STRATI: DatiStrato[] = Array.from({ length: N_STRATI }, (_, k) => {
  const p = profilo(k, N_STRATI)
  return {
    k,
    h: p.h,
    frecce: FRECCE.map((f) => ({ nome: f.nome, arco: f.arco, punta: puntaScalata(f.punta, p.f), colore: coloreStrato(f.colore, p.t), spessore: SPESSORE * p.f })),
  }
})

/**
 * Sul web la matrice a 16 numeri si chiama `matrix3d` (CSS; react-native-web trasforma `matrix` in
 * `matrix(...)`, che ne vuole 6); sul telefono React Native la chiama `matrix`.
 */
const MATRICE = Platform.OS === 'web' ? 'matrix3d' : 'matrix'

/** Una trasformazione dalla matrice (il tipo di React Native non conosce `matrix3d`). */
const conMatrice = (m: number[]) => {
  'worklet'
  return [{ [MATRICE]: m }] as unknown as ViewStyle['transform']
}

/** Un solo strato di tutti i tubi: lo stesso disegno di quello sotto, piu' stretto e piu' chiaro, alzato di `h`. */
function Strato({ dati, scena }: { dati: DatiStrato; scena: SharedValue<Scena> }) {
  const h = dati.h
  const stile = useAnimatedStyle(() => ({ transform: conMatrice(alzata(scena.value.m, h)) }))
  return (
    <Animated.View pointerEvents="none" style={[stili.strato, stile]}>
      <Svg width={LATO} height={LATO} viewBox={`0 0 ${LATO} ${LATO}`}>
        {dati.frecce.map((f) => (
          <Path key={`a${f.nome}`} d={f.arco} stroke={f.colore} strokeWidth={f.spessore} fill="none" strokeLinecap="round" />
        ))}
        {dati.frecce.map((f) => (
          <Path key={`p${f.nome}`} d={f.punta} fill={f.colore} stroke={f.colore} strokeWidth={Math.max(0.6, f.spessore / 10)} strokeLinejoin="round" />
        ))}
      </Svg>
    </Animated.View>
  )
}

/** L'ombra a terra: piu' scura e piu' stretta quando la ruota e' bassa, piu' chiara e larga quando sale. */
function Ombra({ scena, scuro }: { scena: SharedValue<Scena>; scuro: boolean }) {
  const colore = scuro ? '#000000' : '#121316'
  const stile = useAnimatedStyle(() => {
    const { quota, arrivo, scala } = scena.value
    const su = (quota + 12) / 15.2 // 0 = in basso, 1 = in alto
    return {
      opacity: (0.62 - 0.2 * su) * arrivo,
      transform: [{ scaleX: scala * (0.96 + 0.07 * su) }, { scaleY: scala * (0.92 + 0.1 * su) }],
    }
  })
  return (
    <Animated.View pointerEvents="none" style={[stili.ombra, stile]}>
      <Svg width={OMBRA_L} height={OMBRA_A} viewBox={`0 0 ${OMBRA_L} ${OMBRA_A}`}>
        <Defs>
          <RadialGradient id="ruotaOmbra" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={colore} stopOpacity={scuro ? 0.7 : 0.34} />
            <Stop offset="0.55" stopColor={colore} stopOpacity={scuro ? 0.3 : 0.12} />
            <Stop offset="1" stopColor={colore} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={OMBRA_L / 2} cy={OMBRA_A / 2} rx={OMBRA_L / 2} ry={OMBRA_A / 2} fill="url(#ruotaOmbra)" />
      </Svg>
    </Animated.View>
  )
}

/** Dove sta il centro dell'etichetta sul disco, in punti dal centro (la rotazione la mette la matrice). */
const posto = (mezzo: number) => [R * Math.cos(rad(mezzo)), R * Math.sin(rad(mezzo))] as const

function Etichetta({ nome, colore, fondo, scuro, mezzo, scena }: { nome: string; colore: string; fondo: string; scuro: boolean; mezzo: number; scena: SharedValue<Scena> }) {
  const [x, y] = posto(mezzo)
  const stile = useAnimatedStyle(() => {
    const [X, Y, k] = proietta(scena.value.m, x, y, Z_ETICHETTA)
    const lontano = (k - 0.9) / 0.22 // 0 sul lato lontano, 1 sul vicino
    return {
      // Quasi opache anche lontano: una pillola che lascia vedere la freccia sotto si legge male.
      opacity: 0.92 + 0.08 * Math.min(1, Math.max(0, lontano)),
      transform: [{ translateX: X }, { translateY: Y }, { scale: k * scena.value.scala }],
    }
  })
  return (
    <Animated.View pointerEvents="none" style={[stili.etichetta, stile]}>
      <View style={[stili.pillola, { borderColor: colore, backgroundColor: fondo, boxShadow: scuro ? '0 4px 10px rgba(0,0,0,0.5)' : '0 4px 10px rgba(18,19,22,0.2)' }]}>
        <Text style={[stili.nome, { color: colore }]}>{nome}</Text>
      </View>
    </Animated.View>
  )
}

/** Il punto in cui «Equilibrio» sta a riposo: il parallasse e' lo scarto da qui, cosi' resta al centro quando la ruota e' ferma. */
const [CENTRO_X0, CENTRO_Y0, CENTRO_K0] = proietta(RIPOSO, 0, 0, Z_CENTRO)

function Centro({ scena, colore }: { scena: SharedValue<Scena>; colore: string }) {
  const stile = useAnimatedStyle(() => {
    const [X, Y, k] = proietta(scena.value.m, 0, 0, Z_CENTRO)
    return { transform: [{ translateX: X - CENTRO_X0 * scena.value.scala }, { translateY: Y - CENTRO_Y0 * scena.value.scala }, { scale: (k / CENTRO_K0) * scena.value.scala }] }
  })
  return (
    <Animated.View pointerEvents="none" style={[stili.centro, stile]}>
      <Text style={[stili.centroTesto, { color: colore }]}>{t('Equilibrio', 'Balance')}</Text>
    </Animated.View>
  )
}

export function RuotaBenessere() {
  const p = usePalette()
  const fermo = useReducedMotion()
  const inPrimoPiano = useIsFocused()

  // L'orologio: i secondi da quando la ruota e' apparsa. Ogni fotogramma somma il tempo vero trascorso,
  // al massimo 50 ms: se la scheda e' stata in pausa o l'app ha avuto un singhiozzo, la ruota riprende
  // da dove era invece di saltare in avanti.
  const s = useSharedValue(fermo ? POSA_FERMA_S : 0)
  const passo = useCallback(
    (info: FrameInfo) => {
      'worklet'
      s.value += Math.min(info.timeSincePreviousFrame ?? 16, 50) / 1000
    },
    [s],
  )
  const orologio = useFrameCallback(passo, false)
  useEffect(() => {
    orologio.setActive(!fermo && inPrimoPiano)
  }, [orologio, fermo, inPrimoPiano])

  // Tutta la posa si calcola una volta per fotogramma e la leggono gli strati, le etichette e l'ombra.
  const scena = useDerivedValue(() => scenaDa(s.value))

  return (
    <View style={stili.ruota} accessibilityRole="image" accessibilityLabel={t('Train, Food e Relax: tre frecce che si rincorrono in cerchio. Il benessere è il loro equilibrio.', 'Train, Food and Relax: three arrows chasing each other in a circle. Wellbeing is the balance between them.')}>
      <Ombra scena={scena} scuro={p.scuro} />
      {STRATI.map((st) => (
        <Strato key={st.k} dati={st} scena={scena} />
      ))}
      <Centro scena={scena} colore={p.testo} />
      {FRECCE.map((f) => (
        <Etichetta key={f.nome} nome={f.nome} colore={f.colore} fondo={p.carta} scuro={p.scuro} mezzo={f.mezzo} scena={scena} />
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  ruota: { width: LATO, height: LATO, alignSelf: 'center' },
  // Ogni strato e' grande come la ruota e ha il centro nel centro: la matrice lavora intorno a quello.
  strato: { position: 'absolute', left: 0, top: 0, width: LATO, height: LATO },
  ombra: { position: 'absolute', left: C - OMBRA_L / 2, top: C + 70 - OMBRA_A / 2, width: OMBRA_L, height: OMBRA_A },
  centro: { position: 'absolute', top: C - 14, left: C - 60, width: 120, height: 28, alignItems: 'center', justifyContent: 'center' },
  centroTesto: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.2 },
  // L'etichetta parte dal centro e la trasformazione la porta sul disco.
  etichetta: { position: 'absolute', left: C - 40, top: C - 15, width: 80, height: 30, alignItems: 'center', justifyContent: 'center' },
  pillola: { borderRadius: 999, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 3 },
  nome: { fontFamily: F.extra, fontSize: 13 },
})
