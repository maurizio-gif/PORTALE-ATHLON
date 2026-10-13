import { useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Campo } from '@/components/Campo'
import { Casella } from '@/components/Casella'
import { Forte, Testo } from '@/components/Testo'
import { controllaIban, controllaIndirizzo } from '@/lib/metodoPagamento'
import { spazio, tinta, useColori } from '@/theme'

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
  etichettaInvio = 'Salva il conto',
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
    if (intestatario.trim().length < 3) return setErrore('Scrivi nome e cognome di chi intesta il conto.')
    const indirizzo = controllaIndirizzo({ via, cap, citta })
    if (!indirizzo.ok) return setErrore(indirizzo.errore)
    if (!consenso) return setErrore('Per salvare il conto serve l’autorizzazione all’addebito.')

    setAttesa(true)
    try {
      const problema = await onInvia({ iban: controllo.iban, intestatario: intestatario.trim(), ...indirizzo.valori, consenso: true })
      if (problema) setErrore(problema)
    } catch {
      setErrore('Non siamo riusciti a salvarlo adesso. Riprova fra qualche minuto.')
    }
    setAttesa(false)
  }

  return (
    <>
      <Testo variante="sottotitolo">Conto corrente</Testo>
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
      <Campo etichetta="Intestatario del conto" value={intestatario} onChangeText={setIntestatario} autoComplete="name" />
      <Campo
        etichetta="Indirizzo dell’intestatario"
        value={via}
        onChangeText={setVia}
        autoComplete="street-address"
        placeholder="Via e numero civico"
      />
      <View style={stili.affiancati}>
        <View style={{ flex: 2 }}>
          <Campo etichetta="CAP" value={cap} onChangeText={setCap} autoComplete="postal-code" inputMode="numeric" />
        </View>
        <View style={{ flex: 3 }}>
          <Campo etichetta="Città" value={citta} onChangeText={setCitta} autoComplete="address-line2" />
        </View>
      </View>

      {/* Chi gestisce l'addebito si dice prima della casella: chi autorizza
          deve sapere a chi, e sull'estratto conto il nome di GoCardless
          senza una spiegazione e' l'addebito che si contesta per sbaglio. */}
      <View style={[stili.riquadro, { backgroundColor: tinta(c.testo, 0.04), borderColor: tinta(c.testo, 0.1) }]}>
        <Testo variante="piccolo" style={{ color: c.testo }}>
          <Forte>Chi gestisce l’addebito: GoCardless.</Forte> Gli addebiti diretti SEPA del club passano da GoCardless, un istituto di
          pagamento europeo autorizzato e vigilato, specializzato negli addebiti ricorrenti sul conto corrente e usato da migliaia di
          aziende in Europa.
        </Testo>
        <Testo variante="piccolo" style={{ color: c.testo }}>
          <Forte>Sul tuo estratto conto</Forte> l’addebito comparirà con i nomi di <Forte>GoCardless</Forte> e di <Forte>Point 2000</Forte>:
          è GoCardless che addebita l’importo, per conto di Point 2000 SSD (Athlon Club). Non è un addebito sconosciuto: sono le quote
          del tuo abbonamento.
        </Testo>
      </View>

      <Casella spuntata={consenso} onCambia={() => setConsenso((v) => !v)} etichetta="Autorizzo l’addebito diretto SEPA">
        <Testo variante="piccolo" style={{ color: c.testo, fontStyle: 'italic' }}>
          Autorizzo Società Sportiva Dilettantistica Point 2000 SSD (Centro Sportivo Athlon) e GoCardless, suo fornitore dei servizi di
          pagamento, a inviare istruzioni alla mia banca per addebitare su questo conto le quote del mio abbonamento con addebito diretto
          SEPA, e la mia banca a eseguire gli addebiti secondo queste istruzioni. Ho diritto al rimborso dalla mia banca secondo le
          condizioni del mio contratto con lei: il rimborso va chiesto entro 8 settimane dalla data dell’addebito.
        </Testo>
      </Casella>

      {errore ? <Avviso>{errore}</Avviso> : null}

      <Bottone testo={etichettaInvio} onPress={invia} inCorso={attesa} />
      <Bottone testo="Indietro" variante="contorno" onPress={onIndietro} disabilitato={attesa} />
    </>
  )
}

const stili = StyleSheet.create({
  affiancati: { flexDirection: 'row', gap: spazio.due + 2 },
  riquadro: { borderWidth: 1, borderRadius: 10, padding: spazio.tre, gap: spazio.due },
})
