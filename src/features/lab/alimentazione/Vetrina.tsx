import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { daiConsenso } from '@/api/alimentazione'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { useProgresso } from '../schede/ContatoreCalorie'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { Foglio } from '../ui/Foglio'
import { F, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CONSENSO, INFORMATIVA, VERSIONE_INFORMATIVA } from './informativa'

// La vetrina della sezione Alimentazione (19/10/2026): quello che la sezione fa,
// raccontato in modo da far venire voglia di provarla, e sotto il consenso.
// **Senza il consenso la sezione e' chiusa** (richiesta del club): il pulsante si
// accende solo con la casella spuntata, e la funzione rifiuta ogni azione finche'
// il consenso non e' registrato. L'informativa completa si apre in un foglio.

const ANELLI = [
  { colore: '#FFD166', quota: 0.5 },
  { colore: '#FF8A5B', quota: 0.3 },
  { colore: '#FFFFFF', quota: 0.2 },
]

/** Il piatto della vetrina: tre spicchi che si disegnano, come le quote di carboidrati, grassi e proteine. */
function Piatto() {
  const t = useProgresso(1600, 250)
  const fermo = useReducedMotion()
  const s = useSharedValue(1)
  useEffect(() => {
    if (!fermo) s.value = withRepeat(withSequence(withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1)
  }, [fermo, s])
  const respira = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }))
  const r = 44
  const giro = 2 * Math.PI * r
  let inizio = 0
  return (
    <View style={stili.piatto}>
      <Svg width={112} height={112} viewBox="0 0 112 112">
        <Circle cx={56} cy={56} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={12} fill="none" />
        {ANELLI.map((a, i) => {
          const lungo = giro * a.quota * t - 3
          const el = (
            <Circle
              key={i}
              cx={56}
              cy={56}
              r={r}
              stroke={a.colore}
              strokeWidth={12}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, lungo)} ${giro}`}
              strokeDashoffset={-inizio * t}
              transform="rotate(-90 56 56)"
            />
          )
          inizio += giro * a.quota
          return el
        })}
      </Svg>
      <Animated.View style={[stili.piattoCentro, respira]}>
        <Icona nome="piatto" size={30} colore="#fff" />
      </Animated.View>
    </View>
  )
}

const COSE: { icona: NomeIcona; colori: readonly [string, string]; titolo: string; testo: string }[] = [
  { icona: 'piatto', colori: ['#43E0A0', '#0A6B37'], titolo: t('Il diario in un tocco', 'Your diary in one tap'), testo: t('Cerchi l’alimento, scegli la porzione: calorie e nutrienti si contano da soli.', 'Search for the food, choose the portion: calories and nutrients add up on their own.') },
  { icona: 'fotocamera', colori: ['#FF8A2B', '#E84300'], titolo: t('Fotografa il piatto', 'Photograph your meal'), testo: t('L’intelligenza artificiale riconosce cosa c’è e stima i grammi. Tu controlli e confermi.', 'Artificial intelligence recognizes what’s there and estimates the grams. You check and confirm.') },
  { icona: 'fiamma', colori: ['#5C8DFF', '#1F4FD8'], titolo: t('Accanto al tuo allenamento', 'Next to your training'), testo: t('Quello che mangi vicino a quello che consumi con gli allenamenti e le lezioni.', 'What you eat next to what you burn in your workouts and classes.') },
  { icona: 'stella', colori: ['#A78BFA', '#6D28D9'], titolo: t('Consigli per te', 'Tips for you'), testo: t('Secondo il tuo obiettivo e come ti alleni, dalle linee guida ufficiali.', 'Based on your goal and how you train, from the official guidelines.') },
]

const GARANZIE: { icona: NomeIcona; testo: string }[] = [
  { icona: 'lucchetto', testo: t('Li vedi solo tu: nemmeno lo staff del club.', 'Only you can see it: not even the club staff.') },
  { icona: 'fotocamera', testo: t('La foto serve solo a riconoscere il piatto: non la conserviamo.', 'The photo is only used to recognize the meal: we don’t keep it.') },
  { icona: 'cestino', testo: t('Revochi quando vuoi, e cancelliamo tutto subito.', 'Withdraw whenever you like, and we delete everything right away.') },
]

export function Vetrina({ onConsenso }: { onConsenso: () => void }) {
  const p = usePalette()
  const [spunta, setSpunta] = useState(false)
  const [aperta, setAperta] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function attiva() {
    setInCorso(true)
    setErrore(null)
    const r = await daiConsenso(VERSIONE_INFORMATIVA)
    setInCorso(false)
    if (r.ok) onConsenso()
    else setErrore(r.errore)
  }

  return (
    <>
      <Entra indice={0}>
        <LinearGradient colors={ORTO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.eroe}>
          <View style={stili.eroeRiga}>
            <View style={{ flex: 1, gap: spazio.due }}>
              <View style={stili.novita}>
                <Text style={stili.novitaTesto}>{t('NOVITÀ', 'NEW')}</Text>
              </View>
              <Text style={stili.eroeTitolo}>{t('Mangia bene, allenati meglio', 'Eat well, train better')}</Text>
            </View>
            <Piatto />
          </View>
          <Text style={stili.eroeTesto}>{t('Il diario dei pasti, la foto del piatto che diventa calorie, il bilancio con quello che consumi e i consigli per il tuo allenamento.', 'The meal diary, the photo of your meal that turns into calories, the balance with what you burn, and tips for your training.')}</Text>
        </LinearGradient>
      </Entra>

      <View style={{ gap: spazio.tre }}>
        {COSE.map((c, i) => (
          <Entra key={c.titolo} indice={i + 1}>
            <Carta style={stili.cosa}>
              <LinearGradient colors={c.colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cosaIcona}>
                <Icona nome={c.icona} size={22} colore="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.cosaTitolo, { color: p.testo }]}>{c.titolo}</Text>
                <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>{c.testo}</Text>
              </View>
            </Carta>
          </Entra>
        ))}
      </View>

      <Entra indice={5}>
        <Carta style={{ gap: spazio.tre }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{t('I tuoi dati restano tuoi', 'Your data stays yours')}</Text>
          <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>
            {t('Quello che mangi è un dato sulla salute: per aprire la sezione ci serve il tuo consenso, che puoi ritirare quando vuoi.', 'What you eat is health data: to open the section we need your consent, which you can withdraw whenever you like.')}
          </Text>
          <View style={{ gap: spazio.due }}>
            {GARANZIE.map((g) => (
              <View key={g.testo} style={stili.garanzia}>
                <Icona nome={g.icona} size={18} colore={ORTO[1]} />
                <Text style={[stili.cosaTesto, { color: p.testo, flex: 1 }]}>{g.testo}</Text>
              </View>
            ))}
          </View>
          <Tocco onPress={() => setAperta(true)} etichetta={t('Leggi l’informativa completa', 'Read the full privacy notice')} ruolo="link" style={{ alignSelf: 'flex-start' }}>
            <Text style={[stili.link, { color: p.accento }]}>{t('Leggi l’informativa completa', 'Read the full privacy notice')}</Text>
          </Tocco>
          <Tocco onPress={() => setSpunta((v) => !v)} vibra="scelta" ruolo="checkbox" stato={{ selected: spunta }} etichetta={CONSENSO} scala={0.99}>
            <View style={[stili.spunta, { backgroundColor: p.incavo }]}>
              <View style={[stili.casella, { borderColor: spunta ? ORTO[1] : p.testoTerzo, backgroundColor: spunta ? ORTO[1] : 'transparent' }]}>
                {spunta ? <Icona nome="spunta" size={15} colore="#fff" /> : null}
              </View>
              <Text style={[stili.cosaTesto, { color: p.testo, flex: 1 }]}>{CONSENSO}</Text>
            </View>
          </Tocco>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Attiva l’alimentazione', 'Turn on Nutrition')} icona="avanti" onPress={attiva} disabilitato={!spunta} inCorso={inCorso} />
        </Carta>
      </Entra>

      <Foglio aperto={aperta} titolo={t('Informativa: Alimentazione', 'Privacy notice: Nutrition')} sottotitolo={t(`Versione del ${VERSIONE_INFORMATIVA.split('-').reverse().join('/')}`, `Version of ${VERSIONE_INFORMATIVA.split('-').reverse().join('/')}`)} onChiudi={() => setAperta(false)}>
        {INFORMATIVA.map((s) => (
          <View key={s.titolo} style={{ gap: 4 }}>
            <Text style={[stili.cosaTitolo, { color: p.testo }]}>{s.titolo}</Text>
            <Text style={[stili.cosaTesto, { color: p.testoSecondario }]}>{s.testo}</Text>
          </View>
        ))}
        <Pulsante testo={t('Ho letto', 'I’ve read it')} variante="secondario" onPress={() => setAperta(false)} />
      </Foglio>
    </>
  )
}

const stili = StyleSheet.create({
  eroe: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre, overflow: 'hidden' },
  eroeRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  eroeTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 26, lineHeight: 30 },
  eroeTesto: { color: 'rgba(255,255,255,0.88)', fontFamily: F.medio, fontSize: 15, lineHeight: 21 },
  novita: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  novitaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
  piatto: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  piattoCentro: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.16)', alignItems: 'center', justifyContent: 'center' },
  cosa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  cosaIcona: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cosaTitolo: { fontFamily: F.extra, fontSize: 16 },
  cosaTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  titoletto: { fontFamily: F.extra, fontSize: 18 },
  garanzia: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due },
  link: { fontFamily: F.bold, fontSize: 14, paddingVertical: 6 },
  spunta: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre, borderRadius: 16, padding: spazio.tre },
  casella: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
})
