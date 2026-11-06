import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { miOrdini, type Ordine } from '@/api/shop'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Etichetta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { CassaShop } from './CassaShop'
import { CodiceRitiro } from './CodiceRitiro'
import { giorno } from './quando'
import { RigaRitiro, testiRitiro } from './RitiroOrdine'
import { RigheOrdine } from './RigheOrdine'

// I miei ordini: quelli pagati (in preordine, ordinati al fornitore, pronti da ritirare in segreteria, ritirati) e quelli ancora da pagare. Chi ha pagato e ha chiuso la
// pagina prima del ritorno lo ritrova qui appena il webhook conferma il pagamento. **Lo stato del ritiro e' del server** (`stato_ritiro`): il QR compare solo
// quando la merce e' pronta (`CodiceRitiro`).
//
// **Un addebito sul conto che non riesce** (`sepa_stato` fallito o contestato) lascia l'ordine com'e' ma lo dice, e propone di pagare con la carta: la carta prende il
// posto dell'addebito (e' cio' che fa il database quando arriva il pagamento, come per le gare). Qui la cassa si apre con `soloCarta`: riproporre il conto sarebbe
// rifare lo stesso errore.

function sepaNonRiuscito(o: Ordine): boolean {
  return o.stato === 'pagato' && o.pagamento === 'sepa' && (o.sepa_stato === 'fallito' || o.sepa_stato === 'contestato')
}

export function Ordini() {
  const p = usePalette()
  const [ordini, setOrdini] = useState<Ordine[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [cassa, setCassa] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await miOrdini()
    if (r.ok) setOrdini(r.ordini)
    else setErrore(r.errore)
  }, [])
  useEffect(() => {
    carica()
  }, [carica])

  return (
    <Schermata titolo={t('I miei ordini', 'My orders')} sopratitolo="Shop" sottotitolo={t('Gli articoli si ritirano in segreteria.', 'Items are picked up at reception.')} indietro="/shop" barra={false}>
      {errore && !ordini ? (
        <View style={{ gap: spazio.tre }}>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={carica} />
        </View>
      ) : !ordini ? (
        <SchedeInArrivo quante={2} />
      ) : !ordini.length ? (
        <>
          <Carta piatta>
            <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>{t('Non hai ancora ordini.', 'You don’t have any orders yet.')}</Text>
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 20, marginTop: 4 }}>{t('Quando compri qualcosa nello shop lo ritrovi qui.', 'When you buy something in the shop, you’ll find it here.')}</Text>
          </Carta>
          <Pulsante testo={t('Vai allo shop', 'Go to the shop')} variante="secondario" onPress={() => router.replace('/shop')} />
        </>
      ) : (
        ordini.map((o) => {
          const ko = sepaNonRiuscito(o)
          const ritiro = o.stato === 'pagato' && o.stato_ritiro ? testiRitiro(o.stato_ritiro, o.consegnato_il) : null
          return (
            <Carta key={o.ordine_id} style={{ gap: spazio.tre }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spazio.due }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: p.testoSecondario, fontFamily: F.bold, fontSize: 14 }}>{giorno(o.pagato_il ?? o.creato_il)}</Text>
                  {o.numero ? <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 12.5 }}>{t(`Ordine n. ${o.numero}`, `Order no. ${o.numero}`)}</Text> : null}
                </View>
                {ko ? (
                  <Etichetta testo={t('Addebito non riuscito', 'Debit failed')} tono="attenzione" icona="attenzione" />
                ) : o.stato === 'pagato' && ritiro ? (
                  <Etichetta testo={ritiro.etichetta} tono={ritiro.tono} icona={o.stato_ritiro === 'pronto' ? 'spunta' : undefined} />
                ) : o.stato === 'errore' ? (
                  <Etichetta testo={t('Pagamento non riuscito', 'Payment failed')} tono="errore" />
                ) : (
                  <Etichetta testo={t('Pagamento in corso', 'Payment in progress')} tono="attenzione" icona="clessidra" />
                )}
              </View>
              <RigheOrdine ordine={o} />
              {o.stato === 'pagato' && !ko ? <RigaRitiro ordine={o} /> : null}
              {o.stato === 'pagato' && o.pagamento === 'sepa' && o.sepa_stato === 'in_corso' ? (
                <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
                  {t('Addebito sul conto in corso: la ricevuta ti arriva per email quando la banca lo conferma.', 'Direct debit in progress: the receipt arrives by email once your bank confirms it.')}
                </Text>
              ) : null}
              {o.stato === 'errore' && o.errore ? <Messaggio>{o.errore}</Messaggio> : null}
              {!ko ? <CodiceRitiro ordine={o} size={148} /> : null}
              {ko ? (
                cassa === o.ordine_id ? (
                  <CassaShop ordineId={o.ordine_id} totale={o.totale} soloCarta chiudi={t('Non adesso', 'Not now')} onChiudi={() => setCassa(null)} />
                ) : (
                  <>
                    <Messaggio tono="attenzione" titolo={t('L’addebito sul conto non è riuscito', 'The direct debit didn’t go through')}>
                      {t('Puoi pagare con la carta.', 'You can pay by card.')}
                    </Messaggio>
                    <Pulsante testo={t('Paga con la carta', 'Pay by card')} icona="carta" onPress={() => setCassa(o.ordine_id)} />
                  </>
                )
              ) : null}
              {o.stato === 'avviato' ? (
                <Pulsante testo={t('Controlla il pagamento', 'Check the payment')} variante="secondario" piccolo icona="aggiorna" onPress={() => router.push({ pathname: '/shop/ordine/[id]', params: { id: o.ordine_id } })} />
              ) : null}
            </Carta>
          )
        })
      )}
    </Schermata>
  )
}
