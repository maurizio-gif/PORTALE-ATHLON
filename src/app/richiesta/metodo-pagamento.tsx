import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { emailValida, inviaRichiesta } from '@/api/richieste'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { spazio, useColori } from '@/theme'

// Il primo flusso del binario A, sopra la rotta che il CRM ha gia'
// (`/api/metodo-pagamento/richiesta`): il link che arriva apre per ora la
// pagina sul CRM. Alla tappa 1 la pagina trasloca qui, in `/r/[token]`.
export default function RichiestaMetodoPagamento() {
  const c = useColori()
  const [email, setEmail] = useState('')
  const [stato, setStato] = useState<'modulo' | 'invio' | 'inviata'>('modulo')
  const [errore, setErrore] = useState<string | null>(null)

  async function invia() {
    setErrore(null)
    if (!emailValida(email)) {
      setErrore('Scrivi un indirizzo email valido.')
      return
    }
    setStato('invio')
    const esito = await inviaRichiesta('metodo_pagamento', email.trim())
    if (esito.ok) setStato('inviata')
    else {
      setErrore(esito.errore)
      setStato('modulo')
    }
  }

  if (stato === 'inviata') {
    return (
      <Pagina titolo="Controlla la tua email" sottotitolo={`Se ${email.trim()} è l’indirizzo registrato al club, tra pochi minuti ti arriva un link valido 3 giorni.`}>
        <Text style={[stili.nota, { color: c.testoSecondario }]}>
          Dal link vedi i tuoi abbonamenti e quelli dei tuoi figli, e scegli conto corrente o carta. Non trovi l’email? Guarda nella posta indesiderata.
        </Text>
        <Bottone testo="Usa un’altra email" variante="contorno" onPress={() => setStato('modulo')} />
      </Pagina>
    )
  }

  return (
    <Pagina titolo="Metodo di pagamento" sottotitolo="Scrivi l’email con cui sei iscritto: ti mandiamo il link per salvare IBAN o carta.">
      <View style={stili.campo}>
        <Text style={[stili.etichetta, { color: c.testo }]} nativeID="etichetta-email">
          Email
        </Text>
        <TextInput
          accessibilityLabelledBy="etichetta-email"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={invia}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          inputMode="email"
          keyboardType="email-address"
          placeholder="nome@esempio.it"
          placeholderTextColor={c.testoSecondario}
          returnKeyType="send"
          style={[stili.input, { color: c.testo, borderColor: errore ? c.errore : c.bordo, backgroundColor: c.superficie }]}
        />
        {errore ? (
          <Text accessibilityRole="alert" style={[stili.errore, { color: c.errore }]}>
            {errore}
          </Text>
        ) : null}
      </View>
      <Bottone testo="Mandami il link" onPress={invia} inCorso={stato === 'invio'} />
    </Pagina>
  )
}

const stili = StyleSheet.create({
  campo: { gap: spazio.due },
  etichetta: { fontSize: 15, fontWeight: '600' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: spazio.tre, fontSize: 16 },
  errore: { fontSize: 14 },
  nota: { fontSize: 15, lineHeight: 22 },
})
