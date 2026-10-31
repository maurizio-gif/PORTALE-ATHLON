import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Text } from 'react-native'

import { accettaDelega, leggiInvitoDelega, type InvitoDelega } from '@/api/delega'
import { emailValida } from '@/api/richieste'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CampoData } from '@/components/CampoData'
import { CampoTelefono } from '@/components/CampoTelefono'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { InCaricamento } from '@/features/link/Stati'
import { t, tv } from '@/lib/lingua'
import { useColori } from '@/theme'

import { maggiorenne, mancanti } from './regole'

// La pagina pubblica della delega (31/10/2026, richiesta di Maurizio): `https://app.athlonroma.it/delega/<codice>`, il link che un
// titolare manda dall'app («Un altro adulto sui tuoi figli», `lab/delega`). Senza accesso e senza la cornice dell'app, come
// /invito/<codice>: chi lo apre scrive nome, cognome, email, cellulare e data di nascita, accetta la privacy e basta. **Niente
// password e niente codice fiscale**: la persona entra poi nell'app con la sua email, come tutti.
//
// Cosa succede lo fa `delega-invito` (APP-ATHLON, `docs/delega-nucleo.md`): ricontrolla che il link valga e non sia stato usato, che
// la persona sia maggiorenne e che non sia gia' al club con dati diversi; se e' nuova la crea su PerfectGym come Guest; poi la collega
// al titolare e ai figli. **Dai figli non si mostra niente prima di accettare** (nemmeno i nomi): il link e' un segreto, ma chi lo
// gira a un altro non deve regalare i nomi di due bambini. Si dice solo chi da' la delega e quanti figli sono.

const PRIVACY =
  'Ho letto l’informativa privacy e acconsento al trattamento dei miei dati personali da parte della Società Sportiva Dilettantistica Point 2000 SSD per essere collegato come adulto di riferimento.'
const PRIVACY_EN =
  'I have read the privacy notice and consent to Società Sportiva Dilettantistica Point 2000 SSD processing my personal data so that I can be linked as a reference adult.'

const oggi = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })

export function AccettaDelega({ codice }: { codice: string }) {
  const c = useColori()
  const [invito, setInvito] = useState<InvitoDelega | undefined>(undefined)
  const [d, setD] = useState({ nome: '', cognome: '', email: '', telefono: '', nascita: '' })
  const [privacy, setPrivacy] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [scaduto, setScaduto] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [fatto, setFatto] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    leggiInvitoDelega(codice).then((r) => {
      if (vivo) setInvito(r)
    })
    return () => {
      vivo = false
    }
  }, [codice])

  const cambia = (k: keyof typeof d) => (v: string) => setD((x) => ({ ...x, [k]: v }))
  const vuoti = mancanti(d)
  const minorenne = !!d.nascita && !maggiorenne(d.nascita, oggi())

  async function manda() {
    setErrore(null)
    if (vuoti.length) return setErrore(t('Compila tutti i campi.', 'Fill in all the fields.'))
    if (!emailValida(d.email)) return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
    if (minorenne) return setErrore(t('Per avere accesso ai figli di un altro serve essere maggiorenni.', 'You must be an adult to get access to someone else’s children.'))
    if (!privacy) return setErrore(t('Serve il consenso al trattamento dei dati.', 'You need to consent to data processing.'))
    setAttesa(true)
    const r = await accettaDelega(codice, { ...d, nome: d.nome.trim(), cognome: d.cognome.trim() }, privacy)
    setAttesa(false)
    if (!r.ok) {
      setScaduto(r.scaduto)
      return setErrore(r.errore)
    }
    setFatto(r.nome)
  }

  if (invito === undefined) return <InCaricamento testo={t('Stiamo aprendo il tuo invito…', 'We’re opening your invitation…')} />

  if (fatto) {
    return (
      <Pagina
        titolo={t(`Fatto, ${fatto}`, `Done, ${fatto}`)}
        sottotitolo={t('Ora puoi vedere e gestire i figli di chi ti ha invitato.', 'You can now see and manage the children of the person who invited you.')}
        indietro={false}
      >
        <Testo>
          {t(
            `Entra nell’app con ${d.email.trim().toLowerCase()}: ti mandiamo il codice per accedere. Trovi i bambini nella sezione Famiglia della Home e puoi prenotare, disdire e pagare per loro.`,
            `Sign in to the app with ${d.email.trim().toLowerCase()}: we’ll send you the code to get in. You’ll find the children in the Family section of the Home screen and you can book, cancel and pay for them.`,
          )}
        </Testo>
        <Testo variante="attenuato">{t('Se i bambini non compaiono subito, riprova fra qualche minuto: il club aggiorna i dati ogni poco.', 'If the children don’t show up right away, try again in a few minutes: the club updates its data regularly.')}</Testo>
        <Bottone testo={t('Entra nell’app', 'Open the app')} onPress={() => router.replace('/')} />
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
        `Scrivi i tuoi dati: ti registriamo nell’app di Athlon e ti colleghiamo a ${chi ?? 'chi ti ha invitato'}${figli ? ` e ${figli === 1 ? 'al suo bambino' : 'ai suoi bambini'}` : ''}. Da quel momento puoi vedere e gestire per loro lezioni, prenotazioni, pagamenti e certificato.`,
        `Enter your details: we’ll register you in the Athlon app and link you to ${chi ?? 'the person who invited you'}${figli ? ` and ${figli === 1 ? 'their child' : 'their children'}` : ''}. From then on you can see and manage their classes, bookings, payments and certificate.`,
      )}
      indietro={false}
    >
      {tv(null, <Testo variante="piccolo">Courtesy translation: the Italian text is the binding version.</Testo>)}
      <Campo etichetta={t('Nome', 'First name')} value={d.nome} onChangeText={cambia('nome')} autoCapitalize="words" autoComplete="given-name" />
      <Campo etichetta={t('Cognome', 'Last name')} value={d.cognome} onChangeText={cambia('cognome')} autoCapitalize="words" autoComplete="family-name" />
      <Campo etichetta={t('Email', 'Email')} value={d.email} onChangeText={cambia('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder={t('nome@esempio.it', 'name@example.com')} />
      <CampoTelefono etichetta={t('Cellulare', 'Mobile')} value={d.telefono} onChange={cambia('telefono')} sfondo={c.sfondo} />
      <CampoData etichetta={t('Data di nascita', 'Date of birth')} value={d.nascita} onChange={cambia('nascita')} max={oggi()} errore={minorenne} sfondo={c.sfondo} />
      {minorenne ? <Avviso>{t('Per avere accesso ai figli di un altro serve essere maggiorenni.', 'You must be an adult to get access to someone else’s children.')}</Avviso> : null}
      <Casella spuntata={privacy} onCambia={() => setPrivacy((x) => !x)} etichetta={t('Consenso privacy (obbligatorio)', 'Privacy consent (required)')}>
        <Testo variante="piccolo">{t(PRIVACY, PRIVACY_EN)} {t('(obbligatorio)', '(required)')}</Testo>
      </Casella>
      <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.athlonroma.it/privacy')}>
        {t('Leggi l’informativa privacy', 'Read the privacy notice')}
      </Text>
      {errore ? <Avviso>{errore}</Avviso> : null}
      {scaduto ? <Testo variante="attenuato">{t('Chiedi a chi te l’ha mandato di crearne uno nuovo.', 'Ask the person who sent it to create a new one.')}</Testo> : null}
      <Bottone testo={t('Accetta e registrati', 'Accept and sign up')} onPress={manda} inCorso={attesa} disabilitato={scaduto || vuoti.length > 0 || minorenne || !privacy} />
    </Pagina>
  )
}
