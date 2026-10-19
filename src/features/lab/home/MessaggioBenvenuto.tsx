import { LinearGradient } from 'expo-linear-gradient'
import { router, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { messaggioToccato, type DestinazioneBenvenuto, type MessaggioBenvenuto as MessaggioDato } from '@/api/benvenuto'
import { spazio } from '@/theme'
import { vistaCorrente } from '../vista'

import { Icona } from '../ui/Icona'
import { Entra, Pulsante, Scheletro } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import type { SezioneHome } from './sezioni'
import { useMessaggioBenvenuto } from './useMessaggioBenvenuto'

// Il messaggio di benvenuto (20/10/2026), subito sotto la testata della Home: un messaggio personale, scritto dall'AI a ogni
// ritorno nell'app, che spinge il socio verso il suo prossimo passo (attivare la prova, scegliere un abbonamento, dare seguito agli
// allenamenti, ricominciare). Il passo lo decide il server dai dati del mirror; qui si mostrano il testo e il pulsante che arrivano.
//
// - **Non e' una carta**: e' testo direttamente sulla Home, senza riquadro, senza ombra e senza una X per chiuderlo (richiesta del
//   club, 19/10/2026: una parte della Home, non un avviso che si scarta). Per questo non si puo' nascondere: resta fino al prossimo
//   ritorno, quando ne arriva uno nuovo.
// - **Mentre arriva** c'e' lo scheletro (le stesse righe, senza riquadro), che sull'apertura dell'app si confonde con l'avvio
//   animato; se la funzione non risponde (o non c'e' ancora) non compare niente: nessun vuoto e nessun errore per una cosa che nessuno
//   ha chiesto.
// - **L'etichetta e' sempre «PER TE»**, senza dire chi ha scritto il messaggio (richiesta del club, 19/10/2026): l'AI scrive solo le
//   parole di un passo che decide il codice, e quando non risponde il server ripiega su testi scritti a mano. `origine` arriva comunque
//   dalla funzione (e si registra), ma qui non si mostra.
// - **In vista cliente dello staff non c'e'**: chi guarda l'app di un socio non genera messaggi a suo nome.
// - Il pulsante porta dove dice la destinazione: la prova e l'abbonamento sono le schermate che gia' esistono, il calendario e
//   l'allenamento le sue schede, e i pagamenti la sezione della Home (`onSezione`).

const INDIRIZZI: Record<Exclude<DestinazioneBenvenuto, 'pagamenti'>, Href> = {
  prova: '/richiesta/guest-pass',
  abbonamento: '/abbonamento',
  calendario: '/calendario',
  allenamento: '/allenamento',
}

export function MessaggioBenvenuto({ email, onSezione }: { email: string; onSezione: (s: SezioneHome) => void }) {
  const inVista = vistaCorrente() !== null
  const { stato } = useMessaggioBenvenuto(!inVista, email)
  if (inVista || stato.fase === 'niente') return null
  if (stato.fase === 'carico') return <Attesa />
  return <TestoMessaggio m={stato.messaggio} onSezione={onSezione} />
}

function Attesa() {
  return (
    <Entra indice={1}>
      <View accessibilityLabel="Sto scrivendo il tuo messaggio" accessibilityRole="progressbar" style={[stili.blocco, { gap: spazio.tre }]}>
        <View style={stili.testata}>
          <Scheletro altezza={30} larghezza={30} tondo={11} />
          <Scheletro altezza={12} larghezza={70} />
        </View>
        <Scheletro altezza={22} larghezza="62%" />
        <View style={{ gap: spazio.due }}>
          <Scheletro altezza={14} />
          <Scheletro altezza={14} larghezza="82%" />
        </View>
      </View>
    </Entra>
  )
}

function TestoMessaggio({ m, onSezione }: { m: MessaggioDato; onSezione: (s: SezioneHome) => void }) {
  const p = usePalette()
  const azione = m.azione

  function vai() {
    if (!azione) return
    messaggioToccato(m.id)
    if (azione.destinazione === 'pagamenti') onSezione('pagamenti')
    else router.navigate(INDIRIZZI[azione.destinazione])
  }

  return (
    <Entra indice={1}>
      <View style={[stili.blocco, { gap: spazio.tre }]}>
        <View style={stili.testata}>
          <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.bollino}>
            <Icona nome="stella" size={16} colore="#fff" />
          </LinearGradient>
          <Text style={[stili.etichetta, { color: p.testoTerzo }]} numberOfLines={1}>
            PER TE
          </Text>
        </View>
        {/* Il testo arriva con una dissolvenza: sull'apertura dell'app lo scheletro si trasforma, non salta. */}
        <Animated.View key={m.id || m.titolo} entering={FadeIn.duration(380)} style={{ gap: spazio.due, maxWidth: 640 }}>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {m.titolo}
          </Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>{m.testo}</Text>
        </Animated.View>
        {/* Sullo schermo largo il pulsante non si stira su tutta la riga. */}
        {azione ? (
          <View style={{ maxWidth: 420 }}>
            <Pulsante testo={azione.etichetta} icona="avanti" onPress={vai} />
          </View>
        ) : null}
      </View>
    </Entra>
  )
}

const stili = StyleSheet.create({
  // Nessuno sfondo, bordo od ombra: e' testo sulla Home. Il margine allinea il testo a quello dentro la testata scura.
  blocco: { paddingHorizontal: spazio.due, paddingVertical: spazio.due },
  testata: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2 },
  bollino: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.1, flexShrink: 1 },
  titolo: { fontFamily: F.extra, fontSize: 24, lineHeight: 29, letterSpacing: -0.6 },
  testo: { fontFamily: F.medio, fontSize: 16, lineHeight: 24 },
})
