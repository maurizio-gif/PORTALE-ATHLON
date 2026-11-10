import { useEffect, useRef, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'

import type { ImportiContratto } from '@/api/abbonamento'
import { esitoProposta, importiAdessoProposta, pagaProposta, type ErroreProposta } from '@/api/proposta'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Testo } from '@/components/Testo'
import { SchedaScelta } from '@/features/lab/abbonamento/Passi'
import { useImportiAdesso } from '@/features/lab/useImportiAdesso'
import { RiepilogoCosti } from '@/features/lab/RiepilogoCosti'
import { ModuloIban } from '@/features/metodo-pagamento/ModuloIban'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { apriPagamento } from '@/lib/pagamentoEsterno'
import { spazio, useColori } from '@/theme'

// Fase 4 della proposta: come si paga, dopo la firma. Il contratto non dice con cosa si paga, quindi il metodo si sceglie qui e
// si puo' ripetere finche' la prima quota non e' pagata. Chi compra da una proposta non ha una carta ne' un conto salvati su
// PerfectGym (lo sa il server, che per un metodo salvato che non c'e' risponde): qui si offrono solo una carta nuova, che si
// paga e si salva sulla pagina sicura della banca, e un IBAN nuovo con il suo mandato SEPA.

export function FasePagamento({
  token,
  firmato,
  errore,
  assistita,
  onPagato,
  onErrore,
}: {
  token: string
  /** Se la pagina e' stata riaperta dopo la firma non c'e': il numero e il riepilogo costi si vedevano al momento della firma. */
  firmato: { numero: string; importi: ImportiContratto } | null
  /** L'errore del tentativo di prima, se la pagina si e' riaperta dopo un pagamento non riuscito. */
  errore: string | null
  /** Sul totem con un operatore gia' sbloccato per questa proposta: la pagina della carta si apre qui senza richiedere il codice (`passaggio.ts`). */
  assistita?: boolean
  /** Pagina di pagamento chiusa, o addebito collegato: l'esito lo dice la fase dopo. */
  onPagato: () => void
  onErrore: (e: ErroreProposta) => boolean
}) {
  const c = useColori()
  const [metodo, setMetodo] = useState<'carta' | 'conto'>('carta')
  const [pagando, setPagando] = useState(false)
  const [erroreLocale, setErroreLocale] = useState<string | null>(errore)
  // Quello che si paga adesso (10/11/2026, Giorgia Levi Minzi): il credito sul conto puo' arrivare dopo la firma (il desk lo registra a contratto creato).
  // Si legge dal server anche se la pagina e' stata riaperta dopo la firma (`firmato` nullo), e si riallinea mentre si e' qui.
  const importi = useImportiAdesso(token, firmato?.importi ?? null, () => importiAdessoProposta(token))

  async function pagaConCarta() {
    setErroreLocale(null)
    setPagando(true)
    const r = await pagaProposta(token, { metodo: 'carta', con_carta: false })
    if (!r.ok) {
      setPagando(false)
      if (!onErrore(r)) setErroreLocale(r.errore)
      return
    }
    if (r.esito.url) {
      // Sul web si cambia pagina: al ritorno questa pagina si riapre da sola, sull'esito. Nell'app la pagina della banca e' un
      // browser integrato, e quando si chiude si va a guardare l'esito.
      await apriPagamento(r.esito.url, { giaAssistito: assistita })
      setPagando(false)
      return onPagato()
    }
    setPagando(false)
    onPagato()
  }

  return (
    <>
      <Avviso tono="ok">
        {firmato
          ? t(`Contratto n. ${firmato.numero} firmato. Il contratto non vincola il metodo di pagamento: scegli ora come pagare.`, `Contract no. ${firmato.numero} signed. The contract doesn’t tie you to a payment method: choose how to pay now.`)
          : t('Il contratto è firmato. Scegli come pagare.', 'The contract is signed. Choose how to pay.')}
      </Avviso>
      {erroreLocale ? <Avviso>{erroreLocale}</Avviso> : null}

      <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
        <SchedaScelta
          attiva={metodo === 'carta'}
          etichetta={t('Paga con carta', 'Pay by card')}
          icona="carta"
          titolo={t('Carta', 'Card')}
          sotto={t('La prima quota la paghi sulla pagina sicura della banca, che salva la carta: le quote dopo si addebitano da sole.', 'You pay the first installment on the bank’s secure page, which saves your card: later payments are charged automatically.')}
          onPress={() => {
            setMetodo('carta')
            setErroreLocale(null)
          }}
        />
        <SchedaScelta
          attiva={metodo === 'conto'}
          etichetta={t('Paga con conto corrente', 'Pay by bank account')}
          icona="banca"
          titolo={t('Conto corrente (addebito SEPA)', 'Bank account (SEPA direct debit)')}
          sotto={t('Le quote, la prima compresa, si addebitano sul tuo conto con il mandato SEPA. Non devi pagare altro adesso.', 'All payments, the first included, are charged to your account under the SEPA mandate. You don’t have to pay anything else now.')}
          onPress={() => {
            setMetodo('conto')
            setErroreLocale(null)
          }}
        />
      </View>

      {importi ? <RiepilogoCosti importi={importi} metodo={metodo} senzaTotale={importi.formula === 'flex'} /> : null}

      {metodo === 'conto' ? (
        <ModuloIban
          nomeCompleto=""
          introduzione={<Text style={[stili.nota, { color: c.testoSecondario }]}>{t('Scrivi l’IBAN su cui addebitare le quote.', 'Enter the IBAN to charge the installments to.')}</Text>}
          etichettaInvio={t('Conferma e attiva', 'Confirm and activate')}
          onInvia={async (d) => {
            const r = await pagaProposta(token, { metodo: 'conto', iban: d.iban, intestatario: d.intestatario, via: d.via, cap: d.cap, citta: d.citta })
            if (!r.ok) return onErrore(r) ? null : r.errore
            onPagato()
            return null
          }}
          onIndietro={() => setMetodo('carta')}
        />
      ) : (
        <Bottone
          testo={importi ? (importi.calendario.totale_oggi === 0 ? t('Conferma e attiva', 'Confirm and activate') : t(`Paga ${euro(importi.calendario.totale_oggi)}`, `Pay ${euro(importi.calendario.totale_oggi)}`)) : t('Vai al pagamento sicuro', 'Go to secure payment')}
          onPress={pagaConCarta}
          inCorso={pagando}
        />
      )}
      <Text style={[stili.nota, { color: c.testoSecondario }]}>
        {t('Se non finisci ora, riapri questo link: il contratto resta firmato e riprendi dal pagamento.', 'If you don’t finish now, reopen this link: the contract stays signed and you pick up from the payment.')}
      </Text>
    </>
  )
}

// ---------------------------------------------------------------------------
// L'esito

const GIRI_MAX = 15
const PAUSA_MS = 3000

/**
 * Dopo il pagamento, e al ritorno dalla pagina della banca: se la prima quota e il contratto sono a posto. Si aggiorna da solo per
 * qualche decina di secondi.
 *
 * **Un conto collegato non e' un pagamento**: l'addebito della prima quota parte con il mandato SEPA e si vede dopo. Si dice cosi',
 * e la quota non risulta pagata finche' non lo e' davvero.
 */
export function FaseEsito({
  token,
  numero,
  onRiprova,
  onErrore,
  onFine,
}: {
  token: string
  numero: string | null
  onRiprova: () => void
  onErrore: (e: ErroreProposta) => boolean
  /** Sul totem: «Ho finito, esco» al posto del rimando al sito. Fa uscire e non lascia niente a schermo. */
  onFine?: () => void
}) {
  const c = useColori()
  const [esito, setEsito] = useState<{ stato: string; come?: string; pagamentoOk: boolean; errore: string | null } | null>(null)
  const [erroreRete, setErroreRete] = useState<string | null>(null)
  const [finito, setFinito] = useState(false)
  const [giro, setGiro] = useState(0)
  const giri = useRef(0)

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout>
    giri.current = 0
    async function controlla() {
      const r = await esitoProposta(token)
      if (!vivo) return
      if (!r.ok) {
        if (onErrore(r)) return
        setErroreRete(r.errore)
      } else if (r.esito.firmata) {
        const e = r.esito
        setErroreRete(null)
        const guasto = e.stato === 'errore' || !!e.pagamento?.errore
        const collegato = !!e.pagamento?.ok && e.pagamento.come === 'addebito'
        setEsito({ stato: e.stato, come: e.pagamento?.come, pagamentoOk: !!e.pagamento?.ok, errore: e.pagamento?.errore ?? e.errore ?? null })
        if (e.stato === 'completato' || guasto || collegato) {
          setFinito(true)
          return
        }
      }
      giri.current += 1
      if (giri.current < GIRI_MAX) timer = setTimeout(controlla, PAUSA_MS)
      else setFinito(true)
    }
    controlla()
    return () => {
      vivo = false
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, giro])

  const collegato = !!esito?.pagamentoOk && esito.come === 'addebito'
  const fatto = esito?.stato === 'completato' && !collegato
  const guasto = esito?.stato === 'errore' || !!esito?.errore
  const inAttesa = !fatto && !guasto && !collegato

  return (
    <>
      {erroreRete ? <Avviso>{erroreRete}</Avviso> : null}
      {fatto ? (
        <Avviso tono="ok">
          <Testo>{t('Tutto a posto: il contratto è firmato e il pagamento è arrivato. Il tuo abbonamento è attivo. Il documento firmato lo trovi accedendo all’app con questa email.', 'All set: the contract is signed and the payment has arrived. Your membership is active. You’ll find the signed document by signing in to the app with this email.')}</Testo>
        </Avviso>
      ) : collegato ? (
        <Avviso tono="attenzione">
          <Testo>
            {t(
              'Il conto è collegato e il contratto è firmato. L’addebito della prima quota parte con il mandato SEPA: l’abbonamento risulta pagato solo quando l’addebito va a buon fine, di solito dopo qualche giorno. Non devi fare altro.',
              'Your account is linked and the contract is signed. The first installment is debited under the SEPA mandate: the membership counts as paid only once the debit goes through, usually after a few days. You don’t have to do anything else.',
            )}
          </Testo>
        </Avviso>
      ) : guasto ? (
        <Avviso>
          <Testo>
            {esito?.errore ?? t('Qualcosa non è andato a buon fine.', 'Something went wrong.')} {t('Il contratto è firmato e conservato: puoi riprovare a pagare, anche con un altro metodo.', 'The contract is signed and stored: you can try paying again, even with a different method.')}
          </Testo>
        </Avviso>
      ) : finito ? (
        <Avviso tono="attenzione">
          <Testo>
            {t(
              'Non vediamo ancora il pagamento. Se hai appena pagato, può servire qualche minuto: controlla di nuovo. Se non hai finito di pagare, scegli di nuovo come farlo.',
              'We can’t see the payment yet. If you’ve just paid, it may take a few minutes: check again. If you didn’t finish paying, choose how to pay again.',
            )}
          </Testo>
        </Avviso>
      ) : (
        <Avviso tono="attenzione">
          <Testo>{t('Stiamo verificando il pagamento e preparando il documento firmato. Non chiudere la pagina.', 'We’re verifying the payment and preparing the signed document. Don’t close the page.')}</Testo>
        </Avviso>
      )}
      {numero ? <Text style={[stili.nota, { color: c.testoSecondario }]}>{t(`Contratto n. ${numero}`, `Contract no. ${numero}`)}</Text> : null}
      {guasto || (inAttesa && finito) ? <Bottone testo={guasto ? t('Riprova il pagamento', 'Try the payment again') : t('Scegli come pagare', 'Choose how to pay')} onPress={onRiprova} /> : null}
      {inAttesa && finito ? <Bottone testo={t('Controlla di nuovo', 'Check again')} variante="contorno" onPress={() => {
            setFinito(false)
            setGiro((g) => g + 1)
          }} /> : null}
      {fatto || collegato ? (
        onFine ? (
          <Bottone testo={t('Ho finito, esco', 'I’m done, sign out')} onPress={onFine} />
        ) : (
          <Bottone testo={t('Vai al sito di Athlon', 'Go to the Athlon website')} variante="contorno" onPress={() => Linking.openURL('https://www.athlonroma.it/')} />
        )
      ) : null}
    </>
  )
}

const stili = StyleSheet.create({
  nota: { fontSize: 13, lineHeight: 19 },
})
