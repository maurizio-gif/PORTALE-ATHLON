import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { LARN } from '../alimentazione/conti'
import { Icona } from '../ui/Icona'
import { Barra, Messaggio } from '../ui/kit'
import { F, FUOCO, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { Bolla, Emoji } from './Emoji'
import { COLORE_MACRO, type NomeVisual } from './temi'

// Le immagini che spiegano (01/11/2026): al posto dell'elenco puntato di una definizione, un disegno che si
// capisce in un colpo d'occhio. Tutto con viste e barre, niente immagini da caricare: seguono il tema chiaro e
// scuro, e le barre crescono quando la lettura si apre (`anima`).
// Descrivono, non prescrivono: nessun disegno dice una cifra da raggiungere.

type Proprieta = { accento: string; anima: boolean }

const unita = (testo: string, colore: string) => <Text style={{ fontFamily: F.bold, fontSize: 13, color: colore }}>{testo}</Text>

// ---------------------------------------------------------------------------
// Capire i macros: quante kcal porta un grammo

function KcalGrammo({ anima }: Proprieta) {
  const p = usePalette()
  const righe = [
    { nome: t('Proteine', 'Protein'), k: 4, colore: COLORE_MACRO.proteine, emoji: '🥩' },
    { nome: t('Carboidrati', 'Carbs'), k: 4, colore: COLORE_MACRO.carboidrati, emoji: '🍚' },
    { nome: t('Grassi', 'Fat'), k: 9, colore: COLORE_MACRO.grassi, emoji: '🥑' },
  ]
  return (
    <View style={{ gap: spazio.tre }}>
      {righe.map((r, i) => (
        <View key={r.nome} style={{ gap: 7 }}>
          <View style={stili.testa}>
            <Bolla emoji={r.emoji} colore={r.colore} size={34} />
            <Text style={[stili.nome, { color: p.testo }]}>{r.nome}</Text>
            <Text style={[stili.valore, { color: p.testo }]}>
              {r.k} {unita('kcal/g', p.testoSecondario)}
            </Text>
          </View>
          <Barra valore={r.k / 9} colore={r.colore} altezza={14} animata={anima} ritardo={150 + i * 150} />
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Capire i macros: le fasce dei LARN, disegnate su una scala da 0 a 100

function Larn(_: Proprieta) {
  const p = usePalette()
  const fasce = [
    { nome: t('Carboidrati', 'Carbs'), r: LARN.carboidrati, colore: COLORE_MACRO.carboidrati, emoji: '🍚' },
    { nome: t('Grassi', 'Fat'), r: LARN.grassi, colore: COLORE_MACRO.grassi, emoji: '🥑' },
  ]
  return (
    <View style={{ gap: spazio.tre }}>
      {fasce.map((f) => (
        <View key={f.nome} style={{ gap: 7 }}>
          <View style={stili.testa}>
            <Bolla emoji={f.emoji} colore={f.colore} size={34} />
            <Text style={[stili.nome, { color: p.testo }]}>{f.nome}</Text>
            <Text style={[stili.valore, { color: p.testo }]}>
              {f.r[0]}–{f.r[1]} {unita(t('% dell’energia', '% of energy'), p.testoSecondario)}
            </Text>
          </View>
          <View style={[stili.scala, { backgroundColor: p.incavo }]}>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${f.r[0]}%`, width: `${f.r[1] - f.r[0]}%`, borderRadius: 14, backgroundColor: f.colore }} />
          </View>
        </View>
      ))}
      <View style={stili.assi}>
        {['0', '25', '50', '75', '100'].map((n) => (
          <Text key={n} style={[stili.asse, { color: p.testoTerzo }]}>
            {n}
          </Text>
        ))}
      </View>
      <View style={[stili.riquadro, { backgroundColor: p.incavo }]}>
        <Bolla emoji="🥩" colore={COLORE_MACRO.proteine} size={34} />
        <Text style={[stili.testoRiquadro, { color: p.testoSecondario }]}>
          <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('Proteine', 'Protein')}: </Text>
          {t('0,9 g per kg di peso al giorno; da 1,2 a 2,0 se ti alleni con regolarità.', '0.9 g per kg of body weight a day; 1.2 to 2.0 if you train regularly.')}
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Proteine dagli alimenti: grammi di proteine per 100 g

const FONTI_PROTEINE = [
  { nome: t('Parmigiano', 'Parmesan'), emoji: '🧀', g: 33, vegetale: false },
  { nome: t('Tonno', 'Tuna'), emoji: '🥫', g: 25, vegetale: false },
  { nome: t('Pollo', 'Chicken'), emoji: '🍗', g: 23, vegetale: false },
  { nome: t('Salmone', 'Salmon'), emoji: '🐟', g: 20, vegetale: false },
  { nome: t('Uova', 'Eggs'), emoji: '🥚', g: 13, vegetale: false },
  { nome: 'Tofu', emoji: '🌱', g: 12, vegetale: true },
  { nome: t('Yogurt', 'Yogurt'), emoji: '🥣', g: 10, vegetale: false },
  { nome: t('Lenticchie', 'Lentils'), emoji: '🫘', g: 9, vegetale: true },
]

function FontiProteine({ anima }: Proprieta) {
  const p = usePalette()
  const animale = '#E5484D'
  return (
    <View style={{ gap: spazio.tre }}>
      <View style={{ gap: 9 }}>
        {FONTI_PROTEINE.map((f, i) => (
          <View key={f.nome} style={stili.rigaFonte}>
            <Emoji e={f.emoji} size={22} style={{ width: 28 }} />
            <Text style={[stili.nomeFonte, { color: p.testo }]} numberOfLines={1}>
              {f.nome}
            </Text>
            <View style={{ flex: 1 }}>
              <Barra valore={f.g / 33} colore={f.vegetale ? ORTO[1] : animale} altezza={12} animata={anima} ritardo={120 + i * 90} />
            </View>
            <Text style={[stili.valoreFonte, { color: p.testo }]}>{f.g} g</Text>
          </View>
        ))}
      </View>
      <View style={stili.legenda}>
        <View style={stili.voceLegenda}>
          <View style={[stili.punto, { backgroundColor: animale }]} />
          <Text style={[stili.testoLegenda, { color: p.testoSecondario }]}>{t('Animale', 'Animal')}</Text>
        </View>
        <View style={stili.voceLegenda}>
          <View style={[stili.punto, { backgroundColor: ORTO[1] }]} />
          <Text style={[stili.testoLegenda, { color: p.testoSecondario }]}>{t('Vegetale', 'Plant')}</Text>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Bilancio calorico: l'altalena

type Stato = 'surplus' | 'pari' | 'deficit'

const ANGOLO: Record<Stato, number> = { surplus: -9, pari: 0, deficit: 9 }

const SPIEGAZIONE: Record<Stato, { titolo: string; testo: string }> = {
  surplus: {
    titolo: t('Entra più di quanto esce', 'More comes in than goes out'),
    testo: t('Il peso tende a salire. Con un po’ di allenamento di forza, una parte di quel peso può essere muscolo.', 'Weight tends to go up. With a bit of strength training, part of that weight can be muscle.'),
  },
  pari: {
    titolo: t('Entra quanto esce', 'What comes in goes out'),
    testo: t('Il peso resta più o meno stabile: è la situazione di chi si mantiene.', 'Weight stays more or less stable: it’s the situation of someone maintaining.'),
  },
  deficit: {
    titolo: t('Entra meno di quanto esce', 'Less comes in than goes out'),
    testo: t('Il peso tende a scendere. Se lo scarto è grande, insieme al grasso si perde anche muscolo, e si sente nell’energia e nell’umore.', 'Weight tends to go down. If the gap is large, you lose muscle along with fat, and you feel it in your energy and mood.'),
  },
}

const NOMI_STATO: { id: Stato; nome: string }[] = [
  { id: 'surplus', nome: 'Surplus' },
  { id: 'pari', nome: t('In pari', 'Even') },
  { id: 'deficit', nome: 'Deficit' },
]

function Peso({ colori, emoji, testo }: { colori: readonly [string, string, string]; emoji: string; testo: string }) {
  return (
    <LinearGradient colors={colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.peso}>
      <Emoji e={emoji} size={28} />
      <Text style={stili.testoPeso}>{testo}</Text>
    </LinearGradient>
  )
}

function Altalena({ accento }: Proprieta) {
  const p = usePalette()
  const [s, setS] = useState<Stato>('pari')
  const angolo = useSharedValue(0)
  useEffect(() => {
    angolo.value = withSpring(ANGOLO[s], { damping: 8, stiffness: 70, mass: 0.9 })
  }, [s, angolo])
  const trave = useAnimatedStyle(() => ({ transform: [{ rotate: `${angolo.value}deg` }] }))
  const spiega = SPIEGAZIONE[s]
  return (
    <View style={{ gap: spazio.tre }}>
      <View style={stili.altalena}>
        <Animated.View style={[stili.trave, { backgroundColor: p.testo }, trave]}>
          <View style={[stili.pesoSopra, { left: 6 }]}>
            <Peso colori={ORTO} emoji="🍝" testo={t('Mangi', 'Eat')} />
          </View>
          <View style={[stili.pesoSopra, { right: 6 }]}>
            <Peso colori={FUOCO} emoji="🏃" testo={t('Consumi', 'Burn')} />
          </View>
        </Animated.View>
        <View style={[stili.perno, { borderBottomColor: p.testoTerzo }]} />
        <View style={[stili.base, { backgroundColor: p.testoTerzo }]} />
      </View>
      <View style={stili.pillole}>
        {NOMI_STATO.map((n) => {
          const sel = n.id === s
          return (
            <Tocco key={n.id} onPress={() => setS(n.id)} vibra="scelta" ruolo="radio" etichetta={n.nome} stato={{ checked: sel }} style={{ flex: 1 }}>
              <View style={[stili.pillola, { backgroundColor: sel ? accento : p.incavo }]}>
                <Text style={[stili.testoPillola, { color: sel ? '#fff' : p.testo }]}>{n.nome}</Text>
              </View>
            </Tocco>
          )
        })}
      </View>
      <Animated.View key={s} entering={FadeIn.duration(260)} style={{ gap: 4, minHeight: 84 }}>
        <Text style={[stili.titoloSpiega, { color: p.testo }]}>{spiega.titolo}</Text>
        <Text style={[stili.testoSpiega, { color: p.testoSecondario }]}>{spiega.testo}</Text>
      </Animated.View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Bilancio calorico: dove va l'energia

function DoveVaEnergia({ accento }: Proprieta) {
  const p = usePalette()
  const parti = [
    { flex: 6, emoji: '🫀', colore: accento, nome: t('A riposo', 'At rest'), testo: t('Cuore, respiro, temperatura: la parte più grande se ne va solo per tenerti in vita.', 'Heart, breathing, temperature: the biggest part goes just to keeping you alive.') },
    { flex: 3, emoji: '🏃', colore: FUOCO[1], nome: t('In movimento', 'On the move'), testo: t('Dai passi di tutti i giorni all’allenamento.', 'From everyday steps to your workout.') },
    { flex: 1, emoji: '🍽️', colore: '#F2B84B', nome: t('Digestione', 'Digestion'), testo: t('Circa un decimo dell’energia che mangi serve a digerirla.', 'About a tenth of the energy you eat goes into digesting it.') },
  ]
  return (
    <View style={{ gap: spazio.tre }}>
      <View style={stili.barraEnergia}>
        {parti.map((x) => (
          <View key={x.nome} style={{ flex: x.flex, backgroundColor: x.colore }} />
        ))}
      </View>
      <View style={{ gap: spazio.due + 2 }}>
        {parti.map((x) => (
          <View key={x.nome} style={stili.voceEnergia}>
            <Bolla emoji={x.emoji} colore={x.colore} size={34} />
            <Text style={[stili.testoSpiega, { color: p.testoSecondario, flex: 1 }]}>
              <Text style={{ fontFamily: F.bold, color: p.testo }}>{x.nome}. </Text>
              {x.testo}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Prima e dopo l'allenamento: la linea del tempo

type Passo = { quando: string; testo: string; emoji?: string; allenamento?: boolean }

const PASSI: Passo[] = [
  { emoji: '🍚', quando: t('1–2 ore prima', '1–2 hours before'), testo: t('Un pasto normale con carboidrati e proteine: per esempio riso e pollo, o pane e uova.', 'A regular meal with carbs and protein: for example rice and chicken, or bread and eggs.') },
  { emoji: '🍌', quando: t('30–60 minuti prima', '30–60 minutes before'), testo: t('Qualcosa di leggero che si digerisce in fretta: una banana, fiocchi d’avena, una fetta di pane tostato.', 'Something light that digests quickly: a banana, oats, a slice of toast.') },
  { quando: '', testo: '', allenamento: true },
  { emoji: '🥛', quando: t('Entro 1–2 ore dopo', 'Within 1–2 hours after'), testo: t('Proteine e carboidrati insieme: riso e pollo, ricotta e frutta, oppure uno shake con una banana se un pasto non c’è.', 'Protein and carbs together: rice and chicken, ricotta and fruit, or a shake with a banana if a meal isn’t possible.') },
]

function Timeline({ accento }: Proprieta) {
  const p = usePalette()
  return (
    <View>
      {PASSI.map((x, i) => {
        const ultimo = i === PASSI.length - 1
        return (
          <View key={i} style={stili.passo}>
            <View style={stili.colonnaPasso}>
              <View style={x.allenamento ? [stili.nodoGrande, { backgroundColor: FUOCO[1] }] : [stili.nodo, { borderColor: accento, backgroundColor: p.carta }]} />
              {ultimo ? null : <View style={[stili.filo, { backgroundColor: accento }]} />}
            </View>
            <View style={{ flex: 1, paddingBottom: ultimo ? 0 : spazio.tre + 2, gap: 3, flexDirection: x.emoji ? 'row' : 'column', alignItems: x.emoji ? 'flex-start' : undefined }}>
              {x.emoji ? <Bolla emoji={x.emoji} colore={accento} size={40} /> : null}
              {x.allenamento ? (
                <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.pilloleAllenamento}>
                  <Icona nome="peso" size={16} colore="#fff" />
                  <Text style={stili.testoAllenamento}>{t('Allenamento', 'Training')}</Text>
                </LinearGradient>
              ) : (
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[stili.titoloSpiega, { color: p.testo }]}>{x.quando}</Text>
                  <Text style={[stili.testoSpiega, { color: p.testoSecondario }]}>{x.testo}</Text>
                </View>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Idratazione: il test del colore

const COLORI_URINE = ['#FBF4CF', '#F7E79B', '#F0D060', '#E3B335', '#CC8E1F', '#A5601A']

const MESSAGGI_URINE: { tono: 'ok' | 'attenzione' | 'errore'; titolo: string; testo: string }[] = [
  { tono: 'ok', titolo: t('Molto chiaro', 'Very pale'), testo: t('Sei ben idratato. Se è quasi incolore tutto il giorno, puoi anche bere un po’ meno.', 'You’re well hydrated. If it’s nearly colorless all day, you can even drink a little less.') },
  { tono: 'ok', titolo: t('Giallo paglierino', 'Pale straw'), testo: t('È il colore giusto: sei ben idratato.', 'That’s the right color: you’re well hydrated.') },
  { tono: 'ok', titolo: t('Giallo', 'Yellow'), testo: t('Ancora bene: un bicchiere d’acqua nelle prossime ore e sei a posto.', 'Still fine: a glass of water in the next few hours and you’re set.') },
  { tono: 'attenzione', titolo: t('Giallo scuro', 'Dark yellow'), testo: t('Stai perdendo più di quanto bevi: bevi qualcosa adesso.', 'You’re losing more than you drink: have something to drink now.') },
  { tono: 'attenzione', titolo: t('Ambra', 'Amber'), testo: t('Probabilmente sei disidratato: bevi con regolarità nelle prossime ore.', 'You’re probably dehydrated: drink regularly over the next few hours.') },
  { tono: 'errore', titolo: t('Molto scuro', 'Very dark'), testo: t('Bevi subito, un poco alla volta. Se resta così nonostante tu beva, parlane con il medico.', 'Drink now, a little at a time. If it stays like this even though you drink, talk to your doctor.') },
]

function Urine(_: Proprieta) {
  const p = usePalette()
  const [i, setI] = useState(1)
  const m = MESSAGGI_URINE[i]
  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.testoSpiega, { color: p.testoSecondario }]}>{t('Il controllo più semplice che hai. Tocca un colore.', 'The simplest check you have. Tap a color.')}</Text>
      <View style={stili.campioni}>
        {COLORI_URINE.map((c, k) => {
          const sel = k === i
          return (
            <Tocco key={c} onPress={() => setI(k)} vibra="scelta" ruolo="radio" etichetta={MESSAGGI_URINE[k].titolo} stato={{ checked: sel }} style={{ flex: 1 }}>
              <View style={[stili.campione, { backgroundColor: c, borderColor: sel ? p.testo : 'transparent' }]}>
                {sel ? <Icona nome="spunta" size={18} colore={k < 3 ? '#5B3A00' : '#fff'} /> : null}
              </View>
            </Tocco>
          )
        })}
      </View>
      <View style={stili.assi}>
        <Text style={[stili.asse, { color: p.testoTerzo }]}>{t('Idratato', 'Hydrated')}</Text>
        <Text style={[stili.asse, { color: p.testoTerzo }]}>{t('Da bere', 'Drink up')}</Text>
      </View>
      <Animated.View key={i} entering={FadeIn.duration(240)}>
        <Messaggio tono={m.tono} titolo={m.titolo} icona="goccia">
          {m.testo}
        </Messaggio>
      </Animated.View>
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {t('Vitamine del gruppo B, alcuni alimenti e certi farmaci cambiano il colore: se è insolito e non passa, chiedi al medico.', 'B vitamins, some foods and certain medicines change the color: if it’s unusual and doesn’t go away, ask your doctor.')}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Qualità degli alimenti: i quattro gruppi NOVA

const GRUPPI_NOVA = [
  { n: 1, colore: '#18A957', titolo: t('Freschi o appena lavorati', 'Fresh or minimally processed'), testo: t('Frutta, verdura, uova, latte, legumi secchi, riso, carne e pesce.', 'Fruit, vegetables, eggs, milk, dried legumes, rice, meat and fish.'), emoji: '🍎 🥦 🥚 🐟' },
  { n: 2, colore: '#9BB726', titolo: t('Ingredienti da cucina', 'Culinary ingredients'), testo: t('Olio, burro, sale, zucchero, farina: servono per cucinare, non sono un pasto.', 'Oil, butter, salt, sugar, flour: they’re for cooking, not a meal.'), emoji: '🧈 🧂 🌾' },
  { n: 3, colore: '#F2A93B', titolo: t('Trasformati', 'Processed'), testo: t('Pane, formaggi, legumi e tonno in scatola, conserve: pochi ingredienti e un processo semplice.', 'Bread, cheese, canned legumes and tuna, preserves: few ingredients and a simple process.'), emoji: '🍞 🧀 🥫' },
  { n: 4, colore: '#E5484D', titolo: t('Ultra-trasformati', 'Ultra-processed'), testo: t('Snack e merendine confezionati, bibite zuccherate, piatti pronti industriali: molti ingredienti e additivi che in cucina non hai.', 'Packaged snacks and pastries, sugary drinks, industrial ready meals: many ingredients and additives you wouldn’t have in your kitchen.'), emoji: '🍟 🥤 🍪' },
]

function Nova(_: Proprieta) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due + 2 }}>
      <View style={{ gap: 5 }}>
        <LinearGradient colors={GRUPPI_NOVA.map((g) => g.colore) as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={stili.spettro} />
        <View style={stili.assi}>
          <Text style={[stili.asse, { color: p.testoTerzo }]}>{t('Meno trasformati', 'Less processed')}</Text>
          <Text style={[stili.asse, { color: p.testoTerzo }]}>{t('Più trasformati', 'More processed')}</Text>
        </View>
      </View>
      {GRUPPI_NOVA.map((g) => (
        <View key={g.n} style={[stili.gruppo, { backgroundColor: p.incavo }]}>
          <View style={[stili.numeroGruppo, { backgroundColor: g.colore }]}>
            <Text style={stili.testoNumero}>{g.n}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titoloSpiega, { color: p.testo }]}>{g.titolo}</Text>
            <Text style={[stili.testoSpiega, { color: p.testoSecondario }]}>{g.testo}</Text>
            <Emoji e={g.emoji} size={24} style={{ textAlign: 'left', letterSpacing: 8, marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------

export function Visual({ nome, accento, anima }: { nome: NomeVisual } & Proprieta) {
  const x = { accento, anima }
  switch (nome) {
    case 'kcal-grammo':
      return <KcalGrammo {...x} />
    case 'larn':
      return <Larn {...x} />
    case 'fonti-proteine':
      return <FontiProteine {...x} />
    case 'altalena':
      return <Altalena {...x} />
    case 'dove-va-energia':
      return <DoveVaEnergia {...x} />
    case 'timeline':
      return <Timeline {...x} />
    case 'urine':
      return <Urine {...x} />
    case 'nova':
      return <Nova {...x} />
  }
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  punto: { width: 10, height: 10, borderRadius: 5 },
  nome: { flex: 1, fontFamily: F.bold, fontSize: 15 },
  valore: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  scala: { height: 14, borderRadius: 14, overflow: 'hidden' },
  assi: { flexDirection: 'row', justifyContent: 'space-between' },
  asse: { fontFamily: F.semi, fontSize: 11.5 },
  riquadro: { flexDirection: 'row', gap: spazio.due + 2, padding: spazio.tre - 2, borderRadius: 16 },
  testoRiquadro: { flex: 1, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  rigaFonte: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2 },
  nomeFonte: { width: 84, fontFamily: F.semi, fontSize: 13.5 },
  valoreFonte: { width: 40, textAlign: 'right', fontFamily: F.extra, fontSize: 14, fontVariant: ['tabular-nums'] },
  legenda: { flexDirection: 'row', gap: spazio.tre },
  voceLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testoLegenda: { fontFamily: F.semi, fontSize: 12.5 },
  altalena: { height: 176, alignItems: 'center', justifyContent: 'flex-end' },
  trave: { width: '100%', maxWidth: 300, height: 12, borderRadius: 6, marginBottom: 40 },
  pesoSopra: { position: 'absolute', bottom: 12 },
  peso: { width: 74, height: 74, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 3 },
  testoPeso: { color: '#fff', fontFamily: F.extra, fontSize: 11.5 },
  perno: { position: 'absolute', bottom: 0, width: 0, height: 0, borderLeftWidth: 28, borderRightWidth: 28, borderBottomWidth: 44, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  base: { position: 'absolute', bottom: 0, width: 104, height: 8, borderRadius: 4 },
  pillole: { flexDirection: 'row', gap: spazio.due },
  pillola: { minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  testoPillola: { fontFamily: F.bold, fontSize: 14 },
  titoloSpiega: { fontFamily: F.extra, fontSize: 15.5, letterSpacing: -0.2 },
  testoSpiega: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  barraEnergia: { flexDirection: 'row', height: 40, borderRadius: 14, overflow: 'hidden', gap: 2 },
  voceEnergia: { flexDirection: 'row', gap: spazio.due + 2 },
  passo: { flexDirection: 'row', gap: spazio.tre - 2 },
  colonnaPasso: { width: 22, alignItems: 'center' },
  nodo: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, marginTop: 3 },
  nodoGrande: { width: 22, height: 22, borderRadius: 11, marginTop: 6 },
  filo: { flex: 1, width: 3, borderRadius: 2, opacity: 0.35, marginTop: 4 },
  pilloleAllenamento: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginVertical: 4, borderRadius: 999, paddingHorizontal: 14, minHeight: 34 },
  testoAllenamento: { color: '#fff', fontFamily: F.extra, fontSize: 14 },
  campioni: { flexDirection: 'row', gap: 6 },
  campione: { height: 58, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  spettro: { height: 8, borderRadius: 8 },
  gruppo: { flexDirection: 'row', gap: spazio.tre - 2, padding: spazio.tre - 2, borderRadius: 18, alignItems: 'flex-start' },
  numeroGruppo: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  testoNumero: { color: '#fff', fontFamily: F.extra, fontSize: 16 },
})
