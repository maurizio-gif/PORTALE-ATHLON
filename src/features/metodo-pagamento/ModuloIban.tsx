import { useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Forte, Testo } from '@/components/Testo'
import { controllaIban, controllaIndirizzo } from '@/lib/metodoPagamento'
import { spazio, tinta, useColori } from '@/theme'
import { t, tv } from '@/lib/lingua'

// Il modulo del conto corrente: IBAN, intestatario, il suo indirizzo, chi
// gestisce l'addebito e l'autorizzazione SEPA. Ripreso dal CRM
// (`_condivisi/ModuloIban.tsx`), testi compresi: il mandato e' la formula che
// GoCardless chiede, e non si riscrive.
//
// L'IBAN e l'indirizzo si controllano qui prima di mandarli, codice di
// controllo compreso: un carattere sbagliato si corregge subito, invece di
// tornare come un rifiuto del gestionale dopo qualche secondo.

export type DatiConto = { iban: string; intestatario: string; via: string; cap: string; citta: string; consenso: true }

export function ModuloIban({
  nomeCompleto,
  introduzione,
  etichettaInvio = t('Salva il conto', 'Save the account'),
  onInvia,
  onIndietro,
}: {
  nomeCompleto: string
  introduzione: ReactNode
  etichettaInvio?: string
  /** Restituisce un errore da mostrare, o null se e' andata. */
  onInvia: (dati: DatiConto) => Promise<string | null>
  onIndietro: () => void
}) {
  const c = useColori()
  const [iban, setIban] = useState('')
  const [intestatario, setIntestatario] = useState(nomeCompleto)
  // L'indirizzo parte vuoto, sempre: e' quello di chi intesta il conto, che
  // puo' non essere chi si allena.
  const [via, setVia] = useState('')
  const [cap, setCap] = useState('')
  const [citta, setCitta] = useState('')
  const [consenso, setConsenso] = useState(false)
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  async function invia() {
    setErrore('')
    const controllo = controllaIban(iban)
    if (!controllo.ok) return setErrore(controllo.errore)
    if (intestatario.trim().length < 3) return setErrore(t('Scrivi nome e cognome di chi intesta il conto.', 'Enter the first and last name of the account holder.'))
    const indirizzo = controllaIndirizzo({ via, cap, citta })
    if (!indirizzo.ok) return setErrore(indirizzo.errore)
    if (!consenso) return setErrore(t('Per salvare il conto serve l’autorizzazione all’addebito.', 'To save the account we need your authorization for the direct debit.'))

    setAttesa(true)
    try {
      const problema = await onInvia({ iban: controllo.iban, intestatario: intestatario.trim(), ...indirizzo.valori, consenso: true })
      if (problema) setErrore(problema)
    } catch {
      setErrore(t('Non siamo riusciti a salvarlo adesso. Riprova fra qualche minuto.', 'We couldn’t save it right now. Try again in a few minutes.'))
    }
    setAttesa(false)
  }

  return (
    <>
      <Testo variante="sottotitolo">{t('Conto corrente', 'Bank account')}</Testo>
      {introduzione}

      <Campo
        etichetta="IBAN"
        value={iban}
        onChangeText={(v) => setIban(v.toUpperCase())}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        placeholder="IT60 X054 2811 1010 0000 0123 456"
        style={{ letterSpacing: 0.5, fontVariant: ['tabular-nums'] }}
      />
      <Campo etichetta={t('Intestatario del conto', 'Account holder')} value={intestatario} onChangeText={setIntestatario} autoComplete="name" />
      <Campo
        etichetta={t('Indirizzo dell’intestatario', 'Account holder’s address')}
        value={via}
        onChangeText={setVia}
        autoComplete="street-address"
        placeholder={t('Via e numero civico', 'Street and house number')}
      />
      <View style={stili.affiancati}>
        <View style={{ flex: 2 }}>
          <Campo etichetta={t('CAP', 'Postcode')} value={cap} onChangeText={setCap} autoComplete="postal-code" inputMode="numeric" />
        </View>
        <View style={{ flex: 3 }}>
          <Campo etichetta={t('Città', 'City')} value={citta} onChangeText={setCitta} autoComplete="address-line2" />
        </View>
      </View>

      {/* Chi gestisce l'addebito si dice prima della casella: chi autorizza
          deve sapere a chi, e sull'estratto conto il nome di GoCardless
          senza una spiegazione e' l'addebito che si contesta per sbaglio. */}
      <View style={[stili.riquadro, { backgroundColor: tinta(c.testo, 0.04), borderColor: tinta(c.testo, 0.1) }]}>
        <Testo variante="piccolo" style={{ color: c.testo }}>
          {tv(
            <>
              <Forte>Chi gestisce l’addebito: GoCardless.</Forte> Gli addebiti diretti SEPA del club passano da GoCardless, un istituto di
              pagamento europeo autorizzato e vigilato, specializzato negli addebiti ricorrenti sul conto corrente e usato da migliaia di
              aziende in Europa.
            </>,
            <>
              <Forte>Who handles the debit: GoCardless.</Forte> The club’s SEPA direct debits go through GoCardless, a licensed and
              supervised European payment institution, specialized in recurring debits from bank accounts and used by thousands of
              businesses in Europe.
            </>,
          )}
        </Testo>
        <Testo variante="piccolo" style={{ color: c.testo }}>
          {tv(
            <>
              <Forte>Sul tuo estratto conto</Forte> l’addebito comparirà con i nomi di <Forte>GoCardless</Forte> e di <Forte>Point 2000</Forte>:
              è GoCardless che addebita l’importo, per conto di Point 2000 SSD (Athlon Club). Non è un addebito sconosciuto: sono le quote
              del tuo abbonamento.
            </>,
            <>
              <Forte>On your bank statement</Forte> the debit will show the names <Forte>GoCardless</Forte> and <Forte>Point 2000</Forte>:
              GoCardless collects the amount on behalf of Point 2000 SSD (Athlon Club). It’s not an unknown charge: it’s the fees of your
              membership.
            </>,
          )}
        </Testo>
      </View>

      <Casella spuntata={consenso} onCambia={() => setConsenso((v) => !v)} etichetta={t('Autorizzo l’addebito diretto SEPA', 'I authorize the SEPA direct debit')}>
        <Testo variante="piccolo" style={{ color: c.testo, fontStyle: 'italic' }}>
          {t(
            'Autorizzo Società Sportiva Dilettantistica Point 2000 SSD (Centro Sportivo Athlon) e GoCardless, suo fornitore dei servizi di pagamento, a inviare istruzioni alla mia banca per addebitare su questo conto le quote del mio abbonamento con addebito diretto SEPA, e la mia banca a eseguire gli addebiti secondo queste istruzioni. Ho diritto al rimborso dalla mia banca secondo le condizioni del mio contratto con lei: il rimborso va chiesto entro 8 settimane dalla data dell’addebito.',
            'Courtesy translation: the Italian text is the binding version. I authorize Società Sportiva Dilettantistica Point 2000 SSD (Centro Sportivo Athlon) and GoCardless, its payment service provider, to send instructions to my bank to debit the fees of my membership from this account by SEPA direct debit, and my bank to carry out the debits in accordance with those instructions. I am entitled to a refund from my bank under the terms and conditions of my agreement with it: a refund must be claimed within 8 weeks from the date of the debit.',
          )}
        </Testo>
      </Casella>

      {errore ? <Avviso>{errore}</Avviso> : null}

      <Bottone testo={etichettaInvio} onPress={invia} inCorso={attesa} />
      <Bottone testo={t('Indietro', 'Back')} variante="contorno" onPress={onIndietro} disabilitato={attesa} />
    </>
  )
}

const stili = StyleSheet.create({
  affiancati: { flexDirection: 'row', gap: spazio.due + 2 },
  riquadro: { borderWidth: 1, borderRadius: 10, padding: spazio.tre, gap: spazio.due },
})
