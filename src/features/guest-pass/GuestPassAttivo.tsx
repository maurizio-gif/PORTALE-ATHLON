import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { chiediResetPassword } from '@/api/guestPass'
import { APP_ATHLON_URL, ATTIVITA_GUEST_PASS, LINK_CONFERMA } from '@/lib/guestPass'
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
  return new Date(g + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
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
    <Scheda titolo="Entra nell’app">
      <Testo>
        Scarica l’app <Forte>Athlon Club</Forte> e accedi con la tua email{email ? <> (<Forte>{email}</Forte>)</> : null} come ID
        {nuovoAccount ? <> e la <Forte>password che hai scelto</Forte>.</> : <> e la password che usi già.</>}
      </Testo>
      <Bottone testo="Scarica l’app Athlon Club" onPress={() => Linking.openURL(APP_ATHLON_URL)} />
      {!nuovoAccount && email ? (
        reset === 'inviata' ? (
          <Avviso tono="ok">{`Ti abbiamo mandato a ${email} il link per scegliere una nuova password. Controlla anche lo spam.`}</Avviso>
        ) : (
          <>
            <Testo variante="attenuato">Non ricordi la password? Puoi richiederne il reset: premi il pulsante e ti mandiamo per email il link per sceglierne una nuova.</Testo>
            <Bottone testo="Richiedi il reset della password" variante="contorno" onPress={chiedi} inCorso={reset === 'invio'} />
            {reset === 'errore' ? <Avviso tono="attenzione">Non siamo riusciti a mandare il link adesso. Riprova fra qualche minuto.</Avviso> : null}
          </>
        )
      ) : null}
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
}) {
  const c = useColori()
  const chi = `${nome ?? ''} ${cognome ?? ''}`.trim()
  let i = 0
  return (
    <Pagina legale titolo="Il tuo Guest Pass è attivo" sottotitolo={chi ? `${chi}, siamo lieti di confermarti l’attivazione del tuo Guest Pass.` : 'Siamo lieti di confermarti l’attivazione del tuo Guest Pass.'}>
      <View style={stili.testa}>
        <Spunta />
        <View style={{ flex: 1 }}>
          <Text style={[stili.prodotto, { color: c.testo }]}>Guest Pass 1 settimana · {prezzo} €</Text>
          {inizio && fine ? (
            <Text style={[stili.periodo, { color: c.testoSecondario }]}>
              Valido da {conAnno(inizio)} a {conAnno(fine)}
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
          <Testo variante="attenuato">I {prezzo} € saranno addebitati sul conto che hai indicato.</Testo>
        </Entra>
      ) : null}

      <Entra indice={i++}>
        <Accesso email={email} nuovoAccount={nuovoAccount} />
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo="Cosa comprende">
          <Testo>
            Hai accesso a <Forte>tutte le attività del Club</Forte>, in palestra, in piscina e online, e a tutti i vantaggi
            dell’app <Forte>Athlon Club</Forte> per allenarti senza limiti.
          </Testo>
          <View style={stili.pillole}>
            {ATTIVITA_GUEST_PASS.map((a) => (
              <Pillola key={a.nome} testo={a.nome} url={a.url} />
            ))}
          </View>
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo="Il primo accesso">
          <Testo>
            Per entrare al Club il <Forte>badge</Forte> va abbinato alla tua anagrafica: lo ritiri al desk al tuo primo
            accesso.
          </Testo>
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo="Prenota le attività">
          <Testo>
            Tutte le attività in presenza <Forte>si prenotano</Forte>, dal tuo account nell’app Athlon Club: la
            prenotazione si apre 3 giorni prima. Hai dubbi o richieste? Siamo a disposizione.
          </Testo>
          <Bottone testo="Come si prenota" variante="contorno" onPress={() => Linking.openURL(LINK_CONFERMA.prenotazioni)} />
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Scheda titolo="Hai un dubbio?">
          <Testo>Fissa un appuntamento telefonico con il nostro team: ti richiamiamo noi nel giorno e all’ora che scegli.</Testo>
          <Bottone testo="Prenota una chiamata" onPress={() => Linking.openURL(LINK_CONFERMA.chiamata)} />
        </Scheda>
      </Entra>

      <Entra indice={i++}>
        <Text style={[stili.saluto, { color: c.testo }]}>Ti auguriamo un buon allenamento!</Text>
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
