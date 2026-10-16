import { LinearGradient } from 'expo-linear-gradient'
import { router as navigatore, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import {
  addebitaRata,
  avviaPagamento,
  chiudiAbbonamento,
  elencoPagamenti,
  STATI_IN_CORSO,
  type AbbonamentoLab,
  type PianoLab,
  type SessioneAdyen,
} from '@/api/lab'
import { InfoAdyen } from '@/components/InfoAdyen'
import { spazio, type Tono } from '@/theme'

import { DropIn, pagamentoDisponibile } from './adyen'
import { inMemoria, prendi } from './memoria'
import { euro, quando, STATO_ABBONAMENTO, STATO_PAGAMENTO } from './etichettePagamenti'
import { Icona } from './ui/Icona'
import { Carta, Colonnine, Entra, Etichetta, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from './ui/kit'
import { F, FUOCO, MARE, NOTTE, usePalette } from './ui/tema'
import { colpetto } from './ui/Tocco'

// I pagamenti di prova del laboratorio (tappa 4b), in fondo al Profilo dal
// 15/10/2026 (ProvaPagamento); la scheda Pagamenti tiene i pagamenti veri.
// Si sceglie un piano, si paga
// la prima rata con il Drop-in di Adyen, la carta resta salvata e le rate dopo
// partono da sole (il cron di lab-pagamenti) o subito, col bottone.
//
// **Soldi veri**, sul conto live del club, con il tetto di 5 euro. Quello che
// si vede qui e' lo stato nel nostro database, aggiornato dal webhook di Adyen.

const COLORI_PIANI = [FUOCO, MARE, NOTTE] as const

/** Un piano da provare: un riquadro colorato col prezzo grande. */
function Piano({ piano, indice, onScegli, inCorso, spento }: { piano: PianoLab; indice: number; onScegli: () => void; inCorso: boolean; spento: boolean }) {
  const colori = COLORI_PIANI[indice % COLORI_PIANI.length]
  return (
    <LinearGradient colors={colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.piano}>
      <View style={stili.pianoIcona}>
        <Icona nome="carta" size={120} colore="rgba(255,255,255,0.1)" />
      </View>
      <Tag testo={`${piano.rate_totali} rate · ogni ${piano.intervallo_giorni} ${piano.intervallo_giorni === 1 ? 'giorno' : 'giorni'}`} colore="rgba(255,255,255,0.92)" />
      <Text style={stili.pianoNome}>{piano.nome}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spazio.tre }}>
        <View>
          <Numero valore={euro(piano.importo_cent).replace(' €', '')} unita="€" size={44} colore="#fff" />
          <Text style={stili.pianoNota}>{`la prima rata adesso · in tutto ${euro(piano.importo_cent * piano.rate_totali)}`}</Text>
        </View>
        <Colonnine quante={piano.rate_totali} piene={1} altezza={44} larghezza={7} />
      </View>
      <BottoneBianco testo={`Paga ${euro(piano.importo_cent)}`} onPress={onScegli} inCorso={inCorso} spento={spento} />
    </LinearGradient>
  )
}

/** Il bottone bianco sopra un riquadro colorato. */
function BottoneBianco({ testo, onPress, inCorso, spento }: { testo: string; onPress: () => void; inCorso: boolean; spento: boolean }) {
  return (
    <View style={{ borderRadius: 18, backgroundColor: '#fff', opacity: spento && !inCorso ? 0.5 : 1 }}>
      <Pulsante testo={testo} icona="avanti" variante="fantasma" onPress={onPress} inCorso={inCorso} disabilitato={spento} />
    </View>
  )
}

/** La carta salvata, disegnata come una carta: il circuito, le ultime cifre, la scadenza. */
function CartaSalvata({ metodo, finale, scadenza }: { metodo: string | null; finale: string | null; scadenza: string | null }) {
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.carta}>
      <View style={stili.cartaBagliore} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={stili.chip} />
        <Text style={stili.circuito}>{(metodo ?? 'carta').toUpperCase()}</Text>
      </View>
      <Text style={stili.cifreCarta}>{finale ? `••••  ••••  ••••  ${finale}` : 'Carta non ancora salvata'}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={stili.cartaPiccolo}>CUSTODITA DA ADYEN</Text>
        {scadenza ? <Text style={stili.cartaPiccolo}>{`SCAD. ${scadenza}`}</Text> : null}
      </View>
    </LinearGradient>
  )
}

function Abbonamento({ a, onCambiato }: { a: AbbonamentoLab; onCambiato: () => void }) {
  const p = usePalette()
  const [daConfermare, setDaConfermare] = useState(false)
  const [inCorso, setInCorso] = useState<'addebita' | 'chiudi' | null>(null)
  const [messaggio, setMessaggio] = useState<{ testo: string; tono: Tono } | null>(null)

  const stato = STATO_ABBONAMENTO[a.stato]
  const aperto = a.stato !== 'chiuso' && a.stato !== 'completato'
  const haCarta = Boolean(a.ultime_quattro || a.metodo) && a.stato !== 'in_attesa'
  const pagate = a.pagamenti.filter((x) => x.stato === 'autorizzato').length
  const inAttesa = a.pagamenti.some((x) => STATI_IN_CORSO.includes(x.stato))
  const carta = a.ultime_quattro ? `${a.metodo ? a.metodo.toUpperCase() + ' ' : ''}•••• ${a.ultime_quattro}${a.scadenza_carta ? ` (scad. ${a.scadenza_carta})` : ''}` : null

  async function addebita() {
    setDaConfermare(false)
    setMessaggio(null)
    setInCorso('addebita')
    const r = await addebitaRata(a.id)
    setInCorso(null)
    if (!r.ok) setMessaggio({ testo: r.errore, tono: 'errore' })
    else if (r.esito === 'Authorised') setMessaggio({ testo: `Rata ${r.rata} pagata.`, tono: 'ok' })
    else if (r.esito === 'Refused') setMessaggio({ testo: `Rata ${r.rata} rifiutata${r.motivo ? `: ${r.motivo}` : ''}.`, tono: 'errore' })
    else setMessaggio({ testo: `Rata ${r.rata} inviata ad Adyen: l’esito arriva fra poco.`, tono: 'attenzione' })
    colpetto(r.ok && r.esito === 'Authorised' ? 'ok' : r.ok ? 'leggero' : 'errore')
    onCambiato()
  }

  async function chiudi() {
    setMessaggio(null)
    setInCorso('chiudi')
    const r = await chiudiAbbonamento(a.id)
    setInCorso(null)
    if (!r.ok) setMessaggio({ testo: r.errore, tono: 'errore' })
    onCambiato()
  }

  return (
    <Carta style={{ gap: spazio.tre + 2 }}>
      <View style={stili.testa}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[stili.abbNome, { color: p.testo }]}>{a.piano}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {aperto && a.prossima_il ? `prossima rata ${quando(a.prossima_il)}` : `${euro(a.importo_cent)} ogni ${a.intervallo_giorni} ${a.intervallo_giorni === 1 ? 'giorno' : 'giorni'}`}
          </Text>
        </View>
        <Etichetta testo={stato.testo} tono={stato.tono ?? 'neutro'} />
      </View>

      <View style={[stili.rate, { backgroundColor: p.incavo }]}>
        <View style={{ gap: 2 }}>
          <Numero valore={`${pagate}/${a.rate_totali}`} size={34} />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>rate pagate</Text>
        </View>
        <Colonnine quante={a.rate_totali} piene={pagate} colore={p.accento} altezza={52} larghezza={9} />
      </View>

      {a.ultime_quattro ? <CartaSalvata metodo={a.metodo} finale={a.ultime_quattro} scadenza={a.scadenza_carta} /> : null}
      {a.segnalazione ? <Messaggio tono="attenzione">{a.segnalazione}</Messaggio> : null}

      {a.pagamenti.length ? (
        <View>
          {a.pagamenti.map((x, i) => {
            const e = STATO_PAGAMENTO[x.stato]
            return (
              <Riga
                key={x.riferimento}
                prima={i === 0}
                icona={x.stato === 'autorizzato' ? 'ok' : STATI_IN_CORSO.includes(x.stato) ? 'clessidra' : e.tono === 'errore' ? 'no' : 'ricevuta'}
                tono={e.tono ?? 'neutro'}
                titolo={`Rata ${x.numero_rata}${x.tentativo > 1 ? ` · tentativo ${x.tentativo}` : ''}`}
                sotto={[quando(x.aggiornato_il), x.stato === 'rifiutato' && x.motivo ? x.motivo : null].filter(Boolean).join(' · ')}
                coda={
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15 }}>{euro(x.importo_cent)}</Text>
                    <Text style={{ color: e.tono ? p[e.tono] : p.testoSecondario, fontFamily: F.bold, fontSize: 12 }}>{e.testo}</Text>
                  </View>
                }
                onPress={() => navigatore.push({ pathname: '/lab/pagamenti/[riferimento]', params: { riferimento: x.riferimento } })}
              />
            )
          })}
        </View>
      ) : null}

      {aperto ? (
        daConfermare ? (
          <View style={{ gap: spazio.due }}>
            <Messaggio tono="attenzione" titolo="Soldi veri">{`Addebitiamo davvero ${euro(a.importo_cent)} sulla carta ${carta ?? 'salvata'}. Confermi?`}</Messaggio>
            <View style={stili.azioni}>
              <Pulsante testo="No" variante="secondario" onPress={() => setDaConfermare(false)} />
              <Pulsante testo={`Sì, ${euro(a.importo_cent)}`} onPress={addebita} />
            </View>
          </View>
        ) : (
          <View style={{ gap: spazio.due }}>
            {haCarta ? (
              <Pulsante
                testo="Addebita la prossima rata ora"
                icona="fulmine"
                onPress={() => setDaConfermare(true)}
                inCorso={inCorso === 'addebita'}
                disabilitato={inCorso !== null || inAttesa}
              />
            ) : null}
            <Pulsante testo="Chiudi: niente altre rate" variante="contorno" icona="stop" onPress={chiudi} inCorso={inCorso === 'chiudi'} disabilitato={inCorso !== null} />
            {!haCarta ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>La carta si salva quando la prima rata risulta pagata.</Text> : null}
          </View>
        )
      ) : null}
      {messaggio ? <Messaggio tono={messaggio.tono}>{messaggio.testo}</Messaggio> : null}
    </Carta>
  )
}

/**
 * La prova del pagamento diretto con carta e rate (soldi veri, massimo 5 €).
 * Sta in fondo al Profilo (15/10/2026): Pagamenti mostra solo i pagamenti
 * veri, il riepilogo e il metodo. Ha i suoi dati e il suo checkout.
 */
export function ProvaPagamento() {
  const p = usePalette()
  const router = useRouter()
  const giaLetti = inMemoria<{ piani: PianoLab[]; abbonamenti: AbbonamentoLab[] }>('pagamenti')
  const [dati, setDati] = useState<{ piani: PianoLab[]; abbonamenti: AbbonamentoLab[] } | null>(giaLetti ? { piani: giaLetti.piani, abbonamenti: giaLetti.abbonamenti } : null)
  const [errore, setErrore] = useState<string | null>(null)
  const [avvio, setAvvio] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<{ piano: PianoLab; sessione: SessioneAdyen } | null>(null)
  const [erroreCheckout, setErroreCheckout] = useState<string | null>(null)

  const carica = useCallback(async () => {
    const r = await prendi('pagamenti', elencoPagamenti)
    if (r.ok) {
      setDati({ piani: r.piani, abbonamenti: r.abbonamenti })
      setErrore(null)
    } else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  // Finche' qualche addebito aspetta l'esito, si rilegge ogni 5 secondi: il
  // webhook di Adyen arriva dopo il browser.
  const inAttesa = dati?.abbonamenti.some((a) => a.pagamenti.some((x) => STATI_IN_CORSO.includes(x.stato))) ?? false
  useEffect(() => {
    if (!inAttesa || checkout) return
    const t = setInterval(carica, 5000)
    return () => clearInterval(t)
  }, [inAttesa, checkout, carica])

  async function scegli(piano: PianoLab) {
    setErroreCheckout(null)
    setAvvio(piano.id)
    const r = await avviaPagamento(piano.id)
    setAvvio(null)
    if (!r.ok) return setErroreCheckout(r.errore)
    setCheckout({ piano, sessione: r })
  }

  function fine(sessionResult: string | null) {
    if (!checkout) return
    const { riferimento, sessione } = checkout.sessione
    router.push({
      pathname: '/lab/pagamenti/[riferimento]',
      params: sessionResult ? { riferimento, sessionId: sessione.id, sessionResult } : { riferimento, sessionId: sessione.id },
    })
  }

  const pagatoTotale = dati?.abbonamenti.reduce((t, a) => t + a.pagamenti.filter((x) => x.stato === 'autorizzato').reduce((s, x) => s + x.importo_cent, 0), 0) ?? 0

  return (
    <View style={{ gap: spazio.quattro }}>
      <Text style={[stili.sezioneLab, { color: p.testo }]}>Laboratorio: pagamento diretto con carta e rate</Text>
      <Messaggio tono="attenzione" icona="fulmine" titolo="Soldi veri, massimo 5 €">
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          È il conto del club su <InfoAdyen />, non una prova finta: ogni rata è 1 € e si addebita davvero. Il laboratorio non va oltre 5 €.
        </Text>
      </Messaggio>

      {errore && !dati ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
        </>
      ) : !dati ? (
        <SchedeInArrivo quante={2} />
      ) : checkout ? (
        <View style={{ gap: spazio.tre, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          <Carta style={{ gap: spazio.tre }}>
            <View style={stili.testa}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[stili.abbNome, { color: p.testo }]}>{checkout.piano.nome}</Text>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{`riferimento ${checkout.sessione.riferimento}`}</Text>
              </View>
              <Numero valore={euro(checkout.piano.importo_cent).replace(' €', '')} unita="€" size={30} colore={p.accento} />
            </View>
            <DropIn sessione={checkout.sessione} onFine={fine} onErrore={setErroreCheckout} />
          </Carta>
          {erroreCheckout ? <Messaggio>{erroreCheckout}</Messaggio> : null}
          <Pulsante
            testo="Annulla"
            variante="secondario"
            onPress={() => {
              setCheckout(null)
              setErroreCheckout(null)
              carica()
            }}
          />
        </View>
      ) : (
        <>
          <Sezione titolo="Prova un piano" destra={<Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 12.5 }}>{`pagati finora ${euro(pagatoTotale)}`}</Text>}>
            {!pagamentoDisponibile ? <Messaggio tono="attenzione">Il pagamento con carta, per ora, si prova dal sito: app.athlonroma.it/lab.</Messaggio> : null}
            <View style={stili.griglia}>
              {dati.piani.map((x, i) => (
                <Entra key={x.id} indice={i} style={stili.cellaPiano}>
                  <Piano piano={x} indice={i} onScegli={() => scegli(x)} inCorso={avvio === x.id} spento={!pagamentoDisponibile || avvio !== null} />
                </Entra>
              ))}
            </View>
            {erroreCheckout ? <Messaggio>{erroreCheckout}</Messaggio> : null}
          </Sezione>

          <Sezione titolo="I miei abbonamenti di prova" conteggio={dati.abbonamenti.length}>
            {dati.abbonamenti.length ? (
              <View style={stili.griglia}>
                {dati.abbonamenti.map((a, i) => (
                  <Entra key={a.id} indice={i + 2} style={stili.cella}>
                    <Abbonamento a={a} onCambiato={carica} />
                  </Entra>
                ))}
              </View>
            ) : (
              <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
                <Icona nome="carta" size={34} colore={p.testoTerzo} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Ancora nessuno: scegline uno qui sopra.</Text>
              </Carta>
            )}
          </Sezione>
        </>
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due },
  nota: { fontSize: 13.5, lineHeight: 19, fontFamily: F.medio },
  sezioneLab: { fontSize: 19, fontFamily: F.extra, letterSpacing: -0.4, marginTop: spazio.tre },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
  cella: { flexGrow: 1, flexBasis: 360, minWidth: 0, maxWidth: 580 },
  cellaPiano: { flexGrow: 1, flexBasis: 300, minWidth: 0, maxWidth: 580 },
  piano: { borderRadius: 30, padding: spazio.quattro - 2, gap: spazio.tre, overflow: 'hidden' },
  pianoIcona: { position: 'absolute', right: -18, top: -16, transform: [{ rotate: '-14deg' }] },
  pianoNome: { color: '#fff', fontFamily: F.extra, fontSize: 22, letterSpacing: -0.6 },
  pianoNota: { color: 'rgba(255,255,255,0.75)', fontFamily: F.medio, fontSize: 12.5, marginTop: 2 },
  abbNome: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5 },
  rate: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderRadius: 22, padding: spazio.tre },
  carta: { borderRadius: 22, padding: spazio.tre + 2, gap: spazio.tre + 2, aspectRatio: 1.9, maxWidth: 360, width: '100%', justifyContent: 'space-between', overflow: 'hidden' },
  cartaBagliore: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -70, top: -90, backgroundColor: '#FF5701', opacity: 0.35, filter: 'blur(40px)' } as object,
  chip: { width: 38, height: 28, borderRadius: 7, backgroundColor: '#E7C77A', opacity: 0.9 },
  circuito: { color: '#fff', fontFamily: F.extra, fontSize: 15, letterSpacing: 1.2, fontStyle: 'italic' },
  cifreCarta: { color: '#fff', fontFamily: F.bold, fontSize: 17, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  cartaPiccolo: { color: 'rgba(255,255,255,0.55)', fontFamily: F.extra, fontSize: 10, letterSpacing: 1.2 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
