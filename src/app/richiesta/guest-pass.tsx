import { useState } from 'react'
import { Linking, Text, View } from 'react-native'

import { richiediGuestPass, verificaGuestPass, type DatiRegistrazione } from '@/api/guestPass'
import { emailValida } from '@/api/richieste'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { CampoData } from '@/components/CampoData'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { spazio, useColori } from '@/theme'

// La richiesta del Guest Pass nuovo (in prova, solo per i tester): l'email,
// il controllo di chi puo' averlo e, per chi il club non conosce come Member o
// Guest, la registrazione coi dati completi. Poi arriva il link per email, e
// da li' si attiva (/r/<codice>). La procedura di prima, sul sito, resta.

const CONSENSO_OBBLIGATORIO =
  'Ho letto l’informativa privacy e acconsento al trattamento dei miei dati personali da parte della Società Sportiva Dilettantistica Point 2000 SSD per la registrazione al club e il Guest Pass.'
const CONSENSO_FACOLTATIVO = 'Voglio ricevere comunicazioni su corsi, promozioni e novità del club. Posso revocare quando voglio.'

type Fase = 'email' | 'dati' | 'inviata' | 'no'

export default function RichiestaGuestPass() {
  const c = useColori()
  const [fase, setFase] = useState<Fase>('email')
  const [email, setEmail] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const [d, setD] = useState<DatiRegistrazione>({ nome: '', cognome: '', cellulare: '', nascita: '', codice_fiscale: '', via: '', cap: '', citta: '', privacy: false, marketing: false })
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const campo = (k: keyof DatiRegistrazione) => (v: string) => setD((x) => ({ ...x, [k]: v }))

  async function continua() {
    setErrore(null)
    if (!emailValida(email)) return setErrore('Scrivi un indirizzo email valido.')
    setAttesa(true)
    const v = await verificaGuestPass(email.trim().toLowerCase())
    if (!v.ok) {
      setAttesa(false)
      return setErrore(v.errore)
    }
    if (v.stato === 'non_disponibile' || v.stato === 'non_idoneo') {
      setAttesa(false)
      setMotivo(v.motivo)
      return setFase('no')
    }
    if (v.stato === 'registrazione') {
      setAttesa(false)
      return setFase('dati')
    }
    const r = await richiediGuestPass(email.trim().toLowerCase())
    setAttesa(false)
    if (r.ok) setFase('inviata')
    else setErrore(r.errore)
  }

  async function registrati() {
    setErrore(null)
    if (!d.privacy) return setErrore('Per registrarti serve il consenso al trattamento dei dati.')
    setAttesa(true)
    const r = await richiediGuestPass(email.trim().toLowerCase(), d)
    setAttesa(false)
    if (r.ok) setFase('inviata')
    else setErrore(r.errore)
  }

  if (fase === 'inviata') {
    return (
      <Pagina titolo="Controlla la tua email" sottotitolo={`Tra pochi minuti ti arriva a ${email.trim()} il link per attivare il Guest Pass. Vale 3 giorni.`}>
        <Testo variante="attenuato">Dal link scegli il giorno d’inizio, entro due settimane, e come pagare. Non trovi l’email? Guarda nella posta indesiderata.</Testo>
        <Bottone testo="Usa un’altra email" variante="contorno" onPress={() => setFase('email')} />
      </Pagina>
    )
  }

  if (fase === 'no') {
    return (
      // Niente «Usa un'altra email»: inviterebbe a riprovare con un altro indirizzo.
      <Pagina titolo="Guest Pass non disponibile">
        <Testo>{motivo ?? 'Non è possibile attivare il Guest Pass.'}</Testo>
      </Pagina>
    )
  }

  if (fase === 'dati') {
    return (
      <Pagina titolo="Registrati per il Guest Pass" sottotitolo={`Non troviamo un account del club con ${email.trim()}: con questi dati ti creiamo la scheda.`}>
        <View style={{ flexDirection: 'row', gap: spazio.due }}>
          <Campo etichetta="Nome" value={d.nome} onChangeText={campo('nome')} autoComplete="given-name" />
          <Campo etichetta="Cognome" value={d.cognome} onChangeText={campo('cognome')} autoComplete="family-name" />
        </View>
        <Campo etichetta="Cellulare" value={d.cellulare} onChangeText={campo('cellulare')} keyboardType="phone-pad" autoComplete="tel" placeholder="3401234567" />
        <CampoData etichetta="Data di nascita" value={d.nascita} onChange={campo('nascita')} />
        <Campo etichetta="Codice fiscale" value={d.codice_fiscale} onChangeText={campo('codice_fiscale')} autoCapitalize="characters" maxLength={16} />
        <Campo etichetta="Via e numero civico" value={d.via} onChangeText={campo('via')} autoComplete="street-address" />
        <View style={{ flexDirection: 'row', gap: spazio.due }}>
          <Campo etichetta="CAP" value={d.cap} onChangeText={campo('cap')} keyboardType="number-pad" maxLength={5} />
          <Campo etichetta="Città" value={d.citta} onChangeText={campo('citta')} placeholder="Roma" />
        </View>
        <Casella spuntata={d.privacy} onCambia={() => setD((x) => ({ ...x, privacy: !x.privacy }))} etichetta="Consenso privacy (obbligatorio)">
          <Testo variante="piccolo">{CONSENSO_OBBLIGATORIO} (obbligatorio)</Testo>
        </Casella>
        <Casella spuntata={d.marketing} onCambia={() => setD((x) => ({ ...x, marketing: !x.marketing }))} etichetta="Comunicazioni (facoltativo)">
          <Testo variante="piccolo">{CONSENSO_FACOLTATIVO} (facoltativo)</Testo>
        </Casella>
        <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.athlonroma.it/privacy')}>
          Leggi l’informativa privacy
        </Text>
        {errore ? <Avviso>{errore}</Avviso> : null}
        <Bottone testo="Registrati e mandami il link" onPress={registrati} inCorso={attesa} />
        <Bottone testo="Cambia email" variante="contorno" onPress={() => setFase('email')} disabilitato={attesa} />
      </Pagina>
    )
  }

  return (
    <Pagina titolo="Guest Pass" sottotitolo="Una settimana al club a 19 €, per chi non è iscritto dal 2024 in poi. Scrivi la tua email: ti mandiamo il link per attivarlo.">
      <Campo etichetta="La tua email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="nome@esempio.it" onSubmitEditing={continua} />
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo="Continua" onPress={continua} inCorso={attesa} />
    </Pagina>
  )
}
