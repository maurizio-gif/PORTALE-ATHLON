import { useState } from 'react'
import { Linking, Text } from 'react-native'

import { richiediGuestPass, riprendiGuestPass, verificaGuestPass, type DatiContatto, type TipoVerifica } from '@/api/guestPass'
import { emailValida } from '@/api/richieste'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { useColori } from '@/theme'

// La richiesta del Guest Pass nuovo (in prova), come /prova-guest-pass del
// sito: prima l'email; poi, sempre, nome, cognome, cellulare e la privacy,
// gia' compilati per chi il club conosce. Chi non c'e' diventa un Lead. Poi
// arriva il link per email, e da li' si completano i dati e si attiva
// (/r/<codice>). Chi ha gia' un Guest Pass a meta' non ricomincia: gli si
// rimanda lo stesso link, con quello che aveva gia' fatto.

const CONSENSO_OBBLIGATORIO =
  'Ho letto l’informativa privacy e acconsento al trattamento dei miei dati personali da parte della Società Sportiva Dilettantistica Point 2000 SSD per il Guest Pass.'
const CONSENSO_FACOLTATIVO = 'Voglio ricevere comunicazioni su corsi, promozioni e novità del club. Posso revocare quando voglio.'

type Fase = 'email' | 'dati' | 'riprendi' | 'inviata' | 'no'

export default function RichiestaGuestPass() {
  const c = useColori()
  const [fase, setFase] = useState<Fase>('email')
  const [email, setEmail] = useState('')
  const [tipo, setTipo] = useState<TipoVerifica>('nuovo')
  const [motivo, setMotivo] = useState<string | null>(null)
  // Il passo da cui si riparte, per chi ha gia' un Guest Pass a meta'.
  const [ripresa, setRipresa] = useState<{ passo: string; nome: string | null } | null>(null)
  const [d, setD] = useState<DatiContatto>({ nome: '', cognome: '', cellulare: '', privacy: false, marketing: false })
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const campo = (k: 'nome' | 'cognome' | 'cellulare') => (v: string) => setD((x) => ({ ...x, [k]: v }))

  async function continua() {
    setErrore(null)
    if (!emailValida(email)) return setErrore('Scrivi un indirizzo email valido.')
    setAttesa(true)
    const v = await verificaGuestPass(email.trim().toLowerCase())
    setAttesa(false)
    if (!v.ok) return setErrore(v.errore)
    if ('inCorso' in v) {
      setRipresa({ passo: v.riprendi, nome: v.nome })
      return setFase('riprendi')
    }
    if (!v.idoneo) {
      setMotivo(v.motivo)
      return setFase('no')
    }
    // I consensi ripartono da zero: chi c'e' gia' li riacquisisce qui.
    setTipo(v.tipo)
    setD({ nome: v.persona?.nome ?? '', cognome: v.persona?.cognome ?? '', cellulare: v.persona?.telefono ?? '', privacy: false, marketing: false })
    setFase('dati')
  }

  async function manda() {
    setErrore(null)
    if (!d.nome.trim() || !d.cognome.trim()) return setErrore('Scrivi nome e cognome.')
    if (!d.cellulare.trim()) return setErrore('Scrivi il numero di cellulare.')
    if (!d.privacy) return setErrore('Per continuare serve il consenso al trattamento dei dati.')
    setAttesa(true)
    const r = await richiediGuestPass(email.trim().toLowerCase(), d)
    setAttesa(false)
    if (r.ok) {
      setRipresa(r.riprendi ? { passo: r.riprendi, nome: null } : null)
      return setFase('inviata')
    }
    if (r.nonIdoneo) {
      setMotivo(r.errore)
      return setFase('no')
    }
    setErrore(r.errore)
  }

  async function rimanda() {
    setErrore(null)
    setAttesa(true)
    const r = await riprendiGuestPass(email.trim().toLowerCase())
    if (r.ok) {
      setAttesa(false)
      setRipresa((x) => ({ passo: r.riprendi, nome: x?.nome ?? null }))
      return setFase('inviata')
    }
    // Nel frattempo e' finita o scaduta: si riparte dalla verifica.
    if (r.nessuna) {
      setAttesa(false)
      setRipresa(null)
      return continua()
    }
    setAttesa(false)
    setErrore(r.errore)
  }

  if (fase === 'riprendi' && ripresa) {
    return (
      <Pagina
        titolo={ripresa.nome ? `Ciao ${ripresa.nome}, hai già iniziato` : 'Hai già iniziato'}
        sottotitolo={`Il tuo Guest Pass con ${email.trim()} è a metà: quello che hai già fatto è salvato, e riparti ${ripresa.passo}. Ti rimandiamo il link per finire.`}
      >
        {errore ? <Avviso>{errore}</Avviso> : null}
        <Bottone testo="Rimandami il link" onPress={rimanda} inCorso={attesa} />
        <Bottone testo="Usa un’altra email" variante="contorno" onPress={() => setFase('email')} disabilitato={attesa} />
      </Pagina>
    )
  }

  if (fase === 'inviata' && ripresa) {
    return (
      <Pagina titolo="Controlla la tua email" sottotitolo={`Tra pochi minuti ti arriva a ${email.trim()} lo stesso link di prima. Vale 3 giorni da adesso.`}>
        <Testo variante="attenuato">
          Quello che avevi già fatto è salvato, e riparti {ripresa.passo}. Non trovi l’email? Guarda nella posta indesiderata.
        </Testo>
        <Bottone testo="Usa un’altra email" variante="contorno" onPress={() => setFase('email')} />
      </Pagina>
    )
  }

  if (fase === 'inviata') {
    return (
      <Pagina titolo="Controlla la tua email" sottotitolo={`Tra pochi minuti ti arriva a ${email.trim()} il link per attivare il Guest Pass. Vale 3 giorni.`}>
        <Testo variante="attenuato">
          Dal link confermi i tuoi dati e completi quelli che mancano, scegli il giorno d’inizio, entro due settimane, e come pagare. Non trovi
          l’email? Guarda nella posta indesiderata.
        </Testo>
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
      <Pagina
        titolo="I tuoi dati"
        sottotitolo={
          tipo === 'nuovo'
            ? `Non troviamo ${email.trim()} fra i contatti del club: lasciaci nome, cognome e cellulare.`
            : 'Ti abbiamo trovato: controlla i tuoi dati, correggili se serve e conferma i consensi.'
        }
      >
        <Campo etichetta="Nome" value={d.nome} onChangeText={campo('nome')} autoComplete="given-name" />
        <Campo etichetta="Cognome" value={d.cognome} onChangeText={campo('cognome')} autoComplete="family-name" />
        <Campo etichetta="Cellulare" value={d.cellulare} onChangeText={campo('cellulare')} keyboardType="phone-pad" autoComplete="tel" placeholder="3401234567" />
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
        <Bottone testo="Mandami il link" onPress={manda} inCorso={attesa} />
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
