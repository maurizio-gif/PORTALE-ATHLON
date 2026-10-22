import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'

import { ordina, pagaOrdineConCarta, type OrdineAperto } from '@/api/shop'
import { InfoAdyen } from '@/components/InfoAdyen'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Icona } from '../ui/Icona'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { allineaAllaVetrina, impostaQuantita, togliDalCarrello, useCarrello } from './carrello'
import { Quantita } from './Quantita'
import { SegnapostoFoto } from './SegnapostoFoto'
import { useVetrina } from './useVetrina'

// Il carrello e il pagamento (18/10/2026), come «Acquista e prenota» delle lezioni singole: «Vai al pagamento» apre
// l'ordine da PerfectGym (**non addebita niente**: apre il link) e poi si paga sulla pagina protetta di Adyen,
// dove la carta si salva; chi ha gia' una carta salvata la vede («Carta •••• 1234») e paga con quella senza uscire.
//
// **Il totale che si vede qui e' una somma per comodita'.** Quello che si paga lo decide la funzione, che rilegge i
// prezzi da PerfectGym: se un prezzo e' cambiato o un articolo e' finito, l'ordine non parte, si ricarica la
// vetrina e si toglie dal carrello cio' che non c'e' piu'. Dopo l'apertura dell'ordine il totale mostrato e' quello
// della funzione.

const apri = (url: string) => (Platform.OS === 'web' ? void window.location.assign(url) : void Linking.openURL(url))

export function Carrello() {
  const p = usePalette()
  const { dati, errore: erroreVetrina, carica } = useVetrina()
  const { righe } = useCarrello()
  const inVista = vistaCorrente() !== null
  const [occupato, setOccupato] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)
  const [daPagare, setDaPagare] = useState<OrdineAperto | null>(null)

  const massimo = dati?.quantita_max ?? 5
  const articoli = new Map((dati?.articoli ?? []).map((a) => [a.product_id, a]))
  const voci = righe.map((r) => ({ r, a: articoli.get(r.product_id) }))
  const nonDisponibili = voci.filter((v) => !v.a || v.a.esaurito)
  // Somma per comodita', in centesimi: il totale vero e' quello che torna dall'ordine.
  const totale = voci.reduce((t, v) => t + (v.a ? Math.round(v.a.prezzo * 100) * v.r.quantita : 0), 0) / 100

  async function vaiAlPagamento() {
    setProblema(null)
    setOccupato(true)
    const r = await ordina(righe)
    setOccupato(false)
    if (!r.ok) {
      colpetto('errore')
      setProblema(r.errore)
      // Un articolo finito, non piu' in vendita o col prezzo cambiato: si rilegge la vetrina e si tiene solo cio' che c'e'.
      if (r.codice) {
        const v = await carica(true)
        if (v.ok) allineaAllaVetrina(v.articoli)
      }
      return
    }
    setDaPagare(r)
  }

  async function pagaConCarta(ordine: OrdineAperto) {
    setProblema(null)
    setOccupato(true)
    const r = await pagaOrdineConCarta(ordine.ordine_id)
    setOccupato(false)
    if (!r.ok) {
      colpetto('errore')
      return setProblema(r.errore)
    }
    router.replace({ pathname: '/shop/ordine/[id]', params: { id: ordine.ordine_id } })
  }

  if (!dati) {
    return (
      <Schermata titolo={t('Carrello', 'Cart')} indietro="/shop" barra={false}>
        {erroreVetrina ? (
          <View style={{ gap: spazio.tre }}>
            <Messaggio>{erroreVetrina}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={() => carica(true)} />
          </View>
        ) : (
          <SchedeInArrivo quante={2} />
        )}
      </Schermata>
    )
  }

  if (!righe.length) {
    return (
      <Schermata titolo={t('Carrello', 'Cart')} indietro="/shop" barra={false}>
        <Carta piatta>
          <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 15, lineHeight: 22 }}>{t('Il carrello è vuoto.', 'Your cart is empty.')}</Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 20, marginTop: 4 }}>{t('Scegli un articolo dallo shop e mettilo qui.', 'Pick an item from the shop and add it here.')}</Text>
        </Carta>
        {problema ? <Messaggio tono="attenzione">{problema}</Messaggio> : null}
        <Pulsante testo={t('Vai allo shop', 'Go to the shop')} variante="secondario" onPress={() => router.replace('/shop')} />
      </Schermata>
    )
  }

  return (
    <Schermata titolo={t('Carrello', 'Cart')} sottotitolo={t('Controlla gli articoli, poi vai al pagamento.', 'Check your items, then go to payment.')} indietro="/shop" barra={false}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {voci.map(({ r, a }, i) => (
          <View key={r.product_id} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
            <View style={[stili.miniatura, { backgroundColor: p.incavo }]}>{a ? a.foto[0] ? <Image source={{ uri: a.foto[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <SegnapostoFoto size={24} /> : null}</View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                {a?.nome ?? t('Articolo non più disponibile', 'Item no longer available')}
              </Text>
              {a && !a.esaurito ? (
                <>
                  <Text style={[stili.prezzoRiga, { color: p.testoSecondario }]}>
                    {euro(a.prezzo)} {r.quantita > 1 ? `× ${r.quantita} = ${euro(Math.round(a.prezzo * 100) * r.quantita / 100)}` : ''}
                  </Text>
                  {/* Con l'ordine gia' aperto il carrello non si cambia piu': l'ordine e' quello. */}
                  {daPagare ? null : <Quantita valore={r.quantita} massimo={massimo} nome={a.nome} onCambia={(n) => impostaQuantita(r.product_id, n, massimo)} />}
                </>
              ) : (
                <Text style={{ color: p.errore, fontFamily: F.bold, fontSize: 13.5 }}>{a ? t('Esaurito: toglilo per continuare.', 'Sold out: remove it to continue.') : t('Toglilo per continuare.', 'Remove it to continue.')}</Text>
              )}
            </View>
            {daPagare ? null : (
              <Tocco onPress={() => togliDalCarrello(r.product_id)} etichetta={t(`Togli ${a?.nome ?? 'l’articolo'} dal carrello`, `Remove ${a?.nome ?? 'the item'} from the cart`)} style={stili.togli}>
                <Icona nome="cestino" size={18} colore={p.testoSecondario} />
              </Tocco>
            )}
          </View>
        ))}
      </Carta>

      {inVista ? <Messaggio tono="attenzione">{t('Vista cliente: lo shop si guarda soltanto, non si compra.', 'Client view: you can browse the shop, but not buy.')}</Messaggio> : null}
      {problema ? <Messaggio>{problema}</Messaggio> : null}

      {daPagare ? (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.totale}>
            <Text style={[stili.totaleEtichetta, { color: p.testoSecondario }]}>{t('Totale da pagare', 'Total to pay')}</Text>
            <Text style={[stili.totaleCifra, { color: p.testo }]}>{euro(daPagare.totale)}</Text>
          </View>
          {daPagare.carta ? (
            <>
              <Pulsante
                testo={t(`Paga ${euro(daPagare.totale)} con la carta${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`, `Pay ${euro(daPagare.totale)} with card${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`)}
                icona="carta"
                inCorso={occupato}
                onPress={() => pagaConCarta(daPagare)}
              />
              <Pulsante testo={t('Usa un’altra carta', 'Use another card')} variante="fantasma" piccolo onPress={() => apri(daPagare.url)} disabilitato={occupato} />
            </>
          ) : (
            <Pulsante testo={t(`Vai al pagamento · ${euro(daPagare.totale)}`, `Go to payment · ${euro(daPagare.totale)}`)} icona="carta" onPress={() => apri(daPagare.url)} />
          )}
          <Pulsante testo={t('Torna al carrello', 'Back to cart')} variante="fantasma" piccolo onPress={() => setDaPagare(null)} disabilitato={occupato} />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {daPagare.carta ? t('La carta la custodisce ', 'Your card is stored by ') : t('Paghi sulla pagina protetta di ', 'You pay on the secure page of ')}
            <InfoAdyen />
            {daPagare.carta ? t(': il club non vede mai il numero completo.', ': the club never sees the full number.') : t(', in un passo solo: la carta resta salvata per i prossimi acquisti e il club non ne vede mai il numero completo.', ', in a single step: your card stays saved for future purchases and the club never sees the full number.')}
          </Text>
        </Carta>
      ) : (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.totale}>
            <Text style={[stili.totaleEtichetta, { color: p.testoSecondario }]}>{t('Totale', 'Total')}</Text>
            <Text style={[stili.totaleCifra, { color: p.testo }]}>{euro(totale)}</Text>
          </View>
          <Pulsante
            testo={t('Vai al pagamento', 'Go to payment')}
            icona="carta"
            inCorso={occupato}
            disabilitato={inVista || nonDisponibili.length > 0}
            onPress={vaiAlPagamento}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t('Il ritiro è in segreteria, negli orari di apertura del club: non facciamo spedizioni. Il prezzo si ricontrolla al pagamento, e non si addebita niente finché non confermi su Adyen o con la tua carta.', 'Pick up at reception during the club’s opening hours: we don’t ship. The price is checked again at payment, and nothing is charged until you confirm on Adyen or with your card.')}
          </Text>
        </Carta>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  miniatura: { width: 72, height: 72, borderRadius: 16, overflow: 'hidden' },
  nome: { fontFamily: F.bold, fontSize: 15, lineHeight: 20 },
  prezzoRiga: { fontFamily: F.semi, fontSize: 13.5 },
  togli: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  totale: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  totaleEtichetta: { fontFamily: F.bold, fontSize: 15 },
  totaleCifra: { fontFamily: F.extra, fontSize: 28, letterSpacing: -0.8 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
})
