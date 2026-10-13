import { Link, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

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
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { InfoAdyen } from '@/components/InfoAdyen'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { spazio, stileTono, useColori, type Tono } from '@/theme'

import { DropIn, pagamentoDisponibile } from './adyen'
import { euro, quando, STATO_ABBONAMENTO, STATO_PAGAMENTO } from './etichettePagamenti'

// I pagamenti di prova del laboratorio (tappa 4b): si sceglie un piano, si paga
// la prima rata con il Drop-in di Adyen, la carta resta salvata e le rate dopo
// partono da sole (il cron di lab-pagamenti) o subito, col bottone.
//
// **Soldi veri**, sul conto live del club, con il tetto di 5 euro. Quello che
// si vede qui e' lo stato nel nostro database, aggiornato dal webhook di Adyen.

function Etichetta({ testo, tono }: { testo: string; tono?: Tono }) {
  const c = useColori()
  return (
    <Text style={[stili.etichetta, tono ? stileTono(c, tono) : { borderColor: c.bordo, borderWidth: 1 }, { color: c.testo }]}>{testo}</Text>
  )
}

function Riquadro({ children }: { children: React.ReactNode }) {
  const c = useColori()
  return <View style={[stili.riquadro, { backgroundColor: c.superficie, borderColor: c.bordo }]}>{children}</View>
}

function Piano({ piano, onScegli, inCorso, spento }: { piano: PianoLab; onScegli: () => void; inCorso: boolean; spento: boolean }) {
  return (
    <Riquadro>
      <Testo style={{ fontWeight: '700' }}>{piano.nome}</Testo>
      <Testo variante="piccolo">
        {`La prima rata adesso, poi una ogni ${piano.intervallo_giorni} giorni dalla carta salvata. In tutto ${euro(piano.importo_cent * piano.rate_totali)}.`}
      </Testo>
      <Bottone testo={`Paga ${euro(piano.importo_cent)}`} onPress={onScegli} inCorso={inCorso} disabilitato={spento} />
    </Riquadro>
  )
}

function Abbonamento({ a, onCambiato }: { a: AbbonamentoLab; onCambiato: () => void }) {
  const c = useColori()
  const [daConfermare, setDaConfermare] = useState(false)
  const [inCorso, setInCorso] = useState<'addebita' | 'chiudi' | null>(null)
  const [messaggio, setMessaggio] = useState<{ testo: string; tono: Tono } | null>(null)

  const stato = STATO_ABBONAMENTO[a.stato]
  const aperto = a.stato !== 'chiuso' && a.stato !== 'completato'
  const haCarta = Boolean(a.ultime_quattro || a.metodo) && a.stato !== 'in_attesa'
  const pagate = a.pagamenti.filter((p) => p.stato === 'autorizzato').length
  const inAttesa = a.pagamenti.some((p) => STATI_IN_CORSO.includes(p.stato))
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
    <Riquadro>
      <View style={stili.testa}>
        <Testo style={{ fontWeight: '700', flex: 1 }}>{a.piano}</Testo>
        <Etichetta testo={stato.testo} tono={stato.tono} />
      </View>
      <Testo variante="piccolo">
        {[`${pagate} di ${a.rate_totali} rate pagate`, carta, aperto && a.prossima_il ? `prossima rata ${quando(a.prossima_il)}` : null]
          .filter(Boolean)
          .join(' · ')}
      </Testo>
      {a.segnalazione ? <Avviso tono="attenzione">{a.segnalazione}</Avviso> : null}

      <View style={{ gap: spazio.uno }}>
        {a.pagamenti.map((p) => {
          const e = STATO_PAGAMENTO[p.stato]
          return (
            <Link key={p.riferimento} href={`/lab/pagamenti/${p.riferimento}`} style={[stili.rata, { borderTopColor: c.bordo }]}>
              <Text style={{ color: c.testo, fontSize: 14 }}>
                {`Rata ${p.numero_rata}${p.tentativo > 1 ? ` (tentativo ${p.tentativo})` : ''} · ${euro(p.importo_cent)} · `}
                <Text style={{ fontWeight: '700', color: e.tono ? c[e.tono] : c.testoSecondario }}>{e.testo}</Text>
                <Text style={{ color: c.testoSecondario }}>{` · ${quando(p.aggiornato_il)}`}</Text>
                {p.stato === 'rifiutato' && p.motivo ? <Text style={{ color: c.testoSecondario }}>{` · ${p.motivo}`}</Text> : null}
              </Text>
            </Link>
          )
        })}
      </View>

      {aperto ? (
        daConfermare ? (
          <View style={{ gap: spazio.due }}>
            <Avviso tono="attenzione">{`Addebitiamo davvero ${euro(a.importo_cent)} sulla carta ${carta ?? 'salvata'}. Confermi?`}</Avviso>
            <Bottone testo={`Sì, addebita ${euro(a.importo_cent)}`} onPress={addebita} />
            <Bottone testo="No, lascia stare" variante="contorno" onPress={() => setDaConfermare(false)} />
          </View>
        ) : (
          <View style={{ gap: spazio.due }}>
            {haCarta ? (
              <Bottone
                testo="Addebita la prossima rata ora"
                onPress={() => setDaConfermare(true)}
                inCorso={inCorso === 'addebita'}
                disabilitato={inCorso !== null || inAttesa}
              />
            ) : null}
            <Bottone testo="Chiudi: niente altre rate" variante="contorno" onPress={chiudi} inCorso={inCorso === 'chiudi'} disabilitato={inCorso !== null} />
            {!haCarta ? <Testo variante="piccolo">La carta si salva quando la prima rata risulta pagata.</Testo> : null}
          </View>
        )
      ) : null}
      {messaggio ? <Avviso tono={messaggio.tono}>{messaggio.testo}</Avviso> : null}
    </Riquadro>
  )
}

export function Pagamenti() {
  const c = useColori()
  const router = useRouter()
  const [dati, setDati] = useState<{ piani: PianoLab[]; abbonamenti: AbbonamentoLab[] } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [avvio, setAvvio] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<{ piano: PianoLab; sessione: SessioneAdyen } | null>(null)
  const [erroreCheckout, setErroreCheckout] = useState<string | null>(null)

  const carica = useCallback(async () => {
    const r = await elencoPagamenti()
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
  const inAttesa = dati?.abbonamenti.some((a) => a.pagamenti.some((p) => STATI_IN_CORSO.includes(p.stato))) ?? false
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

  if (errore && !dati) {
    return (
      <Pagina titolo="Pagamenti" sottotitolo={errore}>
        <Bottone testo="Riprova" onPress={carica} />
        <Link href="/lab" style={{ color: c.accento, fontWeight: '600' }}>
          ‹ La mia area
        </Link>
      </Pagina>
    )
  }

  return (
    <Pagina titolo="Pagamenti" sottotitolo="Laboratorio · pagamento diretto con carta e rate automatiche.">
      <Avviso tono="attenzione">
        <Testo variante="piccolo">
          <Forte>Soldi veri.</Forte> È il conto del club su <InfoAdyen />, non una prova finta: ogni rata è 1 € e si addebita davvero. Il
          laboratorio non va oltre 5 €.
        </Testo>
      </Avviso>

      {!dati ? (
        <View style={{ alignItems: 'flex-start' }}>
          <ActivityIndicator color={c.accento} />
        </View>
      ) : checkout ? (
        <View style={{ gap: spazio.tre }}>
          <Testo variante="sottotitolo">{checkout.piano.nome}</Testo>
          <Testo variante="piccolo">{`Prima rata ${euro(checkout.piano.importo_cent)} · riferimento ${checkout.sessione.riferimento}`}</Testo>
          <DropIn sessione={checkout.sessione} onFine={fine} onErrore={setErroreCheckout} />
          {erroreCheckout ? <Avviso>{erroreCheckout}</Avviso> : null}
          <Bottone
            testo="Annulla"
            variante="contorno"
            onPress={() => {
              setCheckout(null)
              setErroreCheckout(null)
              carica()
            }}
          />
        </View>
      ) : (
        <>
          <Testo variante="sottotitolo">Prova un piano</Testo>
          {!pagamentoDisponibile ? <Avviso tono="attenzione">Il pagamento con carta, per ora, si prova dal sito: app.athlonroma.it/lab.</Avviso> : null}
          {dati.piani.map((p) => (
            <Piano key={p.id} piano={p} onScegli={() => scegli(p)} inCorso={avvio === p.id} spento={!pagamentoDisponibile || avvio !== null} />
          ))}
          {erroreCheckout ? <Avviso>{erroreCheckout}</Avviso> : null}

          <Testo variante="sottotitolo">I miei abbonamenti di prova</Testo>
          {dati.abbonamenti.length ? (
            dati.abbonamenti.map((a) => <Abbonamento key={a.id} a={a} onCambiato={carica} />)
          ) : (
            <Testo variante="attenuato">Ancora nessuno: scegline uno qui sopra.</Testo>
          )}
        </>
      )}

      <Link href="/lab" style={{ color: c.accento, fontWeight: '600' }}>
        ‹ La mia area
      </Link>
    </Pagina>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.due },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  etichetta: { fontSize: 12, fontWeight: '700', borderRadius: 999, paddingHorizontal: spazio.due, paddingVertical: 2, overflow: 'hidden' },
  rata: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.uno + 2 },
})
