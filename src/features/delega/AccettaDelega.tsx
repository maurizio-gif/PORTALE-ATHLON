import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Text } from 'react-native'

import { leggiInvitoDelega, richiediConfermaDelega, type InvitoDelega } from '@/api/delega'
import { emailValida } from '@/api/richieste'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { InCaricamento } from '@/features/link/Stati'
import { t, tv } from '@/lib/lingua'
import { useColori } from '@/theme'

// La pagina pubblica della delega (31/10/2026, richiesta di Maurizio): `https://app.athlonroma.it/delega/<codice>`, il link che un
// titolare manda dall'app («Un altro adulto sui tuoi figli», `lab/delega`). Senza accesso e senza la cornice dell'app, come
// /invito/<codice>: chi lo apre scrive **solo l'email** e accetta la privacy (01/11/2026, come ogni registrazione dell'app: prima chiedeva
// tutti i dati anche a chi era gia' socio, dal test di Sara). I dati che mancano si chiedono dopo, dal link dell'email (`ConfermaDelega`), solo se servono.
// **Niente password e niente codice fiscale**: la persona entra poi nell'app con la sua email, come tutti.
//
// **Il modulo non abbina nessuno**: manda un'email con il link per terminare (`ConfermaDelega`, /delega/conferma/<token>) e dice
// «controlla la tua email», sempre allo stesso modo. Solo la conferma dalla propria casella collega la persona (se e' gia' al club si
// usa la sua scheda com'e', se e' nuova la crea `delega-invito` su PerfectGym come Guest con i dati chiesti li'; poi la collega al titolare e ai figli). Cosi' un
// indirizzo scritto a caso non crea niente e non tocca la scheda di nessuno (APP-ATHLON, `docs/delega-nucleo.md`). **Dai figli non si mostra niente prima di accettare** (nemmeno i nomi): il link e' un segreto, ma chi lo
// gira a un altro non deve regalare i nomi di due bambini. Si dice solo chi da' la delega e quanti figli sono.

const PRIVACY =
  'Ho letto l’informativa privacy e acconsento al trattamento dei miei dati personali da parte della Società Sportiva Dilettantistica Point 2000 SSD per essere collegato come adulto di riferimento.'
const PRIVACY_EN =
  'I have read the privacy notice and consent to Società Sportiva Dilettantistica Point 2000 SSD processing my personal data so that I can be linked as a reference adult.'

export function AccettaDelega({ codice }: { codice: string }) {
  const c = useColori()
  const [invito, setInvito] = useState<InvitoDelega | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [scaduto, setScaduto] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [inviata, setInviata] = useState(false)

  useEffect(() => {
    let vivo = true
    leggiInvitoDelega(codice).then((r) => {
      if (vivo) setInvito(r)
    })
    return () => {
      vivo = false
    }
  }, [codice])

  async function manda() {
    setErrore(null)
    if (!emailValida(email)) return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
    if (!privacy) return setErrore(t('Serve il consenso al trattamento dei dati.', 'You need to consent to data processing.'))
    setAttesa(true)
    const r = await richiediConfermaDelega(codice, email, privacy)
    setAttesa(false)
    if (!r.ok) {
      setScaduto(r.scaduto)
      return setErrore(r.errore)
    }
    setInviata(true)
  }

  if (invito === undefined) return <InCaricamento testo={t('Stiamo aprendo il tuo invito…', 'We’re opening your invitation…')} />

  if (inviata) {
    return (
      <Pagina
        titolo={t('Controlla la tua email', 'Check your email')}
        sottotitolo={t(`Abbiamo mandato un link a ${email.trim().toLowerCase()}: toccalo per completare.`, `We’ve sent a link to ${email.trim().toLowerCase()}: tap it to finish.`)}
        indietro={false}
      >
        <Testo>
          {t(
            'Serve a essere sicuri che l’email sia tua. Dal link ti chiediamo solo i dati che non abbiamo già (se sei iscritto al club, di solito nessuno) e ti colleghiamo ai bambini.',
            'This is to make sure the email is yours. From the link we only ask for the details we don’t already have (if you’re a club member, usually none) and link you to the children.',
          )}
        </Testo>
        <Testo variante="attenuato">{t('Non lo trovi? Guarda nella posta indesiderata. Il link vale 24 ore. Finché non lo tocchi non succede niente.', 'Can’t find it? Check your spam folder. The link is valid for 24 hours. Nothing happens until you tap it.')}</Testo>
        <Bottone testo={t('Ho sbagliato email', 'I used the wrong email')} variante="contorno" onPress={() => setInviata(false)} />
      </Pagina>
    )
  }

  if (!invito.valido) {
    return (
      <Pagina titolo={t('Questo link non è più valido', 'This link is no longer valid')} indietro={false}>
        <Testo>{t('Il link può essere usato da una persona sola e per pochi giorni. Chiedi a chi te l’ha mandato di crearne uno nuovo.', 'The link works for one person only and for a few days. Ask the person who sent it to create a new one.')}</Testo>
        <Bottone testo={t('Vai all’app', 'Go to the app')} variante="contorno" onPress={() => router.replace('/')} />
      </Pagina>
    )
  }

  const chi = invito.nome
  const figli = invito.figli
  return (
    <Pagina
      titolo={chi ? t(`${chi} ti dà accesso ai suoi figli`, `${chi} is giving you access to their children`) : t('Ti danno accesso ai loro figli', 'You’re being given access to their children')}
      sottotitolo={t(
        `Scrivi la tua email: ti mandiamo un link per completare e ti colleghiamo a ${chi ?? 'chi ti ha invitato'}${figli ? ` e ${figli === 1 ? 'al suo bambino' : 'ai suoi bambini'}` : ''}. Da quel momento puoi vedere e gestire per loro lezioni, prenotazioni, pagamenti e certificato.`,
        `Enter your email: we’ll send you a link to finish and link you to ${chi ?? 'the person who invited you'}${figli ? ` and ${figli === 1 ? 'their child' : 'their children'}` : ''}. From then on you can see and manage their classes, bookings, payments and certificate.`,
      )}
      indietro={false}
    >
      {tv(null, <Testo variante="piccolo">Courtesy translation: the Italian text is the binding version.</Testo>)}
      <Campo etichetta={t('Email', 'Email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder={t('nome@esempio.it', 'name@example.com')} />
      <Casella spuntata={privacy} onCambia={() => setPrivacy((x) => !x)} etichetta={t('Consenso privacy (obbligatorio)', 'Privacy consent (required)')}>
        <Testo variante="piccolo">{t(PRIVACY, PRIVACY_EN)} {t('(obbligatorio)', '(required)')}</Testo>
      </Casella>
      <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.athlonroma.it/privacy')}>
        {t('Leggi l’informativa privacy', 'Read the privacy notice')}
      </Text>
      {errore ? <Avviso>{errore}</Avviso> : null}
      {scaduto ? <Testo variante="attenuato">{t('Chiedi a chi te l’ha mandato di crearne uno nuovo.', 'Ask the person who sent it to create a new one.')}</Testo> : null}
      <Bottone testo={t('Continua', 'Continue')} onPress={manda} inCorso={attesa} disabilitato={scaduto || !email.trim() || !privacy} />
    </Pagina>
  )
}
