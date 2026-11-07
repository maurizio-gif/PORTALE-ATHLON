import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { chiediCodice, entra } from '@/api/lab'
import { emailValida } from '@/api/richieste'
import { registrazioneAperta } from '@/api/registrazione'
import { PRIVACY_URL } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { rilasciaEntrata, trattieniEntrata } from './entrata'
import { CampoCodice, CampoTesto, CIFRE, IncollaCodice } from './ui/Campi'
import type { StatoCodice } from './ui/CodicePacman'
import { Icona } from './ui/Icona'
import { Installa } from './ui/Installa'
import { Bollino, Carta, Messaggio, Pulsante } from './ui/kit'
import { useRiduciMovimento } from './ui/movimento'
import { SceltaLingua } from './ui/SceltaLingua'
import { Realizzata } from './ui/Realizzata'
import { SceltaTema } from './ui/SceltaTema'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, NOTTE, usePalette, velo } from './ui/tema'
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


/** La testata scura, con il bagliore arancio e gli anelli che allargano il marchio. Anche per «Completa il profilo» (`ingresso/`). */
export function Testata({ fase, titolo, sotto, senzaSotto = false }: { fase: 'email' | 'codice' | 'profilo'; /** Al posto del titolo e del sottotitolo della fase (le schermate che fermano «Completa il profilo»). */ titolo?: string; sotto?: string; /** Niente sottotitolo (07/11/2026): all'email, con la registrazione aperta, la stessa frase sta gia' nella carta e il pulsante deve restare sopra la fine della prima schermata. */ senzaSotto?: boolean }) {
  const ins = useSafeAreaInsets()
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[stili.testata, { paddingTop: ins.top + spazio.cinque }, senzaSotto && stili.testataBassa]}>
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
          {titolo ? titolo : fase === 'email' ? t('Il tuo club,\nsempre con te', 'Your club,\nalways with you') : fase === 'codice' ? t('Controlla\nla posta', 'Check\nyour email') : t('Ancora\nun attimo', 'Just one\nmore step')}
          <Text style={{ color: FUOCO[1] }}>.</Text>
        </Text>
        {senzaSotto && !sotto ? null : (
          <Text style={stili.sotto}>
            {sotto ? sotto : fase === 'email'
              ? t('Prenotazioni, workout, abbonamenti e pagamenti in un posto solo. Entri con la tua email, senza password.', 'Bookings, workouts, memberships and payments all in one place. Sign in with your email, no password.')
              : fase === 'codice'
                ? t(`Ti abbiamo mandato un codice di ${CIFRE} cifre: scrivilo o incollalo qui sotto.`, `We sent you a ${CIFRE}-digit code: type or paste it below.`)
                : t('Ci servono pochi dati per completare il tuo profilo, poi sei dentro.', 'We just need a few details to complete your profile, then you’re in.')}
          </Text>
        )}
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

/** L'ultima risposta di «la registrazione e' aperta?»: si parte da questa (di partenza si', e' aperta) e la risposta del server la corregge, cosi' la pagina non cambia faccia ogni volta che si apre. */
let registrazioneNota = true

export function Accesso() {
  const p = usePalette()
  const [email, setEmail] = useState('')
  const [codice, setCodice] = useState('')
  const [fase, setFase] = useState<'email' | 'codice'>('email')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  // Il codice in verifica (07/11/2026): Pacman mangia le caselle mentre si aspetta il server, poi la spunta (`ui/CodicePacman.tsx`).
  const [stato, setStato] = useState<StatoCodice>('scrivi')
  const animato = !useRiduciMovimento()
  const campoEmail = useRef<TextInput>(null)
  // Se la pagina si smonta mentre trattiene l'entrata, la lascia andare (comunque si scioglie da sola: `entrata.ts`).
  useEffect(() => () => rilasciaEntrata(), [])
  // Registrazione aperta (interruttore sul server, 01/11/2026): la pagina diventa «Accedi o registrati», un percorso solo e un pulsante solo
  // («Continua», 07/11/2026, proposta A scelta da Maurizio). Chiusa, e' l'accesso di prima.
  const [registrazione, setRegistrazione] = useState(registrazioneNota)
  useEffect(() => {
    let vivo = true
    registrazioneAperta().then((a) => {
      registrazioneNota = a
      if (vivo) setRegistrazione(a)
    })
    return () => {
      vivo = false
    }
  }, [])

  async function mandaCodice() {
    setErrore(null)
    // Il pulsante sta sotto il campo, ma sul telefono la tastiera e lo scorrimento possono portarlo via: col cursore nel campo l'errore si vede sempre.
    if (!emailValida(email)) {
      campoEmail.current?.focus()
      return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
    }
    setAttesa(true)
    const esito = await chiediCodice(email.trim().toLowerCase())
    setAttesa(false)
    if (!esito.ok) return setErrore(esito.errore)
    colpetto('ok')
    setCodice('')
    setFase('codice')
  }

  // «Ho già un codice»: chi ha già il codice (per esempio quello dell'email di conferma della delega) lo scrive senza chiederne un altro,
  // che sostituirebbe quello che ha in mano.
  function haGiaUnCodice() {
    setErrore(null)
    if (!emailValida(email)) {
      campoEmail.current?.focus()
      return setErrore(t('Scrivi prima l’indirizzo email a cui è arrivato il codice.', 'First enter the email address the code was sent to.'))
    }
    setCodice('')
    setFase('codice')
  }

  async function verifica(scritto = codice) {
    if (attesa || stato === 'ok') return
    setErrore(null)
    if (scritto.replace(/\D/g, '').length < CIFRE) return setErrore(t(`Il codice ha ${CIFRE} cifre.`, `The code has ${CIFRE} digits.`))
    setAttesa(true)
    setStato('verifica')
    // Si trattiene la sessione PRIMA di chiedere: Supabase la apre dentro `verifyOtp`, e senza trattenerla la pagina sparirebbe prima della spunta.
    // «Riduci movimento»: niente animazione, niente attesa in piu'.
    if (animato) trattieniEntrata()
    const esito = await entra(email.trim().toLowerCase(), scritto)
    if (!esito.ok) {
      rilasciaEntrata()
      setStato('scrivi')
      setAttesa(false)
      colpetto('errore')
      return setErrore(esito.errore)
    }
    if (!animato) {
      setStato('scrivi')
      setAttesa(false)
      return
    }
    // Il «si'»: Pacman finisce la corsa, si disegna la spunta e `onFinita` (CampoCodice) lascia entrare. `attesa` resta vera: il pulsante non
    // si puo' toccare un'altra volta (il codice e' monouso). Si riarma il limite di tempo del trattenimento.
    trattieniEntrata()
    setStato('ok')
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
    <Schermata titolo={t('Accesso', 'Sign in')} nascondiTitolo barra={false} sopra={<Testata fase={fase} senzaSotto={registrazione && fase === 'email'} />}>
      <Carta style={stili.modulo}>
        {/* La lingua, in vista sia all'email sia al codice (lib/lingua.ts): di partenza e' l'italiano. Una riga sola, discreta: ogni voce e' scritta nella sua lingua, quindi niente etichetta.
            Il tema (02/11/2026, richiesta di Maurizio: «troppo impattante e crea confusione») non sta piu' qui: e' in fondo alla pagina, dopo l'informativa privacy. */}
        <View style={{ marginBottom: spazio.tre }}>
          <SceltaLingua centrata compatta />
        </View>
        <Animated.View key={fase} entering={FadeInRight.duration(320)} style={{ gap: spazio.tre + 4 }}>
          <Passi fase={fase} />
          {fase === 'email' ? (
            <>
              {registrazione ? (
                // Una porta sola (07/11/2026): la pagina non sa se l'email e' gia' iscritta (e non deve dirlo), quindi non promette ne' «entri» ne' «ti registri».
                <View style={{ gap: 6 }}>
                  <Text style={[stili.cartaTitolo, { color: p.testo }]} accessibilityRole="header">{t('Accedi o registrati', 'Sign in or sign up')}</Text>
                  <Text style={[stili.nota, { color: p.testoSecondario, fontSize: 14 }]}>
                    {t('Scrivi la tua email. Se sei già iscritto entri, se sei nuovo ti creiamo il profilo: stesso percorso, ', 'Enter your email. If you’re already a member you’re in, if you’re new we’ll create your profile: same path, ')}
                    <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('niente password', 'no password')}</Text>.
                  </Text>
                </View>
              ) : null}
              <CampoTesto
                ref={campoEmail}
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
              <Pulsante testo={registrazione ? t('Continua', 'Continue') : t('Mandami il codice', 'Send me the code')} icona="avanti" onPress={mandaCodice} inCorso={attesa} />
              <Pulsante testo={t('Ho già un codice', 'I already have a code')} variante="fantasma" piccolo onPress={haGiaUnCodice} disabilitato={attesa} />
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t('Usa l’email con cui sei iscritto al club: è da lì che troviamo', 'Use the email you registered with at the club: that’s how we find')}{' '}
                <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('i tuoi abbonamenti e la tua famiglia', 'your memberships and your family')}</Text>.
              </Text>
              {registrazione ? (
                // I motivi per registrarsi (02/11/2026, richiesta di Maurizio: oggi si fa quasi tutto sul sito, l'obiettivo e' portare l'utente a fare le cose nell'app).
                // Dal 07/11/2026 non e' piu' un riquadro con un secondo pulsante «Registrati» in fondo alla pagina (a ~800 px dal campo: l'errore restava fuori vista):
                // il pulsante e' uno e sta sotto l'email, e qui sotto c'e' solo il perche'. Voci vere: sono quelle che l'app fa oggi. La prova e' una riga sola, senza prezzo
                // ne' dettagli (chi non ha diritto alla prova lo scopre quando prova ad attivarla; il prezzo e' `PREZZO_PROVA` di `lib/guestPass`).
                <>
                  <View style={[stili.filo, { backgroundColor: p.linea }]} />
                  <View style={{ gap: spazio.tre }}>
                    <Text style={[stili.etichettaBlocco, { color: p.testoSecondario }]}>{t('REGISTRARSI CONVIENE', 'WHY SIGN UP')}</Text>
                    <View style={{ gap: 10 }}>
                      {(
                        [
                          ['calendario', t('Prenoti lezioni e corsi in un tocco', 'Book classes and courses in one tap')],
                          ['fulmine', t('Ti alleni con piani pensati per te', 'Train with plans made for you')],
                          ['carta', t('Abbonamento e pagamenti sempre con te', 'Your membership and payments, always with you')],
                        ] as const
                      ).map(([icona, voce]) => (
                        <View key={voce} style={stili.vantaggio}>
                          <Bollino icona={icona} tono="accento" size={32} />
                          <Text style={[stili.vantaggioTesto, { color: p.testo }]}>{voce}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[stili.prova, { backgroundColor: velo(p, 'accento', 0.1), borderColor: velo(p, 'accento', 0.4) }]}>
                      <Bollino icona="regalo" tono="accento" size={32} pieno />
                      <Text style={[stili.vantaggioTesto, { color: p.testo, fontFamily: F.extra, fontSize: 14.5 }]}>{t('Prova il club per una settimana', 'Try the club for a week')}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[stili.nota, { color: p.testoSecondario, fontSize: 14.5 }]}>
                {t('Se', 'If')} <Text style={{ fontFamily: F.bold, color: p.testo }}>{email.trim()}</Text>{' '}
                {t(`è l’email con cui sei iscritto, ti abbiamo mandato un codice di ${CIFRE} cifre.`, `is the email you registered with, we’ve sent you a ${CIFRE}-digit code.`)}
              </Text>
              <CampoCodice value={codice} onChange={cambiaCodice} onInvio={() => verifica()} errore={!!errore} stato={stato} onFinita={rilasciaEntrata} />
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
            // Con la registrazione aperta «per i soci del club» era falso: si registra chiunque (07/11/2026).
            ['tessera', registrazione ? t('Ti registri in un minuto', 'Sign up in a minute') : t('Per i soci del club', 'For club members')],
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
      {/* Il tema (02/11/2026, richiesta di Maurizio): in fondo, discreto e non subito sotto gli occhi. Automatico, Chiaro e Scuro come nel Profilo, in pillole piccole. */}
      <View style={stili.tema}>
        <Text style={{ color: p.testoTerzo, fontSize: 12, fontFamily: F.semi }}>{t('Tema', 'Theme')}</Text>
        <SceltaTema compatta />
      </View>
      <Realizzata />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  // Senza sottotitolo la testata e' piu' bassa anche sotto (07/11/2026): la carta resta agganciata (margine -64) e il modulo sale, cosi' il pulsante si vede senza scorrere.
  testataBassa: { paddingBottom: 64 },
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
  cartaTitolo: { fontSize: 23, lineHeight: 28, fontFamily: F.extra, letterSpacing: -0.6 },
  filo: { height: 1 },
  etichettaBlocco: { fontSize: 11, fontFamily: F.extra, letterSpacing: 1.3 },
  vantaggio: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  vantaggioTesto: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.semi },
  prova: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  garanzie: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spazio.tre, marginTop: -spazio.due },
  garanzia: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tema: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: spazio.due },
})
