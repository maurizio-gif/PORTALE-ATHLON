import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { LARGO } from '@/components/Pagina'
import { spazio, type Tono } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Bollino } from '../ui/kit'
import { F, FUOCO, MARE, usePalette, coloreTono, velo, type ToniTutti } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { SEZIONI, type SezioneHome } from './sezioni'

// Il selettore della Home: un riquadro per sezione (il Tesseramento solo se c'e'), che mostrano un
// dato vivo e fanno da schede. Quello scelto si accende col colore della sua
// sezione. Su telefono scorrono in orizzontale; da largo stanno in riga.

/** Il dato vivo di un riquadro. `allerta` accende un pallino (rosso: urgente, ambra: da guardare). */
export type VoceRiquadro = {
  valore: string
  /** La riga piccola sotto il valore. */
  nota?: string
  allerta?: Tono
  /** Una pillola nell'angolo, al posto del pallino: lo stato di quello che il riquadro conta («Irregolare»). */
  tag?: { testo: string; tono: Tono }
}

const ASPETTO: Record<SezioneHome, { titolo: string; icona: NomeIcona; tono: ToniTutti; colori: readonly [string, string, ...string[]] }> = {
  abbonamenti: { titolo: 'Abbonamenti', icona: 'abbonamento', tono: 'accento', colori: FUOCO },
  pagamenti: { titolo: 'Pagamenti', icona: 'carta', tono: 'attenzione', colori: ['#F59E0B', '#B45309'] },
  prodotti: { titolo: 'Prodotti', icona: 'pass', tono: 'neutro', colori: ['#EC4899', '#9D174D'] },
  documenti: { titolo: 'Documenti', icona: 'documento', tono: 'neutro', colori: ['#14B8A6', '#0E7C70'] },
  certificato: { titolo: 'Certificato', icona: 'certificato', tono: 'ok', colori: ['#34A36B', '#1B6B43'] },
  famiglia: { titolo: 'Famiglia', icona: 'famiglia', tono: 'blu', colori: MARE },
  profilo: { titolo: 'Profilo', icona: 'persona', tono: 'neutro', colori: ['#8B5CF6', '#5B21B6'] },
  tesseramento: { titolo: 'Tesseramento', icona: 'tessera', tono: 'blu', colori: ['#0EA5E9', '#075985'] },
}

const LARGHEZZA = 160
const SPAZIO_FRA = spazio.tre - 4

/** La grandezza del valore: un numero sta grande, una parola o una data piu' piccola. */
function corpo(valore: string): number {
  return valore.length <= 3 ? 34 : valore.length <= 7 ? 25 : 19
}

function Riquadro({ sezione, voce, scelto, onPress, larghezza }: { sezione: SezioneHome; voce: VoceRiquadro; scelto: boolean; onPress: () => void; /** In riga (schermo largo) il riquadro riempie la sua cella; su telefono ha una larghezza fissa. */ larghezza?: number }) {
  const p = usePalette()
  const a = ASPETTO[sezione]
  const sopra = scelto ? '#fff' : p.testo
  const sotto = scelto ? 'rgba(255,255,255,0.8)' : p.testoSecondario
  const contenuto = (
    <>
      <View style={stili.testa}>
        {scelto ? (
          <View style={stili.iconaScelta}>
            <Icona nome={a.icona} size={18} colore="#fff" />
          </View>
        ) : (
          <Bollino icona={a.icona} tono={a.tono} size={36} />
        )}
        {voce.tag ? (
          <View style={[stili.tag, { backgroundColor: scelto ? 'rgba(255,255,255,0.24)' : velo(p, voce.tag.tono, 0.16) }]}>
            <Text style={[stili.tagTesto, { color: scelto ? '#fff' : coloreTono(p, voce.tag.tono) }]} numberOfLines={1}>
              {voce.tag.testo}
            </Text>
          </View>
        ) : voce.allerta ? <View style={[stili.pallino, { backgroundColor: coloreTono(p, voce.allerta), borderColor: scelto ? a.colori[1] : p.carta }]} /> : null}
      </View>
      <View style={{ gap: 1 }}>
        <Text style={[stili.titolo, { color: sotto }]} numberOfLines={1}>
          {a.titolo}
        </Text>
        <Text style={[stili.valore, { color: sopra, fontSize: corpo(voce.valore) }]} numberOfLines={1}>
          {voce.valore}
        </Text>
        <Text style={[stili.nota, { color: sotto }]} numberOfLines={2}>
          {voce.nota ?? ' '}
        </Text>
      </View>
    </>
  )
  return (
    <Tocco
      ruolo="tab"
      vibra="scelta"
      stato={{ selected: scelto }}
      onPress={onPress}
      etichetta={`${a.titolo}: ${voce.valore}${voce.nota ? `, ${voce.nota}` : ''}`}
      scala={0.97}
      style={[stili.riquadro, larghezza ? { width: larghezza } : stili.riempi]}
    >
      {scelto ? (
        <LinearGradient colors={a.colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.dentro, !larghezza && stili.riempi]}>
          {contenuto}
        </LinearGradient>
      ) : (
        <View style={[stili.dentro, !larghezza && stili.riempi, { backgroundColor: p.carta, borderColor: p.linea, borderWidth: StyleSheet.hairlineWidth, boxShadow: p.ombra }]}>{contenuto}</View>
      )}
    </Tocco>
  )
}

/** `sezioni`: quali riquadri mostrare, nell'ordine (di norma tutte; il Tesseramento manca a chi non ha una tessera attiva). */
export function Riquadri({ voci, scelta, onScegli, sezioni = SEZIONI }: { voci: Record<SezioneHome, VoceRiquadro>; scelta: SezioneHome; onScegli: (s: SezioneHome) => void; sezioni?: readonly SezioneHome[] }) {
  const { width } = useWindowDimensions()
  const largo = width >= LARGO
  const scorrimento = useRef<ScrollView>(null)

  // Una sezione scelta da un link o da «Da fare» puo' stare fuori dallo schermo: si porta in vista.
  useEffect(() => {
    if (largo) return
    const x = Math.max(0, sezioni.indexOf(scelta) * (LARGHEZZA + SPAZIO_FRA) - spazio.tre)
    scorrimento.current?.scrollTo({ x, animated: true })
  }, [scelta, largo, sezioni])

  const riquadri = sezioni.map((s) => <Riquadro key={s} sezione={s} voce={voci[s]} scelto={s === scelta} onPress={() => onScegli(s)} larghezza={largo ? undefined : LARGHEZZA} />)

  if (largo) {
    return (
      <View style={{ flexDirection: 'row', gap: spazio.tre }} accessibilityRole="tablist">
        {riquadri.map((r, i) => (
          <View key={i} style={{ flex: 1, minWidth: 0, flexDirection: 'column' }}>
            {r}
          </View>
        ))}
      </View>
    )
  }
  return (
    <ScrollView
      ref={scorrimento}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: SPAZIO_FRA, paddingHorizontal: spazio.tre + 2, paddingVertical: 6 }}
      style={{ marginHorizontal: -(spazio.tre + 2) }}
    >
      {riquadri}
    </ScrollView>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderRadius: 26 },
  riempi: { flex: 1 },
  dentro: { borderRadius: 26, padding: spazio.tre, minHeight: 148, justifyContent: 'space-between', gap: spazio.due },
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconaScelta: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  titolo: { fontFamily: F.bold, fontSize: 13 },
  pallino: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagTesto: { fontFamily: F.extra, fontSize: 11.5 },
  valore: { fontFamily: F.extra, letterSpacing: -0.6 },
  // Due righe di spazio sempre: cosi' i riquadri affiancati hanno il testo alla stessa altezza.
  nota: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 16, minHeight: 32 },
})
