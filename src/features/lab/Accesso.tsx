import { useState } from 'react'

import { chiediCodice, entra } from '@/api/lab'
import { emailValida } from '@/api/richieste'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'

// L'accesso al laboratorio: email, poi il codice di sei cifre che arriva per
// email. Nessuna password. Chi non e' fra i tester non riceve niente, ma la
// pagina dice la stessa cosa a tutti: non deve diventare il modo di sapere chi
// lo e'.
export function Accesso() {
  const [email, setEmail] = useState('')
  const [codice, setCodice] = useState('')
  const [fase, setFase] = useState<'email' | 'codice'>('email')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function mandaCodice() {
    setErrore(null)
    if (!emailValida(email)) return setErrore('Scrivi un indirizzo email valido.')
    setAttesa(true)
    const esito = await chiediCodice(email.trim().toLowerCase())
    setAttesa(false)
    if (!esito.ok) return setErrore(esito.errore)
    setCodice('')
    setFase('codice')
  }

  async function verifica() {
    setErrore(null)
    if (codice.replace(/\D/g, '').length < 6) return setErrore('Il codice ha sei cifre.')
    setAttesa(true)
    const esito = await entra(email.trim().toLowerCase(), codice)
    setAttesa(false)
    if (!esito.ok) setErrore(esito.errore)
    // Se e' andata, la sessione cambia e la pagina passa da sola all'area.
  }

  if (fase === 'codice') {
    return (
      <Pagina titolo="Controlla la tua email" sottotitolo={`Se ${email.trim()} è fra i tester, ti abbiamo mandato un codice di sei cifre.`}>
        <Campo
          etichetta="Codice"
          value={codice}
          onChangeText={(v) => setCodice(v.replace(/\D/g, '').slice(0, 10))}
          onSubmitEditing={verifica}
          inputMode="numeric"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="123456"
          maxLength={10}
          errore={!!errore}
          style={{ fontSize: 22, letterSpacing: 6 }}
        />
        {errore ? <Avviso>{errore}</Avviso> : null}
        <Bottone testo="Entra" onPress={verifica} inCorso={attesa} />
        <Bottone testo="Usa un’altra email o chiedi un nuovo codice" variante="contorno" onPress={() => setFase('email')} disabilitato={attesa} />
        <Testo variante="piccolo">Il codice vale un’ora. Non trovi l’email? Guarda nella posta indesiderata.</Testo>
      </Pagina>
    )
  }

  return (
    <Pagina titolo="Laboratorio" sottotitolo="Area di prova riservata ai tester: entri con la tua email, senza password.">
      <Campo
        etichetta="Email"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={mandaCodice}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        inputMode="email"
        keyboardType="email-address"
        placeholder="nome@esempio.it"
        errore={!!errore}
      />
      {errore ? <Avviso>{errore}</Avviso> : null}
      <Bottone testo="Mandami il codice" onPress={mandaCodice} inCorso={attesa} />
      <Testo variante="piccolo">
        Usa l’email con cui sei iscritto al club: è da lì che il laboratorio trova <Forte>i tuoi abbonamenti e la tua famiglia</Forte>.
      </Testo>
    </Pagina>
  )
}
