import { useCallback, useEffect, type ReactNode } from 'react'
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { useIsFocused } from 'expo-router'
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type FrameInfo, type SharedValue } from 'react-native-reanimated'
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg'

import { t } from '@/lib/lingua'

import { F, usePalette } from '../ui/tema'
import { POSA_FERMA_S, alzata, coloreParete, mescola, proietta, scenaDa, type Scena } from './ruota3d'
import { arco, costruisciFreccia, puntoSuCerchio, type Freccia } from './ruotaForme'

// La ruota dell'Athlon Health System (richiesta del club, 19/10/2026): tre frecce che si rincorrono
// in cerchio, Train, Food e Relax. Nessuna viene prima: e' un equilibrio che gira.
//
// **Rifatta il 25/10/2026** (Maurizio, sulla prima versione 3D del 24/10: «non gira in modo simmetrico e
// poi vorrei qualcosa di piu' moderno ed energico»). Due cose cambiano.
//
// 1. **Il moto e' simmetrico.** L'inclinazione e' fissa e verticale (destra e sinistra sono uno specchio
//    dell'altra), il giro e' a velocita' costante, e l'unico moto in piu' e' un battito che si ripete tre
//    volte a giro, quanto le frecce: ogni 120 gradi la ruota e' identica. Prima l'inclinazione respirava,
//    precedeva di lato e la velocita' variava: il disco non faceva la stessa cosa da una parte e dall'altra.
//    La matematica sta in ruota3d.ts (pura, provata).
// 2. **Il disegno e' una cometa.** Ogni freccia ha la coda sottile che sfuma nel nulla, il corpo che si
//    allarga e una punta netta, piu' larga, con la luce calda verso la testa: si legge da che parte va e
//    sembra piu' veloce di quanto giri. Sotto, un binario tenue e un alone del colore della freccia (la
//    luce che lascia); sopra, un filo di riflesso. Le forme sono in ruotaForme.ts (pura, provata).
//
// Come funziona il 3D, invariato: la ruota e' una pila di View, ognuna con una **matrice 4x4 con
// prospettiva** (la base, dieci pareti che danno lo spessore, la faccia). Niente librerie 3D e niente
// canvas: sono View con una trasformazione, che il browser e il telefono compongono con la scheda grafica.
// Un solo orologio (`useFrameCallback`) somma i secondi veri fra un fotogramma e l'altro e da quel numero
// discende tutto: nessun tween che riparte, e niente passa da React. L'orologio si ferma quando la scheda
// non e' in primo piano e riprende da dove era.
//
// Le etichette restano diritte (non ruotano col disco, o in basso si leggerebbero capovolte) e
// seguono la profondita': piu' grandi sul lato vicino. Con «riduci movimento» la ruota resta ferma, in posa.

const LATO = 220
const C = LATO / 2
const R = 78
/** La larghezza piena del corpo di una freccia. */
const LARGHEZZA = 22
/** Quanti strati di parete danno lo spessore, e quanto e' spessa la ruota in tutto, in punti. */
const PARETI = 10
const SPESSORE_Z = 10
/** La quota della faccia: appena sopra l'ultima parete. */
const Z_FACCIA = SPESSORE_Z + 0.6
/** La quota delle etichette sopra il disco. */
const Z_ETICHETTA = SPESSORE_Z + 7
/** L'ombra a terra. */
const OMBRA_L = 208
const OMBRA_A = 58

export const SPICCHI = [
  { nome: 'Train', colore: '#FF5701' },
  { nome: 'Food', colore: '#18A957' },
  { nome: 'Relax', colore: '#14B8A6' },
] as const

const chiaro = (c: string) => mescola(c, '#FFFFFF', 0.34)

const FRECCE = SPICCHI.map((s, i) => {
  const da = i * 120 + 3
  const f = costruisciFreccia({ centro: C, raggio: R, larghezza: LARGHEZZA, coda: 0.26, da, a: (i + 1) * 120 - 5, testa: 18, alette: 1.6 })
  // L'etichetta sta dove il corpo e' gia' pieno (due terzi della freccia), non sulla coda che sfuma.
  const mezzo = da + 0.68 * (f.base - da)
  return { ...s, ...f, da, mezzo, chiaro: chiaro(s.colore) }
})

/** Come cresce l'opacita' dalla coda (0) alla base della testa (1): la coda sfuma nel nulla. */
const ALFA: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.14, 0.08],
  [0.5, 0.7],
  [0.86, 1],
  [1, 1],
]

/**
 * Come cresce l'opacita' delle pareti: comincia piu' avanti di quella della faccia. Le pareti sono scure e stanno
 * piu' in basso: con la stessa sfumatura, dove la faccia e' ancora quasi trasparente (la coda) si vedrebbero
 * piu' di lei, come una macchia scura. Cosi' lo spessore compare dove il corpo e' gia' pieno.
 */
const ALFA_PARETE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.3, 0],
  [0.56, 0.7],
  [0.86, 1],
  [1, 1],
]

/** Un gradiente lungo la freccia: dal colore `a` (all'inizio) al colore `b` (alla testa), con l'opacita' di `alfa` (di partenza ALFA) moltiplicata per `forza`. */
function Catena({ id, f, a, b, forza = 1, alfa: curva = ALFA }: { id: string; f: Freccia; a: string; b: string; forza?: number; alfa?: readonly (readonly [number, number])[] }) {
  const { x1, y1, x2, y2 } = f.catena
  return (
    <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
      {curva.map(([o, alfa]) => (
        <Stop key={o} offset={o} stopColor={mescola(a, b, Math.min(1, Math.max(0, (o - 0.5) / 0.5)))} stopOpacity={alfa * forza} />
      ))}
    </LinearGradient>
  )
}

/**
 * Sulla ruota, sul web la matrice a 16 numeri si chiama `matrix3d` (CSS; react-native-web trasforma
 * `matrix` in `matrix(...)`, che ne vuole 6); sul telefono React Native la chiama `matrix`.
 */
const MATRICE = Platform.OS === 'web' ? 'matrix3d' : 'matrix'

/** Una trasformazione dalla matrice (il tipo di React Native non conosce `matrix3d`). */
const conMatrice = (m: number[]) => {
  'worklet'
  return [{ [MATRICE]: m }] as unknown as ViewStyle['transform']
}

/** Un disco della pila: una View grande come la ruota, con il centro nel centro, alzata di `h` lungo la normale. */
function Strato({ h, scena, figli }: { h: number; scena: SharedValue<Scena>; figli: ReactNode }) {
  const stile = useAnimatedStyle(() => ({ transform: conMatrice(alzata(scena.value.m, h)) }))
  return (
    <Animated.View pointerEvents="none" style={[stili.strato, stile]}>
      <Svg width={LATO} height={LATO} viewBox={`0 0 ${LATO} ${LATO}`}>
        {figli}
      </Svg>
    </Animated.View>
  )
}

/**
 * La base: il binario su cui corrono le frecce, l'alone della luce che lasciano e un lampo attorno a ogni
 * testa. L'alone e' fatto di tante pennellate larghe e debolissime, una sopra l'altra, a passi di tre punti:
 * una sola, larga, avrebbe il bordo netto (una bolla), e a passi grandi si vedrebbero i gradini come le curve
 * di livello di una carta. Il lampo e' un gradiente radiale, che sfuma da solo. Sullo scuro e' un bagliore
 * acceso e largo; sul chiaro, dove un colore sotto un altro su fondo bianco diventa una sbavatura, e'
 * stretto e tenue.
 */
function Base({ scuro }: { scuro: boolean }) {
  const binario = scuro ? 'rgba(255,255,255,0.07)' : 'rgba(18,19,22,0.06)'
  const extra = Array.from({ length: scuro ? 9 : 5 }, (_, k) => 3 * (k + 1))
  const forza = scuro ? 0.055 : 0.05
  const lampo = scuro ? 0.5 : 0.26
  return (
    <>
      <Defs>
        {FRECCE.map((f, i) => (
          <Catena key={i} id={`ruotaAlone${i}`} f={f} a={f.colore} b={f.colore} forza={forza} />
        ))}
        {FRECCE.map((f, i) => {
          const [x, y] = puntoSuCerchio(C, R, f.base + 3)
          return (
            <RadialGradient key={`t${i}`} id={`ruotaTesta${i}`} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={38}>
              <Stop offset="0" stopColor={f.colore} stopOpacity={lampo} />
              <Stop offset="0.5" stopColor={f.colore} stopOpacity={lampo * 0.3} />
              <Stop offset="1" stopColor={f.colore} stopOpacity={0} />
            </RadialGradient>
          )
        })}
      </Defs>
      <Circle cx={C} cy={C} r={R} stroke={binario} strokeWidth={LARGHEZZA + 8} fill="none" />
      {extra.map((e) =>
        FRECCE.map((f, i) => <Path key={`${e}_${i}`} d={arco(C, R, f.da, f.base)} stroke={`url(#ruotaAlone${i})`} strokeWidth={LARGHEZZA + e} fill="none" strokeLinecap="round" />),
      )}
      {FRECCE.map((f, i) => {
        const [x, y] = puntoSuCerchio(C, R, f.base + 3)
        return <Circle key={`c${i}`} cx={x} cy={y} r={38} fill={`url(#ruotaTesta${i})`} />
      })}
    </>
  )
}

/** Una parete: la forma delle frecce in un colore piu' scuro (i fianchi sono in ombra), che sfuma come la faccia. */
function Parete({ k }: { k: number }) {
  return (
    <>
      <Defs>
        {FRECCE.map((f, i) => {
          const c = coloreParete(f.colore, k, PARETI)
          return <Catena key={i} id={`ruotaParete${k}_${i}`} f={f} a={c} b={c} alfa={ALFA_PARETE} />
        })}
      </Defs>
      {FRECCE.map((f, i) => (
        <Path key={i} d={f.corpo} fill={`url(#ruotaParete${k}_${i})`} stroke={`url(#ruotaParete${k}_${i})`} strokeWidth={1.4} strokeLinejoin="round" />
      ))}
    </>
  )
}

/** La faccia: il colore del brand che si scalda verso la testa, e un filo di luce lungo il bordo esterno. */
function Faccia() {
  return (
    <>
      <Defs>
        {FRECCE.map((f, i) => (
          <Catena key={i} id={`ruotaFaccia${i}`} f={f} a={f.colore} b={f.chiaro} />
        ))}
        {FRECCE.map((f, i) => (
          <Catena key={`l${i}`} id={`ruotaLuce${i}`} f={f} a="#FFFFFF" b="#FFFFFF" forza={0.62} />
        ))}
      </Defs>
      {FRECCE.map((f, i) => (
        <Path key={`f${i}`} d={f.corpo} fill={`url(#ruotaFaccia${i})`} stroke={`url(#ruotaFaccia${i})`} strokeWidth={1.4} strokeLinejoin="round" />
      ))}
      {FRECCE.map((f, i) => (
        <Path key={`l${i}`} d={arco(C, R + LARGHEZZA * 0.2, f.da + 0.14 * (f.base - f.da), f.base - 1)} stroke={`url(#ruotaLuce${i})`} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      ))}
    </>
  )
}

/** L'ombra a terra: un alone morbido sotto la ruota, che segue il battito e cresce all'arrivo. */
function Ombra({ scena, scuro }: { scena: SharedValue<Scena>; scuro: boolean }) {
  const colore = scuro ? '#000000' : '#121316'
  const stile = useAnimatedStyle(() => {
    const { arrivo, scala } = scena.value
    return { opacity: 0.9 * arrivo, transform: [{ scaleX: scala }, { scaleY: scala }] }
  })
  return (
    <Animated.View pointerEvents="none" style={[stili.ombra, stile]}>
      <Svg width={OMBRA_L} height={OMBRA_A} viewBox={`0 0 ${OMBRA_L} ${OMBRA_A}`}>
        <Defs>
          <RadialGradient id="ruotaOmbra" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={colore} stopOpacity={scuro ? 0.62 : 0.3} />
            <Stop offset="0.55" stopColor={colore} stopOpacity={scuro ? 0.26 : 0.1} />
            <Stop offset="1" stopColor={colore} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={OMBRA_L / 2} cy={OMBRA_A / 2} rx={OMBRA_L / 2} ry={OMBRA_A / 2} fill="url(#ruotaOmbra)" />
      </Svg>
    </Animated.View>
  )
}

/** Dove sta il centro dell'etichetta sul disco, in punti dal centro (la rotazione la mette la matrice). */
const posto = (mezzo: number) => {
  const [x, y] = puntoSuCerchio(0, R, mezzo)
  return [x, y] as const
}

function Etichetta({ nome, colore, scuro, mezzo, scena }: { nome: string; colore: string; scuro: boolean; mezzo: number; scena: SharedValue<Scena> }) {
  const [x, y] = posto(mezzo)
  const stile = useAnimatedStyle(() => {
    const [X, Y, k] = proietta(scena.value.m, x, y, Z_ETICHETTA)
    return { transform: [{ translateX: X }, { translateY: Y }, { scale: k * scena.value.scala }] }
  })
  return (
    <Animated.View pointerEvents="none" style={[stili.etichetta, stile]}>
      <View style={[stili.pillola, { backgroundColor: colore, boxShadow: `0 6px 14px ${colore}${scuro ? '66' : '55'}` }]}>
        <Text style={stili.nome}>{nome}</Text>
      </View>
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
      <Strato h={-3} scena={scena} figli={<Base scuro={p.scuro} />} />
      {Array.from({ length: PARETI }, (_, k) => (
        <Strato key={k} h={(k / (PARETI - 1)) * SPESSORE_Z} scena={scena} figli={<Parete k={k} />} />
      ))}
      <Strato h={Z_FACCIA} scena={scena} figli={<Faccia />} />
      <View pointerEvents="none" style={stili.centro}>
        <Text style={[stili.centroTesto, { color: p.testo }]}>{t('Equilibrio', 'Balance')}</Text>
      </View>
      {FRECCE.map((f) => (
        <Etichetta key={f.nome} nome={f.nome} colore={f.colore} scuro={p.scuro} mezzo={f.mezzo} scena={scena} />
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  ruota: { width: LATO, height: LATO, alignSelf: 'center' },
  // Ogni strato e' grande come la ruota e ha il centro nel centro: la matrice lavora intorno a quello.
  strato: { position: 'absolute', left: 0, top: 0, width: LATO, height: LATO },
  ombra: { position: 'absolute', left: C - OMBRA_L / 2, top: C + 72 - OMBRA_A / 2, width: OMBRA_L, height: OMBRA_A },
  centro: { position: 'absolute', top: C - 14, left: C - 60, width: 120, height: 28, alignItems: 'center', justifyContent: 'center' },
  centroTesto: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.2 },
  // L'etichetta parte dal centro e la trasformazione la porta sul disco.
  etichetta: { position: 'absolute', left: C - 40, top: C - 15, width: 80, height: 30, alignItems: 'center', justifyContent: 'center' },
  pillola: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  nome: { fontFamily: F.extra, fontSize: 13, color: '#FFFFFF', letterSpacing: 0.1 },
})
