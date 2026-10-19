import { LinearGradient } from 'expo-linear-gradient'
import { router, type Href } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { messaggioToccato, ultimoMessaggio, type DestinazioneBenvenuto, type MessaggioBenvenuto as MessaggioDato } from '@/api/benvenuto'
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
// - **In vista cliente dello staff si legge l'ultimo che il socio ha ricevuto** (`ultimoMessaggio`), con la data e una riga che dice che e'
//   una lettura: lo staff vede quello che il socio ha visto, o che non ne ha ancora ricevuti, ma non ne scrive uno a suo nome e il
//   pulsante non segna nessun tocco.
// - Il pulsante porta dove dice la destinazione: la prova e l'abbonamento sono le schermate che gia' esistono, il calendario e
//   l'allenamento le sue schede, e i pagamenti la sezione della Home (`onSezione`).

const INDIRIZZI: Record<Exclude<DestinazioneBenvenuto, 'pagamenti'>, Href> = {
  prova: '/richiesta/guest-pass',
  abbonamento: '/abbonamento',
  calendario: '/calendario',
  allenamento: '/allenamento',
}

export function MessaggioBenvenuto({ email, onSezione }: { email: string; onSezione: (s: SezioneHome) => void }) {
  return vistaCorrente() !== null ? <MessaggioInVista email={email} onSezione={onSezione} /> : <MessaggioDelSocio email={email} onSezione={onSezione} />
}

/** Il socio nella sua app: il messaggio di questo ritorno. */
function MessaggioDelSocio({ email, onSezione }: { email: string; onSezione: (s: SezioneHome) => void }) {
  const { stato } = useMessaggioBenvenuto(true, email)
  if (stato.fase === 'niente') return null
  if (stato.fase === 'carico') return <Attesa />
  return <TestoMessaggio m={stato.messaggio} onSezione={onSezione} />
}

/** Lo staff in vista cliente: l'ultimo messaggio che il socio ha ricevuto, letto e non scritto. Un errore e la carta non c'e', come per il socio. */
function MessaggioInVista({ email, onSezione }: { email: string; onSezione: (s: SezioneHome) => void }) {
  const p = usePalette()
  const [stato, setStato] = useState<{ fase: 'carico' } | { fase: 'niente' } | { fase: 'pronto'; messaggio: MessaggioDato | null }>({ fase: 'carico' })
  useEffect(() => {
    let vivo = true
    setStato({ fase: 'carico' })
    ultimoMessaggio().then((r) => {
      if (vivo) setStato(r.ok ? { fase: 'pronto', messaggio: r.messaggio } : { fase: 'niente' })
    })
    return () => {
      vivo = false
    }
  }, [email])

  if (stato.fase === 'niente') return null
  if (stato.fase === 'carico') return <Attesa />
  if (!stato.messaggio) {
    return (
      <View style={stili.blocco}>
        <Text style={[stili.nota, { color: p.testoTerzo }]}>Questo socio non ha ancora ricevuto un messaggio di benvenuto.</Text>
      </View>
    )
  }
  return <TestoMessaggio m={stato.messaggio} onSezione={onSezione} inVista />
}

/** «19 ott, 08:20», all'ora di Roma. */
function quando(iso: string | null): string {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : ''
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

function TestoMessaggio({ m, onSezione, inVista = false }: { m: MessaggioDato; onSezione: (s: SezioneHome) => void; inVista?: boolean }) {
  const p = usePalette()
  const azione = m.azione

  function vai() {
    if (!azione) return
    // In vista cliente il tocco non e' del socio: non si segna.
    if (!inVista) messaggioToccato(m.id)
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
        {inVista ? (
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            {`Ultimo messaggio ricevuto dal socio${m.il ? `, il ${quando(m.il)}` : ''}. In vista cliente non se ne scrivono di nuovi.`}
          </Text>
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
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
})
