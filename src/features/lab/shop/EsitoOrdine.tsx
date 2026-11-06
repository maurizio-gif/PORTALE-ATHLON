import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { configurazioneAdyen } from '@/api/lab'
import { esitoOrdine, esitoSessioneOrdine, type Ordine } from '@/api/shop'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { pagamentoDisponibile, riprendiDopoRedirect } from '../adyen'
import { scorda } from '../memoria'
import { primaVolta } from '../pagamento/comune'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { svuotaCarrello } from './carrello'
import { CodiceRitiro } from './CodiceRitiro'
import { giornoCorto } from './quando'
import { MessaggioRitiro } from './RitiroOrdine'
import { RigheOrdine } from './RigheOrdine'

// La pagina dell'ordine (`/shop/ordine/<id>`): ci si arriva appena il pagamento e' partito (carta salvata, conto, modulo di Adyen) o quando Adyen riporta qui dopo una
// 3D Secure o dal browser integrato. Chiede com'e' andata ogni 4 secondi, per due minuti, **finche' il webhook non ha confermato**: la conferma del pagamento non e'
// del ritorno dell'app, e di solito arriva in qualche secondo. Come il Calendario con `?acquisto=`. Il carrello si svuota solo quando l'ordine risulta pagato: se si
// torna indietro senza pagare, e' ancora li' per riprovare.
//
// **Un addebito sul conto (SEPA) e' gia' un ordine pagato**: la banca addebita in qualche giorno lavorativo e la ricevuta arriva per email quando l'addebito e'
// confermato. Se la carta passa da una 3D Secure l'indirizzo porta `sessionId` e `redirectResult`, che vanno consegnati ad Adyen (una volta sola, come per le gare)
// o il pagamento non si completa; poi si chiede ad Adyen com'e' andata (`esito_sessione`) per dire subito «rifiutato» invece di far aspettare i due minuti.
//
// Dopo il pagamento dice dov'e' la merce (`stato_ritiro`): in preordine, ordinata al fornitore, pronta in segreteria (col codice per il ritiro) o ritirata.

const OGNI_MS = 4000
const GIRI_MAX = 30

type Fallimento = 'rifiutato' | 'non_completato'

export function EsitoOrdine({ id }: { id: string }) {
  const p = usePalette()
  const { sessionId, redirectResult, addebito } = useLocalSearchParams<{ sessionId?: string; redirectResult?: string; addebito?: string }>()
  const [ordine, setOrdine] = useState<Ordine | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [finito, setFinito] = useState(false)
  const [fallito, setFallito] = useState<Fallimento | null>(null)
  const avviato = useRef(false)

  useEffect(() => {
    if (avviato.current) return
    avviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const r = await esitoOrdine(id)
      if (fermo) return
      if (!r.ok) return setErrore(r.errore)
      setOrdine(r.ordine)
      if (r.ordine.stato === 'pagato') {
        svuotaCarrello()
        // I prodotti della Home in memoria non hanno ancora questo ordine (e potrebbero essere freschi): alla prossima apertura si rileggono.
        scorda('prodotti:elenco')
        colpetto('ok')
        return
      }
      if (r.ordine.stato === 'avviato') {
        if (++giri < GIRI_MAX) setTimeout(giro, OGNI_MS)
        else setFinito(true)
      }
    }
    giro()

    // Il ritorno dalla 3D Secure o da un metodo con reindirizzamento: va consegnato ad Adyen, una volta sola per risultato. Se non riesce, il giro qui sopra segue comunque il webhook.
    if (pagamentoDisponibile && sessionId && redirectResult && primaVolta(`shop-redirect-${redirectResult.slice(0, 40)}`)) {
      ;(async () => {
        try {
          const cfg = await configurazioneAdyen()
          if (!cfg.ok) return
          const risultato = await riprendiDopoRedirect({ clientKey: cfg.clientKey, environment: cfg.environment, sessionId, redirectResult })
          if (fermo || !risultato) return
          const e = await esitoSessioneOrdine(id, sessionId, risultato)
          if (fermo || !e.ok) return
          if (e.adyen_status === 'refused' || e.adyen_status === 'canceled' || e.adyen_status === 'expired') {
            fermo = true
            colpetto('errore')
            setFallito(e.adyen_status === 'refused' ? 'rifiutato' : 'non_completato')
          }
        } catch {
          // il giro qui sopra segue comunque il webhook
        }
      })()
    }
    return () => {
      fermo = true
    }
    // Una volta sola per ordine: i parametri dell'indirizzo si leggono alla prima apertura, e un loro cambio non deve fermare il giro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (errore && !ordine) {
    return (
      <Schermata titolo={t('Ordine', 'Order')} indietro="/shop" barra={false}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Torna allo shop', 'Back to the shop')} variante="secondario" onPress={() => router.replace('/shop')} />
      </Schermata>
    )
  }

  if (fallito) {
    return (
      <Schermata titolo={fallito === 'rifiutato' ? t('Pagamento rifiutato', 'Payment declined') : t('Pagamento non completato', 'Payment not completed')} indietro="/shop" barra={false}>
        <Messaggio tono="errore">
          {fallito === 'rifiutato'
            ? t('La banca non ha autorizzato il pagamento. Non è stato addebitato nulla: puoi riprovare con un’altra carta.', 'Your bank didn’t authorize the payment. Nothing was charged: you can try another card.')
            : t('Il pagamento non è stato completato. Non è stato addebitato nulla.', 'The payment wasn’t completed. Nothing was charged.')}
        </Messaggio>
        <Pulsante testo={t('Torna al carrello', 'Back to cart')} onPress={() => router.replace('/shop/carrello')} />
        <Pulsante testo={t('I miei ordini', 'My orders')} variante="secondario" onPress={() => router.replace('/shop/ordini')} />
      </Schermata>
    )
  }

  if (!ordine || (ordine.stato === 'avviato' && !finito)) {
    return (
      <Schermata titolo={t('Verifichiamo il pagamento…', 'Checking your payment…')} indietro="/shop" barra={false}>
        <Carta style={stili.attesa}>
          <ActivityIndicator color={p.accento} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21, textAlign: 'center' }}>
            {t('Stiamo aspettando la conferma della banca: di solito bastano pochi secondi. Non chiudere la pagina.', 'We’re waiting for your bank’s confirmation: it usually takes a few seconds. Don’t close the page.')}
          </Text>
        </Carta>
      </Schermata>
    )
  }

  if (ordine.stato === 'pagato') {
    const sepaInCorso = ordine.pagamento === 'sepa' && ordine.sepa_stato === 'in_corso'
    const sepaKo = ordine.pagamento === 'sepa' && (ordine.sepa_stato === 'fallito' || ordine.sepa_stato === 'contestato')
    // La data dell'addebito arriva con l'indirizzo, dal momento in cui e' stato chiesto: l'ordine non la porta.
    const quando = typeof addebito === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(addebito) ? giornoCorto(addebito) : null
    return (
      <Schermata
        titolo={sepaInCorso ? t('Ordine confermato', 'Order confirmed') : t('Pagamento ricevuto', 'Payment received')}
        sopratitolo="Shop"
        sottotitolo={ordine.numero ? t(`Ordine n. ${ordine.numero}`, `Order no. ${ordine.numero}`) : undefined}
        indietro="/shop"
        barra={false}
      >
        {sepaInCorso ? (
          <Messaggio tono="ok" titolo={t('Addebito sul conto in corso', 'Direct debit in progress')}>
            {t(
              `La banca addebiterà ${euro(ordine.totale)} sul tuo conto${quando ? ` intorno al ${quando}` : ' nei prossimi giorni lavorativi'}. La ricevuta ti arriva per email quando l’addebito è confermato.`,
              `Your bank will debit ${euro(ordine.totale)} from your account${quando ? ` around ${quando}` : ' within the next few working days'}. The receipt arrives by email once the debit is confirmed.`,
            )}
          </Messaggio>
        ) : null}
        {sepaKo ? (
          <Messaggio tono="attenzione" titolo={t('L’addebito sul conto non è riuscito', 'The direct debit didn’t go through')}>
            {t('Puoi pagare con la carta da «I miei ordini».', 'You can pay by card from “My orders”.')}
          </Messaggio>
        ) : null}
        <MessaggioRitiro ordine={ordine} />
        <CodiceRitiro ordine={ordine} />
        <Carta style={{ paddingVertical: spazio.due }}>
          <RigheOrdine ordine={ordine} />
        </Carta>
        <Pulsante testo={t('I miei ordini', 'My orders')} variante="secondario" onPress={() => router.replace('/shop/ordini')} />
        <Pulsante testo={t('Torna allo shop', 'Back to the shop')} variante="fantasma" onPress={() => router.replace('/shop')} />
      </Schermata>
    )
  }

  // `errore`, oppure «avviato» dopo i due minuti: il pagamento non si vede.
  return (
    <Schermata titolo={ordine.stato === 'errore' ? t('Pagamento non riuscito', 'Payment failed') : t('Non vediamo ancora il pagamento', 'We can’t see the payment yet')} indietro="/shop" barra={false}>
      <Messaggio tono={ordine.stato === 'errore' ? 'errore' : 'attenzione'}>
        {ordine.stato === 'errore'
          ? (ordine.errore ?? t('Il pagamento non è andato a buon fine.', 'The payment didn’t go through.'))
          : t('Se hai completato il pagamento, aspetta qualche minuto e guarda in «I miei ordini»: compare appena la banca lo conferma. Se invece sei tornato indietro senza pagare, non è stato addebitato niente.', 'If you completed the payment, wait a few minutes and check “My orders”: it shows up as soon as your bank confirms it. If you went back without paying, nothing has been charged.')}
      </Messaggio>
      <Pulsante testo={t('Torna al carrello', 'Back to cart')} onPress={() => router.replace('/shop/carrello')} />
      <Pulsante testo={t('I miei ordini', 'My orders')} variante="secondario" onPress={() => router.replace('/shop/ordini')} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  attesa: { alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.quattro },
})
