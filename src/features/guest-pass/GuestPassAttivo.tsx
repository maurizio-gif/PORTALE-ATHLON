import { router } from 'expo-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { chiediResetPassword } from '@/api/guestPass'
import { APP_ATHLON_URL, ATTIVITA_GUEST_PASS, LINK_CONFERMA } from '@/lib/guestPass'
import { locale, t, tv } from '@/lib/lingua'
import { spazio, tinta, useColori, type Tono } from '@/theme'

// La pagina finale del Guest Pass (14/10/2026): il testo della lettera di
// conferma che il club mandava a mano, diviso in blocchi che entrano uno dopo
// l'altro. I link vanno alle pagine vere del sito: le attività, la prenotazione
// di una telefonata e la guida alle prenotazioni.

const NATIVO = Platform.OS !== 'web'

/** Un blocco che entra dal basso, sfalsato sul precedente. */
function Entra({ indice, children }: { indice: number; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: 120 + indice * 110, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVO }).start()
  }, [v, indice])
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      {children}
    </Animated.View>
  )
}

/** Il segno di spunta che si gonfia: la prima cosa che si vede. */
function Spunta() {
  const c = useColori()
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 5, tension: 70, useNativeDriver: NATIVO }).start()
  }, [v])
  return (
    <Animated.View
      style={[stili.spunta, { backgroundColor: c.ok, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={stili.spuntaSegno}>✓</Text>
    </Animated.View>
  )
}

function Scheda({ titolo, children }: { titolo: string; children: ReactNode }) {
  const c = useColori()
  return (
    <View style={[stili.scheda, { borderColor: c.bordo, backgroundColor: c.superficie }]}>
      <Text style={[stili.schedaTitolo, { color: c.testo }]}>{titolo}</Text>
      {children}
    </View>
  )
}

function Pillola({ testo, url }: { testo: string; url: string }) {
  const c = useColori()
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [stili.pillola, { borderColor: tinta(c.accento, 0.45), backgroundColor: tinta(c.accento, pressed ? 0.18 : 0.08) }]}
    >
      <Text style={[stili.pillolaTesto, { color: c.testo }]}>{testo}</Text>
    </Pressable>
  )
}

/** «sabato 17 ottobre 2026». */
function conAnno(g: string): string {
  return new Date(g + 'T12:00:00Z').toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Come si entra nell'app (14/10/2026). Chi ha creato l'account in questa
 * procedura ha appena scelto la password, e basta ricordargli quali sono le
 * credenziali. Chi era gia' Guest o Member la password ce l'ha da prima: se non
 * la ricorda ne richiede il reset da qui, e solo premendo il pulsante — niente
 * parte da se'. Usa la stessa funzione del sito.
 */
function Accesso({ email, nuovoAccount }: { email: string | null; nuovoAccount: boolean }) {
  const [reset, setReset] = useState<'no' | 'invio' | 'inviata' | 'errore'>('no')
  async function chiedi() {
    if (!email) return
    setReset('invio')
    setReset((await chiediResetPassword(email)) ? 'inviata' : 'errore')
  }
  return (
    <Scheda titolo={t('Entra nell’app', 'Sign in to the app')}>
      <Testo>
        {tv(
          <>
            Scarica l’app <Forte>Athlon Club</Forte> e accedi con la tua email{email ? <> (<Forte>{email}</Forte>)</> : null} come ID
            {nuovoAccount ? <> e la <Forte>password che hai scelto</Forte>.</> : <> e la password che usi già.</>}
          </>,
          <>
            Download the <Forte>Athlon Club</Forte> app and sign in with your email{email ? <> (<Forte>{email}</Forte>)</> : null} as your ID
            {nuovoAccount ? <> and the <Forte>password you chose</Forte>.</> : <> and the password you already use.</>}
          </>,
        )}
      </Testo>
      <Bottone testo={t('Scarica l’app Athlon Club', 'Download the Athlon Club app')} onPress={() => Linking.openURL(APP_ATHLON_URL)} />
      {!nuovoAccount && email ? (
        reset === 'inviata' ? (
          <Avviso tono="ok">{t(`Ti abbiamo mandato a ${email} il link per scegliere una nuova password. Controlla anche lo spam.`, `We sent ${email} a link to choose a new password. Check your spam folder too.`)}</Avviso>
        ) : (
          <>
            <Testo variante="attenuato">{t('Non ricordi la password? Puoi richiederne il reset: premi il pulsante e ti mandiamo per email il link per sceglierne una nuova.', 'Forgot your password? You can reset it: press the button and we’ll email you a link to choose a new one.')}</Testo>
            <Bottone testo={t('Richiedi il reset della password', 'Reset my password')} variante="contorno" onPress={chiedi} inCorso={reset === 'invio'} />
            {reset === 'errore' ? <Avviso tono="attenzione">{t('Non siamo riusciti a mandare il link adesso. Riprova fra qualche minuto.', 'We couldn’t send the link right now. Try again in a few minutes.')}</Avviso> : null}
          </>
        )
      ) : null}
    </Scheda>
  )
}

/**
 * Chi ha fatto la procedura da dentro l'app (29/10/2026) ha gia' l'accesso: niente «scarica l'app» ne' reset della password,
 * ma il Guest Pass che e' gia' sul suo account e la strada per prenotare.
 */
function GiaNellApp({ figlio }: { figlio: { nome: string | null; primo: string | null } | null }) {
  return (
    <Scheda titolo={t('Il Guest Pass è già nella tua app', 'The Guest Pass is already in your app')}>
      <Testo>
        {figlio
          ? t(
              `Sei già dentro l’app Athlon Club: il Guest Pass di ${figlio.primo ?? 'tuo figlio'} è sul tuo account e le sue lezioni le prenoti da qui, scegliendolo fra le persone della tua famiglia.`,
              `You’re already in the Athlon Club app: ${figlio.primo ? `${figlio.primo}’s` : 'your child’s'} Guest Pass is on your account and you book their classes from here, choosing them among your family members.`,
            )
          : t(
              'Sei già dentro l’app Athlon Club: il Guest Pass è sul tuo account, non devi fare altro per entrare. Da qui prenoti le lezioni.',
              'You’re already in the Athlon Club app: the Guest Pass is on your account, there’s nothing else to do to get in. You book your classes from here.',
            )}
      </Testo>
      <Bottone testo={t('Vai alla Home', 'Go to Home')} onPress={() => router.replace('/')} />
      <Bottone testo={t('Prenota una lezione', 'Book a class')} variante="contorno" onPress={() => router.navigate('/calendario')} />
    </Scheda>
  )
}

export function GuestPassAttivo({
  email,
  nuovoAccount,
  nome,
  cognome,
  inizio,
  fine,
  prezzo,
  addebito,
  avviso,
  figlio = null,
  dopo = null,
  dallApp = false,
}: {
  email: string | null
  /** L'account e' nato in questa procedura: la password l'ha appena scelta. */
  nuovoAccount: boolean
  nome: string | null
  cognome: string | null
  inizio: string | null
  fine: string | null
  prezzo: number
  /** Pagato con addebito su conto: i soldi arrivano dopo, e lo si dice. */
  addebito: boolean
  avviso: { testo: string; tono: Tono } | null
  /**
   * Il Guest Pass e' di un figlio (21/10/2026): `nome` e `cognome` sono del genitore, che ha pagato ed entra nell'app;
   * il figlio non ha un accesso suo, e le sue lezioni le prenota il genitore.
   */
  figlio?: { nome: string | null; primo: string | null } | null
  /** In fondo, prima del saluto: «Attiva un altro Guest Pass». */
  dopo?: ReactNode
  /** La procedura e' stata fatta da dentro l'app, con la sessione di chi la sta leggendo. */
  dallApp?: boolean
}) {
  const c = useColori()
  const chi = `${nome ?? ''} ${cognome ?? ''}`.trim()
  const diChi = figlio ? `il Guest Pass di ${figlio.primo ?? figlio.nome ?? 'tuo figlio'}` : 'il tuo Guest Pass'
  let i = 0
  return (
    <Pagina
      titolo={figlio ? t(`Il Guest Pass di ${figlio.primo ?? 'tuo figlio'} è attivo`, `${figlio.primo ? `${figlio.primo}’s` : 'Your child’s'} Guest Pass is active`) : t('Il tuo Guest Pass è attivo', 'Your Guest Pass is active')}
      sottotitolo={tv(
        chi ? `${chi}, siamo lieti di confermarti l’attivazione del${diChi.slice(2)}.` : `Siamo lieti di confermarti l’attivazione del${diChi.slice(2)}.`,
        `${chi ? `${chi}, we’re` : 'We’re'} happy to confirm that ${figlio ? `${figlio.primo ?? figlio.nome ?? 'your child'}’s Guest Pass` : 'your Guest Pass'} is now active.`,
      )}
    >
      <View style={stili.testa}>
        <Spunta />
        <View style={{ flex: 1 }}>
          <Text style={[stili.prodotto, { color: c.testo }]}>{t(`Guest Pass 1 settimana · ${prezzo} €`, `Guest Pass 1 week · ${prezzo} €`)}</Text>
          {inizio && fine ? (
            <Text style={[stili.periodo, { color: c.testoSecondario }]}>
              {t(`Valido da ${conAnno(inizio)} a ${conAnno(fine)}`, `Valid from ${conAnno(inizio)} to ${conAnno(fine)}`)}
            </Text>
          ) : null}
        </View>
      </View>

      {avviso ? (
        <Entra indice={i++}>
          <Avviso tono={avviso.tono}>{avviso.testo}</Avviso>
        </Entra>
      ) : null}
      {addebito ? (
        <Entra indice={i++}>
          <Testo variante="attenuato">{t(`I ${prezzo} € saranno addebitati sul conto che hai indicato.`, `The ${prezzo} € will be charged to the bank account you entered.`)}</Testo>
        </Entra>
      ) : null}

      <Entra indice={i++}>{dallApp ? <GiaNellApp figlio={figlio} /> : <Accesso email={email} nuovoAccount={nuovoAccount} />}</Entra>

      {figlio ? (
        <Entra indice={i++}>
          <Scheda titolo={t(`Le lezioni di ${figlio.primo ?? 'tuo figlio'}`, `${figlio.primo ? `${figlio.primo}’s` : 'Your child’s'} classes`)}>
            <Testo>
              {tv(
                <>
                  {figlio.primo ?? 'Tuo figlio'} non ha un accesso suo: le sue lezioni le prenoti tu, dall’app Athlon Club, scegliendo{' '}
                  <Forte>{figlio.primo ?? 'tuo figlio'}</Forte> fra le persone della tua famiglia.
                </>,
                <>
                  {figlio.primo ?? 'Your child'} doesn’t have their own sign-in: you book their classes in the Athlon Club app, choosing{' '}
                  <Forte>{figlio.primo ?? 'your child'}</Forte> among your family members.
                </>,
              )}
            </Testo>
          </Scheda>
        </Entra>
      ) : null}

      <Entra indice={i++}>
        <Scheda titolo={t('Cosa comprende', 'What’s included')}>
          <Testo>
            {tv(
              <>
                Hai accesso a <Forte>tutte le attività del Club</Forte>, in palestra, in piscina e online, e a tutti i vantaggi
                dell’app <Forte>Athlon Club</Forte> per allenarti senza limiti.
              </>,
              <>
                You have access to <Forte>all the Club’s activities</Forte>, in the gym, in the pool and online, and to all the perks of
                the <Forte>Athlon Club</Forte> app to train without limits.
              </>,
            )}
          </Testo>
          <View style={stili.pillole}>
            {ATTIVITA_GUEST_PASS.map((a) => (
              <Pillola key={a.nome} testo={a.nome} url={a.url} />
            ))}
          </View>
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo={t('Il primo accesso', 'Your first visit')}>
          <Testo>
            {figlio ? (
              tv(
                <>
                  Per entrare al Club il <Forte>badge</Forte> va abbinato all’anagrafica di {figlio.primo ?? 'tuo figlio'}: lo ritira
                  al desk al suo primo accesso.
                </>,
                <>
                  To enter the Club, the <Forte>access card</Forte> must be linked to {figlio.primo ? `${figlio.primo}’s` : 'your child’s'} profile: they pick it up
                  at the front desk on their first visit.
                </>,
              )
            ) : (
              tv(
                <>
                  Per entrare al Club il <Forte>badge</Forte> va abbinato alla tua anagrafica: lo ritiri al desk al tuo primo
                  accesso.
                </>,
                <>
                  To enter the Club, the <Forte>access card</Forte> must be linked to your profile: pick it up at the front desk on your first
                  visit.
                </>,
              )
            )}
          </Testo>
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo={t('Prenota le attività', 'Book your activities')}>
          <Testo>
            {tv(
              <>
                Tutte le attività in presenza <Forte>si prenotano</Forte>, dal tuo account nell’app Athlon Club: la
                prenotazione si apre 3 giorni prima. Hai dubbi o richieste? Siamo a disposizione.
              </>,
              <>
                All in-person activities <Forte>must be booked</Forte>, from your account in the Athlon Club app: booking opens 3 days
                before. Any questions or requests? We’re here to help.
              </>,
            )}
          </Testo>
          <Bottone testo={t('Come si prenota', 'How to book')} variante="contorno" onPress={() => Linking.openURL(LINK_CONFERMA.prenotazioni)} />
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo={t('Hai un dubbio?', 'Any questions?')}>
          <Testo>{t('Fissa un appuntamento telefonico con il nostro team: ti richiamiamo noi nel giorno e all’ora che scegli.', 'Book a phone call with our team: we’ll call you back on the day and at the time you choose.')}</Testo>
          <Bottone testo={t('Prenota una chiamata', 'Book a call')} onPress={() => Linking.openURL(LINK_CONFERMA.chiamata)} />
        </Scheda>
      </Entra>

      {dopo ? <Entra indice={i++}>{dopo}</Entra> : null}

      <Entra indice={i++}>
        <Text style={[stili.saluto, { color: c.testo }]}>{t('Ti auguriamo un buon allenamento!', 'Enjoy your workout!')}</Text>
      </Entra>
    </Pagina>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  spunta: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  spuntaSegno: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', lineHeight: 32 },
  prodotto: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  periodo: { fontSize: 15, lineHeight: 21, marginTop: 2 },
  scheda: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.tre },
  schedaTitolo: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  pillola: { borderWidth: 1, borderRadius: 999, paddingVertical: spazio.due, paddingHorizontal: spazio.tre, minHeight: 40, justifyContent: 'center' },
  pillolaTesto: { fontSize: 14, fontWeight: '600' },
  saluto: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: spazio.due },
})
