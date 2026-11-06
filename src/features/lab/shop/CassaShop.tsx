import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import type { SessioneAdyen } from '@/api/lab'
import {
  carteSalvateShop,
  contoSalvatoShop,
  esitoSessioneOrdine,
  linkPagamentoOrdine,
  pagaOrdineConCartaSalvata,
  pagaOrdineConConto,
  sessioneOrdine,
  type CartaSalvataShop,
  type ContoSalvatoShop,
} from '@/api/shop'
import { Casella } from '@/components/Casella'
import { InfoAdyen } from '@/components/InfoAdyen'
import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { apriPagamento } from '@/lib/pagamentoEsterno'
import { spazio } from '@/theme'
import { passaDalTotem } from '@/features/lab/totem/passaggio'

import { DropIn, pagamentoDisponibile } from '../adyen'
import { nomeCarta } from '../pagamento/comune'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'

// La cassa dello shop (06/11/2026, decisione di Maurizio: «gestiamo il pagamento come per le gare di nuoto, quindi tramite carta o a debito su conto»).
// Le strade sono quelle di `CassaGara` (`junior/Gare.tsx`), sull'**ordine** e con le azioni di `portale-lab-shop`:
//
//   1. **La carta gia' salvata, con un tocco**: «Paga 79 € con •••• 1234», senza CVC ne' 3D Secure (servono alla prima registrazione). Con piu' carte, una lista.
//   2. **Il conto gia' salvato su PerfectGym** (addebito SEPA sul mandato che c'e': nessun IBAN da scrivere, nessun mandato nuovo). Si sceglie, si spunta
//      l'autorizzazione col testo che scrive il server (importo, ultime cifre), e l'ordine e' **pagato subito**: l'incasso lo fa la banca in qualche giorno.
//   3. **Una carta nuova col Drop-in di Adyen** (solo web), che **salva la carta pagando** e lo dice prima. Dopo una 3D Secure Adyen riporta su
//      `/shop/ordine/<id>` con `sessionId` e `redirectResult` (li consegna `EsitoOrdine`).
//   4. **Nell'app nativa** il Drop-in non c'e' (`pagamentoDisponibile` falso): la carta nuova passa dal link nel browser integrato.
//
// **La conferma del pagamento non e' di questa schermata**: e' del webhook di Adyen (carta) o di GoCardless (SEPA). Qui si chiede il pagamento e, quando e' partito,
// si va alla pagina dell'ordine (`EsitoOrdine`), che chiede com'e' andata finche' non lo sa. Solo se la banca rifiuta si resta qui, con «Riprova».
//
// **Sul totem ogni pagamento passa dalle tre strade** (QR, email, operatore: `totem/passaggio.ts`): lo fa `passaDalTotem` prima di addebitare una carta salvata,
// il conto, o aprire il modulo di una carta nuova; il link dell'app nativa lo fa `apriPagamento`. Fuori dal totem non cambia niente.
//
// `soloCarta` serve a un ordine il cui addebito sul conto non e' riuscito: la carta prende il suo posto, e proporre di nuovo il conto sarebbe rifare lo stesso errore.

type EsitoCassa = { tono: 'ok' | 'attenzione' | 'errore'; titolo: string; testo: string; altra?: boolean }

// Nella scelta, il conto si distingue dalle carte con questo id (i token di Adyen non lo sono mai).
const CONTO = 'conto'

const SEZIONE = '/shop/carrello'

export function CassaShop({ ordineId, totale, soloCarta = false, chiudi, onChiudi }: { ordineId: string; totale: number; soloCarta?: boolean; chiudi: string; onChiudi: () => void }) {
  const p = usePalette()
  const [fase, setFase] = useState<'carico' | 'carte' | 'nuova' | 'ferma'>('carico')
  const [carte, setCarte] = useState<CartaSalvataShop[]>([])
  const [conto, setConto] = useState<ContoSalvatoShop | null>(null)
  const [autorizzo, setAutorizzo] = useState(false)
  const [scelta, setScelta] = useState<string | null>(null)
  const [lavoro, setLavoro] = useState(false)
  const [sessione, setSessione] = useState<SessioneAdyen | null>(null)
  const [salva, setSalva] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<EsitoCassa | null>(null)
  const [giro, setGiro] = useState(0) // cambia per chiedere una sessione nuova

  /** Il pagamento e' partito (o l'ordine risulta gia' pagato): da qui in poi la pagina dell'ordine chiede com'e' andata. */
  const vaiAllEsito = useCallback(
    (dataAddebito?: string | null) => {
      router.replace({ pathname: '/shop/ordine/[id]', params: { id: ordineId, ...(dataAddebito ? { addebito: dataAddebito } : {}) } })
    },
    [ordineId],
  )

  /** Apre il modulo della carta nuova. Sul totem prima si passa dalle tre strade: se non si prosegue, il modulo non si apre. */
  const vaiAlModulo = useCallback(async () => {
    setErrore(null)
    setEsito(null)
    if (pagamentoDisponibile && !(await passaDalTotem({ cosa: 'carta', percorso: SEZIONE }))) return setFase('ferma')
    setGiro((g) => g + 1)
    setFase('nuova')
  }, [])

  // 1. Le carte gia' salvate, e il conto gia' salvato su PerfectGym (se l'addebito sul conto e' acceso).
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [c, k] = await Promise.all([carteSalvateShop(), soloCarta ? Promise.resolve(null) : contoSalvatoShop(ordineId)])
      if (!vivo) return
      setCarte(c)
      setConto(k)
      setScelta(c[0]?.id ?? (k ? CONTO : null))
      if (c.length || k) setFase('carte')
      else vaiAlModulo()
    })()
    return () => {
      vivo = false
    }
  }, [ordineId, soloCarta, vaiAlModulo])

  // 2. La carta nuova col modulo di Adyen (solo web): la sessione la prepara il server.
  useEffect(() => {
    if (fase !== 'nuova' || !pagamentoDisponibile) return
    let vivo = true
    setSessione(null)
    setErrore(null)
    setEsito(null)
    ;(async () => {
      const r = await sessioneOrdine(ordineId)
      if (!vivo) return
      if (!r.ok) return setErrore(r.errore)
      if ('giaPagato' in r) return vaiAllEsito()
      setSalva(r.salva)
      setSessione(r)
    })()
    return () => {
      vivo = false
    }
  }, [fase, ordineId, giro, vaiAllEsito])

  // La carta salvata, con un tocco.
  async function addebita() {
    const carta = carte.find((c) => c.id === scelta)
    if (!carta) return
    if (!(await passaDalTotem({ cosa: 'carta salvata', percorso: SEZIONE }))) return
    setErrore(null)
    setLavoro(true)
    const r = await pagaOrdineConCartaSalvata(ordineId, carta.id)
    setLavoro(false)
    if (!r.ok) {
      colpetto('errore')
      if (r.cartaPersa) {
        const restano = carte.filter((c) => c.id !== carta.id)
        setCarte(restano)
        setScelta(restano[0]?.id ?? (conto ? CONTO : null))
        if (!restano.length && !conto) vaiAlModulo()
      }
      return setErrore(r.errore)
    }
    if (r.esito === 'non_autorizzato') {
      colpetto('errore')
      return setEsito({
        tono: 'errore',
        titolo: t('Pagamento non autorizzato', 'Payment not authorized'),
        testo: t(`La banca non ha autorizzato l’addebito sulla carta •••• ${carta.cifre}. Non è stato addebitato nulla: puoi usare un’altra carta.`, `Your bank didn’t authorize the charge on the card •••• ${carta.cifre}. Nothing was charged: you can use another card.`),
        altra: true,
      })
    }
    // Autorizzato o in verifica: la conferma e' del webhook, e la pagina dell'ordine la aspetta.
    colpetto('ok')
    vaiAllEsito()
  }

  // Il conto gia' salvato: l'addebito SEPA. L'ordine e' pagato subito; l'incasso arriva in qualche giorno lavorativo.
  async function addebitaConto() {
    if (!conto || !autorizzo) return
    if (!(await passaDalTotem({ cosa: 'conto', percorso: SEZIONE }))) return
    setErrore(null)
    setLavoro(true)
    const r = await pagaOrdineConConto(ordineId)
    setLavoro(false)
    if (!r.ok) {
      colpetto('errore')
      if (r.contoPerso) {
        setConto(null)
        setScelta(carte[0]?.id ?? null)
        if (!carte.length) vaiAlModulo()
      }
      return setErrore(r.errore)
    }
    colpetto('ok')
    vaiAllEsito('giaPagato' in r ? null : r.dataAddebito)
  }

  // Il modulo di Adyen: finito, si chiede l'esito al server.
  const fine = useCallback(
    async (risultato: string | null) => {
      const id = sessione?.sessione.id
      let stato: string | null = null
      if (id && risultato) {
        const e = await esitoSessioneOrdine(ordineId, id, risultato)
        if (e.ok) stato = e.adyen_status
      }
      setSessione(null) // il modulo si chiude
      if (stato === 'refused') {
        setEsito({ tono: 'errore', titolo: t('Pagamento rifiutato', 'Payment declined'), testo: t('La banca non ha autorizzato il pagamento. Non è stato addebitato nulla: puoi riprovare con un’altra carta.', 'Your bank didn’t authorize the payment. Nothing was charged: you can try another card.'), altra: true })
      } else if (stato === 'canceled' || stato === 'expired') {
        setEsito({ tono: 'attenzione', titolo: t('Pagamento non completato', 'Payment not completed'), testo: t('Il pagamento non è stato completato. Non è stato addebitato nulla.', 'The payment wasn’t completed. Nothing was charged.'), altra: true })
      } else {
        // Ricevuto, in verifica o esito non leggibile: la conferma e' del webhook, e la pagina dell'ordine la aspetta.
        vaiAllEsito()
      }
    },
    [sessione, ordineId, vaiAllEsito],
  )

  // Nell'app nativa il modulo non c'e': la carta nuova passa dal link, nel browser integrato.
  async function apriLink() {
    setErrore(null)
    setLavoro(true)
    const l = await linkPagamentoOrdine(ordineId)
    setLavoro(false)
    if (!l.ok) return setErrore(l.errore)
    if ('giaPagato' in l) return vaiAllEsito()
    // Sul web `apriPagamento` cambia pagina: al ritorno ci pensa `EsitoOrdine`. Sull'app nativa la promessa si risolve quando si chiude il browser integrato.
    const aperto = await apriPagamento(l.url)
    if (aperto && Platform.OS !== 'web') vaiAllEsito()
  }

  const altraCarta = () => {
    void vaiAlModulo()
  }
  const scelteAperte = fase === 'carte' && !esito
  const cartaScelta = carte.find((c) => c.id === scelta)
  const contoScelto = scelta === CONTO && conto !== null
  const nomeConto = conto ? `${t('Conto', 'Account')} •••• ${conto.cifre}` : ''

  return (
    <View style={{ gap: spazio.tre }}>
      <View style={stili.rigaIcona}>
        <Icona nome="carta" size={18} colore={p.accento} />
        <Text style={[stili.corpo, { color: p.testo, fontFamily: F.bold, flex: 1 }]}>
          {conto && fase === 'carte' ? t(`Paga ${euro(totale)}`, `Pay ${euro(totale)}`) : t(`Paga ${euro(totale)} con carta`, `Pay ${euro(totale)} by card`)}
        </Text>
      </View>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {esito ? (
        <Messaggio tono={esito.tono} titolo={esito.titolo}>
          {esito.testo}
        </Messaggio>
      ) : null}

      {fase === 'carico' ? <SchedeInArrivo quante={1} /> : null}

      {scelteAperte ? (
        <>
          <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
            {carte.map((c) => {
              const on = c.id === scelta
              return (
                <Tocco
                  key={c.id}
                  vibra="scelta"
                  ruolo="radio"
                  stato={{ checked: on }}
                  etichetta={`${nomeCarta(c)} •••• ${c.cifre}${c.scade ? `, ${t('scade', 'expires')} ${c.scade}` : ''}`}
                  onPress={() => setScelta(c.id)}
                  style={[stili.cartaRiga, { backgroundColor: on ? velo(p, 'accento', p.scuro ? 0.18 : 0.1) : p.carta, borderColor: on ? p.accento : p.linea }]}
                >
                  <Icona nome="carta" size={18} colore={on ? p.accento : p.testoSecondario} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 15 }}>
                      {nomeCarta(c)} •••• {c.cifre}
                    </Text>
                    {c.scade ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Scade ${c.scade}`, `Expires ${c.scade}`)}</Text> : null}
                  </View>
                </Tocco>
              )
            })}
            {conto ? (
              <Tocco
                vibra="scelta"
                ruolo="radio"
                stato={{ checked: contoScelto }}
                etichetta={`${t('Addebito sul conto', 'Direct debit from account')} •••• ${conto.cifre}${conto.banca ? `, ${conto.banca}` : ''}`}
                onPress={() => setScelta(CONTO)}
                style={[stili.cartaRiga, { backgroundColor: contoScelto ? velo(p, 'accento', p.scuro ? 0.18 : 0.1) : p.carta, borderColor: contoScelto ? p.accento : p.linea }]}
              >
                <Icona nome="banca" size={18} colore={contoScelto ? p.accento : p.testoSecondario} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.testo, fontFamily: contoScelto ? F.extra : F.bold, fontSize: 15 }}>{nomeConto}</Text>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {conto.banca ? `${t('Addebito SEPA', 'SEPA direct debit')} · ${conto.banca}` : t('Addebito SEPA, il conto già salvato', 'SEPA direct debit, your saved account')}
                  </Text>
                </View>
              </Tocco>
            ) : null}
          </View>
          {contoScelto && conto ? (
            <>
              <Casella spuntata={autorizzo} onCambia={() => setAutorizzo((x) => !x)} etichetta={conto.consenso}>
                <Text style={[stili.nota, { color: p.testo }]}>{conto.consenso}</Text>
              </Casella>
              <Pulsante testo={t(`Paga ${euro(totale)} con il conto •••• ${conto.cifre}`, `Pay ${euro(totale)} from account •••• ${conto.cifre}`)} icona="banca" inCorso={lavoro} disabilitato={!autorizzo} onPress={addebitaConto} />
            </>
          ) : (
            <Pulsante testo={t(`Paga ${euro(totale)}${cartaScelta ? ` con la carta •••• ${cartaScelta.cifre}` : ''}`, `Pay ${euro(totale)}${cartaScelta ? ` with the card •••• ${cartaScelta.cifre}` : ''}`)} icona="carta" inCorso={lavoro} onPress={addebita} />
          )}
          <Pulsante testo={carte.length ? t('Usa un’altra carta', 'Use another card') : t('Paga con una carta', 'Pay by card')} variante="secondario" piccolo onPress={altraCarta} />
        </>
      ) : null}

      {fase === 'nuova' && pagamentoDisponibile ? (
        <>
          {sessione ? <DropIn sessione={sessione} onFine={fine} onErrore={setErrore} /> : !esito && !errore ? <SchedeInArrivo quante={1} /> : null}
          {sessione && salva ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t('Pagando, la carta viene salvata in modo sicuro su Adyen: la prossima volta la ritrovi già pronta, senza riscrivere i dati.', 'When you pay, the card is saved securely with Adyen: next time it’s ready, without typing the details again.')}
            </Text>
          ) : null}
        </>
      ) : null}

      {fase === 'nuova' && !pagamentoDisponibile && !esito ? <Pulsante testo={t(`Paga ${euro(totale)} con carta`, `Pay ${euro(totale)} by card`)} icona="carta" inCorso={lavoro} onPress={apriLink} /> : null}

      {/* Sul totem, se non si e' passati dalle tre strade, il modulo non si e' aperto: si puo' riprovare. */}
      {fase === 'ferma' ? (
        <>
          <Messaggio tono="attenzione">{t('Il pagamento non è partito. Non è stato addebitato nulla.', 'The payment didn’t start. Nothing was charged.')}</Messaggio>
          <Pulsante testo={t('Paga con una carta', 'Pay by card')} icona="carta" onPress={altraCarta} />
        </>
      ) : null}

      {fase === 'nuova' && (errore || esito?.altra) && pagamentoDisponibile ? <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={altraCarta} /> : null}
      {esito?.altra && fase === 'carte' ? <Pulsante testo={t('Usa un’altra carta', 'Use another card')} icona="carta" variante="secondario" onPress={altraCarta} /> : null}
      <Pulsante testo={chiudi} variante="fantasma" piccolo onPress={onChiudi} disabilitato={lavoro} />
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {fase === 'carte' && contoScelto ? (
          t('L’ordine è confermato subito; l’addebito sul conto lo esegue la banca in qualche giorno lavorativo.', 'Your order is confirmed straight away; the bank processes the debit within a few working days.')
        ) : fase === 'carte' ? (
          t('Addebitiamo la carta già salvata, senza altri codici.', 'We charge the card you already saved, with no extra codes.')
        ) : (
          <>
            {t('I dati della carta li scrivi nel modulo sicuro di ', 'You enter your card details in the secure form of ')}
            <InfoAdyen />
            {t(': non passano da noi.', ': they don’t pass through us.')}
          </>
        )}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  rigaIcona: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  cartaRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, minHeight: 56, borderRadius: 14, borderWidth: 1.5, paddingVertical: spazio.due, paddingHorizontal: spazio.tre },
})
