import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { chiediCodice, entra } from '@/api/lab'
import { emailValida } from '@/api/richieste'
import { spazio } from '@/theme'

import { CampoCodice, CampoTesto, CIFRE } from './ui/Campi'
import { Icona } from './ui/Icona'
import { Installa } from './ui/Installa'
import { Carta, Messaggio, Pulsante } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from './ui/tema'
import { colpetto } from './ui/Tocco'

// L'accesso al laboratorio, cioe' alla nuova app di Athlon Club in prova:
// email, poi il codice di otto cifre che arriva per email (lo genera Supabase
// Auth, e sono otto: vedi CIFRE in ui/Campi). Nessuna password. Il codice
// completo parte da solo, scritto, incollato o suggerito dalla tastiera.
// Chi non e' fra i tester non riceve niente, ma la
// pagina dice la stessa cosa a tutti: non deve diventare il modo di sapere chi
// lo e'.


/** La testata scura, con il bagliore arancio e gli anelli che allargano il marchio. */
function Testata({ fase }: { fase: 'email' | 'codice' }) {
  const ins = useSafeAreaInsets()
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[stili.testata, { paddingTop: ins.top + spazio.cinque }]}>
      <View style={stili.bagliore} />
      {[300, 460, 620].map((d, i) => (
        <View key={d} style={[stili.anello, { width: d, height: d, borderRadius: d / 2, right: -d / 2.4, top: -d / 3.2, opacity: 0.32 - i * 0.09 }]} />
      ))}
      <View style={stili.testataColonna}>
        {/* Il marchio arancio pieno su bianco: tintColor non vale sul web, e bianco su arancio diventava arancio su arancio. */}
        <View style={stili.logo} accessibilityLabel="Athlon Club" accessibilityRole="image">
          <Image source={require('@/../assets/images/pittogramma.png')} style={{ width: 40, height: 32 }} contentFit="contain" />
        </View>
        <View style={stili.chip}>
          <Icona nome="laboratorio" size={13} colore={FUOCO[0]} />
          <Text style={stili.chipTesto}>LA NUOVA APP ATHLON CLUB · IN TEST</Text>
        </View>
        <Text style={stili.titolo} accessibilityRole="header">
          {fase === 'email' ? 'Il club, prima\ndi tutti' : 'Controlla\nla posta'}
          <Text style={{ color: FUOCO[1] }}>.</Text>
        </Text>
        <Text style={stili.sotto}>
          {fase === 'email'
            ? 'Questa è la nuova app di Athlon Club, ancora in fase di test: la provano per primi alcuni soci, prima che arrivi a tutti. Entri con la tua email, senza password.'
            : `Ti abbiamo mandato un codice di ${CIFRE} cifre: scrivilo o incollalo qui sotto.`}
        </Text>
      </View>
    </LinearGradient>
  )
}

/** I due passi, come due trattini: quello fatto e quello in corso. */
function Passi({ fase }: { fase: 'email' | 'codice' }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLabel={fase === 'email' ? 'Passo 1 di 2' : 'Passo 2 di 2'}>
      <View style={[stili.passo, { width: 28, backgroundColor: p.accento }]} />
      <View style={[stili.passo, { width: fase === 'codice' ? 28 : 12, backgroundColor: fase === 'codice' ? p.accento : p.incavo }]} />
      <Text style={{ color: p.testoTerzo, fontSize: 12, fontFamily: F.extra, marginLeft: 4 }}>{fase === 'email' ? '1 / 2' : '2 / 2'}</Text>
    </View>
  )
}

export function Accesso() {
  const p = usePalette()
  const [email, setEmail] = useState('')
  const [codice, setCodice] = useState('')
  const [fase, setFase] = useState<'email' | 'codice'>('email')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function mandaCodice() {
    setErrore(null)
    if (!emailValida(email)) return setErrore('Scrivi un indirizzo email valido.')
    setAttesa(true)
    const esito = await chiediCodice(email.trim().toLowerCase())
    setAttesa(false)
    if (!esito.ok) return setErrore(esito.errore)
    colpetto('ok')
    setCodice('')
    setFase('codice')
  }

  async function verifica(scritto = codice) {
    if (attesa) return
    setErrore(null)
    if (scritto.replace(/\D/g, '').length < CIFRE) return setErrore(`Il codice ha ${CIFRE} cifre.`)
    setAttesa(true)
    const esito = await entra(email.trim().toLowerCase(), scritto)
    setAttesa(false)
    if (!esito.ok) {
      colpetto('errore')
      setErrore(esito.errore)
    }
    // Se e' andata, la sessione cambia e la pagina passa da sola all'area.
  }

  // Appena il codice e' completo si entra: chi lo incolla o lo prende dai
  // suggerimenti della tastiera non deve anche cercare il pulsante.
  function cambiaCodice(v: string) {
    setCodice(v)
    if (v.length === CIFRE && v !== codice) verifica(v)
  }

  // Sul web: «Incolla il codice» legge gli appunti (Safari chiede conferma
  // con la sua bolla «Incolla»). Nell'app la tastiera lo propone gia' da sola.
  const puoIncollare = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
  async function incolla() {
    setErrore(null)
    try {
      const cifre = (await navigator.clipboard.readText()).replace(/\D/g, '').slice(0, 10)
      if (cifre.length < CIFRE) return setErrore(`Negli appunti non c’è un codice di ${CIFRE} cifre: copialo dall’email e riprova.`)
      cambiaCodice(cifre)
    } catch {
      setErrore('Non riusciamo a leggere gli appunti: tieni premuto sulle caselle e scegli «Incolla».')
    }
  }

  return (
    <Schermata titolo="Laboratorio" nascondiTitolo barra={false} sopra={<Testata fase={fase} />}>
      <Carta style={stili.modulo}>
        <Animated.View key={fase} entering={FadeInRight.duration(320)} style={{ gap: spazio.tre + 4 }}>
          <Passi fase={fase} />
          {fase === 'email' ? (
            <>
              <CampoTesto
                etichetta="Email"
                icona="email"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={mandaCodice}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                inputMode="email"
                keyboardType="email-address"
                placeholder="nome@esempio.it"
                errore={!!errore}
              />
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo="Mandami il codice" icona="avanti" onPress={mandaCodice} inCorso={attesa} />
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                Usa l’email con cui sei iscritto al club: è da lì che il laboratorio trova{' '}
                <Text style={{ fontFamily: F.bold, color: p.testo }}>i tuoi abbonamenti e la tua famiglia</Text>.
              </Text>
            </>
          ) : (
            <>
              <Text style={[stili.nota, { color: p.testoSecondario, fontSize: 14.5 }]}>
                Se <Text style={{ fontFamily: F.bold, color: p.testo }}>{email.trim()}</Text> è fra i tester, ti abbiamo mandato un codice di {CIFRE} cifre.
              </Text>
              <CampoCodice value={codice} onChange={cambiaCodice} onInvio={() => verifica()} errore={!!errore} />
              {puoIncollare ? <Pulsante testo="Incolla il codice" icona="documento" variante="secondario" piccolo onPress={incolla} disabilitato={attesa} /> : null}
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo="Entra" icona="avanti" onPress={() => verifica()} inCorso={attesa} />
              <Pulsante testo="Usa un’altra email o chiedi un nuovo codice" variante="fantasma" piccolo onPress={() => setFase('email')} disabilitato={attesa} />
              <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'center' }]}>Il codice vale un’ora. Non trovi l’email? Guarda nella posta indesiderata.</Text>
            </>
          )}
        </Animated.View>
      </Carta>
      {/* Su iPhone l'app installata ha un accesso suo: meglio installarla prima di entrare. */}
      {fase === 'email' ? <Installa dopoAccesso /> : null}
      <View style={stili.garanzie}>
        {(
          [
            ['lucchetto', 'Niente password'],
            ['scudo', 'Solo per i tester'],
            ['laboratorio', 'Funzioni in prova'],
          ] as const
        ).map(([icona, testo]) => (
          <View key={testo} style={stili.garanzia}>
            <Icona nome={icona} size={16} colore={p.testoTerzo} />
            <Text style={{ color: p.testoTerzo, fontSize: 12, fontFamily: F.semi }}>{testo}</Text>
          </View>
        ))}
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testata: { paddingBottom: 100, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' },
  bagliore: { position: 'absolute', width: 380, height: 380, borderRadius: 190, right: -120, top: -140, backgroundColor: '#FF5701', opacity: 0.35, filter: 'blur(60px)' } as object,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipTesto: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontFamily: F.extra, letterSpacing: 1.4 },
  testataColonna: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spazio.quattro, gap: spazio.due + 2 },
  anello: { position: 'absolute', borderWidth: 1.5, borderColor: '#FF8A2B' },
  logo: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spazio.due, backgroundColor: '#fff', boxShadow: '0 12px 34px rgba(255,87,1,0.55)' },
  titolo: { color: '#fff', fontSize: 42, lineHeight: 46, fontFamily: F.extra, letterSpacing: -1.6, marginTop: spazio.uno },
  sotto: { color: 'rgba(255,255,255,0.7)', fontSize: 15.5, lineHeight: 23, maxWidth: 420, fontFamily: F.medio },
  modulo: { marginTop: -64, padding: spazio.quattro - 2 },
  passo: { height: 6, borderRadius: 3 },
  nota: { fontSize: 13.5, lineHeight: 20, fontFamily: F.medio },
  garanzie: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spazio.tre, marginTop: -spazio.due },
  garanzia: { flexDirection: 'row', alignItems: 'center', gap: 5 },
})
