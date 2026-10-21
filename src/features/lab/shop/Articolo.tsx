import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { SegnapostoFoto } from './SegnapostoFoto'
import { colpetto } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { BottoneCarrello } from './BottoneCarrello'
import { aggiungiAlCarrello, useCarrello } from './carrello'
import { Quantita } from './Quantita'
import { useVetrina } from './useVetrina'

// La pagina di un articolo: le foto (si scorrono), il prezzo, la descrizione e «Aggiungi al carrello». Quanti
// pezzi si possono mettere lo dice la vetrina (`quantita_max`): un articolo si compra al massimo in cinque pezzi per ordine.

export function Articolo({ id }: { id: number }) {
  const p = usePalette()
  const { dati, errore, carica } = useVetrina()
  const { quantita } = useCarrello()
  const [scelti, setScelti] = useState(1)
  const [larghezza, setLarghezza] = useState(0)
  const [foto, setFoto] = useState(0)
  const [aggiunto, setAggiunto] = useState(false)
  const inVista = vistaCorrente() !== null

  const a = dati?.articoli.find((x) => x.product_id === id)
  const massimo = dati?.quantita_max ?? 5
  const nelCarrello = quantita(id)
  const posti = Math.max(0, massimo - nelCarrello)
  const pezzi = Math.min(Math.max(1, scelti), Math.max(1, posti))

  const scorri = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (larghezza) setFoto(Math.round(e.nativeEvent.contentOffset.x / larghezza))
  }

  if (!dati) {
    return (
      <Schermata titolo={t('Articolo', 'Item')} indietro="/shop" barra={false}>
        {errore ? (
          <View style={{ gap: spazio.tre }}>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={() => carica(true)} />
          </View>
        ) : (
          <SchedeInArrivo quante={2} />
        )}
      </Schermata>
    )
  }

  if (!a) {
    return (
      <Schermata titolo={t('Articolo', 'Item')} indietro="/shop" barra={false}>
        <Messaggio tono="attenzione">{t('Questo articolo non è più in vetrina.', 'This item is no longer in the shop.')}</Messaggio>
        <Pulsante testo={t('Torna allo shop', 'Back to the shop')} variante="secondario" onPress={() => router.replace('/shop')} />
      </Schermata>
    )
  }

  const aggiungi = () => {
    aggiungiAlCarrello(a.product_id, pezzi, massimo)
    colpetto('ok')
    setAggiunto(true)
    setScelti(1)
  }

  return (
    <Schermata titolo={a.nome} sopratitolo={a.categoria} indietro="/shop" barra={false} destra={inVista ? undefined : <BottoneCarrello />}>
      <View onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} style={{ gap: spazio.due }}>
        {a.foto.length ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={scorri}
            scrollEventThrottle={16}
            style={[stili.galleria, { backgroundColor: p.incavo }]}
          >
            {a.foto.map((u, i) => (
              <Image
                key={u}
                source={{ uri: u }}
                style={{ width: larghezza || 320, aspectRatio: 1 }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={t(`${a.nome}, foto ${i + 1} di ${a.foto.length}`, `${a.nome}, photo ${i + 1} of ${a.foto.length}`)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[stili.galleria, { backgroundColor: p.incavo, width: '100%', aspectRatio: 1 }]}>
            <SegnapostoFoto size={56} />
          </View>
        )}
        {a.foto.length > 1 ? (
          <View style={stili.puntini} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {a.foto.map((u, i) => (
              <View key={u} style={[stili.puntino, { backgroundColor: i === foto ? p.accento : p.linea }]} />
            ))}
          </View>
        ) : null}
      </View>

      <Carta>
        <View style={stili.testa}>
          <Text style={[stili.prezzo, { color: p.testo }]}>{euro(a.prezzo)}</Text>
          {a.esaurito ? <Tag testo={t('Esaurito', 'Sold out')} colore={p.testo} /> : null}
        </View>
        {a.descrizione ? <Text style={[stili.descrizione, { color: p.testoSecondario }]}>{a.descrizione}</Text> : null}
        <Text style={[stili.nota, { color: p.testoTerzo }]}>{t('Si ritira in segreteria, negli orari di apertura del club.', 'Pick up at reception during the club’s opening hours.')}</Text>
      </Carta>

      {inVista ? (
        <Messaggio tono="attenzione">{t('Vista cliente: lo shop si guarda soltanto, non si compra.', 'Client view: you can browse the shop, but not buy.')}</Messaggio>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {a.esaurito ? null : posti > 0 ? (
            <View style={stili.quantita}>
              <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{t('Quanti', 'Quantity')}</Text>
              <Quantita valore={pezzi} massimo={posti} nome={a.nome} onCambia={(n) => setScelti(n)} />
            </View>
          ) : (
            <Messaggio tono="attenzione">{t(`Nel carrello hai già il massimo di questo articolo (${massimo} pezzi per ordine).`, `You already have the maximum of this item in your cart (${massimo} per order).`)}</Messaggio>
          )}
          <Pulsante testo={a.esaurito ? t('Esaurito', 'Sold out') : t(`Aggiungi al carrello · ${euro(a.prezzo * pezzi)}`, `Add to cart · ${euro(a.prezzo * pezzi)}`)} icona="carrello" disabilitato={a.esaurito || posti === 0} onPress={aggiungi} />
          {aggiunto ? (
            <>
              <Messaggio tono="ok">{nelCarrello === 1 ? t('Aggiunto: nel carrello hai 1 pezzo.', 'Added: you have 1 item in your cart.') : t(`Aggiunto: nel carrello hai ${nelCarrello} pezzi.`, `Added: you have ${nelCarrello} items in your cart.`)}</Messaggio>
              <Pulsante testo={t('Vai al carrello', 'Go to cart')} variante="scuro" icona="avanti" onPress={() => router.push('/shop/carrello')} />
            </>
          ) : null}
        </View>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  galleria: { borderRadius: 28, overflow: 'hidden' },
  puntini: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  puntino: { width: 8, height: 8, borderRadius: 4 },
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spazio.tre },
  prezzo: { fontFamily: F.extra, fontSize: 28, letterSpacing: -0.8 },
  descrizione: { fontFamily: F.medio, fontSize: 15, lineHeight: 23, marginTop: spazio.tre },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19, marginTop: spazio.tre },
  quantita: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
