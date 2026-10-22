import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { chiediCodice, entra } from '@/api/lab'
import { emailValida } from '@/api/richieste'
import { PRIVACY_URL } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { CampoCodice, CampoTesto, CIFRE, IncollaCodice } from './ui/Campi'
import { Icona } from './ui/Icona'
import { Installa } from './ui/Installa'
import { Carta, Messaggio, Pulsante } from './ui/kit'
import { SceltaLingua } from './ui/SceltaLingua'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// L'accesso all'area riservata di Athlon Club:
// email, poi il codice di otto cifre che arriva per email (lo genera Supabase
// Auth, e sono otto: vedi CIFRE in ui/Campi). Nessuna password. Il codice
// completo parte da solo, scritto, incollato o suggerito dalla tastiera.
// Chi non e' fra i tester non riceve niente, ma la
// pagina dice la stessa cosa a tutti: non deve diventare il modo di sapere chi
// lo e'.
// In fondo il link all'informativa privacy del club (20/10/2026): all'accesso si da' solo l'email, per farti
// entrare, e non e' un consenso (nessuna casella): i consensi veri (alimentazione, sonno e dispositivi, misure del
// corpo) si chiedono dove serve, la prima volta che si usa quella funzione.


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
          <Icona nome="tessera" size={13} colore={FUOCO[0]} />
          <Text style={stili.chipTesto}>{t('LA TUA AREA ATHLON CLUB', 'YOUR ATHLON CLUB AREA')}</Text>
        </View>
        <Text style={stili.titolo} accessibilityRole="header">
          {fase === 'email' ? t('Il tuo club,\nsempre con te', 'Your club,\nalways with you') : t('Controlla\nla posta', 'Check\nyour email')}
          <Text style={{ color: FUOCO[1] }}>.</Text>
        </Text>
        <Text style={stili.sotto}>
          {fase === 'email'
            ? t('Prenotazioni, workout, abbonamenti e pagamenti in un posto solo. Entri con la tua email, senza password.', 'Bookings, workouts, memberships and payments all in one place. Sign in with your email, no password.')
            : t(`Ti abbiamo mandato un codice di ${CIFRE} cifre: scrivilo o incollalo qui sotto.`, `We sent you a ${CIFRE}-digit code: type or paste it below.`)}
        </Text>
      </View>
    </LinearGradient>
  )
}

/** I due passi, come due trattini: quello fatto e quello in corso. */
function Passi({ fase }: { fase: 'email' | 'codice' }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLabel={fase === 'email' ? t('Passo 1 di 2', 'Step 1 of 2') : t('Passo 2 di 2', 'Step 2 of 2')}>
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
    if (!emailValida(email)) return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
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
    if (scritto.replace(/\D/g, '').length < CIFRE) return setErrore(t(`Il codice ha ${CIFRE} cifre.`, `The code has ${CIFRE} digits.`))
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

  // Il codice che arriva da «Incolla il codice» (ui/Campi): si scrive nelle caselle e
  // si entra subito, anche se e' uguale a quello di un tentativo sbagliato.
  function usaCodice(c: string) {
    setCodice(c)
    verifica(c)
  }

  return (
    <Schermata titolo={t('Accesso', 'Sign in')} nascondiTitolo barra={false} sopra={<Testata fase={fase} />}>
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
                placeholder={t('nome@esempio.it', 'name@example.com')}
                errore={!!errore}
              />
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={t('Mandami il codice', 'Send me the code')} icona="avanti" onPress={mandaCodice} inCorso={attesa} />
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t('Usa l’email con cui sei iscritto al club: è da lì che troviamo', 'Use the email you registered with at the club: that’s how we find')}{' '}
                <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('i tuoi abbonamenti e la tua famiglia', 'your memberships and your family')}</Text>.
              </Text>
            </>
          ) : (
            <>
              <Text style={[stili.nota, { color: p.testoSecondario, fontSize: 14.5 }]}>
                {t('Se', 'If')} <Text style={{ fontFamily: F.bold, color: p.testo }}>{email.trim()}</Text>{' '}
                {t(`è l’email con cui sei iscritto, ti abbiamo mandato un codice di ${CIFRE} cifre.`, `is the email you registered with, we’ve sent you a ${CIFRE}-digit code.`)}
              </Text>
              <CampoCodice value={codice} onChange={cambiaCodice} onInvio={() => verifica()} errore={!!errore} />
              <IncollaCodice onCodice={usaCodice} disabilitato={attesa} />
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={t('Entra', 'Sign in')} icona="avanti" onPress={() => verifica()} inCorso={attesa} />
              <Pulsante testo={t('Usa un’altra email o chiedi un nuovo codice', 'Use another email or request a new code')} variante="fantasma" piccolo onPress={() => setFase('email')} disabilitato={attesa} />
              <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'center' }]}>{t('Il codice vale un’ora. Non trovi l’email? Guarda nella posta indesiderata.', 'The code is valid for one hour. Can’t find the email? Check your spam folder.')}</Text>
            </>
          )}
        </Animated.View>
      </Carta>
      {/* Su iPhone l'app installata ha un accesso suo: meglio installarla prima di entrare. */}
      {fase === 'email' ? <Installa dopoAccesso /> : null}
      <View style={stili.garanzie}>
        {(
          [
            ['lucchetto', t('Niente password', 'No password')],
            ['scudo', t('Accesso sicuro', 'Secure sign-in')],
            ['tessera', t('Per i soci del club', 'For club members')],
          ] as const
        ).map(([icona, testo]) => (
          <View key={testo} style={stili.garanzia}>
            <Icona nome={icona} size={16} colore={p.testoTerzo} />
            <Text style={{ color: p.testoTerzo, fontSize: 12, fontFamily: F.semi }}>{testo}</Text>
          </View>
        ))}
      </View>
      <Tocco onPress={() => Linking.openURL(PRIVACY_URL)} ruolo="link" etichetta={t('Informativa privacy del club', 'Club privacy notice')} vibra={null} scala={0.99} style={{ alignSelf: 'center' }}>
        <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'center', fontSize: 12.5 }]}>
          {t('Come trattiamo i tuoi dati:', 'How we handle your data:')}{' '}
          <Text style={{ fontFamily: F.bold, color: p.accento, textDecorationLine: 'underline' }}>{t('informativa privacy', 'privacy notice')}</Text>
        </Text>
      </Tocco>
      {/* La lingua, anche prima di entrare (lib/lingua.ts). */}
      <SceltaLingua centrata />
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
