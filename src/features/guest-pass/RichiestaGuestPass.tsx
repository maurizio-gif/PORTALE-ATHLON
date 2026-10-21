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

const CONSENSO_OBBLIGATORIO =
  'Ho letto l’informativa privacy e acconsento al trattamento dei miei dati personali da parte della Società Sportiva Dilettantistica Point 2000 SSD per il Guest Pass.'
const CONSENSO_FACOLTATIVO = 'Voglio ricevere comunicazioni su corsi, promozioni e novità del club. Posso revocare quando voglio.'

export type Invito = { codice: string; nome: string | null; prezzo: number; prezzoPieno: number }

export function RichiestaGuestPass({ invito, avviso }: { invito?: Invito; avviso?: string } = {}) {
  const c = useColori()
  const [inviata, setInviata] = useState(false)
  const [email, setEmail] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function manda() {
    setErrore(null)
    if (!emailValida(email)) return setErrore('Scrivi un indirizzo email valido.')
    if (!privacy) return setErrore('Per ricevere il link serve il consenso al trattamento dei dati.')
    setAttesa(true)
    const r = await richiediGuestPass(email.trim().toLowerCase(), { privacy, marketing }, invito?.codice)
    setAttesa(false)
    if (!r.ok) return setErrore(r.errore)
    setInviata(true)
  }

  if (inviata) {
    return (
      <Pagina
        titolo="Controlla la tua email"
        sottotitolo={`Tra pochi minuti ti arriva a ${email.trim()} il link per il Guest Pass. Se avevi già iniziato, è lo stesso link di prima, con quello che avevi già fatto.`}
      >
        <Testo>
          Nel link scegli per chi attivarlo, per te o per un figlio dai 13 ai 17 anni, e vedi subito chi può averlo. Poi completi i dati, scegli il
          giorno d’inizio, entro due settimane, e come pagare.
        </Testo>
        {invito ? (
          <Testo>
            {`Con l’invito di ${invito.nome ?? 'chi ti ha invitato'} la settimana di prova costa ${invito.prezzo} € invece di ${invito.prezzoPieno}: lo trovi già nel link.`}
          </Testo>
        ) : null}
        <Testo variante="attenuato">Non trovi l’email? Guarda nella posta indesiderata. Il link vale 30 giorni.</Testo>
        {invito ? (
          <>
            <Testo variante="attenuato">Preferisci iscriverti subito, senza la settimana di prova? Scegli il tuo abbonamento: l’invito vale lo stesso.</Testo>
            <Bottone testo="Scegli l’abbonamento" variante="contorno" onPress={() => Linking.openURL(`${SITO_URL}/abbonamenti/`)} />
          </>
        ) : null}
        <Bottone testo="Usa un’altra email" variante="contorno" onPress={() => setInviata(false)} />
      </Pagina>
    )
  }

  return (
    <Pagina
      titolo={invito ? (invito.nome ? `${invito.nome} ti invita da Athlon` : 'Sei invitato da Athlon') : 'Guest Pass'}
      sottotitolo={
        invito
          ? `Con il suo invito provi il club per una settimana pagando solo ${invito.prezzo} € invece di ${invito.prezzoPieno}, oppure ti iscrivi subito. Scrivi la tua email: ti mandiamo il link per cominciare. L’invito vale 30 giorni da quando lo accetti, per chi non ha avuto abbonamenti o Guest Pass negli ultimi 3 anni.`
          : 'Una settimana al club a 19 €, per chi non ha avuto abbonamenti o Guest Pass negli ultimi 3 anni: per te o per un figlio dai 13 ai 17 anni. Scrivi la tua email: ti mandiamo il link per attivarlo.'
      }
    >
      {avviso ? <Testo variante="attenuato">{avviso}</Testo> : null}
      <Campo etichetta="La tua email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="nome@esempio.it" onSubmitEditing={manda} />
      <Casella spuntata={privacy} onCambia={() => setPrivacy((x) => !x)} etichetta="Consenso privacy (obbligatorio)">
        <Testo variante="piccolo">{CONSENSO_OBBLIGATORIO} (obbligatorio)</Testo>
      </Casella>
      <Casella spuntata={marketing} onCambia={() => setMarketing((x) => !x)} etichetta="Comunicazioni (facoltativo)">
        <Testo variante="piccolo">{CONSENSO_FACOLTATIVO} (facoltativo)</Testo>
      </Casella>
      <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.athlonroma.it/privacy')}>
        Leggi l’informativa privacy
      </Text>
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo="Mandami il link" onPress={manda} inCorso={attesa} />
    </Pagina>
  )
}
