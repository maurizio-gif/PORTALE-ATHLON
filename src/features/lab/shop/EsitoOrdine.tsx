import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { esitoOrdine, type Ordine } from '@/api/shop'
import { spazio } from '@/theme'

import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'
import { svuotaCarrello } from './carrello'
import { RigheOrdine } from './RigheOrdine'

// Il ritorno dal pagamento (`/shop/ordine/<id>`): la pagina di Adyen riporta qui, e si chiede com'e' andata finche'
// PerfectGym non ha registrato il pagamento (arriva qualche secondo dopo), per due minuti. Come il Calendario con
// `?acquisto=`. Il carrello si svuota solo quando l'ordine risulta pagato: se si torna indietro senza pagare, e'
// ancora li' per riprovare.

const OGNI_MS = 4000
const GIRI_MAX = 30

export function EsitoOrdine({ id }: { id: string }) {
  const p = usePalette()
  const [ordine, setOrdine] = useState<Ordine | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [finito, setFinito] = useState(false)
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
        colpetto('ok')
        return
      }
      if (r.ordine.stato === 'avviato') {
        if (++giri < GIRI_MAX) setTimeout(giro, OGNI_MS)
        else setFinito(true)
      }
    }
    giro()
    return () => {
      fermo = true
    }
  }, [id])

  if (errore && !ordine) {
    return (
      <Schermata titolo="Ordine" indietro="/shop" barra={false}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Torna allo shop" variante="secondario" onPress={() => router.replace('/shop')} />
      </Schermata>
    )
  }

  if (!ordine || (ordine.stato === 'avviato' && !finito)) {
    return (
      <Schermata titolo="Verifichiamo il pagamento…" indietro="/shop" barra={false}>
        <Carta style={stili.attesa}>
          <ActivityIndicator color={p.accento} />
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21, textAlign: 'center' }}>
            Aspettiamo la conferma di PerfectGym: di solito basta qualche secondo. Non chiudere la pagina.
          </Text>
        </Carta>
      </Schermata>
    )
  }

  if (ordine.stato === 'pagato') {
    return (
      <Schermata titolo="Pagamento ricevuto" sopratitolo="Shop" indietro="/shop" barra={false}>
        <Messaggio tono="ok" titolo={ordine.consegnato_il ? 'Ritirato' : 'Da ritirare in segreteria'}>
          {ordine.consegnato_il ? 'Questo ordine è già stato consegnato.' : 'Passa in segreteria, negli orari di apertura del club: ti consegniamo gli articoli.'}
        </Messaggio>
        <Carta style={{ paddingVertical: spazio.due }}>
          <RigheOrdine ordine={ordine} />
        </Carta>
        <Pulsante testo="I miei ordini" variante="secondario" onPress={() => router.replace('/shop/ordini')} />
        <Pulsante testo="Torna allo shop" variante="fantasma" onPress={() => router.replace('/shop')} />
      </Schermata>
    )
  }

  // `errore`, oppure «avviato» dopo i due minuti: il pagamento non si vede.
  return (
    <Schermata titolo={ordine.stato === 'errore' ? 'Pagamento non riuscito' : 'Non vediamo ancora il pagamento'} indietro="/shop" barra={false}>
      <Messaggio tono={ordine.stato === 'errore' ? 'errore' : 'attenzione'}>
        {ordine.stato === 'errore'
          ? (ordine.errore ?? 'Il pagamento non è andato a buon fine.')
          : 'Se hai completato il pagamento, aspetta qualche minuto e guarda in «I miei ordini»: compare appena PerfectGym lo registra. Se invece sei tornato indietro senza pagare, non è stato addebitato niente.'}
      </Messaggio>
      <Pulsante testo="Torna al carrello" onPress={() => router.replace('/shop/carrello')} />
      <Pulsante testo="I miei ordini" variante="secondario" onPress={() => router.replace('/shop/ordini')} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  attesa: { alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.quattro },
})
