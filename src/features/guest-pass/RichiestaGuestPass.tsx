import { useState } from 'react'
import { Linking, Text } from 'react-native'

import { richiediGuestPass } from '@/api/guestPass'
import { emailValida } from '@/api/richieste'
import { SITO_URL } from '@/config'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { ProvaDallApp } from '@/features/guest-pass/ProvaDallApp'
import { InCaricamento } from '@/features/link/Stati'
import { useSessione } from '@/features/lab/useSessione'
import { vistaCorrente } from '@/features/lab/vista'
import { t, tv } from '@/lib/lingua'
import { useColori } from '@/theme'

// La richiesta del Guest Pass, come /prova-guest-pass del sito. **Il primo passo e' l'email con la privacy, e la
// risposta e' sempre la stessa** (21/10/2026, decisione di Maurizio): «controlla la tua email». Non si dice se la persona
// puo' averlo, se il club la conosce o se aveva gia' iniziato (in quel caso il server le rimanda lo stesso link): lo si
// dice nel link, nella sua casella. Li' sceglie anche per chi e': per se' o per un figlio dai 13 ai 17 anni, del suo
// nucleo o da aggiungere (`AttivaGuestPass`, /r/<codice>). Per questo qui non si chiedono nome, cognome e cellulare.
//
// **Con un invito** (21/10/2026, pagina pubblica /invito/<codice>): la stessa procedura, con in cima chi ha invitato, e la
// richiesta porta il codice; `guest-pass` lo abbina al socio quando nel link si sceglie per chi e' (`referral_accetta`:
// 30 giorni dall'accettazione, vince il primo invito). **Con l'invito la prova costa 5 € invece di 19**, anche per un
// figlio: lo decide `guest-pass`, qui si dice soltanto. Dopo l'invio, per chi preferisce non fare la prova, c'e'
// l'iscrizione diretta: per ora dal sito.

const CONSENSO_OBBLIGATORIO = t(
  'Ho letto l’informativa privacy e acconsento al trattamento dei miei dati personali da parte della Società Sportiva Dilettantistica Point 2000 SSD per il Guest Pass.',
  'I have read the privacy notice and consent to Società Sportiva Dilettantistica Point 2000 SSD processing my personal data for the Guest Pass.',
)
const CONSENSO_FACOLTATIVO = t(
  'Voglio ricevere comunicazioni su corsi, promozioni e novità del club. Posso revocare quando voglio.',
  'I want to receive updates about classes, promotions and club news. I can withdraw at any time.',
)

export type Invito = { codice: string; nome: string | null; prezzo: number; prezzoPieno: number }

/**
 * **Chi ha gia' un accesso all'app non scrive l'email** (29/10/2026, richiesta di Maurizio): il club sa chi e', e la procedura
 * continua qui dentro, senza uscire e senza aspettare una posta (`ProvaDallApp`). L'email col link resta per chi arriva da fuori:
 * il sito, un amico che apre il link dell'invito, chiunque non abbia una sessione. In vista cliente non si apre niente a nome
 * del cliente: resta il modulo.
 */
export function RichiestaGuestPass(props: { invito?: Invito; avviso?: string } = {}) {
  const sessione = useSessione()
  if (sessione === undefined) return <InCaricamento />
  if (sessione && vistaCorrente() === null) return <ProvaDallApp invito={props.invito?.codice} />
  return <RichiestaConEmail {...props} />
}

function RichiestaConEmail({ invito, avviso }: { invito?: Invito; avviso?: string }) {
  const c = useColori()
  const [inviata, setInviata] = useState(false)
  const [email, setEmail] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function manda() {
    setErrore(null)
    if (!emailValida(email)) return setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
    if (!privacy) return setErrore(t('Per ricevere il link serve il consenso al trattamento dei dati.', 'To receive the link, you need to consent to data processing.'))
    setAttesa(true)
    const r = await richiediGuestPass(email.trim().toLowerCase(), { privacy, marketing }, invito?.codice)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    setInviata(true)
  }

  if (inviata) {
    return (
      <Pagina
        titolo={t('Controlla la tua email', 'Check your email')}
        sottotitolo={t(`Tra pochi minuti ti arriva a ${email.trim()} il link per il Guest Pass. Se avevi già iniziato, è lo stesso link di prima, con quello che avevi già fatto.`, `In a few minutes you’ll get the Guest Pass link at ${email.trim()}. If you had already started, it’s the same link as before, with what you had already done.`)}
      >
        <Testo>
          {t(
            'Nel link scegli per chi attivarlo, per te o per un figlio dai 13 ai 17 anni, e vedi subito chi può averlo. Poi completi i dati, scegli il giorno d’inizio, entro due settimane, e come pagare.',
            'In the link you choose who to activate it for, yourself or a child aged 13 to 17, and you see right away who can have it. Then you complete your details, choose a start day within two weeks, and how to pay.',
          )}
        </Testo>
        {invito ? (
          <Testo>
            {t(`Con l’invito di ${invito.nome ?? 'chi ti ha invitato'} la settimana di prova costa ${invito.prezzo} € invece di ${invito.prezzoPieno}: lo trovi già nel link.`, `With ${invito.nome ? `${invito.nome}’s` : 'your'} invitation, the trial week costs ${invito.prezzo} € instead of ${invito.prezzoPieno}: it’s already applied in the link.`)}
          </Testo>
        ) : null}
        <Testo variante="attenuato">{t('Non trovi l’email? Guarda nella posta indesiderata. Il link vale 30 giorni.', 'Can’t find the email? Check your spam folder. The link is valid for 30 days.')}</Testo>
        {invito ? (
          <>
            <Testo variante="attenuato">{t('Preferisci iscriverti subito, senza la settimana di prova? Scegli il tuo abbonamento: l’invito vale lo stesso.', 'Would you rather join right away, without the trial week? Choose your membership: the invitation still counts.')}</Testo>
            <Bottone testo={t('Scegli l’abbonamento', 'Choose a membership')} variante="contorno" onPress={() => Linking.openURL(`${SITO_URL}/abbonamenti/`)} />
          </>
        ) : null}
        <Bottone testo={t('Usa un’altra email', 'Use another email')} variante="contorno" onPress={() => setInviata(false)} />
      </Pagina>
    )
  }

  return (
    <Pagina
      titolo={invito ? (invito.nome ? t(`${invito.nome} ti invita da Athlon`, `${invito.nome} invites you to Athlon`) : t('Sei invitato da Athlon', 'You’re invited to Athlon')) : 'Guest Pass'}
      sottotitolo={
        invito
          ? t(
              `Con il suo invito provi il club per una settimana pagando solo ${invito.prezzo} € invece di ${invito.prezzoPieno}, oppure ti iscrivi subito. Scrivi la tua email: ti mandiamo il link per cominciare. L’invito vale 30 giorni da quando lo accetti, per chi non ha avuto abbonamenti o Guest Pass negli ultimi 3 anni.`,
              `With this invitation you try the club for a week for just ${invito.prezzo} € instead of ${invito.prezzoPieno}, or you join right away. Enter your email: we’ll send you the link to get started. The invitation is valid for 30 days from when you accept it, for anyone who hasn’t had a membership or Guest Pass in the last 3 years.`,
            )
          : t(
              'Una settimana al club a 19 €, per chi non ha avuto abbonamenti o Guest Pass negli ultimi 3 anni: per te o per un figlio dai 13 ai 17 anni. Scrivi la tua email: ti mandiamo il link per attivarlo.',
              'A week at the club for 19 €, for anyone who hasn’t had a membership or Guest Pass in the last 3 years: for you or a child aged 13 to 17. Enter your email: we’ll send you the link to activate it.',
            )
      }
    >
      {avviso ? <Testo variante="attenuato">{avviso}</Testo> : null}
      {tv(null, <Testo variante="piccolo">Courtesy translation: the Italian text is the binding version.</Testo>)}
      <Campo etichetta={t('La tua email', 'Your email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder={t('nome@esempio.it', 'name@example.com')} onSubmitEditing={manda} />
      <Casella spuntata={privacy} onCambia={() => setPrivacy((x) => !x)} etichetta={t('Consenso privacy (obbligatorio)', 'Privacy consent (required)')}>
        <Testo variante="piccolo">{CONSENSO_OBBLIGATORIO} {t('(obbligatorio)', '(required)')}</Testo>
      </Casella>
      <Casella spuntata={marketing} onCambia={() => setMarketing((x) => !x)} etichetta={t('Comunicazioni (facoltativo)', 'Updates (optional)')}>
        <Testo variante="piccolo">{CONSENSO_FACOLTATIVO} {t('(facoltativo)', '(optional)')}</Testo>
      </Casella>
      <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.athlonroma.it/privacy')}>
        {t('Leggi l’informativa privacy', 'Read the privacy notice')}
      </Text>
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo={t('Mandami il link', 'Send me the link')} onPress={manda} inCorso={attesa} />
    </Pagina>
  )
}
