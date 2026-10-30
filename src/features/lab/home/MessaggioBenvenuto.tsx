import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { messaggioToccato, type DestinazioneBenvenuto, type MessaggioBenvenuto as MessaggioDato } from '@/api/benvenuto'
import { PREZZO_PROVA } from '@/lib/guestPass'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'
import { vistaCorrente } from '../vista'

import { Icona } from '../ui/Icona'
import { Carta, Entra, Pulsante, Scheletro } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import type { SezioneHome } from './sezioni'
import { useMessaggioBenvenuto } from './useMessaggioBenvenuto'

// Il messaggio di benvenuto (20/10/2026), subito sotto la testata della Home: un messaggio personale, scritto dall'AI a ogni
// ritorno nell'app, che spinge il socio verso il suo prossimo passo (attivare la prova, scegliere un abbonamento, dare seguito agli
// allenamenti, ricominciare). Il passo lo decide il server dai dati del mirror; qui si mostrano il testo e il pulsante che arrivano.
//
// - **Mentre arriva** c'e' lo scheletro, che sull'apertura dell'app si confonde con l'avvio animato; se la funzione non risponde (o
//   non c'e' ancora) la carta non compare: nessun riquadro vuoto e nessun errore per una cosa che nessuno ha chiesto.
// - **L'etichetta e' sempre «PER TE»**, senza dire chi ha scritto il messaggio (richiesta del club, 19/10/2026): l'AI scrive solo le
//   parole di un passo che decide il codice, e quando non risponde il server ripiega su testi scritti a mano. `origine` arriva comunque
//   dalla funzione (e si registra), ma qui non si mostra.
// - **Si puo' nascondere** (la X): resta nascosto fino al prossimo ritorno, quando ne arriva uno nuovo.
// - **In vista cliente dello staff non c'e'**: chi guarda l'app di un socio non genera messaggi a suo nome.
// - Il pulsante porta dove dice la destinazione: la prova e l'abbonamento sono le schermate che gia' esistono, il calendario e
//   l'allenamento le sue schede, i consigli la loro schermata, `salute` il collegamento di Apple Salute (29/10/2026) e i pagamenti la
//   sezione della Home (`onSezione`).

const INDIRIZZI: Record<Exclude<DestinazioneBenvenuto, 'pagamenti'>, Href> = {
  prova: '/richiesta/guest-pass',
  abbonamento: '/abbonamento',
  calendario: '/calendario',
  allenamento: '/allenamento',
  consigli: '/allenamento/consigli',
  // Apple Salute: la schermata dei dispositivi apre da sola il foglio di Apple (dopo il consenso, se manca): `?attiva=apple`.
  salute: { pathname: '/allenamento/dispositivi', params: { attiva: 'apple' } },
}

export function MessaggioBenvenuto({ email, onSezione }: { email: string; onSezione: (s: SezioneHome) => void }) {
  const inVista = vistaCorrente() !== null
  const { stato, nascondi } = useMessaggioBenvenuto(!inVista, email)
  if (inVista || stato.fase === 'niente') return null
  if (stato.fase === 'carico') return <Attesa />
  return <CartaMessaggio m={stato.messaggio} onSezione={onSezione} onNascondi={nascondi} />
}

function Attesa() {
  return (
    <Entra indice={1}>
      <Carta style={{ gap: spazio.tre }} piatta>
        <View accessibilityLabel={t('Sto scrivendo il tuo messaggio', 'Writing your message')} accessibilityRole="progressbar" style={{ gap: spazio.tre }}>
          <View style={stili.testata}>
            <Scheletro altezza={36} larghezza={36} tondo={13} />
            <Scheletro altezza={12} larghezza={90} />
          </View>
          <Scheletro altezza={20} larghezza="62%" />
          <View style={{ gap: spazio.due }}>
            <Scheletro altezza={14} />
            <Scheletro altezza={14} larghezza="82%" />
          </View>
        </View>
      </Carta>
    </Entra>
  )
}

function CartaMessaggio({ m, onSezione, onNascondi }: { m: MessaggioDato; onSezione: (s: SezioneHome) => void; onNascondi: () => void }) {
  const p = usePalette()
  const azione = m.azione

  function vai() {
    if (!azione) return
    messaggioToccato(m.id)
    if (azione.destinazione === 'pagamenti') onSezione('pagamenti')
    else router.navigate(INDIRIZZI[azione.destinazione])
  }

  // La prova e' l'invito che conta di piu' (30/10/2026, richiesta di Maurizio): una carta tutta sua, con il prezzo in vista.
  if (azione?.destinazione === 'prova') return <CartaProva m={m} onVai={vai} onNascondi={onNascondi} />

  return (
    <Entra indice={1}>
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testata}>
          <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.bollino}>
            <Icona nome="stella" size={18} colore="#fff" />
          </LinearGradient>
          <Text style={[stili.etichetta, { color: p.testoTerzo }]} numberOfLines={1}>
            {t('PER TE', 'FOR YOU')}
          </Text>
          <View style={{ flex: 1 }} />
          <Tocco onPress={onNascondi} etichetta={t('Nascondi il messaggio', 'Hide the message')} scala={0.9} vibra={null}>
            <View style={stili.chiudi}>
              <Icona nome="chiudi" size={15} colore={p.testoTerzo} />
            </View>
          </Tocco>
        </View>
        {/* Il testo arriva con una dissolvenza: sull'apertura dell'app lo scheletro si trasforma, non salta. */}
        <Animated.View key={m.id || m.titolo} entering={FadeIn.duration(380)} style={{ gap: spazio.due }}>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {m.titolo}
          </Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{m.testo}</Text>
        </Animated.View>
        {azione ? <Pulsante testo={azione.etichetta} icona="avanti" onPress={vai} /> : null}
      </Carta>
    </Entra>
  )
}

/**
 * L'invito alla prova (30/10/2026): carta scura con l'arancio che sale da un angolo, il marchio in filigrana, «Prova tutto il club per
 * una settimana» in grande, e «19 €» come l'argomento. Il titolo e il prezzo sono fissi e scritti qui: il testo che arriva dal server
 * (l'AI, o quello di riserva) resta il corpo, piu' pesante di prima, e continua a non nominare soldi: lo garantisce il controllo del
 * server, che qui non e' cambiato. Scura in tutti e due i temi, come le altre schede «carbone».
 */
function CartaProva({ m, onVai, onNascondi }: { m: MessaggioDato; onVai: () => void; onNascondi: () => void }) {
  return (
    <Entra indice={1}>
      <View style={stili.prova}>
        <LinearGradient colors={['#4A210A', '#1E1411', '#121316']} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.9 }} style={StyleSheet.absoluteFill} />
        <Image source={require('@/../assets/images/pittogramma.png')} style={stili.proveMarchio} contentFit="contain" />
        <View style={stili.testata}>
          <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.bollino}>
            <Icona nome="stella" size={18} colore="#fff" />
          </LinearGradient>
          <Text style={stili.proveEtichetta} numberOfLines={1}>
            {t('GUEST PASS · PER TE', 'GUEST PASS · FOR YOU')}
          </Text>
          <View style={{ flex: 1 }} />
          <Tocco onPress={onNascondi} etichetta={t('Nascondi il messaggio', 'Hide the message')} scala={0.9} vibra={null}>
            <View style={stili.chiudi}>
              <Icona nome="chiudi" size={15} colore="rgba(255,255,255,0.6)" />
            </View>
          </Tocco>
        </View>

        <Text style={stili.proveTitolo} accessibilityRole="header">
          {t('Prova tutto il club per una settimana', 'Try the whole club for a week')}
        </Text>

        <View style={stili.provePrezzo} accessible accessibilityLabel={t(`${PREZZO_PROVA} euro, una volta sola, senza rinnovo`, `${PREZZO_PROVA} euros, one time only, no renewal`)}>
          <Text style={stili.proveNumero} accessibilityElementsHidden importantForAccessibility="no">
            {PREZZO_PROVA}
          </Text>
          <View style={{ paddingBottom: 12, gap: 2 }} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={stili.proveEuro}>€</Text>
            <Text style={stili.proveNota}>{t('una volta sola · senza rinnovo', 'one time only · no renewal')}</Text>
          </View>
        </View>

        <Animated.View key={m.id || m.titolo} entering={FadeIn.duration(380)}>
          <Text style={stili.proveTesto}>{m.testo}</Text>
        </Animated.View>

        {m.azione ? <Pulsante testo={m.azione.etichetta} icona="avanti" onPress={onVai} /> : null}
      </View>
    </Entra>
  )
}

const stili = StyleSheet.create({
  prova: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,138,43,0.4)',
    padding: spazio.tre + 4,
    gap: spazio.tre,
    overflow: 'hidden',
    backgroundColor: '#121316',
    boxShadow: '0 16px 40px rgba(255,87,1,0.22)',
  },
  proveMarchio: { position: 'absolute', right: -34, top: 96, width: 190, height: 154, opacity: 0.12 },
  proveEtichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.3, color: '#FF8A2B', flexShrink: 1 },
  proveTitolo: { fontFamily: F.extra, fontSize: 29, lineHeight: 33, letterSpacing: -0.8, color: '#FFFFFF' },
  provePrezzo: { flexDirection: 'row', alignItems: 'flex-end', gap: spazio.due },
  proveNumero: { fontFamily: F.extra, fontSize: 84, lineHeight: 84, letterSpacing: -3, color: '#FF6A1F' },
  proveEuro: { fontFamily: F.extra, fontSize: 30, lineHeight: 30, color: '#FF6A1F' },
  proveNota: { fontFamily: F.bold, fontSize: 12.5, color: 'rgba(255,255,255,0.75)' },
  proveTesto: { fontFamily: F.bold, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.92)' },

  testata: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2 },
  bollino: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1, flexShrink: 1 },
  chiudi: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  titolo: { fontFamily: F.extra, fontSize: 21, lineHeight: 26, letterSpacing: -0.5 },
  testo: { fontFamily: F.medio, fontSize: 15.5, lineHeight: 23 },
})
