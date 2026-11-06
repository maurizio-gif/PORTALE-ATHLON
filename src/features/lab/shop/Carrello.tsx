import { Image } from 'expo-image'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { ordina, type OrdineAperto } from '@/api/shop'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Carta, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Icona } from '../ui/Icona'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { allineaAllaVetrina, impostaQuantita, togliArticolo, togliRiga, useCarrello } from './carrello'
import { CassaShop } from './CassaShop'
import { Quantita } from './Quantita'
import { rispostaCompleta, testoScelte } from './scelte'
import { SegnapostoFoto } from './SegnapostoFoto'
import { useVetrina } from './useVetrina'

// Il carrello e il pagamento (18/10/2026, rifatto il 06/11/2026 con lo shop nostro): «Vai al pagamento» **apre l'ordine** (non addebita niente: la funzione rilegge
// i prezzi dal catalogo e controlla le risposte del questionario) e sotto compare la cassa (`CassaShop`), con le stesse strade delle gare: la carta gia' salvata con un
// tocco, il conto gia' salvato, una carta nuova col modulo di Adyen.
//
// **Il totale che si vede qui e' una somma per comodita'.** Quello che si paga lo decide la funzione: se un prezzo e' cambiato, un articolo e' finito, un preordine
// si e' chiuso o le risposte non tornano piu', l'ordine non parte, si ricarica la vetrina e si toglie dal carrello cio' che non c'e' piu'. Dopo l'apertura dell'ordine il
// totale mostrato e' quello della funzione, e il carrello non si cambia piu': l'ordine e' quello. «Torna al carrello» lo lascia e ne apre uno nuovo.
//
// **Un preordine si compra da solo** (una consegna sola per ordine): con altri articoli in carrello (o con un secondo preordine di un altro articolo) il pagamento resta
// spento e un avviso lo dice. Lo rifiuterebbe comunque la funzione (`misto`); qui si dice prima. Piu' pezzi dello stesso preordine, per atleti diversi, vanno insieme.

export function Carrello() {
  const p = usePalette()
  const { dati, errore: erroreVetrina, carica } = useVetrina()
  const { righe } = useCarrello()
  const inVista = vistaCorrente() !== null
  const [occupato, setOccupato] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)
  const [daPagare, setDaPagare] = useState<OrdineAperto | null>(null)

  const massimo = dati?.quantita_max ?? 5
  const persone = dati?.persone ?? []
  const articoli = new Map((dati?.articoli ?? []).map((a) => [a.product_id, a]))
  const voci = righe.map((r) => ({ r, a: articoli.get(r.product_id) }))
  // Cosa non si puo' ordinare cosi' com'e': l'articolo non c'e' piu' o e' esaurito, il preordine si e' chiuso, le risposte del questionario non tornano piu'.
  const motivoNo = (v: (typeof voci)[number]): 'sparito' | 'esaurito' | 'chiuso' | 'scelte' | null => {
    if (!v.a) return 'sparito'
    if (v.a.esaurito) return 'esaurito'
    if (v.a.preordine && !v.a.preordine_aperto) return 'chiuso'
    if (v.a.opzioni.length && !rispostaCompleta(v.a, v.r.scelte, persone)) return 'scelte'
    return null
  }
  const nonDisponibili = voci.filter((v) => motivoNo(v) !== null)
  // Un preordine con qualunque altro articolo (o con un secondo preordine diverso) non si puo' pagare: una consegna sola per ordine.
  const preordini = voci.filter((v) => v.a?.preordine)
  const misto = preordini.length > 0 && new Set(righe.map((r) => r.product_id)).size > 1
  const soloPreordine = preordini.length > 0 && !misto ? preordini[0].a : undefined
  // Somma per comodita', in centesimi: il totale vero e' quello che torna dall'ordine.
  const totale = voci.reduce((t, v) => t + (v.a ? Math.round(v.a.prezzo * 100) * v.r.quantita : 0), 0) / 100

  async function vaiAlPagamento() {
    setProblema(null)
    setOccupato(true)
    const r = await ordina(righe)
    setOccupato(false)
    if (!r.ok) {
      colpetto('errore')
      // Le risposte di un articolo che la funzione non accetta piu' non si correggono dal carrello: si toglie l'articolo, e si rifanno dalla sua scheda.
      const tolto = r.codice === 'scelte' && r.product_id !== undefined
      if (tolto) togliArticolo(r.product_id as number)
      setProblema(tolto ? `${r.errore} ${t('Abbiamo tolto l’articolo dal carrello: rimettilo dalla sua scheda e rifai le scelte.', 'We removed the item from your cart: add it again from its page and redo the choices.')}` : r.errore)
      // Un articolo finito, non piu' in vendita, un preordine chiuso o col prezzo cambiato: si rilegge la vetrina e si tiene solo cio' che c'e'.
      if (r.codice) {
        const v = await carica(true)
        if (v.ok) allineaAllaVetrina(v.articoli, v.persone)
      }
      return
    }
    setDaPagare(r)
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
        {voci.map((v, i) => {
          const { r, a } = v
          const no = motivoNo(v)
          const scelte = a && r.scelte ? testoScelte(a, r.scelte, persone) : []
          return (
            <View key={r.id} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
              <View style={[stili.miniatura, { backgroundColor: p.incavo }]}>{a ? a.foto[0] ? <Image source={{ uri: a.foto[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <SegnapostoFoto size={24} /> : null}</View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                  {a?.nome ?? t('Articolo non più disponibile', 'Item no longer available')}
                </Text>
                {a?.preordine ? (
                  <View style={{ alignSelf: 'flex-start' }}>
                    <Tag testo={t('Preordine', 'Pre-order')} colore={p.accento} />
                  </View>
                ) : null}
                {no === null && a ? (
                  <>
                    {scelte.length ? <Text style={[stili.scelte, { color: p.testo }]}>{scelte.join(' · ')}</Text> : null}
                    <Text style={[stili.prezzoRiga, { color: p.testoSecondario }]}>
                      {euro(a.prezzo)} {r.quantita > 1 ? `× ${r.quantita} = ${euro(Math.round(a.prezzo * 100) * r.quantita / 100)}` : ''}
                    </Text>
                    {/* Con l'ordine gia' aperto il carrello non si cambia piu': l'ordine e' quello. Un pezzo con le sue risposte non ha quantita': e' un pezzo. */}
                    {daPagare || r.scelte ? null : <Quantita valore={r.quantita} massimo={massimo} nome={a.nome} onCambia={(n) => impostaQuantita(r.product_id, n, massimo)} />}
                  </>
                ) : (
                  <Text style={{ color: p.errore, fontFamily: F.bold, fontSize: 13.5 }}>
                    {no === 'esaurito'
                      ? t('Esaurito: toglilo per continuare.', 'Sold out: remove it to continue.')
                      : no === 'chiuso'
                        ? t('Preordine chiuso: toglilo per continuare.', 'Pre-order closed: remove it to continue.')
                        : no === 'scelte'
                          ? t('Le scelte non sono più valide: toglilo e rifalle dalla sua scheda.', 'The choices are no longer valid: remove it and redo them from its page.')
                          : t('Toglilo per continuare.', 'Remove it to continue.')}
                  </Text>
                )}
              </View>
              {daPagare ? null : (
                <Tocco
                  onPress={() => togliRiga(r.id)}
                  etichetta={t(`Togli ${a?.nome ?? 'l’articolo'}${scelte.length ? ` (${scelte.join(', ')})` : ''} dal carrello`, `Remove ${a?.nome ?? 'the item'}${scelte.length ? ` (${scelte.join(', ')})` : ''} from the cart`)}
                  style={stili.togli}
                >
                  <Icona nome="cestino" size={18} colore={p.testoSecondario} />
                </Tocco>
              )}
            </View>
          )
        })}
      </Carta>

      {inVista ? <Messaggio tono="attenzione">{t('Vista cliente: lo shop si guarda soltanto, non si compra.', 'Client view: you can browse the shop, but not buy.')}</Messaggio> : null}
      {misto && !daPagare ? (
        <Messaggio tono="attenzione" titolo={t('Il preordine si compra da solo', 'A pre-order is bought on its own')}>
          {t('Un preordine ha una consegna sua: toglilo dal carrello, oppure togli gli altri articoli, e paga a parte.', 'A pre-order has its own delivery: take it out of the cart, or remove the other items, and pay separately.')}
        </Messaggio>
      ) : null}
      {problema ? <Messaggio>{problema}</Messaggio> : null}

      {daPagare ? (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.totale}>
            <Text style={[stili.totaleEtichetta, { color: p.testoSecondario }]}>{t('Totale da pagare', 'Total to pay')}</Text>
            <Text style={[stili.totaleCifra, { color: p.testo }]}>{euro(daPagare.totale)}</Text>
          </View>
          {daPagare.preordine ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('È un preordine: paghi adesso e ti diciamo quando arriva.', 'This is a pre-order: you pay now and we’ll tell you when it arrives.')}</Text> : null}
          <CassaShop key={daPagare.ordine_id} ordineId={daPagare.ordine_id} totale={daPagare.totale} chiudi={t('Torna al carrello', 'Back to cart')} onChiudi={() => setDaPagare(null)} />
        </Carta>
      ) : (
        <Carta style={{ gap: spazio.tre }}>
          <View style={stili.totale}>
            <Text style={[stili.totaleEtichetta, { color: p.testoSecondario }]}>{t('Totale', 'Total')}</Text>
            <Text style={[stili.totaleCifra, { color: p.testo }]}>{euro(totale)}</Text>
          </View>
          <Pulsante testo={t('Vai al pagamento', 'Go to payment')} icona="carta" inCorso={occupato} disabilitato={inVista || nonDisponibili.length > 0 || misto} onPress={vaiAlPagamento} />
          {soloPreordine ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {soloPreordine.consegna_prevista ? t(`È un preordine: paghi adesso e lo ritiri quando arriva. Consegna prevista: ${soloPreordine.consegna_prevista}.`, `This is a pre-order: you pay now and pick it up when it arrives. Expected delivery: ${soloPreordine.consegna_prevista}.`) : t('È un preordine: paghi adesso e ti diciamo quando arriva.', 'This is a pre-order: you pay now and we’ll tell you when it arrives.')}
            </Text>
          ) : null}
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t('Il ritiro è in segreteria, negli orari di apertura del club: non facciamo spedizioni. Il prezzo si ricontrolla quando apri l’ordine, e non si addebita niente finché non confermi il pagamento.', 'Pick up at reception during the club’s opening hours: we don’t ship. The price is checked again when the order opens, and nothing is charged until you confirm the payment.')}
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
  scelte: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 },
  prezzoRiga: { fontFamily: F.semi, fontSize: 13.5 },
  togli: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  totale: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  totaleEtichetta: { fontFamily: F.bold, fontSize: 15 },
  totaleCifra: { fontFamily: F.extra, fontSize: 28, letterSpacing: -0.8 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
})
