import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { ATTIVITA_PROVA, type AttivitaProva } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { spazio, tinta, useColori } from '@/theme'

// La prova in vetrina (30/10/2026, richiesta di Maurizio): in cima alla pagina di attivazione del Guest Pass, prima dei
// dati, due blocchi sul modello della pagina /prova del sito.
//   1. `PrezzoProva`: il cartellino — il prezzo e' l'argomento — e le tre cose che tolgono il rischio: sette giorni, nessun
//      rinnovo, e alla fine decide chi prova. Sta su fondo scuro in tutti e due i temi, come le fasce «carbone» dell'app;
//   2. `AttivitaComprese`: tutto quello che il Pass apre, una riga per attivita' a fisarmonica (una aperta alla volta): chiusa
//      dice in una riga cos'e', aperta spiega cosa c'e' dentro e rimanda alla pagina del sito.
// Nessun numero e' scritto a mano: il prezzo arriva dalla richiesta (5 € con l'invito di un socio), le attivita' da
// `ATTIVITA_PROVA` (quelle del Premium, che il Pass apre per sette giorni).

const NATIVO = Platform.OS !== 'web'
const CARBONE = '#171514'

/** Una pagina del sito in un'altra scheda: chi legge non perde quello che ha compilato. */
function apriAccanto(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener')
  else Linking.openURL(url)
}

/** Le icone di linea delle attivita', le stesse del sito (viewBox 24, tratto 1,8). */
const ICONE: Record<string, { percorsi: string[]; cerchi: [number, number, number][] }> = {
  'gym-floor': { percorsi: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3.5 9v6', 'M20.5 9v6', 'M6.5 12h11'], cerchi: [] },
  'corsi-fitness': {
    percorsi: ['M2 21v-1.5A4.5 4.5 0 0 1 6.5 15h5A4.5 4.5 0 0 1 16 19.5V21', 'M22 21v-1a3.5 3.5 0 0 0-3-3.46'],
    cerchi: [[9, 7, 3], [18, 8, 2.5]],
  },
  'group-reformer': { percorsi: ['M3 17h18', 'M6 17v-3.5A2.5 2.5 0 0 1 8.5 11h7a2.5 2.5 0 0 1 2.5 2.5V17'], cerchi: [[12, 6, 2.5]] },
  'aqua-fitness': {
    percorsi: [
      'M2 8.5c2.5-2 4.5 2 7 0s4.5 2 7 0 3.5 1 4 1.2',
      'M2 14c2.5-2 4.5 2 7 0s4.5 2 7 0 3.5 1 4 1.2',
      'M2 19.5c2.5-2 4.5 2 7 0s4.5 2 7 0 3.5 1 4 1.2',
    ],
    cerchi: [],
  },
  'scuola-nuoto-adulti': { percorsi: ['M3 14c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3-.4 4.2.6', 'M6 10.5 11 8l4 3'], cerchi: [[17, 7, 2]] },
  'nuoto-libero': {
    percorsi: ['M10 11.5 15.5 9 21 12', 'M2 17c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3.6 1.6 5.4 0 1.4-.6 1.8-.9'],
    cerchi: [[7, 8, 2]],
  },
  gestanti: { percorsi: ['M12 21s-7-4.3-7-9.4A4.1 4.1 0 0 1 12 8.6a4.1 4.1 0 0 1 7 3c0 5.1-7 9.4-7 9.4Z'], cerchi: [[12, 4, 1.6]] },
}

function Glifo({ chiave, colore, size = 20 }: { chiave: string; colore: string; size?: number }) {
  const i = ICONE[chiave]
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {i ? (
        <>
          {i.percorsi.map((d) => (
            <Path key={d} d={d} stroke={colore} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {i.cerchi.map(([cx, cy, r]) => (
            <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} stroke={colore} strokeWidth={1.8} />
          ))}
        </>
      ) : (
        <Circle cx={12} cy={12} r={3} fill={colore} />
      )}
    </Svg>
  )
}

/** Il blocco che entra: sfuma e sale di pochi punti. Chiuso non c'e': niente da animare in uscita. */
function Appare({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVO }).start()
  }, [v])
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) }] }}>{children}</Animated.View>
}

/** Il cartellino del prezzo, sopra tutto il resto. */
export function PrezzoProva({ prezzo }: { prezzo: number }) {
  const c = useColori()
  const garanzie = [
    t('7 giorni, dal giorno che scegli', '7 days, from the day you choose'),
    t('Nessun rinnovo automatico', 'No automatic renewal'),
    t('Alla fine decidi tu', 'At the end, you decide'),
  ]
  return (
    <View style={stili.hero}>
      <LinearGradient colors={['#2C180D', CARBONE]} start={{ x: 1, y: 0 }} end={{ x: 0.25, y: 0.8 }} style={StyleSheet.absoluteFill} />
      <Image source={require('@/../assets/images/pittogramma.png')} style={stili.marchio} contentFit="contain" />
      <Text style={[stili.sopra, { color: c.accento }]}>{t('GUEST PASS PREMIUM · SENZA IMPEGNO', 'PREMIUM GUEST PASS · NO COMMITMENT')}</Text>
      <View style={stili.rigaPrezzo} accessible accessibilityLabel={t(`${prezzo} euro, una volta sola`, `${prezzo} euros, one time only`)}>
        <Text style={[stili.numero, { color: c.accento }]} accessibilityElementsHidden importantForAccessibility="no">
          {prezzo}
        </Text>
        <View style={stili.latoPrezzo} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={[stili.euro, { color: c.accento }]}>€</Text>
          <Text style={stili.notaPrezzo}>{t('una volta sola', 'one time only')}</Text>
        </View>
      </View>
      <Text style={stili.testoHero}>
        {t(
          'Corsi, sale e vasche: tutto il club per una settimana. Non è un abbonamento e non si rinnova: se alla fine non vuoi continuare, non devi disdire niente.',
          'Classes, gym floor and pools: the whole club for a week. It’s not a membership and it doesn’t renew: if you don’t want to continue at the end, you don’t need to cancel anything.',
        )}
      </Text>
      <View style={stili.garanzie}>
        {garanzie.map((g) => (
          <View key={g} style={stili.garanzia}>
            <Text style={[stili.spunta, { color: c.accento }]}>✓</Text>
            <Text style={stili.testoGaranzia}>{g}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function Freccia({ aperta, colore }: { aperta: boolean; colore: string }) {
  return (
    <View style={{ transform: [{ rotate: aperta ? '180deg' : '0deg' }] }}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M6 9l6 6 6-6" stroke={colore} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

function Riga({ a, aperta, primo, onToggle }: { a: AttivitaProva; aperta: boolean; primo: boolean; onToggle: () => void }) {
  const c = useColori()
  return (
    <View style={!primo ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.bordo } : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: aperta }}
        accessibilityLabel={`${a.nome}. ${a.breve}`}
        accessibilityHint={aperta ? t('Chiudi i dettagli', 'Close the details') : t('Mostra cosa comprende', 'Show what it includes')}
        onPress={onToggle}
        style={({ pressed }) => [stili.testaRiga, { backgroundColor: pressed ? tinta(c.accento, 0.08) : aperta ? tinta(c.accento, 0.05) : 'transparent' }]}
      >
        <View style={[stili.icona, { backgroundColor: tinta(c.accento, aperta ? 0.26 : 0.14) }]}>
          <Glifo chiave={a.chiave} colore={c.accento} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.nome, { color: c.testo }]}>{a.nome}</Text>
          <Text style={[stili.breve, { color: c.testoSecondario }]}>{a.breve}</Text>
        </View>
        <Freccia aperta={aperta} colore={aperta ? c.accento : c.testoSecondario} />
      </Pressable>
      {aperta ? (
        <Appare>
          <View style={stili.corpoRiga}>
            <Text style={[stili.dettaglio, { color: c.testo }]}>{a.dettaglio}</Text>
            <Text accessibilityRole="link" style={[stili.link, { color: c.accento }]} onPress={() => apriAccanto(a.url)}>
              {t('Scopri di più sul sito ↗', 'Learn more on the website ↗')}
            </Text>
          </View>
        </Appare>
      ) : null}
    </View>
  )
}

/**
 * «Cosa comprende»: le attivita' del Pass a fisarmonica. `ridotta` (chi ha gia' confermato i suoi dati e sta solo finendo)
 * la tiene chiusa dietro un comando, per non spingere il resto della pagina sotto la piega.
 */
export function AttivitaComprese({ ridotta = false }: { ridotta?: boolean }) {
  const c = useColori()
  const [aperta, setAperta] = useState<string | null>(null)
  const [mostra, setMostra] = useState(!ridotta)

  return (
    <View style={{ gap: spazio.due, marginTop: spazio.due }}>
      <Text style={[stili.sopra, { color: c.accento }]}>{t('COSA COMPRENDE', 'WHAT’S INCLUDED')}</Text>
      <Text style={[stili.titolo, { color: c.testo }]} accessibilityRole="header">
        {t('Tutto il club, per una settimana.', 'The whole club, for a week.')}
      </Text>
      <Text style={[stili.sotto, { color: c.testoSecondario }]}>
        {t(
          'Il Guest Pass apre le attività dell’abbonamento Premium, il più ampio: per 7 giorni entri in tutto quello che c’è qui sotto e scegli ogni giorno cosa fare. Athlon TV, gli allenamenti on demand, è compresa.',
          'The Guest Pass opens the activities of the Premium membership, the broadest one: for 7 days you get into everything below and choose each day what to do. Athlon TV, the on-demand workouts, is included.',
        )}
      </Text>

      {mostra ? (
        <>
          <Text style={[stili.suggerimento, { color: c.testoSecondario }]}>{t('Tocca un’attività per vedere cosa c’è dentro', 'Tap an activity to see what’s inside')}</Text>
          <View style={[stili.lista, { borderColor: c.bordo, backgroundColor: c.superficie }]}>
            {ATTIVITA_PROVA.map((a, i) => (
              <Riga key={a.chiave} a={a} primo={i === 0} aperta={aperta === a.chiave} onToggle={() => setAperta((x) => (x === a.chiave ? null : a.chiave))} />
            ))}
          </View>
        </>
      ) : (
        <Text accessibilityRole="button" style={[stili.link, { color: c.accento }]} onPress={() => setMostra(true)}>
          {t('Vedi cosa comprende ↓', 'See what’s included ↓')}
        </Text>
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  hero: { borderRadius: 22, padding: spazio.quattro, gap: spazio.tre, overflow: 'hidden', backgroundColor: CARBONE },
  marchio: { position: 'absolute', right: -30, top: 56, width: 170, height: 138, opacity: 0.12 },
  sopra: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  rigaPrezzo: { flexDirection: 'row', alignItems: 'flex-end', gap: spazio.due },
  numero: { fontSize: 92, lineHeight: 92, fontWeight: '800', letterSpacing: -2 },
  latoPrezzo: { paddingBottom: 12, gap: 2 },
  euro: { fontSize: 30, lineHeight: 30, fontWeight: '800' },
  notaPrezzo: { fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  testoHero: { fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.86)' },
  garanzie: { gap: spazio.due },
  garanzia: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  spunta: { fontSize: 15, fontWeight: '800', width: 18 },
  testoGaranzia: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  titolo: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  sotto: { fontSize: 15, lineHeight: 22 },
  suggerimento: { fontSize: 12, marginTop: spazio.uno },
  lista: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  testaRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingHorizontal: spazio.tre, paddingVertical: 14, minHeight: 64 },
  icona: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nome: { fontSize: 16, fontWeight: '700' },
  breve: { fontSize: 13, lineHeight: 18 },
  corpoRiga: { paddingLeft: spazio.tre + 40 + spazio.tre, paddingRight: spazio.tre, paddingBottom: spazio.tre, gap: spazio.due + 2 },
  dettaglio: { fontSize: 14, lineHeight: 21 },
  link: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
})
