import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInRight } from 'react-native-reanimated'

import { esci } from '@/api/lab'
import { completaProfilo, inviaCodiceSms, verificaCodiceSms, type CampoIngresso, type StatoIngresso } from '@/api/registrazione'
import { Casella } from '@/components/Casella'
import { CampoData } from '@/components/CampoData'
import { CampoTelefono } from '@/components/CampoTelefono'
import { maggiorenne } from '@/features/delega/regole'
import { PRIVACY_URL } from '@/lib/guestPass'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Testata } from '../Accesso'
import { CampoTesto } from '../ui/Campi'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'

// «Completa il profilo» (01/11/2026): dopo l'email e il codice, a chi e' nuovo o ha la scheda senza data di nascita si chiede quello che manca, e poi
// e' dentro. Lo stesso percorso sul web e nelle app degli store (niente link per email).
//
// **La data di nascita sempre, e per prima**: un minorenne non lascia nessun altro dato, e `portale-registrazione` non salva niente di lui. I 13-17
// anni entrano dall'account del genitore (Famiglia), non da qui. Se la scheda ha gia' la data non si chiede: restano solo i campi che mancano.
// **Il consenso privacy** (presa visione dell'informativa) si chiede solo dove si crea la scheda, nella stessa schermata dei dati.

// **I dati che il club ha gia' per questa email** (05/11/2026: il pannello del sito davanti al listino, un modulo) arrivano gia' scritti: la persona li
// conferma, e scrive solo la data di nascita. Restano modificabili.
//
// **Gia' dei nostri con un altro indirizzo** (`somiglianza`): la funzione non crea un doppione.
// **Di regola e' un indirizzo sbagliato** (10/11/2026, Maurizio): la funzione manda gli indirizzi che ci risultano **in parte nascosti** (`emailNote`), la schermata
// dice «ci risulta gia' un account a tuo nome con questa email» e il pulsante porta a entrare con quello. La segreteria non e' coinvolta. Solo «Non lo riconosco o non
// lo uso piu'» rimanda i dati con `segnala`: allora vale la strada di prima, il messaggio della funzione («colleghiamo noi») e, se la funzione lo offre, il codice via SMS.
// **Con il codice via SMS** (05/11/2026, `portale-registrazione` azioni `sms_invia` e `sms_verifica`, quando la funzione lo offre con `sms.finale`):
// la persona chiede un codice al cellulare della scheda trovata (vede solo le ultime due cifre), lo scrive, e il suo indirizzo e' collegato alla scheda:
// e' dentro, senza aspettare la segreteria. «Il numero non è più mio» torna al messaggio di sempre.

export function CompletaProfilo({
  campi: iniziali,
  precompila,
  segreteria: daSegreteria = false,
  onFatto,
}: {
  campi: CampoIngresso[]
  precompila?: StatoIngresso['precompila']
  /** Con questa email ci sono solo schede di minorenni: non si completa da qui. */
  segreteria?: boolean
  onFatto: () => void
}) {
  const p = usePalette()
  const [campi, setCampi] = useState<CampoIngresso[]>(iniziali)
  const [passo, setPasso] = useState<'nascita' | 'resto'>(iniziali.includes('nascita') ? 'nascita' : 'resto')
  const [d, setD] = useState({ nascita: '', nome: precompila?.nome ?? '', cognome: precompila?.cognome ?? '', telefono: precompila?.telefono ?? '' })
  const [privacy, setPrivacy] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [minorenne, setMinorenne] = useState(false)
  const [segreteria, setSegreteria] = useState(daSegreteria)
  /** Il messaggio della funzione quando la persona e' gia' del club con un altro indirizzo. */
  const [giaNostro, setGiaNostro] = useState<string | null>(null)
  /** Le ultime due cifre del cellulare della scheda, se la funzione offre il codice via SMS. */
  const [smsFinale, setSmsFinale] = useState<string | null>(null)
  /** Gli indirizzi che ci risultano per questa persona, in parte nascosti. */
  const [emailNote, setEmailNote] = useState<string[] | null>(null)

  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const resto = campi.filter((c) => c !== 'nascita')
  const serveConsenso = campi.includes('nome')
  const cambia = (k: keyof typeof d) => (v: string) => setD((x) => ({ ...x, [k]: v }))

  async function invia(segnala = false) {
    setErrore(null)
    if (campi.includes('nome') && !d.nome.trim()) return setErrore(t('Scrivi il nome.', 'Enter your first name.'))
    if (campi.includes('cognome') && !d.cognome.trim()) return setErrore(t('Scrivi il cognome.', 'Enter your last name.'))
    if (campi.includes('telefono') && d.telefono.replace(/\D/g, '').length < 8) return setErrore(t('Controlla il numero di cellulare.', 'Check your mobile number.'))
    if (serveConsenso && !privacy) return setErrore(t('Per continuare serve la presa visione dell’informativa privacy.', 'To continue you need to acknowledge the privacy notice.'))
    setAttesa(true)
    // Solo i dati chiesti: gli altri non servono e non si mandano.
    const dati: Parameters<typeof completaProfilo>[0] = { privacy }
    for (const k of campi) dati[k] = k === 'nome' || k === 'cognome' ? d[k].trim() : d[k]
    if (segnala) dati.segnala = true
    const r = await completaProfilo(dati)
    setAttesa(false)
    if (r.ok) {
      colpetto('ok')
      return onFatto()
    }
    colpetto('errore')
    if (r.minorenne) return setMinorenne(true)
    if (r.somiglianza) {
      setEmailNote(segnala ? null : (r.emailNote ?? null))
      setSmsFinale(r.sms?.finale ?? null)
      return setGiaNostro(r.errore)
    }
    if (r.verifica) return setSegreteria(true)
    if (r.serve) {
      // La funzione dice che ora servono altri dati (la scheda e' cambiata nel frattempo): si ricomincia da quelli.
      setCampi(r.serve)
      setPasso(r.serve.includes('nascita') ? 'nascita' : 'resto')
    }
    setErrore(r.errore)
  }

  function continuaDaNascita() {
    setErrore(null)
    if (!d.nascita) return setErrore(t('Scrivi la data di nascita.', 'Enter your date of birth.'))
    // Un minorenne si ferma qui, prima di chiedere nome e cellulare: niente viene inviato.
    if (!maggiorenne(d.nascita, oggi)) return setMinorenne(true)
    if (resto.length) return setPasso('resto')
    invia()
  }

  if (giaNostro) {
    return (
      <Schermata titolo={t('Profilo', 'Profile')} nascondiTitolo barra={false} sopra={<Testata fase="profilo" titolo={t('Sei già\ndei nostri', 'You’re already\none of us')} sotto={emailNote ? t('Hai già un account con un altro indirizzo.', 'You already have an account under another address.') : t('Colleghiamo noi questo indirizzo al tuo profilo.', 'We’ll link this address to your profile.')} />}>
        <Carta style={stili.modulo}>
          {emailNote ? (
            <View style={{ gap: spazio.tre }}>
              <Messaggio tono="ok" titolo={emailNote.length === 1 ? t('Ci risulta già un account a tuo nome', 'We already have an account in your name') : t('Ci risultano già degli account a tuo nome', 'We already have accounts in your name')}>
                <Text style={[stili.testoSms, { color: p.testoSecondario }]}>{emailNote.length === 1 ? t('Con questa email:', 'With this email:') : t('Con queste email:', 'With these emails:')}</Text>
                {emailNote.map((m) => (
                  <Text key={m} selectable style={[stili.emailNota, { color: p.testo }]}>{m}</Text>
                ))}
                <Text style={[stili.testoSms, { color: p.testoSecondario }]}>
                  {t('Se è la tua, entra con quell’indirizzo: ritrovi tutto quello che hai già con il club.', 'If that’s yours, sign in with that address: you’ll find everything you already have with the club.')}
                </Text>
              </Messaggio>
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={t('Entra con quell’indirizzo', 'Sign in with that address')} onPress={esci} />
              <Pulsante testo={t('Non lo riconosco o non lo uso più', 'I don’t recognise it or no longer use it')} variante="fantasma" inCorso={attesa} onPress={() => invia(true)} />
            </View>
          ) : smsFinale ? (
            <CollegaConSms finale={smsFinale} onFatto={onFatto} onNonMio={() => setSmsFinale(null)} />
          ) : (
            <>
              <Messaggio tono="ok" titolo={t('Non serve un nuovo profilo', 'No new profile needed')}>
                {giaNostro}
              </Messaggio>
              <Pulsante testo={t('Entra con l’altro indirizzo', 'Sign in with the other address')} variante="secondario" onPress={esci} />
            </>
          )}
        </Carta>
      </Schermata>
    )
  }

  if (minorenne || segreteria) {
    return (
      <Schermata titolo={t('Profilo', 'Profile')} nascondiTitolo barra={false} sopra={
          <Testata
            fase="profilo"
            titolo={minorenne ? t('Serve un\ngenitore', 'A parent\nis needed') : t('Ti aiutiamo\nnoi', 'We’ll\nhelp you')}
            sotto={minorenne ? t('I ragazzi si iscrivono dall’account di un genitore.', 'Teens sign up from a parent’s account.') : t('Questo indirizzo va guardato da una persona del club.', 'This address needs a look from someone at the club.')}
          />
        }
      >
        <Carta style={stili.modulo}>
          <Messaggio tono="attenzione" titolo={minorenne ? t('Serve un genitore', 'A parent is needed') : t('Ti aiutiamo in segreteria', 'We’ll help you at the front desk')}>
            {minorenne
              ? t('Per registrarti serve un genitore: chiedigli di aggiungerti dalla sua app, nella sezione Famiglia. Non abbiamo salvato nessun dato.', 'To sign up you need a parent: ask them to add you from their app, in the Family section. We haven’t saved any details.')
              : t('Con questo indirizzo non riusciamo a completare da qui. Passa in segreteria o scrivici, e ti aiutiamo.', 'We can’t complete this here with this address. Stop by the front desk or write to us and we’ll help.')}
          </Messaggio>
          <Pulsante testo={t('Usa un’altra email', 'Use another email')} variante="secondario" onPress={esci} />
        </Carta>
      </Schermata>
    )
  }

  return (
    <Schermata titolo={t('Profilo', 'Profile')} nascondiTitolo barra={false} sopra={<Testata fase="profilo" />}>
      <Carta style={stili.modulo}>
        <Animated.View key={passo} entering={FadeInRight.duration(320)} style={{ gap: spazio.tre + 4 }}>
          {passo === 'nascita' ? (
            <>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t('Per entrare ci serve la tua ', 'To sign in we need your ')}
                <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('data di nascita', 'date of birth')}</Text>.
              </Text>
              {/* `CampoData` ha `flex: 1` (nasce dentro una riga): in una colonna senza altezza si schiaccia, quindi sta dentro una View. */}
              <View>
                <CampoData etichetta={t('Data di nascita', 'Date of birth')} value={d.nascita} onChange={cambia('nascita')} max={oggi} annoIniziale={new Date().getFullYear() - 30} errore={!!errore} sfondo={p.incavo} />
              </View>
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={resto.length ? t('Continua', 'Continue') : t('Entra', 'Continue')} icona="avanti" onPress={continuaDaNascita} inCorso={attesa} />
            </>
          ) : (
            <>
              {campi.includes('nome') ? <CampoTesto etichetta={t('Nome', 'First name')} value={d.nome} onChangeText={cambia('nome')} autoCapitalize="words" autoComplete="given-name" errore={!!errore && !d.nome.trim()} /> : null}
              {campi.includes('cognome') ? <CampoTesto etichetta={t('Cognome', 'Last name')} value={d.cognome} onChangeText={cambia('cognome')} autoCapitalize="words" autoComplete="family-name" errore={!!errore && !d.cognome.trim()} /> : null}
              {campi.includes('telefono') ? (
                <View>
                  <CampoTelefono etichetta={t('Cellulare', 'Mobile')} value={d.telefono} onChange={cambia('telefono')} sfondo={p.incavo} />
                </View>
              ) : null}
              {serveConsenso ? (
                <Casella spuntata={privacy} onCambia={() => setPrivacy((x) => !x)} etichetta={t('Presa visione dell’informativa privacy', 'Privacy notice acknowledgement')}>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {t('Ho letto l’', 'I’ve read the ')}
                    <Text onPress={() => Linking.openURL(PRIVACY_URL)} style={{ fontFamily: F.bold, color: p.accento, textDecorationLine: 'underline' }}>
                      {t('informativa privacy', 'privacy notice')}
                    </Text>
                    {t(' del club.', ' of the club.')}
                  </Text>
                </Casella>
              ) : null}
              {errore ? <Messaggio>{errore}</Messaggio> : null}
              <Pulsante testo={t('Entra', 'Continue')} icona="avanti" onPress={() => invia()} inCorso={attesa} />
            </>
          )}
        </Animated.View>
        <Tocco onPress={esci} ruolo="link" etichetta={t('Non sei tu? Esci', 'Not you? Sign out')} vibra={null} scala={0.99} style={{ alignSelf: 'center' }}>
          <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'center', fontSize: 12.5 }]}>{t('Non sei tu? Esci', 'Not you? Sign out')}</Text>
        </Tocco>
      </Carta>
    </Schermata>
  )
}

/**
 * Il collegamento con il codice via SMS (05/11/2026): prima la proposta, poi il campo del codice. Il numero si vede solo con le ultime due cifre, ed
 * e' quello della scheda del club, non quello scritto qui.
 */
function CollegaConSms({ finale, onFatto, onNonMio }: { finale: string; onFatto: () => void; onNonMio: () => void }) {
  const p = usePalette()
  const [inviato, setInviato] = useState(false)
  const [codice, setCodice] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const numero = `••${finale}`

  async function invia() {
    setErrore(null)
    setAttesa(true)
    const r = await inviaCodiceSms()
    setAttesa(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    setCodice('')
    setInviato(true)
  }

  async function verifica() {
    setErrore(null)
    const c = codice.replace(/\D/g, '')
    if (c.length !== 6) return setErrore(t('Il codice ha sei cifre.', 'The code has six digits.'))
    setAttesa(true)
    const r = await verificaCodiceSms(c)
    setAttesa(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    onFatto()
  }

  if (!inviato) {
    return (
      <View style={{ gap: spazio.tre }}>
        <Messaggio tono="ok" titolo={t('Collega questo indirizzo al tuo profilo', 'Link this address to your profile')}>
          {t(
            `Hai già un profilo al club. Ti mandiamo un codice via SMS al numero del tuo profilo, quello che finisce per ${numero}: scrivilo qui e da adesso entri con questo indirizzo.`,
            `You already have a club profile. We’ll text a code to the number on your profile, the one ending in ${numero}: enter it here and from now on you sign in with this address.`,
          )}
        </Messaggio>
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo={t(`Mandami il codice al ${numero}`, `Text the code to ${numero}`)} inCorso={attesa} onPress={invia} />
        <Pulsante testo={t('Il numero non è più mio', 'That number isn’t mine anymore')} variante="fantasma" onPress={onNonMio} />
      </View>
    )
  }

  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.testoSms, { color: p.testoSecondario }]}>
        {t(`Ti abbiamo mandato un codice di sei cifre al numero che finisce per ${numero}. Vale 10 minuti.`, `We’ve texted a six-digit code to the number ending in ${numero}. It’s valid for 10 minutes.`)}
      </Text>
      <CampoTesto
        etichetta={t('Codice', 'Code')}
        icona="lucchetto"
        value={codice}
        onChangeText={(v) => setCodice(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        placeholder="123456"
        errore={!!errore}
      />
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={t('Collega ed entra', 'Link and sign in')} inCorso={attesa} disabilitato={codice.length !== 6} onPress={verifica} />
      <Pulsante testo={t('Mandamelo di nuovo', 'Send it again')} variante="fantasma" disabilitato={attesa} onPress={invia} />
      <Pulsante testo={t('Il numero non è più mio', 'That number isn’t mine anymore')} variante="fantasma" onPress={onNonMio} />
    </View>
  )
}

const stili = StyleSheet.create({
  testoSms: { fontFamily: F.normale, fontSize: 15, lineHeight: 22 },
  emailNota: { fontFamily: F.bold, fontSize: 17, lineHeight: 26 },
  modulo: { marginTop: -64, padding: spazio.quattro - 2, gap: spazio.tre + 4 },
  nota: { fontSize: 14.5, lineHeight: 21, fontFamily: F.medio },
})
