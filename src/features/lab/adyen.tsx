import type { AdyenComponent, AdyenError, Configuration, SessionsResult } from '@adyen/react-native'
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import type { SessioneAdyen } from '@/api/lab'
import { Avviso } from '@/components/Avviso'
import { ambienteNativo, sdkAdyen, type SdkAdyen } from '@/lib/adyenNativo'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Pulsante } from './ui/kit'
import { F, usePalette } from './ui/tema'

// Il pagamento con carta **dentro l'app** (10/11/2026, richiesta di Maurizio: «far aprire la schermata di pagamento in app, senza il link esterno, come nel portale web»).
//
// Prima, nell'app nativa, la carta nuova passava da un link di Adyen aperto nel browser integrato (`apriPagamento`): una pagina di un altro sito, con i suoi
// «Termini e condizioni», e una carta da riscrivere a ogni acquisto. Adesso c'e' il Drop-in **nativo** di Adyen (`@adyen/react-native`): un foglio dell'app, con la 3D Secure
// dentro l'SDK (niente browser), e la carta si **salva pagando**, come sul web (la sessione la prepara il server con `storePaymentMethod`), cosi' la volta dopo e' un tocco.
//
// Questo file e' per iOS e Android; sul web c'e' `adyen.web.tsx` (stesso nome, stessa forma: `pagamentoDisponibile`, `DropIn`, `riprendiDopoRedirect`).
//
// **Senza l'SDK nella build** (Expo Go, un development build di prima) `pagamentoDisponibile` e' falso, e le schermate fanno quello che facevano prima: il link nel browser
// integrato. Vedi `lib/adyenNativo.ts`. Il modulo nativo e' entrato con la 3.1.0 dell'app: una build 3.0.0 non e' fra quelle che ricevono questo codice in volo.
//
// **Come si apre.** `DropIn` monta il contesto dell'SDK sulla sessione e, appena i metodi sono pronti, apre il foglio da solo: chi ha scelto «Paga con una carta» non deve
// premere altro. Se chiude il foglio senza pagare resta un pulsante per riprenderlo (la sessione e' ancora valida). Quando il pagamento finisce, qualunque esito, si chiama
// `onFine` con il `sessionResult`, e la schermata lo chiede al server: l'SDK non fa fede, e la conferma e' sempre del webhook di Adyen.

export const pagamentoDisponibile = sdkAdyen() !== null

/** Se il foglio non e' pronto entro questo tempo la sessione non si e' creata: si dice, e si puo' riprovare. */
const ATTESA_MAX_MS = 25_000

type Props = {
  sessione: SessioneAdyen
  onFine: (sessionResult: string | null) => void
  onErrore: (messaggio: string) => void
}

export function DropIn(props: Props) {
  const sdk = sdkAdyen()
  if (!sdk) {
    return <Avviso tono="attenzione">{t('Su questo dispositivo il pagamento con carta si completa dal browser: apri app.athlonroma.it.', 'On this device, card payment is completed in the browser: open app.athlonroma.it.')}</Avviso>
  }
  return <DropInNativo sdk={sdk} {...props} />
}

function DropInNativo({ sdk, sessione, onFine, onErrore }: Props & { sdk: SdkAdyen }) {
  // Le funzioni della schermata cambiano a ogni disegno: l'SDK ne tiene una sola copia, e la legge da qui.
  const richiami = useRef({ onFine, onErrore })
  richiami.current = { onFine, onErrore }
  const [interrotto, setInterrotto] = useState(false)

  const configurazione = useMemo<Configuration>(
    () => ({
      environment: ambienteNativo(sessione.environment),
      clientKey: sessione.clientKey,
      countryCode: 'IT',
      locale: locale(),
      // Quello che il server ha dato ad Adyen come ritorno: i due devono essere lo stesso indirizzo.
      returnUrl: sessione.ritornoNativo ?? 'athlon://',
      analytics: { enabled: false },
      ...(sessione.importoCent ? { amount: { currency: 'EUR', value: sessione.importoCent } } : {}),
      // Un solo metodo (la carta, vedi `METODI_NATIVI` sul server): si apre direttamente il modulo della carta, senza una lista di un elemento.
      dropin: { skipListWhenSinglePaymentMethod: true, showPreselectedStoredPaymentMethod: false },
      // La carta si salva sempre pagando, e la schermata lo dice prima: niente interruttore da spuntare (sul web e' lo stesso, la sessione lo impone).
      card: { showStorePaymentField: false },
    }),
    [sessione.environment, sessione.clientKey, sessione.ritornoNativo, sessione.importoCent],
  )
  const sessioneAdyen = useMemo(() => ({ id: sessione.sessione.id, sessionData: sessione.sessione.sessionData }), [sessione.sessione.id, sessione.sessione.sessionData])

  // Finito: qualunque esito, anche un rifiuto. La schermata chiede ad Adyen, dal server, com'e' andata.
  const alTermine = useCallback((risultato: SessionsResult, componente: AdyenComponent) => {
    componente.hide(true)
    richiami.current.onFine(risultato?.sessionResult ? String(risultato.sessionResult) : null)
  }, [])

  const inErrore = useCallback(
    (errore: AdyenError, componente: AdyenComponent) => {
      // Ha chiuso il foglio: non e' un errore, si puo' riprendere.
      if (errore.errorCode === sdk.ErrorCode.canceled) {
        componente.hide(false)
        setInterrotto(true)
        return
      }
      // Con la sessione non creata non c'e' nessun foglio da chiudere.
      if (errore.errorCode !== sdk.ErrorCode.sessionError) componente.hide(false)
      console.warn('[adyen] errore del pagamento', errore.errorCode, errore.message)
      richiami.current.onErrore(t('Il pagamento non è andato a buon fine. Se non vedi l’addebito puoi riprovare.', 'The payment didn’t go through. If you don’t see a charge you can try again.'))
    },
    [sdk],
  )

  const nonPronto = useCallback(() => {
    richiami.current.onErrore(t('Non siamo riusciti ad aprire il pagamento. Controlla la rete e riprova.', 'We couldn’t open the payment. Check your connection and try again.'))
  }, [])

  // L'SDK controlla la configurazione dentro un effetto e, se non torna (una chiave client malformata), solleva: senza un riparo cadrebbe l'intera schermata.
  const rotto = useCallback((e: unknown) => {
    console.warn('[adyen] configurazione non valida', e)
    richiami.current.onErrore(t('Non siamo riusciti ad aprire il pagamento. Riprova fra qualche minuto.', 'We couldn’t open the payment. Please try again in a few minutes.'))
  }, [])

  return (
    <Riparo onErrore={rotto}>
      <sdk.AdyenCheckout config={configurazione} session={sessioneAdyen} onComplete={alTermine} onError={inErrore}>
        <Apertura sdk={sdk} interrotto={interrotto} onRiprendi={() => setInterrotto(false)} onNonPronto={nonPronto} />
      </sdk.AdyenCheckout>
    </Riparo>
  )
}

/** Prende l'errore sollevato dall'SDK mentre si monta, lo passa alla schermata e non mostra niente al suo posto (la schermata offre «Riprova»). */
class Riparo extends Component<{ children: ReactNode; onErrore: (e: unknown) => void }, { rotto: boolean }> {
  state = { rotto: false }
  static getDerivedStateFromError() {
    return { rotto: true }
  }
  componentDidCatch(e: unknown) {
    this.props.onErrore(e)
  }
  render() {
    return this.state.rotto ? null : this.props.children
  }
}

/** Dentro il contesto dell'SDK: apre il foglio della carta appena i metodi sono pronti, e lo fa riaprire se la persona lo chiude. */
function Apertura({ sdk, interrotto, onRiprendi, onNonPronto }: { sdk: SdkAdyen; interrotto: boolean; onRiprendi: () => void; onNonPronto: () => void }) {
  const p = usePalette()
  const { start, isReady } = sdk.useAdyenCheckout()
  const aperto = useRef(false)

  useEffect(() => {
    if (!isReady || aperto.current) return
    aperto.current = true
    start('dropIn')
  }, [isReady, start])

  useEffect(() => {
    if (isReady) return
    const id = setTimeout(onNonPronto, ATTESA_MAX_MS)
    return () => clearTimeout(id)
  }, [isReady, onNonPronto])

  if (interrotto) {
    return (
      <View style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Hai chiuso il pagamento prima di completarlo.', 'You closed the payment before completing it.')}</Text>
        <Pulsante
          testo={t('Riprendi il pagamento', 'Resume the payment')}
          icona="carta"
          onPress={() => {
            onRiprendi()
            start('dropIn')
          }}
        />
      </View>
    )
  }
  return (
    <View style={stili.attesa} accessibilityRole="progressbar" accessibilityLabel={t('Apro il pagamento sicuro', 'Opening the secure payment')}>
      <ActivityIndicator color={p.accento} />
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Apro il pagamento sicuro…', 'Opening the secure payment…')}</Text>
    </View>
  )
}

/**
 * Il ritorno dalla 3D Secure o da un metodo con reindirizzamento. Nell'app lo consegna l'SDK, da solo, quando riprende il controllo: qui non c'e' niente da fare, e la
 * schermata segue comunque il webhook. Risponde `null` («nessun risultato in mano»), come fa chi non riesce a riprendere.
 */
export async function riprendiDopoRedirect(_: { clientKey: string; environment: string; sessionId: string; redirectResult: string }): Promise<string | null> {
  return null
}

const stili = StyleSheet.create({
  attesa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 20 },
})
