import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

import type { Scelte, ValoreScelta } from '@/api/shop'
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
import { aggiungiAlCarrello, aggiungiRigaConScelte, useCarrello } from './carrello'
import { Quantita } from './Quantita'
import { Questionario } from './Questionario'
import { giornoEOra } from './quando'
import { opzioniMancanti, testoMancante } from './scelte'
import { useVetrina } from './useVetrina'

// La pagina di un articolo: le foto (si scorrono), il prezzo, la descrizione e «Aggiungi al carrello». Quanti
// pezzi si possono mettere lo dice la vetrina (`quantita_max`): un articolo si compra al massimo in cinque pezzi per ordine.
//
// **Il questionario sta prima del carrello** (06/11/2026): un articolo con `opzioni` (il Kit Agonismo: chi e' l'atleta, la taglia della t-shirt e dello short)
// si compra un pezzo per volta, e finche' non ha tutte le risposte il pulsante e' spento e dice cosa manca. Aggiunto il pezzo, le risposte si svuotano: per un
// altro atleta si compila di nuovo, e le taglie di un bambino non passano per sbaglio a un altro. Un **preordine** dice che si paga adesso e si consegna quando
// la merce arriva, fino a quando si puo' comprare e, se il club li ha scritti, quando arriva e come si ritira: sono testi del server, mai scritti qui.

export function Articolo({ id }: { id: number }) {
  const p = usePalette()
  const { dati, errore, carica } = useVetrina()
  const { quantita } = useCarrello()
  const [scelti, setScelti] = useState(1)
  const [larghezza, setLarghezza] = useState(0)
  const [foto, setFoto] = useState(0)
  const [aggiunto, setAggiunto] = useState(false)
  const [risposte, setRisposte] = useState<Scelte>({})
  const inVista = vistaCorrente() !== null

  const a = dati?.articoli.find((x) => x.product_id === id)
  const massimo = dati?.quantita_max ?? 5
  const nelCarrello = quantita(id)
  const posti = Math.max(0, massimo - nelCarrello)
  const pezzi = Math.min(Math.max(1, scelti), Math.max(1, posti))
  const persone = dati?.persone ?? []
  const conOpzioni = (a?.opzioni.length ?? 0) > 0
  const mancanti = a ? opzioniMancanti(a, risposte, persone) : []
  const chiuso = !!a && a.preordine && !a.preordine_aperto

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
    if (conOpzioni) {
      // Un pezzo con le sue risposte. Se non tornano tutte o il tetto e' raggiunto non si aggiunge niente.
      if (mancanti.length || aggiungiRigaConScelte(a.product_id, risposte, massimo) === null) return
      setRisposte({})
    } else aggiungiAlCarrello(a.product_id, pezzi, massimo)
    colpetto('ok')
    setAggiunto(true)
    setScelti(1)
  }
  const rispondi = (id: string, v: ValoreScelta) => {
    setAggiunto(false)
    setRisposte((r) => ({ ...r, [id]: v }))
  }
  const testoPulsante = a.esaurito
    ? t('Esaurito', 'Sold out')
    : chiuso
      ? t('Preordine chiuso', 'Pre-order closed')
      : mancanti.length
        ? testoMancante(mancanti, (e) => t(`Manca: ${e}`, `Missing: ${e}`), (e) => t(`Mancano: ${e}`, `Missing: ${e}`))
        : t(`Aggiungi al carrello · ${euro(a.prezzo * (conOpzioni ? 1 : pezzi))}`, `Add to cart · ${euro(a.prezzo * (conOpzioni ? 1 : pezzi))}`)

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
          <View style={stili.tag}>
            {a.preordine ? <Tag testo={t('Preordine', 'Pre-order')} colore={p.accento} /> : null}
            {a.esaurito ? <Tag testo={t('Esaurito', 'Sold out')} colore={p.testo} /> : null}
          </View>
        </View>
        {a.descrizione ? <Text style={[stili.descrizione, { color: p.testoSecondario }]}>{a.descrizione}</Text> : null}
        {a.preordine ? (
          <View style={[stili.preordine, { backgroundColor: p.incavo }]}>
            <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{t('Si paga adesso e si consegna quando la merce arriva.', 'You pay now and it’s handed over when the goods arrive.')}</Text>
            {a.preordine_aperto && a.preordine_chiude ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Si chiude il ${giornoEOra(a.preordine_chiude)}.`, `Closes on ${giornoEOra(a.preordine_chiude)}.`)}</Text> : null}
            {a.consegna_prevista ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Consegna prevista: ${a.consegna_prevista}`, `Expected delivery: ${a.consegna_prevista}`)}</Text> : null}
          </View>
        ) : null}
        <Text style={[stili.nota, { color: p.testoTerzo }]}>{a.preordine && a.ritiro_testo ? a.ritiro_testo : t('Si ritira in segreteria, negli orari di apertura del club.', 'Pick up at reception during the club’s opening hours.')}</Text>
      </Carta>

      {inVista ? (
        <Messaggio tono="attenzione">{t('Vista cliente: lo shop si guarda soltanto, non si compra.', 'Client view: you can browse the shop, but not buy.')}</Messaggio>
      ) : chiuso ? (
        <Messaggio tono="attenzione" titolo={t('Preordine chiuso', 'Pre-order closed')}>
          {t('Questo preordine non si può più acquistare.', 'This pre-order can no longer be bought.')}
        </Messaggio>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {a.esaurito ? null : conOpzioni ? (
            <Carta style={{ gap: spazio.quattro }}>
              <Questionario opzioni={a.opzioni} persone={persone} risposte={risposte} onCambia={rispondi} />
            </Carta>
          ) : posti > 0 ? (
            <View style={stili.quantita}>
              <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{t('Quanti', 'Quantity')}</Text>
              <Quantita valore={pezzi} massimo={posti} nome={a.nome} onCambia={(n) => setScelti(n)} />
            </View>
          ) : null}
          {!a.esaurito && posti === 0 ? <Messaggio tono="attenzione">{t(`Nel carrello hai già il massimo di questo articolo (${massimo} pezzi per ordine).`, `You already have the maximum of this item in your cart (${massimo} per order).`)}</Messaggio> : null}
          <Pulsante testo={testoPulsante} icona="carrello" disabilitato={a.esaurito || posti === 0 || mancanti.length > 0} onPress={aggiungi} />
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
  tag: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  preordine: { marginTop: spazio.tre, padding: spazio.tre, borderRadius: 14, gap: 4 },
  prezzo: { fontFamily: F.extra, fontSize: 28, letterSpacing: -0.8 },
  descrizione: { fontFamily: F.medio, fontSize: 15, lineHeight: 23, marginTop: spazio.tre },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19, marginTop: spazio.tre },
  quantita: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
