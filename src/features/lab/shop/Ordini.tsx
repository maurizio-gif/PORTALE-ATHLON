import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { miOrdini, type Ordine } from '@/api/shop'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Etichetta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { RigheOrdine } from './RigheOrdine'

// I miei ordini: quelli pagati, da ritirare in segreteria o gia' ritirati, e quello che si sta ancora pagando.
// Chi ha pagato e chiuso la pagina prima del ritorno lo ritrova qui appena PerfectGym registra il pagamento.

function giorno(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })
}

export function Ordini() {
  const p = usePalette()
  const [ordini, setOrdini] = useState<Ordine[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

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
        ordini.map((o) => (
          <Carta key={o.ordine_id} style={{ gap: spazio.tre }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spazio.tre }}>
              <Text style={{ color: p.testoSecondario, fontFamily: F.bold, fontSize: 14 }}>{giorno(o.pagato_il ?? o.creato_il)}</Text>
              {o.stato === 'pagato' ? (
                o.consegnato_il ? (
                  <Etichetta testo={t(`Ritirato il ${giorno(o.consegnato_il)}`, `Picked up on ${giorno(o.consegnato_il)}`)} tono="neutro" />
                ) : (
                  <Etichetta testo={t('Da ritirare in segreteria', 'To pick up at reception')} tono="ok" icona="spunta" />
                )
              ) : (
                <Etichetta testo={t('Pagamento in corso', 'Payment in progress')} tono="attenzione" icona="clessidra" />
              )}
            </View>
            <RigheOrdine ordine={o} />
            {o.stato === 'avviato' ? (
              <Pulsante testo={t('Controlla il pagamento', 'Check the payment')} variante="secondario" piccolo icona="aggiorna" onPress={() => router.push({ pathname: '/shop/ordine/[id]', params: { id: o.ordine_id } })} />
            ) : null}
          </Carta>
        ))
      )}
    </Schermata>
  )
}
