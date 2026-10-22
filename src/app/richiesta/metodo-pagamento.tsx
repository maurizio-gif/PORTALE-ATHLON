import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { emailValida, inviaRichiesta } from '@/api/richieste'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { spazio, useColori } from '@/theme'
import { t } from '@/lib/lingua'

// Il primo flusso del binario A, sopra la rotta che il CRM ha gia'
// (`/api/metodo-pagamento/richiesta`, la stessa del modulo del sito). Il link
// che arriva per email porta qui, a `/r/<token>` (tappa 1).
export default function RichiestaMetodoPagamento() {
  const c = useColori()
  const [email, setEmail] = useState('')
  const [stato, setStato] = useState<'modulo' | 'invio' | 'inviata'>('modulo')
  const [errore, setErrore] = useState<string | null>(null)

  async function invia() {
    setErrore(null)
    if (!emailValida(email)) {
      setErrore(t('Scrivi un indirizzo email valido.', 'Enter a valid email address.'))
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
      <Pagina titolo={t('Controlla la tua email', 'Check your email')} sottotitolo={t(`Se ${email.trim()} è l’indirizzo registrato al club, tra pochi minuti ti arriva un link valido 3 giorni.`, `If ${email.trim()} is the address registered with the club, in a few minutes you’ll get a link valid for 3 days.`)}>
        <Text style={[stili.nota, { color: c.testoSecondario }]}>
          {t('Dal link vedi i tuoi abbonamenti e quelli dei tuoi figli, e scegli conto corrente o carta. Non trovi l’email? Guarda nella posta indesiderata.', 'From the link you’ll see your memberships and your children’s, and choose bank account or card. Can’t find the email? Check your spam folder.')}
        </Text>
        <Bottone testo={t('Usa un’altra email', 'Use another email')} variante="contorno" onPress={() => setStato('modulo')} />
      </Pagina>
    )
  }

  return (
    <Pagina titolo={t('Metodo di pagamento', 'Payment method')} sottotitolo={t('Scrivi l’email con cui sei iscritto: ti mandiamo il link per salvare IBAN o carta.', 'Enter the email you’re registered with: we’ll send you the link to save your IBAN or card.')}>
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
          placeholder={t('nome@esempio.it', 'name@example.com')}
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
      <Bottone testo={t('Mandami il link', 'Send me the link')} onPress={invia} inCorso={stato === 'invio'} />
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
