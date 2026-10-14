import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated'

import { spazio, type Tono } from '@/theme'

import { Icona, type NomeIcona } from './Icona'
import { coloreTono, F, FUOCO, raggio, usePalette, velo, type ToniTutti } from './tema'
import { Tocco } from './Tocco'

// I mattoni delle schermate del laboratorio: bottoni, schede, pillole,
// avvisi, righe, avatar, i numeri grandi, e il caricamento che pulsa al posto
// della rotellina.

// ---------------------------------------------------------------------------

export function Pulsante({
  testo,
  onPress,
  variante = 'primario',
  icona,
  inCorso = false,
  disabilitato = false,
  piccolo = false,
  pieno = true,
}: {
  testo: string
  onPress: () => void
  /** primario: l'arancio; scuro: il carbone; secondario: il grigio; contorno: solo il bordo; fantasma: solo il testo; pericolo: rosso. */
  variante?: 'primario' | 'scuro' | 'secondario' | 'contorno' | 'fantasma' | 'pericolo'
  icona?: NomeIcona
  inCorso?: boolean
  disabilitato?: boolean
  piccolo?: boolean
  /** Occupa tutta la larghezza; false: quanto il testo. */
  pieno?: boolean
}) {
  const p = usePalette()
  const spento = disabilitato || inCorso
  const altezza = piccolo ? 42 : 56
  const colore =
    variante === 'primario' || variante === 'scuro'
      ? '#FFFFFF'
      : variante === 'pericolo'
        ? p.errore
        : variante === 'fantasma'
          ? p.accento
          : p.testo
  const corpo = inCorso ? (
    <ActivityIndicator color={colore} />
  ) : (
    <View style={stili.pulsanteRiga}>
      <Text style={[stili.pulsanteTesto, { color: colore, fontSize: piccolo ? 14 : 16 }]} numberOfLines={2}>
        {testo}
      </Text>
      {icona ? <Icona nome={icona} size={piccolo ? 16 : 18} colore={colore} /> : null}
    </View>
  )
  const forma: ViewStyle = { minHeight: altezza, borderRadius: piccolo ? 14 : 18, paddingHorizontal: piccolo ? spazio.tre : spazio.quattro }
  return (
    <Tocco
      onPress={onPress}
      spento={spento}
      etichetta={testo}
      stato={{ busy: inCorso }}
      style={[{ opacity: spento && !inCorso ? 0.4 : 1, alignSelf: pieno ? 'stretch' : 'flex-start' }, pieno && { flexGrow: 1 }]}
    >
      {variante === 'primario' ? (
        <LinearGradient
          colors={FUOCO}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[stili.pulsante, forma, !spento && { boxShadow: '0 10px 24px rgba(255, 87, 1, 0.32)' }]}
        >
          {corpo}
        </LinearGradient>
      ) : (
        <View
          style={[
            stili.pulsante,
            forma,
            variante === 'scuro' && { backgroundColor: p.carbone },
            variante === 'secondario' && { backgroundColor: p.incavo },
            variante === 'contorno' && { borderWidth: 1.5, borderColor: p.scuro ? 'rgba(255,255,255,0.18)' : 'rgba(17,17,20,0.14)' },
            variante === 'pericolo' && { backgroundColor: velo(p, 'errore', 0.12) },
          ]}
        >
          {corpo}
        </View>
      )}
    </Tocco>
  )
}

// ---------------------------------------------------------------------------

export function Carta({ children, style, onPress, piatta = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; piatta?: boolean }) {
  const p = usePalette()
  const fondo: ViewStyle = { backgroundColor: p.carta, borderColor: p.linea, boxShadow: piatta ? undefined : p.ombra }
  if (onPress)
    return (
      <Tocco onPress={onPress} style={[stili.carta, fondo, style]} scala={0.98}>
        {children}
      </Tocco>
    )
  return <View style={[stili.carta, fondo, style]}>{children}</View>
}

// ---------------------------------------------------------------------------

/** Una pillola colorata: lo stato di una cosa. */
export function Etichetta({ testo, tono = 'neutro', icona, grande = false }: { testo: string; tono?: ToniTutti; icona?: NomeIcona; grande?: boolean }) {
  const p = usePalette()
  const colore = coloreTono(p, tono)
  return (
    <View style={[stili.etichetta, { backgroundColor: velo(p, tono), paddingVertical: grande ? 6 : 4 }]}>
      {icona ? <Icona nome={icona} size={grande ? 15 : 13} colore={colore} /> : <View style={[stili.puntino, { backgroundColor: colore }]} />}
      <Text style={[stili.etichettaTesto, { color: colore, fontSize: grande ? 13 : 12 }]}>{testo}</Text>
    </View>
  )
}

/** Un'etichetta col solo bordo, in maiuscoletto: «IN PROVA», «CORSI FITNESS». */
export function Tag({ testo, colore, fondo }: { testo: string; colore?: string; fondo?: string }) {
  const p = usePalette()
  const c = colore ?? p.testo
  return (
    <View style={[stili.tag, { borderColor: c, backgroundColor: fondo }]}>
      <Text style={[stili.tagTesto, { color: c }]} numberOfLines={1}>
        {testo.toUpperCase()}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------

/** Un numero grande con la sua unita' piccola accanto: «88 %», «5 €». */
export function Numero({ valore, unita, size = 40, colore, stile }: { valore: string; unita?: string; size?: number; colore?: string; stile?: TextStyle }) {
  const p = usePalette()
  const c = colore ?? p.testo
  return (
    <Text style={[{ color: c, fontFamily: F.extra, fontSize: size, lineHeight: size * 1.08, letterSpacing: -size * 0.035, fontVariant: ['tabular-nums'] }, stile]}>
      {valore}
      {unita ? <Text style={{ fontFamily: F.bold, fontSize: Math.max(13, size * 0.4), letterSpacing: 0 }}>{` ${unita}`}</Text> : null}
    </Text>
  )
}

// ---------------------------------------------------------------------------

const ICONA_TONO: Record<Tono, NomeIcona> = { ok: 'ok', attenzione: 'attenzione', errore: 'no' }

/** Un avviso: icona, un titolo se serve, il testo. */
export function Messaggio({ tono = 'errore', titolo, icona, children }: { tono?: Tono; titolo?: string; icona?: NomeIcona; children?: ReactNode }) {
  const p = usePalette()
  return (
    <View accessibilityRole={tono === 'errore' ? 'alert' : undefined} style={[stili.messaggio, { backgroundColor: velo(p, tono, p.scuro ? 0.13 : 0.08), borderColor: velo(p, tono, 0.25) }]}>
      <View style={[stili.messaggioIcona, { backgroundColor: p[tono] }]}>
        <Icona nome={icona ?? ICONA_TONO[tono]} size={16} colore="#fff" />
      </View>
      <View style={{ flex: 1, gap: 3, paddingTop: 2 }}>
        {titolo ? <Text style={[stili.messaggioTitolo, { color: p.testo }]}>{titolo}</Text> : null}
        {typeof children === 'string' ? <Text style={[stili.messaggioTesto, { color: titolo ? p.testoSecondario : p.testo }]}>{children}</Text> : children}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------

/** Un'icona in un quadrato tondeggiante colorato. */
export function Bollino({ icona, tono = 'accento', size = 40, pieno = false }: { icona: NomeIcona; tono?: ToniTutti; size?: number; pieno?: boolean }) {
  const p = usePalette()
  const forma = { width: size, height: size, borderRadius: size * 0.34 }
  return (
    <View style={[stili.bollino, forma, { backgroundColor: pieno ? coloreTono(p, tono) : velo(p, tono) }]}>
      <Icona nome={icona} size={size * 0.5} colore={pieno ? '#fff' : coloreTono(p, tono)} />
    </View>
  )
}

// ---------------------------------------------------------------------------

/** Il titolo di una sezione, con un'azione a destra se serve. */
export function Sezione({ titolo, conteggio, destra, children, style }: { titolo: string; conteggio?: number; destra?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette()
  return (
    <View style={[{ gap: spazio.tre }, style]}>
      <View style={stili.sezioneTesta}>
        <Text style={[stili.sezioneTitolo, { color: p.testo }]} accessibilityRole="header">
          {titolo}
          {conteggio != null ? <Text style={{ color: p.testoTerzo, fontFamily: F.semi }}>{`  (${conteggio})`}</Text> : null}
        </Text>
        {destra}
      </View>
      {children}
    </View>
  )
}

/** Il link arancio a destra del titolo di una sezione: «Vedi tutto». */
export function LinkSezione({ testo, onPress }: { testo: string; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco onPress={onPress} ruolo="link" etichetta={testo}>
      <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 13.5 }}>{testo}</Text>
    </Tocco>
  )
}

// ---------------------------------------------------------------------------

/** Una riga di un elenco dentro una Carta: bollino (o avatar), titolo, sottotitolo, coda. */
export function Riga({
  icona,
  tono,
  testa,
  titolo,
  sotto,
  coda,
  onPress,
  prima = false,
  stileTitolo,
}: {
  icona?: NomeIcona
  tono?: ToniTutti
  /** Al posto del bollino: un avatar, una foto. */
  testa?: ReactNode
  titolo: string
  sotto?: ReactNode
  coda?: ReactNode
  onPress?: () => void
  /** La prima riga non ha la linea sopra. */
  prima?: boolean
  stileTitolo?: TextStyle
}) {
  const p = usePalette()
  const corpo = (
    <View style={[stili.riga, !prima && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.scuro ? 'rgba(255,255,255,0.09)' : 'rgba(17,17,20,0.09)' }]}>
      {testa ?? (icona ? <Bollino icona={icona} tono={tono} size={40} /> : null)}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[stili.rigaTitolo, { color: p.testo }, stileTitolo]}>{titolo}</Text>
        {typeof sotto === 'string' ? <Text style={[stili.rigaSotto, { color: p.testoSecondario }]}>{sotto}</Text> : sotto}
      </View>
      {coda}
      {onPress && !coda ? <Icona nome="avanti" size={16} colore={p.testoTerzo} /> : null}
    </View>
  )
  return onPress ? (
    <Tocco onPress={onPress} scala={0.985} ruolo="link">
      {corpo}
    </Tocco>
  ) : (
    corpo
  )
}

// ---------------------------------------------------------------------------

const COLORI_AVATAR = [
  ['#FF8A2B', '#E84300'],
  ['#5C8DFF', '#1F4FD8'],
  ['#3A3B41', '#141518'],
  ['#14B8A6', '#0E7C70'],
  ['#A78BFA', '#6D28D9'],
] as const

export function iniziali(nome: string | null | undefined, cognome?: string | null): string {
  const n = (nome ?? '').trim()
  const c = (cognome ?? '').trim()
  return ((n[0] ?? '') + (c[0] ?? '')).toUpperCase() || '·'
}

/** Le iniziali in un tondo sfumato; il colore dipende dal nome, quindi resta lo stesso. */
export function Avatar({ nome, cognome, size = 44, anello }: { nome: string | null; cognome?: string | null; size?: number; anello?: string }) {
  const chiave = `${nome ?? ''}${cognome ?? ''}`
  let h = 0
  for (let i = 0; i < chiave.length; i++) h = (h * 31 + chiave.charCodeAt(i)) >>> 0
  const colori = COLORI_AVATAR[h % COLORI_AVATAR.length]
  return (
    <LinearGradient
      colors={colori}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: size * 0.36, alignItems: 'center', justifyContent: 'center' }, anello ? { borderWidth: 2.5, borderColor: anello } : null]}
    >
      <Text style={{ color: '#fff', fontFamily: F.extra, fontSize: size * 0.36, letterSpacing: 0.3 }}>{iniziali(nome, cognome)}</Text>
    </LinearGradient>
  )
}

// ---------------------------------------------------------------------------

/** Entra dal basso, una dopo l'altra: `indice` da' il ritardo. */
export function Entra({ indice = 0, children, style }: { indice?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(indice, 10) * 60).duration(420)} style={style}>
      {children}
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------

/** Una forma grigia che pulsa, dove arrivera' il contenuto. */
export function Scheletro({ altezza = 16, larghezza = '100%', tondo = 8, style }: { altezza?: number; larghezza?: number | `${number}%`; tondo?: number; style?: StyleProp<ViewStyle> }) {
  const p = usePalette()
  const o = useSharedValue(0.5)
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 850 }), -1, true)
  }, [o])
  const animato = useAnimatedStyle(() => ({ opacity: o.value }))
  return <Animated.View style={[{ height: altezza, width: larghezza, borderRadius: tondo, backgroundColor: p.incavo }, animato, style]} />
}

/** Il caricamento di una schermata: qualche scheda vuota che pulsa. */
export function SchedeInArrivo({ quante = 3 }: { quante?: number }) {
  return (
    <View style={{ gap: spazio.tre }} accessibilityLabel="Caricamento" accessibilityRole="progressbar">
      <Scheletro altezza={150} tondo={raggio.grande} />
      {Array.from({ length: quante }, (_, i) => (
        <Carta key={i} style={{ gap: spazio.tre }} piatta>
          <View style={{ flexDirection: 'row', gap: spazio.tre, alignItems: 'center' }}>
            <Scheletro altezza={44} larghezza={44} tondo={15} />
            <View style={{ flex: 1, gap: spazio.due }}>
              <Scheletro altezza={14} larghezza="60%" />
              <Scheletro altezza={12} larghezza="40%" />
            </View>
          </View>
          <Scheletro altezza={12} />
        </Carta>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------

/** Una barra di avanzamento orizzontale. */
/**
 * Una barra di avanzamento. Con `animata` si riempie da zero, dopo `ritardo`
 * millisecondi: per le barre che si guardano appena compaiono (le
 * caratteristiche di una lezione).
 */
export function Barra({
  valore,
  colore,
  altezza = 8,
  fondo,
  animata = false,
  ritardo = 0,
}: {
  valore: number
  colore: string
  altezza?: number
  fondo?: string
  animata?: boolean
  ritardo?: number
}) {
  const p = usePalette()
  const v = Math.max(0, Math.min(1, valore))
  const pieno = useSharedValue(animata ? 0 : v)
  useEffect(() => {
    pieno.value = animata ? withDelay(ritardo, withTiming(v, { duration: 900, easing: Easing.out(Easing.cubic) })) : v
  }, [animata, ritardo, v, pieno])
  const larghezza = useAnimatedStyle(() => ({ width: `${pieno.value * 100}%` }))
  return (
    <View style={{ height: altezza, borderRadius: altezza, backgroundColor: fondo ?? p.incavo, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: altezza, backgroundColor: colore }, larghezza]} />
    </View>
  )
}

/** Una colonnina: con `animata` cresce da zero dopo `ritardo` millisecondi. */
function Colonnina({ altezza, larghezza, colore, opacita, animata, ritardo }: { altezza: number; larghezza: number; colore: string; opacita: number; animata: boolean; ritardo: number }) {
  const h = useSharedValue(animata ? 0 : altezza)
  useEffect(() => {
    h.value = animata ? withDelay(ritardo, withTiming(altezza, { duration: 700, easing: Easing.out(Easing.back(1.4)) })) : altezza
  }, [animata, ritardo, altezza, h])
  const stile = useAnimatedStyle(() => ({ height: h.value }))
  return <Animated.View style={[{ width: larghezza, borderRadius: larghezza / 2, backgroundColor: colore, opacity: opacita }, stile]} />
}

/** Le colonnine del riquadro «Score»: una per pezzo, piena se fatto. Con `animata` crescono una dopo l'altra. */
export function Colonnine({
  quante,
  piene,
  colore = '#fff',
  altezza = 56,
  larghezza = 9,
  animata = false,
  ritardo = 0,
}: {
  quante: number
  piene: number
  colore?: string
  altezza?: number
  larghezza?: number
  animata?: boolean
  ritardo?: number
}) {
  // Altezze che salgono e scendono, come un grafico: non dicono nulla, danno ritmo.
  const ritmo = [0.55, 0.8, 0.62, 1, 0.74, 0.9, 0.5, 0.86, 0.68, 0.96]
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: larghezza * 0.6, height: altezza }}>
      {Array.from({ length: quante }, (_, i) => (
        <Colonnina
          key={i}
          altezza={altezza * ritmo[i % ritmo.length]}
          larghezza={larghezza}
          colore={colore}
          opacita={i < piene ? 1 : 0.3}
          animata={animata}
          ritardo={ritardo + i * 70}
        />
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  pulsante: { alignItems: 'center', justifyContent: 'center' },
  pulsanteRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, paddingVertical: spazio.due },
  pulsanteTesto: { fontFamily: F.bold, letterSpacing: 0, textAlign: 'center', flexShrink: 1 },
  carta: { borderRadius: raggio.grande, borderWidth: StyleSheet.hairlineWidth, padding: spazio.tre + 4 },
  etichetta: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: raggio.pillola, paddingHorizontal: 10, alignSelf: 'flex-start' },
  etichettaTesto: { fontFamily: F.bold },
  tag: { borderWidth: 1.2, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  tagTesto: { fontFamily: F.extra, fontSize: 10, letterSpacing: 1 },
  puntino: { width: 6, height: 6, borderRadius: 3 },
  messaggio: { flexDirection: 'row', gap: spazio.tre - 2, padding: spazio.tre - 2, borderRadius: raggio.medio, borderWidth: 1, alignItems: 'flex-start' },
  messaggioIcona: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  messaggioTitolo: { fontSize: 15, fontFamily: F.bold, lineHeight: 20 },
  messaggioTesto: { fontSize: 14, lineHeight: 20, fontFamily: F.medio },
  bollino: { alignItems: 'center', justifyContent: 'center' },
  sezioneTesta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  sezioneTitolo: { fontSize: 20, fontFamily: F.extra, letterSpacing: -0.5 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre - 2, paddingVertical: spazio.tre - 4 },
  rigaTitolo: { fontSize: 15.5, fontFamily: F.bold },
  rigaSotto: { fontSize: 13, lineHeight: 18, fontFamily: F.medio },
})
