import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop, LinearGradient as SvgGradient } from 'react-native-svg'

import { presenzeLezioni, storicoAllenamenti, type PresenzaLezione, type SchedaLezione, type SedutaStorico } from '@/api/lab'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from '../ui/tema'
import { useStatoCorpo } from './CalorieLezione'
import { contaCalorie, vociCalorie, type Contatore, type Voce } from './contatoreCalorie'
import { CHIAVE_STORICO } from './Storico'

// Il contatore delle calorie (18/10/2026): quanto ha consumato il socio, con le
// sedute chiuse nell'app e le lezioni a cui e' stato presente. Il conto sta in
// contatoreCalorie.ts; qui c'e' come si mostra.
//
// In cima due anelli, come quelli degli orologi sportivi: fuori la settimana
// rispetto alla settimana record, dentro oggi rispetto a un giorno medio. Poi i
// sette giorni, le ultime dodici settimane, il confronto alla pari con la
// settimana scorsa, da dove vengono le calorie e le ultime attivita'.
//
// **Le animazioni** sono di due tipi. Quelle che arrivano a un valore (gli anelli,
// il numero che conta, le barre, la linea che si disegna) seguono un tempo solo,
// `useProgresso`, con requestAnimationFrame: le proprieta' dell'SVG cambiano a ogni
// fotogramma come semplici props, e cosi' funzionano uguali sul web e sul telefono.
// Quelle che non finiscono (la fiamma che respira, le scintille) sono di Reanimated.
// Con «riduci movimento» attivo nel telefono, tutto va subito al valore finale e
// niente si muove in loop.
//
// **Servono gli stessi dati delle lezioni**: peso, altezza, eta' e sesso
// (useStatoCorpo). Senza, si dice cosa manca.

export const CHIAVE_PRESENZE = 'calorie:presenze'
export type Presenze = { ok: true; presenze: PresenzaLezione[]; schede: Record<string, SchedaLezione> }

const intero = (n: number) => Math.round(n).toLocaleString('it-IT')
const COLORI_TIPI = ['#FF5701', '#2F6BFF', '#34C38F', '#8B5CF6', '#F2B84B', '#F06292', '#14B8A6', '#94A3B8']
const giornoCorto = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const dataCorta = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const quando = (giorno: string) => giornoCorto.format(new Date(`${giorno}T12:00:00Z`))
const dataBreve = (giorno: string) => dataCorta.format(new Date(`${giorno}T12:00:00Z`))

// ---------------------------------------------------------------------------
// Il tempo delle animazioni

const rallenta = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Da 0 a 1 in `durata` millisecondi dopo `ritardo`, rallentando alla fine, da
 * quando `attivo` diventa vero. Subito 1 con «riduci movimento».
 */
export function useProgresso(durata = 1400, ritardo = 0, attivo = true): number {
  const fermo = useReducedMotion()
  const [t, setT] = useState(fermo ? 1 : 0)
  useEffect(() => {
    if (fermo) return setT(1)
    if (!attivo) return
    let id = 0
    const partenza = Date.now() + ritardo
    const giro = () => {
      const x = Math.min(1, Math.max(0, (Date.now() - partenza) / durata))
      setT(rallenta(x))
      if (x < 1) id = requestAnimationFrame(giro)
    }
    id = requestAnimationFrame(giro)
    return () => cancelAnimationFrame(id)
  }, [durata, ritardo, fermo, attivo])
  return t
}

/**
 * Se il riquadro e' entrato nello schermo: le sezioni sotto la piega partono
 * quando ci si arriva scorrendo, non all'apertura, o la loro animazione sarebbe
 * gia' finita. Si misura la posizione ogni 150 ms finche' non c'e' (measureInWindow
 * funziona uguale sul web e sul telefono); poi si smette.
 */
export function useVisibile(): [RefObject<View | null>, boolean] {
  const ref = useRef<View>(null)
  const [visibile, setVisibile] = useState(false)
  const { height } = useWindowDimensions()
  useEffect(() => {
    if (visibile) return
    const id = setInterval(() => {
      ref.current?.measureInWindow((_x, y, _w, h) => {
        if (h > 0 && y < height * 0.88 && y + h > 0) setVisibile(true)
      })
    }, 150)
    return () => clearInterval(id)
  }, [visibile, height])
  return [ref, visibile]
}

/** La parte di un'animazione a scalini: l'elemento i di n parte un po' dopo il precedente. */
const scalino = (t: number, i: number, n: number, sovrapposizione = 0.55) => {
  const passo = (1 - sovrapposizione) / Math.max(1, n - 1)
  const inizio = i * passo
  return rallenta(Math.min(1, Math.max(0, (t - inizio) / (1 - passo * (n - 1)))))
}

// ---------------------------------------------------------------------------
// In cima: la fiamma, gli anelli, il numero

/** La fiamma che respira, con le scintille che salgono. */
function Fiamma() {
  const fermo = useReducedMotion()
  const s = useSharedValue(1)
  useEffect(() => {
    if (!fermo) s.value = withRepeat(withSequence(withTiming(1.14, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1)
  }, [fermo, s])
  const stile = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }))
  return (
    <View style={stili.fiamma}>
      {!fermo ? [0, 1, 2, 3, 4].map((i) => <Scintilla key={i} indice={i} />) : null}
      <Animated.View style={stile}>
        <LinearGradient colors={FUOCO} style={stili.fiammaTondo}>
          <Icona nome="fiamma" size={22} colore="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  )
}

function Scintilla({ indice }: { indice: number }) {
  const y = useSharedValue(0)
  useEffect(() => {
    y.value = withDelay(indice * 380, withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1))
  }, [indice, y])
  const x = [-14, 10, -4, 16, -18][indice]
  const stile = useAnimatedStyle(() => ({
    opacity: y.value < 0.15 ? y.value / 0.15 : 1 - (y.value - 0.15) / 0.85,
    transform: [{ translateY: -y.value * 34 }, { translateX: x * y.value * 0.5 }, { scale: 1 - y.value * 0.6 }],
  }))
  return <Animated.View style={[stili.scintilla, { left: 19 + x * 0.4, backgroundColor: indice % 2 ? '#FFB36B' : '#FF7A1A' }, stile]} />
}

function Anelli({ c }: { c: Contatore }) {
  const t = useProgresso(1700, 250)
  const D = 228
  const fuori = { r: 98, w: 18 }
  const dentro = { r: 72, w: 14 }
  const giornoMedio = Math.max(1, (c.media4 || c.record) / 7)
  const quotaSettimana = c.record > 0 ? Math.min(1, c.settimana.totale / c.record) : 0
  const quotaOggi = Math.min(1, c.oggi.totale / giornoMedio)
  const arco = (r: number, quota: number) => {
    const l = 2 * Math.PI * r
    return { strokeDasharray: `${l} ${l}`, strokeDashoffset: l * (1 - Math.max(0.001, quota * t)) }
  }
  return (
    <View style={{ width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="alone" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FF5701" stopOpacity={0.35 * t} />
            <Stop offset="1" stopColor="#FF5701" stopOpacity={0} />
          </RadialGradient>
          <SvgGradient id="fuoco" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFB36B" />
            <Stop offset="0.5" stopColor="#FF5701" />
            <Stop offset="1" stopColor="#E84300" />
          </SvgGradient>
          <SvgGradient id="acqua" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7FB0FF" />
            <Stop offset="1" stopColor="#2F6BFF" />
          </SvgGradient>
        </Defs>
        <Circle cx={D / 2} cy={D / 2} r={D / 2} fill="url(#alone)" />
        <Circle cx={D / 2} cy={D / 2} r={fuori.r} stroke="rgba(255,255,255,0.09)" strokeWidth={fuori.w} fill="none" />
        <Circle cx={D / 2} cy={D / 2} r={dentro.r} stroke="rgba(255,255,255,0.07)" strokeWidth={dentro.w} fill="none" />
        <Circle
          cx={D / 2}
          cy={D / 2}
          r={fuori.r}
          stroke="url(#fuoco)"
          strokeWidth={fuori.w}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(-90 ${D / 2} ${D / 2})`}
          {...arco(fuori.r, quotaSettimana)}
        />
        <Circle
          cx={D / 2}
          cy={D / 2}
          r={dentro.r}
          stroke="url(#acqua)"
          strokeWidth={dentro.w}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(-90 ${D / 2} ${D / 2})`}
          {...arco(dentro.r, quotaOggi)}
        />
      </Svg>
      <Text style={stili.numeroGrande} accessibilityLabel={`${intero(c.settimana.totale)} chilocalorie questa settimana`}>
        {intero(c.settimana.totale * t)}
      </Text>
      <Text style={stili.numeroUnita}>kcal questa settimana</Text>
    </View>
  )
}

function Variazione({ ora, prima }: { ora: number; prima: number }) {
  if (!prima) return <Text style={stili.chipValore}>—</Text>
  const d = Math.round(((ora - prima) / prima) * 100)
  const su = d >= 0
  return <Text style={[stili.chipValore, { color: su ? '#6DD58C' : '#FFB36B' }]}>{`${su ? '▲' : '▼'} ${Math.abs(d)}%`}</Text>
}

function Testata({ c }: { c: Contatore }) {
  const t = useProgresso(1200, 900)
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.testata}>
      <View style={stili.testataRiga}>
        <Fiamma />
        <View style={{ flex: 1 }}>
          <Text style={stili.testataTitolo}>Il tuo contatore</Text>
          <Text style={stili.testataSotto}>Schede chiuse e lezioni con la presenza</Text>
        </View>
        {c.recordOra ? (
          <View style={stili.record}>
            <Icona nome="stella" size={13} colore="#fff" />
            <Text style={stili.recordTesto}>Record</Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'center' }}>
        <Anelli c={c} />
      </View>
      <View style={stili.legendaAnelli}>
        <View style={[stili.puntino, { backgroundColor: '#FF5701' }]} />
        <Text style={stili.legendaTesto}>{c.record > 0 ? `${Math.round((c.settimana.totale / c.record) * 100)}% della tua settimana migliore` : 'La settimana'}</Text>
        <View style={[stili.puntino, { backgroundColor: '#2F6BFF', marginLeft: spazio.due }]} />
        <Text style={stili.legendaTesto}>oggi</Text>
      </View>
      <View style={[stili.chip3, { opacity: t, transform: [{ translateY: (1 - t) * 12 }] }]}>
        <View style={stili.chip}>
          <Text style={stili.chipValore}>{intero(c.oggi.totale)}</Text>
          <Text style={stili.chipEtichetta}>kcal oggi</Text>
        </View>
        <View style={stili.chip}>
          <Variazione ora={c.settimana.totale} prima={c.scorsaAllaPari} />
          <Text style={stili.chipEtichetta}>sulla settimana scorsa</Text>
        </View>
        <View style={stili.chip}>
          <Text style={stili.chipValore}>{c.settimana.voci}</Text>
          <Text style={stili.chipEtichetta}>attività in settimana</Text>
        </View>
      </View>
    </LinearGradient>
  )
}

// ---------------------------------------------------------------------------
// I sette giorni

const SIGLE = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function Settimana({ c }: { c: Contatore }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(1300, 150, visibile)
  const ALTO = 150
  const massimo = Math.max(1, ...c.settimanaGiorni.map((g) => g.totale))
  return (
    <View ref={ref} collapsable={false}>
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.barre}>
          {c.settimanaGiorni.map((g, i) => {
            const k = scalino(t, i, 7)
            const oggi = g.giorno === c.oggi.giorno
            const hSchede = (g.schede / massimo) * ALTO * k
            const hLezioni = (g.lezioni / massimo) * ALTO * k
            return (
              <View key={g.giorno} style={stili.colonna} accessibilityLabel={`${quando(g.giorno)}: ${intero(g.totale)} kcal`}>
                <Text style={[stili.colonnaValore, { color: oggi ? p.accento : p.testoSecondario, opacity: k }]} numberOfLines={1}>
                  {g.totale ? intero(g.totale * k) : ''}
                </Text>
                <View style={[stili.colonnaFondo, { height: ALTO, backgroundColor: p.incavo }]}>
                  <View style={{ height: hLezioni, backgroundColor: p.blu, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
                  <LinearGradient colors={FUOCO} style={{ height: hSchede, borderTopLeftRadius: hLezioni ? 0 : 8, borderTopRightRadius: hLezioni ? 0 : 8 }} />
                </View>
                <View style={[stili.sigla, oggi && { backgroundColor: p.accento }]}>
                  <Text style={{ color: oggi ? '#fff' : p.testoSecondario, fontFamily: F.extra, fontSize: 12 }}>{SIGLE[i]}</Text>
                </View>
              </View>
            )
          })}
        </View>
        <View style={stili.legenda}>
          <View style={[stili.puntino, { backgroundColor: p.accento }]} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>Schede</Text>
          <View style={[stili.puntino, { backgroundColor: p.blu, marginLeft: spazio.due }]} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>Lezioni</Text>
        </View>
      </Carta>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Le ultime dodici settimane

function Andamento({ c }: { c: Contatore }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(1800, 150, visibile)
  const [larghezza, setLarghezza] = useState(0)
  const ALTO = 170
  const M = { sopra: 20, sotto: 24, lati: 18 }
  const w = Math.max(0, larghezza - 2 * M.lati)
  const h = ALTO - M.sopra - M.sotto
  const valori = c.settimane.map((s) => s.totale)
  const massimo = Math.max(1, ...valori) * 1.12
  const conValore = valori.filter((v) => v > 0)
  const media = conValore.length ? conValore.reduce((a, b) => a + b, 0) / conValore.length : 0
  const xy = valori.map((v, i) => [M.lati + (valori.length > 1 ? (i / (valori.length - 1)) * w : w / 2), M.sopra + (1 - v / massimo) * h] as const)
  // Una curva morbida (Catmull-Rom in Bezier), che passa per tutti i punti.
  const linea = xy
    .map(([x, y], i) => {
      if (!i) return `M${x},${y}`
      const [x0, y0] = xy[Math.max(0, i - 2)]
      const [x1, y1] = xy[i - 1]
      const [x3, y3] = xy[Math.min(xy.length - 1, i + 1)]
      return `C${x1 + (x - x0) / 6},${y1 + (y - y0) / 6} ${x - (x3 - x1) / 6},${y - (y3 - y1) / 6} ${x},${y}`
    })
    .join(' ')
  const fondo = M.sopra + h
  const area = xy.length ? `${linea} L${xy[xy.length - 1][0]},${fondo} L${xy[0][0]},${fondo} Z` : ''
  // La lunghezza della linea, per disegnarla mentre il tempo scorre: la corda basta.
  const lunghezza = xy.reduce((tot, [x, y], i) => (i ? tot + Math.hypot(x - xy[i - 1][0], y - xy[i - 1][1]) : 0), 0) * 1.08
  const ultimo = xy[xy.length - 1]
  const yMedia = M.sopra + (1 - media / massimo) * h
  return (
    <View ref={ref} collapsable={false}>
      <Carta style={{ gap: spazio.due }}>
        <View onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} style={{ height: ALTO }}>
          {larghezza > 0 ? (
            <Svg width={larghezza} height={ALTO}>
              <Defs>
                <SvgGradient id="sotto" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FF5701" stopOpacity={0.32 * t} />
                  <Stop offset="1" stopColor="#FF5701" stopOpacity={0} />
                </SvgGradient>
              </Defs>
              {media > 0 ? <Line x1={M.lati} x2={larghezza - M.lati} y1={yMedia} y2={yMedia} stroke={p.testoTerzo} strokeWidth={1} strokeDasharray="4 6" opacity={t} /> : null}
              {area ? <Path d={area} fill="url(#sotto)" /> : null}
              <Path d={linea} stroke="#FF5701" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${lunghezza} ${lunghezza}`} strokeDashoffset={lunghezza * (1 - t)} />
              {xy.map(([x, y], i) => {
                const k = Math.min(1, Math.max(0, (t - i / xy.length) * xy.length * 0.6))
                const corrente = i === xy.length - 1
                return <Circle key={i} cx={x} cy={y} r={(corrente ? 6 : 3.5) * k} fill={corrente ? '#FF5701' : p.carta} stroke="#FF5701" strokeWidth={2.5} />
              })}
              {ultimo ? <Circle cx={ultimo[0]} cy={ultimo[1]} r={14 * t} fill="#FF5701" opacity={0.16} /> : null}
            </Svg>
          ) : null}
        </View>
        <View style={stili.assi}>
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`dal ${dataBreve(c.settimane[0].lunedi)}`}</Text>
          {media > 0 ? <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`- - media ${intero(media)} kcal`}</Text> : null}
          <Text style={[stili.piccola, { color: p.accento, fontFamily: F.extra }]}>questa</Text>
        </View>
      </Carta>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Il confronto alla pari

function Confronto({ c }: { c: Contatore }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(1300, 150, visibile)
  const righe = [
    { nome: 'Questa settimana, fino a oggi', valore: c.settimana.totale, colore: FUOCO },
    { nome: 'La settimana scorsa, allo stesso giorno', valore: c.scorsaAllaPari, colore: ['#7FB0FF', '#2F6BFF'] as const },
    { nome: 'La settimana scorsa, intera', valore: c.scorsa, colore: ['#B8BBC4', '#8A8D96'] as const },
    { nome: 'Media delle 4 settimane prima', valore: c.media4, colore: ['#8FE3BC', '#34C38F'] as const },
  ]
  const massimo = Math.max(1, ...righe.map((r) => r.valore))
  return (
    <View ref={ref} collapsable={false}>
      <Carta style={{ gap: spazio.tre }}>
        {righe.map((r, i) => {
          const k = scalino(t, i, righe.length)
          return (
            <View key={r.nome} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spazio.due }}>
                <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{r.nome}</Text>
                <Text style={[stili.nota, { color: p.testo, fontFamily: F.extra }]}>{`${intero(r.valore * k)} kcal`}</Text>
              </View>
              <View style={[stili.binario, { backgroundColor: p.incavo }]}>
                <LinearGradient colors={r.colore} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${(r.valore / massimo) * 100 * k}%`, borderRadius: 7 }} />
              </View>
            </View>
          )
        })}
      </Carta>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Da dove vengono

function Provenienza({ c }: { c: Contatore }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(1500, 150, visibile)
  const totale = c.perTipo.reduce((a, x) => a + x.kcal, 0)
  const D = 150
  const r = 58
  const l = 2 * Math.PI * r
  let gia = 0
  return (
    <View ref={ref} collapsable={false}>
      <Carta style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spazio.tre }}>
        <View style={{ width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
            <Circle cx={D / 2} cy={D / 2} r={r} stroke={p.incavo} strokeWidth={20} fill="none" />
            {c.perTipo.map((x, i) => {
              const quota = totale ? x.kcal / totale : 0
              const da = gia
              gia += quota
              const visibile = Math.max(0, Math.min(quota, t - da))
              return visibile > 0 ? (
                <Circle
                  key={x.tipo}
                  cx={D / 2}
                  cy={D / 2}
                  r={r}
                  stroke={COLORI_TIPI[i % COLORI_TIPI.length]}
                  strokeWidth={20}
                  fill="none"
                  strokeDasharray={`${Math.max(0, visibile * l - 2)} ${l}`}
                  transform={`rotate(${-90 + da * 360} ${D / 2} ${D / 2})`}
                />
              ) : null
            })}
          </Svg>
          <Text style={[stili.ciambellaNumero, { color: p.testo }]}>{intero(totale * t)}</Text>
          <Text style={[stili.ciambellaUnita, { color: p.testoSecondario }]}>{'kcal in\n4 settimane'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 170, gap: spazio.due }}>
          {c.perTipo.map((x, i) => (
            <View key={x.tipo} style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due, opacity: scalino(t, i, c.perTipo.length) }}>
              <View style={[stili.puntino, { backgroundColor: COLORI_TIPI[i % COLORI_TIPI.length] }]} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]} numberOfLines={1}>
                {x.tipo}
              </Text>
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${x.volte}× · ${intero(x.kcal)}`}</Text>
            </View>
          ))}
        </View>
      </Carta>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Le ultime attivita'

function Ultime({ voci }: { voci: Voce[] }) {
  const p = usePalette()
  return (
    <Carta style={{ gap: 0, paddingVertical: spazio.due }}>
      {voci.slice(0, 8).map((v, i) => (
        <View key={`${v.quando}-${i}`} style={[stili.voce, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
          <LinearGradient colors={v.fonte === 'scheda' ? FUOCO : (['#7FB0FF', '#2F6BFF'] as const)} style={stili.voceIcona}>
            <Icona nome={v.fonte === 'scheda' ? 'peso' : 'persone'} size={16} colore="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]} numberOfLines={1}>
              {v.nome}
            </Text>
            <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${quando(v.giorno)} · ${v.minuti} minuti`}</Text>
          </View>
          <Text style={[stili.nota, { color: p.testo, fontFamily: F.extra }]}>{`${intero(v.kcal)} kcal`}</Text>
        </View>
      ))}
    </Carta>
  )
}

// ---------------------------------------------------------------------------
// La schermata

export function ContatoreCalorie() {
  const p = usePalette()
  const corpo = useStatoCorpo()
  const [sedute, setSedute] = useState<SedutaStorico[] | null>(() => inMemoria<{ ok: true; allenamenti: SedutaStorico[] }>(CHIAVE_STORICO)?.allenamenti ?? null)
  const [presenze, setPresenze] = useState<Presenze | null>(() => inMemoria<Presenze>(CHIAVE_PRESENZE) ?? null)
  const [senzaLezioni, setSenzaLezioni] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    prendi(CHIAVE_STORICO, storicoAllenamenti).then((r) => {
      if (!vivo) return
      if (r.ok) setSedute(r.allenamenti)
      else setErrore(r.errore)
    })
    // Senza le lezioni il contatore conta le schede, e lo dice.
    prendi(CHIAVE_PRESENZE, presenzeLezioni).then((r) => {
      if (!vivo) return
      if (r.ok) return setPresenze(r)
      // Se in memoria c'e' gia' una lettura buona si tiene quella; altrimenti si conta senza lezioni, e lo si dice.
      setPresenze((prima) => {
        if (!prima) setSenzaLezioni(true)
        return prima ?? { ok: true, presenze: [], schede: {} }
      })
    })
    return () => {
      vivo = false
    }
  }, [])

  const contatore = useMemo(() => {
    if (corpo.stato !== 'ok' || !sedute || !presenze) return null
    return contaCalorie(vociCalorie(sedute, presenze.presenze, presenze.schede, corpo.corpo), corpo.corpo)
  }, [corpo, sedute, presenze])

  const testata = { sopratitolo: 'Train', titolo: 'Le tue calorie', indietro: '/allenamento' as const, barra: false }

  if (corpo.stato === 'mancano-dati' || corpo.stato === 'no') {
    return (
      <Schermata {...testata}>
        <Carta style={{ gap: spazio.tre }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
            <Icona nome="fiamma" size={20} colore={p.accento} />
            <Text style={[stili.titoletto, { color: p.testo }]}>Mancano dei dati</Text>
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {corpo.stato === 'no'
              ? 'Il contatore usa una formula pensata per gli adulti.'
              : corpo.motivo === 'misure'
                ? 'Per contare le calorie servono il tuo peso e la tua altezza, insieme all’età della tua scheda del club e al sesso.'
                : corpo.motivo === 'sesso'
                  ? 'Per contare le calorie serve sapere se calcolare come uomo o come donna: lo scegli una volta, nel riquadro «Calorie stimate» di una scheda di allenamento.'
                  : 'Nella tua scheda del club manca la data di nascita, e senza l’età il conto non si può fare. Chiedi al desk di aggiungerla.'}
          </Text>
          {corpo.stato === 'mancano-dati' && corpo.motivo === 'misure' ? (
            <Pulsante testo="Aggiungi i tuoi dati" icona="piu" variante="secondario" onPress={() => router.push('/allenamento/misure')} />
          ) : null}
        </Carta>
      </Schermata>
    )
  }

  if (!contatore) {
    return (
      <Schermata {...testata}>
        {errore ? <Messaggio>{errore}</Messaggio> : <SchedeInArrivo quante={2} />}
      </Schermata>
    )
  }

  const vuoto = !contatore.voci.length
  return (
    <Schermata {...testata}>
      <Entra indice={0}>
        <Testata c={contatore} />
      </Entra>
      {senzaLezioni ? <Messaggio tono="attenzione">Adesso non riusciamo a leggere le tue lezioni: qui contiamo solo le schede. Riprova fra poco.</Messaggio> : null}
      {vuoto ? (
        <Carta style={{ gap: spazio.due }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>Ancora niente da contare</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            Chiudi una seduta di una tua scheda, o vieni a una lezione: quando la reception segna la tua presenza, le calorie compaiono qui.
          </Text>
        </Carta>
      ) : (
        <>
          <Entra indice={1}>
            <Sezione titolo="Questa settimana">
              <Settimana c={contatore} />
            </Sezione>
          </Entra>
          <Entra indice={2}>
            <Sezione titolo="Le ultime 12 settimane">
              <Andamento c={contatore} />
            </Sezione>
          </Entra>
          <Entra indice={3}>
            <Sezione titolo="Il confronto">
              <Confronto c={contatore} />
            </Sezione>
          </Entra>
          {contatore.perTipo.length ? (
            <Entra indice={4}>
              <Sezione titolo="Da dove vengono">
                <Provenienza c={contatore} />
              </Sezione>
            </Entra>
          ) : null}
          <Entra indice={5}>
            <Sezione titolo="Le ultime attività" conteggio={contatore.voci.length}>
              <Ultime voci={contatore.voci} />
            </Sezione>
          </Entra>
        </>
      )}
      <Text style={[stili.piccola, { color: p.testoTerzo, paddingHorizontal: 2 }]}>
        {`Sono stime, come quelle delle schede e delle lezioni: possono sbagliare anche del 20–30%, e contano anche le calorie che avresti consumato comunque in quei minuti. Contiamo le sedute chiuse nell’app e le lezioni con la presenza segnata dalla reception dal ${dataBreve(contatore.settimane[0].lunedi)}; la sala pesi conta solo con una scheda. Non sono un’indicazione per la dieta.`}
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testata: { borderRadius: 28, padding: spazio.tre + 2, gap: spazio.tre, overflow: 'hidden' },
  testataRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  testataTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 18 },
  testataSotto: { color: 'rgba(255,255,255,0.65)', fontFamily: F.semi, fontSize: 13 },
  fiamma: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fiammaTondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(255,87,1,0.6)' },
  scintilla: { position: 'absolute', top: 4, width: 6, height: 6, borderRadius: 3 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,87,1,0.85)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  recordTesto: { color: '#fff', fontFamily: F.extra, fontSize: 12 },
  numeroGrande: { color: '#fff', fontFamily: F.extra, fontSize: 46, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  numeroUnita: { color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 13, marginTop: -2 },
  legendaAnelli: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  legendaTesto: { color: 'rgba(255,255,255,0.75)', fontFamily: F.semi, fontSize: 12.5 },
  chip3: { flexDirection: 'row', gap: spazio.due },
  chip: { flex: 1, borderRadius: 16, paddingVertical: spazio.due + 2, paddingHorizontal: 6, alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipValore: { color: '#fff', fontFamily: F.extra, fontSize: 18, fontVariant: ['tabular-nums'] },
  chipEtichetta: { color: 'rgba(255,255,255,0.65)', fontFamily: F.semi, fontSize: 11, textAlign: 'center' },
  barre: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  colonna: { flex: 1, alignItems: 'center', gap: 6 },
  colonnaValore: { fontFamily: F.extra, fontSize: 11, fontVariant: ['tabular-nums'], minHeight: 14 },
  colonnaFondo: { width: '100%', maxWidth: 34, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  sigla: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  legenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntino: { width: 9, height: 9, borderRadius: 5 },
  assi: { flexDirection: 'row', justifyContent: 'space-between', gap: spazio.due },
  binario: { height: 14, borderRadius: 7, overflow: 'hidden' },
  ciambellaNumero: { fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  ciambellaUnita: { fontFamily: F.semi, fontSize: 11, lineHeight: 13, textAlign: 'center' },
  voce: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.due + 2 },
  voceIcona: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
})
