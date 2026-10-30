import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import type Animated from 'react-native-reanimated'

import {
  anteprimaAbbonamento,
  esitoAbbonamento,
  firmaAbbonamento,
  pagaAbbonamento,
  riepilogoAbbonamento,
  statoAbbonamento,
  statoCambioAbbonamento,
  type AnteprimaContratto,
  type Blocco,
  type EsitoContratto,
  type DatiContraente,
  type ImportiContratto,
  type MetodoAbbonamento,
  type PersonaDati,
  type PersonaAbbonamento,
  type PianoAbbonamento,
  type SceltaAbbonamento,
  type StatoAbbonamento,
  type StatoCambio,
} from '@/api/abbonamento'
import { Casella } from '@/components/Casella'
import { ModuloIban, type DatiConto } from '@/features/metodo-pagamento/ModuloIban'
import { euro } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { CODICE_FISCALE_NON_ATTRIBUITO, ITALIA, nomePaese } from '@/lib/residenteEstero'
import { spazio } from '@/theme'

import { CorreggiDati } from './abbonamento/CorreggiDati'
import { hrefSezione } from './home/sezioni'
import { DaCambio } from './abbonamento/DaCambio'
import { DallaProva } from './abbonamento/DallaProva'
import { Indicatore, SchedaScelta } from './abbonamento/Passi'
import { FORMULE, Listino } from './abbonamento/Listino'
import { FirmaPad } from './FirmaPad'
import { segnaPagataInCorso } from './junior/inCorso'
import { scorda, scordaPrefisso } from './memoria'
import { dataLunga, RiepilogoCosti } from './RiepilogoCosti'
import { Foglio } from './ui/Foglio'
import { Icona } from './ui/Icona'
import { Carta, Etichetta, Messaggio, Pulsante, Sezione } from './ui/kit'
import { SchermataInArrivo } from './ui/Attesa'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'
import { apriPagamento } from '@/lib/pagamentoEsterno'

// L'abbonamento principale comprato dal portale (16/10/2026): Smart o Premium,
// nelle tre formule, con il contratto da leggere e firmare come su Adobe o
// DocuSign. L'ordine: abbonamento, data, dati e firma, pagamento (il metodo si
// sceglie dopo la firma e non e' nel contratto). Chi puo' comprare, i prezzi, le date e il contratto li decide il
// server (portale-abbonamento): qui si sceglie, si legge e si firma.
//
// Un adulto firma da se'; per un minorenne (dai 13 ai 17 anni) firma il
// genitore, dal suo account. Sotto i 13 anni non si vende un abbonamento adulti.
// Il contratto che si firma e' quello che si e' letto: il server ricompone il
// documento e ne confronta l'impronta con quella dell'anteprima.

export function giornoBreve(iso: string): string {
  const [a, m, g] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, g)))
}

function giorniFra(da: string, a: string): string[] {
  const fuori: string[] = []
  const [y, m, d] = da.split('-').map(Number)
  for (let i = 0; i < 20; i++) {
    const g = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10)
    if (g > a) break
    fuori.push(g)
  }
  return fuori
}

/** `**forte**` dentro un testo: il solo markup che il documento ammette. */
function Testo({ testo, stile }: { testo: string; stile: object }) {
  const parti = testo.split(/\*\*(.+?)\*\*/g)
  return (
    <Text style={stile}>
      {parti.map((parte, i) => (i % 2 ? <Text key={i} style={{ fontFamily: F.extra }}>{parte}</Text> : parte))}
    </Text>
  )
}

function BloccoDocumento({ b }: { b: Blocco }) {
  const p = usePalette()
  const corpo = { color: p.testo, fontFamily: F.normale, fontSize: 14, lineHeight: 21 }
  switch (b.t) {
    case 'titolo':
      return <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4, marginTop: spazio.tre }}>{b.testo}</Text>
    case 'sottotitolo':
      return <Testo testo={b.testo} stile={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }} />
    case 'sezione':
      return (
        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15, marginTop: spazio.tre, paddingTop: spazio.due, borderTopWidth: 2, borderTopColor: p.accento }}>{b.testo}</Text>
      )
    case 'p':
      return <Testo testo={b.testo} stile={corpo} />
    case 'elenco':
      return (
        <View style={{ gap: 4 }}>
          {b.voci.map((v) => (
            <Testo key={v} testo={`•  ${v}`} stile={corpo} />
          ))}
        </View>
      )
    case 'tabella':
      return (
        <View style={{ borderWidth: 1, borderColor: p.linea, borderRadius: 12, overflow: 'hidden' }}>
          {b.righe.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spazio.due, padding: 10, borderTopWidth: i ? 1 : 0, borderTopColor: p.linea }}>
              <Text style={[corpo, { flex: 2, fontFamily: F.bold }]}>{r[0]}</Text>
              <Testo testo={r.slice(1).join(' ')} stile={[corpo, { flex: 3 }] as unknown as object} />
            </View>
          ))}
        </View>
      )
    case 'clausola':
      return (
        <View style={b.specifica ? { borderLeftWidth: 3, borderLeftColor: p.accento, paddingLeft: spazio.due } : undefined}>
          <Text style={[corpo, { fontFamily: F.bold }]}>{`${b.specifica ? '★ ' : ''}${b.id} — ${b.titolo}`}</Text>
          {b.testo ? <Testo testo={b.testo} stile={[corpo, { fontSize: 13 }] as unknown as object} /> : null}
        </View>
      )
    case 'salto':
      return <View style={{ height: 1, backgroundColor: p.linea, marginVertical: spazio.tre }} />
  }
}

/**
 * Il contratto: il corpo si legge subito, l'Allegato A (i Termini e Condizioni, che
 * il server accoda dopo il blocco `salto`) sta chiuso e si apre al tocco. E' una
 * scelta di lettura: il documento che si firma e quello archiviato restano interi.
 */
export function DocumentoContratto({ blocchi }: { blocchi: Blocco[] }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  const i = blocchi.findIndex((b) => b.t === 'salto')
  const corpo = i === -1 ? blocchi : blocchi.slice(0, i)
  const allegato = i === -1 ? [] : blocchi.slice(i + 1)
  const titolo = allegato[0]?.t === 'titolo' ? allegato[0].testo : t('Allegato A', 'Annex A')
  const resto = allegato[0]?.t === 'titolo' ? allegato.slice(1) : allegato
  return (
    <>
      {corpo.map((b, k) => (
        <BloccoDocumento key={k} b={b} />
      ))}
      {allegato.length ? (
        <View style={{ borderWidth: 1, borderColor: p.linea, borderRadius: 14, overflow: 'hidden', marginTop: spazio.tre }}>
          <Tocco onPress={() => setAperto((v) => !v)} ruolo="button" etichetta={`${titolo}: ${aperto ? t('chiudi', 'close') : t('apri', 'open')}`} scala={0.99} vibra="scelta">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15, lineHeight: 21 }}>{titolo}</Text>
                <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12.5 }}>{aperto ? t('Tocca per chiuderlo', 'Tap to close it') : t('Tocca per leggerlo: fa parte del contratto', 'Tap to read it: it’s part of the contract')}</Text>
              </View>
              <Icona nome="giu" size={18} colore={p.testoTerzo} style={{ transform: [{ rotate: aperto ? '180deg' : '0deg' }] }} />
            </View>
          </Tocco>
          {aperto ? (
            <View style={{ gap: spazio.tre, paddingHorizontal: spazio.tre, paddingBottom: spazio.tre }}>
              {resto.map((b, k) => (
                <BloccoDocumento key={k} b={b} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  )
}

/** Un dato del contratto, con la sua etichetta: «Nato/a il · 3 marzo 1990». */
export function RigaDato({ nome, valore }: { nome: string; valore: string | null | undefined }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', gap: spazio.due }}>
      <Text style={[stili.nota, { color: p.testoSecondario, width: 112 }]}>{nome}</Text>
      <Text style={{ color: valore ? p.testo : p.errore, fontFamily: F.bold, fontSize: 14, flex: 1, lineHeight: 20 }}>{valore || t('Manca', 'Missing')}</Text>
    </View>
  )
}

/** «Via Ugo Ojetti 134, 00137 Roma»; per chi risiede all'estero, con il Paese in fondo (se la riga non lo dice gia'). */
export function residenzaConPaese(c: DatiContraente): string | null {
  const paese = c.senza_codice_fiscale && c.paese && c.paese !== ITALIA ? nomePaese(c.paese) : null
  if (!c.residenza || !paese) return c.residenza
  return c.residenza.toLowerCase().includes(paese.toLowerCase()) ? c.residenza : `${c.residenza}, ${paese}`
}

/** Un contratto firmato e creato, in attesa del pagamento. */
type Firmato = { numero: string; importi: ImportiContratto; piano: string; nome: string | null; errore: string | null }

export function Abbonamento() {
  const p = usePalette()
  const { contratto, cambio } = useLocalSearchParams<{ contratto?: string; cambio?: string }>()
  // L'ordine, scelto dal club: abbonamento, data, dati e firma, e solo poi il
  // pagamento. Il contratto non dice con cosa si paga: il metodo si sceglie dopo.
  const [passo, setPasso] = useState<1 | 2 | 3 | 4>(1)
  const scorrimento = useRef<Animated.ScrollView>(null)
  const [stato, setStato] = useState<StatoAbbonamento | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [membro, setMembro] = useState<number | null>(null)
  const [pianoId, setPianoId] = useState<number | null>(null)
  const [inizio, setInizio] = useState<string | null>(null)
  const [apertura, setApertura] = useState(false)
  const [anteprima, setAnteprima] = useState<AnteprimaContratto | null>(null)
  const [mancanti, setMancanti] = useState<string[] | null>(null)
  /** Chi ha dati nel contratto, anche quando il contratto non si puo' ancora comporre: si correggono da qui. */
  const [personeDati, setPersoneDati] = useState<PersonaDati[]>([])
  const [datiOk, setDatiOk] = useState(false)
  const [foglio, setFoglio] = useState(false)
  const [consensi, setConsensi] = useState<Record<string, boolean>>({})
  const [firmaPng, setFirmaPng] = useState<string | null>(null)
  const [firmando, setFirmando] = useState(false)
  const [errorefirma, setErroreFirma] = useState<string | null>(null)
  const [firmato, setFirmato] = useState<Firmato | null>(null)
  /** Il pagamento: scelto dopo la firma. */
  const [metodo, setMetodo] = useState<'carta' | 'conto'>('carta')
  const [contoNuovo, setContoNuovo] = useState<DatiConto | null>(null)
  const [usaContoSalvato, setUsaContoSalvato] = useState(true)
  const [pagando, setPagando] = useState(false)
  const [errorePagamento, setErrorePagamento] = useState<string | null>(null)
  const [numero, setNumero] = useState<string | null>(typeof contratto === 'string' ? contratto : null)
  const [costi, setCosti] = useState<ImportiContratto | null>(null)
  const [costiInCorso, setCostiInCorso] = useState(false)
  const giroCosti = useRef(0)

  // Cambio senza disdetta (30/10/2026): la data e' fissa e la decide il server; il metodo di pagamento si sceglie PRIMA della firma; niente pagamento.
  const cambioId = typeof cambio === 'string' && /^\d+$/.test(cambio) ? Number(cambio) : null
  const [infoCambio, setInfoCambio] = useState<StatoCambio | null>(null)
  const [metodoCambio, setMetodoCambio] = useState<'carta' | 'conto' | null>(null)
  const [cambioFatto, setCambioFatto] = useState<{ fine_vecchio: string; inizio_nuovo: string } | null>(null)
  const caricaCambio = useCallback(async () => {
    if (!cambioId) return
    const r = await statoCambioAbbonamento(cambioId)
    if (!r.ok) return setErrore(r.errore)
    setInfoCambio(r.stato)
    setMembro(r.stato.member_id)
    // Il metodo si sceglie fra quelli gia' salvati; se ce n'e' uno solo parte scelto.
    setMetodoCambio((m) => (m && (m === 'carta' ? r.stato.metodi.carta : r.stato.metodi.conto) ? m : r.stato.metodi.carta ? 'carta' : r.stato.metodi.conto ? 'conto' : null))
  }, [cambioId])
  // Anche al ritorno da «Aggiungi il metodo di pagamento»: la schermata resta in pila e il metodo nuovo si rilegge.
  useFocusEffect(
    useCallback(() => {
      caricaCambio()
    }, [caricaCambio]),
  )

  const carica = useCallback(async () => {
    const r = await statoAbbonamento()
    if (!r.ok) return setErrore(r.errore)
    setStato(r.stato)
    setMembro((m) => m ?? (cambioId ? null : r.stato.persone.find((x) => x.puo_comprare)?.member_id) ?? r.stato.persone[0]?.member_id ?? null)
    // Firmato e non pagato: si riprende dal pagamento, senza rifirmare.
    const d = cambioId ? null : r.stato.da_pagare
    if (d) {
      setFirmato({ numero: d.numero, importi: d.importi, piano: d.piano, nome: d.nome, errore: d.errore })
      setPasso(4)
    }
  }, [cambioId])
  useEffect(() => {
    if (!numero) carica()
  }, [carica, numero])

  const personaBase: PersonaAbbonamento | undefined = stato?.persone.find((x) => x.member_id === membro)
  // Nel cambio la persona e' quella del contratto e la data e' una sola (il giorno dopo la fine del vecchio): lo dice `cambio_stato`.
  const persona: PersonaAbbonamento | undefined =
    cambioId && infoCambio && personaBase
      ? { ...personaBase, puo_comprare: true, motivo: null, inizio_min: infoCambio.nuovo_inizio, inizio_max: infoCambio.nuovo_inizio, da_guest_pass: null }
      : cambioId
        ? undefined
        : personaBase
  const piano: PianoAbbonamento | undefined = stato?.piani.find((x) => x.piano_id === pianoId)
  useEffect(() => {
    if (persona?.inizio_min) setInizio((i) => (i && persona.inizio_min! <= i && i <= persona.inizio_max! ? i : persona.inizio_min))
  }, [persona?.inizio_min, persona?.inizio_max, persona])
  const giorni = useMemo(() => (persona?.inizio_min && persona.inizio_max ? giorniFra(persona.inizio_min, persona.inizio_max) : []), [persona])

  function scelta(): SceltaAbbonamento | null {
    if (!persona || !pianoId || !inizio) return null
    return { member_id: persona.member_id, piano_id: pianoId, data_inizio: inizio, ...(cambioId ? { cambio_contract_id: cambioId } : {}) }
  }

  // Il riepilogo dei costi si ricalcola a ogni cambio di piano o di data.
  const chiaveScelta = JSON.stringify([membro, pianoId, inizio])
  useEffect(() => {
    const s = scelta()
    setAnteprima(null)
    setMancanti(null)
    setDatiOk(false)
    if (!s || numero || firmato) {
      setCosti(null)
      return
    }
    const giro = ++giroCosti.current
    setCostiInCorso(true)
    const timer = setTimeout(async () => {
      const r = await riepilogoAbbonamento(s)
      if (giro !== giroCosti.current) return
      setCostiInCorso(false)
      if (r.ok) setCosti(r.importi)
      else {
        setCosti(null)
        setErrore(r.errore)
      }
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveScelta, numero, firmato])

  /** I dati e il contratto, caricati entrando nel passo 3: cosi' le dichiarazioni e i dati mancanti si vedono subito. */
  async function caricaContratto() {
    const s = scelta()
    if (!s) return
    setErrore(null)
    setDatiOk(false)
    setApertura(true)
    const r = await anteprimaAbbonamento(s)
    setApertura(false)
    if (!r.ok) {
      colpetto('errore')
      setAnteprima(null)
      setMancanti(r.mancanti ?? null)
      setPersoneDati(r.persone_dati ?? [])
      // Dati mancanti o sbagliati: si correggono qui sotto, non e' un errore da leggere e basta.
      return setErrore(r.mancanti?.length ? null : r.errore)
    }
    setMancanti(null)
    setPersoneDati(r.anteprima.persone_dati ?? [])
    // Le dichiarazioni obbligatorie partono sempre spuntate (e non si tolgono):
    // il facoltativo segue il catalogo del club.
    setConsensi(Object.fromEntries(r.anteprima.consensi.map((c) => [c.chiave, c.obbligatorio || c.preselezionato])))
    setFirmaPng(null)
    setErroreFirma(null)
    setAnteprima(r.anteprima)
  }

  /** Dove stanno nel foglio le dichiarazioni e la firma, per il pulsante «Firma ora». */
  const scorrimentoFoglio = useRef<ScrollView>(null)
  const posti = useRef({ corpo: 0, firma: 0 })
  const [firmaVicina, setFirmaVicina] = useState(false)

  function apriFoglio() {
    setFirmaVicina(false)
    setFoglio(true)
  }

  /** Il pulsante sparisce quando le dichiarazioni sono gia' nella parte alta del foglio. */
  function scorriFoglio(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement } = e.nativeEvent
    const firma = posti.current.corpo + posti.current.firma
    setFirmaVicina(firma > 0 && contentOffset.y >= firma - layoutMeasurement.height * 0.5)
  }

  function vaiAllaFirma() {
    colpetto('scelta')
    scorrimentoFoglio.current?.scrollTo({ y: Math.max(0, posti.current.corpo + posti.current.firma - 12), animated: true })
  }

  const obbligatoriOk = !!anteprima && anteprima.consensi.every((c) => !c.obbligatorio || consensi[c.chiave])

  async function firma() {
    const s = scelta()
    if (!s || !anteprima || !firmaPng || !piano) return
    setErroreFirma(null)
    setFirmando(true)
    if (cambioId && !metodoCambio) return setErroreFirma(t('Prima scegli o aggiungi il metodo di pagamento.', 'First choose or add a payment method.'))
    const r = await firmaAbbonamento(s, anteprima.impronta, consensi, firmaPng, cambioId ? (metodoCambio ?? undefined) : undefined)
    if (!r.ok) {
      setFirmando(false)
      colpetto('errore')
      return setErroreFirma(r.errore)
    }
    colpetto('ok')
    setFoglio(false)
    setFirmando(false)
    if (cambioId) {
      // Fatto: il vecchio e' chiuso e il nuovo e' in coda. Niente pagamento da qui: lo gestisce la segreteria. Le letture in memoria sono vecchie.
      scorda('abbonamenti:contratti')
      scorda('area')
      setAnteprima(null)
      setCambioFatto(r.esito.cambio ?? (infoCambio ? { fine_vecchio: infoCambio.fine, inizio_nuovo: infoCambio.nuovo_inizio } : null))
      return
    }
    setFirmato({ numero: r.esito.numero, importi: anteprima.importi, piano: `${piano.abbonamento} · ${FORMULE[piano.formula].titolo}`, nome: persona?.nome ?? null, errore: null })
    setAnteprima(null)
    vai(4)
  }

  function metodoScelto(): MetodoAbbonamento | null {
    if (metodo === 'carta') return { metodo: 'carta', con_carta: !!stato?.metodi.carta }
    if (contoNuovo) return { metodo: 'conto', iban: contoNuovo.iban, intestatario: contoNuovo.intestatario, via: contoNuovo.via, cap: contoNuovo.cap, citta: contoNuovo.citta }
    if (stato?.metodi.conto && usaContoSalvato) return { metodo: 'conto', conto_salvato: true }
    return null
  }

  async function paga() {
    const m = metodoScelto()
    if (!m || !firmato) return
    setErrorePagamento(null)
    setPagando(true)
    const r = await pagaAbbonamento(firmato.numero, m)
    if (!r.ok) {
      setPagando(false)
      colpetto('errore')
      return setErrorePagamento(r.errore)
    }
    colpetto('ok')
    if (r.esito.url) {
      await apriPagamento(r.esito.url)
      setPagando(false)
      return
    }
    setPagando(false)
    setNumero(r.esito.numero)
  }

  if (cambioFatto) {
    return (
      <Schermata titolo={t('Cambio abbonamento', 'Change membership')} indietro={hrefSezione('abbonamenti')}>
        <View style={{ gap: spazio.quattro }}>
          <Messaggio tono="ok" titolo={t('Cambio registrato', 'Change recorded')} icona="ok">
            {t(
              `Il tuo abbonamento attuale finisce il ${dataLunga(cambioFatto.fine_vecchio)} e il nuovo parte il ${dataLunga(cambioFatto.inizio_nuovo)}. Non c’è nessun pagamento da fare adesso: della parte economica si occupa la segreteria.`,
              `Your current membership ends on ${dataLunga(cambioFatto.fine_vecchio)} and the new one starts on ${dataLunga(cambioFatto.inizio_nuovo)}. There’s nothing to pay now: the front desk takes care of the payment side.`,
            )}
          </Messaggio>
          <Pulsante testo={t('Vai ai miei abbonamenti', 'Go to my memberships')} onPress={() => router.replace(hrefSezione('abbonamenti'))} />
        </View>
      </Schermata>
    )
  }
  if (numero) return <EsitoContrattoVista numero={numero} onFine={() => router.replace(hrefSezione('abbonamenti'))} onRiprova={() => setNumero(null)} />
  if (!stato && !errore) return <SchermataInArrivo titolo={t('Abbonamento', 'Membership')} />
  if (cambioId && !infoCambio && errore) {
    return (
      <Schermata titolo={t('Cambio abbonamento', 'Change membership')} indietro={hrefSezione('abbonamenti')}>
        <View style={{ gap: spazio.quattro }}>
          <Messaggio tono="attenzione">{errore}</Messaggio>
          <Pulsante testo={t('Torna agli abbonamenti', 'Back to memberships')} variante="secondario" onPress={() => router.replace(hrefSezione('abbonamenti'))} />
        </View>
      </Schermata>
    )
  }
  if (cambioId && !infoCambio) return <SchermataInArrivo titolo={t('Cambio abbonamento', 'Change membership')} />

  const pronto = !!scelta()
  const NOMI_PASSI = [t('Abbonamento', 'Membership'), t('Data', 'Date'), t('Dati e firma', 'Details and signature'), t('Pagamento', 'Payment')]
  const SOTTOTITOLI = [
    t('Scegli l’abbonamento e la formula: qui sotto trovi cosa comprende e le condizioni.', 'Choose your membership and payment plan: below you’ll find what’s included and the terms.'),
    t('Scegli quando parte: vedi subito quanto e quando paghi.', 'Choose when it starts: you’ll see right away how much you pay and when.'),
    t('Conferma i tuoi dati, leggi il contratto e firma.', 'Confirm your details, read the contract and sign.'),
    t('Il contratto è firmato. Ultimo passo: scegli come pagare.', 'The contract is signed. Last step: choose how to pay.'),
  ]
  const nomePersona = persona ? `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() : ''
  const formula = piano ? FORMULE[piano.formula] : null

  function vai(n: 1 | 2 | 3 | 4) {
    setErrore(null)
    setPasso(n)
    setTimeout(() => (scorrimento.current as unknown as ScrollView | null)?.scrollTo({ y: 0, animated: true }), 30)
    if (n === 3) caricaContratto()
  }

  return (
    <Schermata titolo={t('Abbonamento', 'Membership')} sottotitolo={SOTTOTITOLI[passo - 1]} indietro={hrefSezione('abbonamenti')} scorrimento={scorrimento}>
      <View style={{ gap: spazio.quattro }}>
        <Indicatore passo={passo} nomi={NOMI_PASSI} />
        {errore ? <Messaggio>{errore}</Messaggio> : null}

        {passo === 1 && stato ? (
          <>
            {stato.persone.length > 1 && !cambioId ? (
              <Sezione titolo={t('Per chi', 'Who for')}>
                <View style={{ gap: spazio.due }}>
                  {stato.persone.map((x) => {
                    const attivo = x.member_id === membro
                    return (
                      <SchedaScelta
                        key={x.member_id}
                        attiva={attivo}
                        etichetta={t(`Per ${x.nome ?? ''} ${x.cognome ?? ''}`, `For ${x.nome ?? ''} ${x.cognome ?? ''}`)}
                        onPress={() => setMembro(x.member_id)}
                        titolo={`${x.nome ?? ''} ${x.cognome ?? ''}`.trim()}
                        sotto={x.puo_comprare ? (x.firmatario === 'genitore' ? t('Firma il genitore', 'The parent signs') : x.titolare ? t('Firmi tu', 'You sign') : t('Firma lui', 'They sign')) : (x.motivo ?? undefined)}
                        destra={x.puo_comprare ? undefined : <Etichetta testo={t('Non disponibile', 'Not available')} tono="neutro" />}
                      />
                    )
                  })}
                </View>
              </Sezione>
            ) : null}

            {persona && !persona.puo_comprare ? (
              <Messaggio tono="attenzione" titolo={t('Non è possibile acquistare', 'Purchase not possible')}>
                {persona.motivo}
              </Messaggio>
            ) : null}

            {persona?.puo_comprare ? (
              <>
                {persona.da_guest_pass && persona.inizio_min ? <DallaProva inizio={persona.inizio_min} quota={stato.quota_attivazione} /> : null}
                {infoCambio ? <DaCambio fine={infoCambio.fine} inizio={infoCambio.nuovo_inizio} piano={infoCambio.piano} /> : null}
                <Listino piani={stato.piani} pianoId={pianoId} onScegli={setPianoId} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {stato.quota_attivazione > 0 && !infoCambio
                    ? t(`A ogni abbonamento si aggiunge la quota di attivazione di ${euro(stato.quota_attivazione)}, che non si paga se il nuovo abbonamento parte il giorno dopo la scadenza del precedente. `, `A joining fee of ${euro(stato.quota_attivazione)} is added to every membership; it isn’t charged if the new membership starts the day after the previous one ends. `)
                    : ''}
                  {t('Tutto quello che scegli lo rivedi prima di firmare.', 'You’ll review everything you choose before signing.')}
                </Text>
                <Pulsante testo={t('Continua', 'Continue')} icona="avanti" onPress={() => vai(2)} disabilitato={!pianoId} />
                <Pulsante testo={t('I miei abbonamenti', 'My memberships')} variante="fantasma" piccolo pieno={false} onPress={() => router.navigate(hrefSezione('abbonamenti'))} />
              </>
            ) : null}
          </>
        ) : null}

        {passo === 2 && stato && persona && piano ? (
          <>
            <Carta piatta>
              <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{t('La tua scelta', 'Your choice')}</Text>
              <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 }}>{`${piano.abbonamento} · ${formula?.titolo ?? ''}`}</Text>
              <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>
                {t(`${euro(piano.importo)} ${piano.periodo.includes('anno') ? 'all’anno' : 'al mese'}${stato.persone.length > 1 ? ` · per ${nomePersona}` : ''}`, `${euro(piano.importo)} ${piano.periodo.includes('anno') ? 'a year' : 'a month'}${stato.persone.length > 1 ? ` · for ${nomePersona}` : ''}`)}
              </Text>
            </Carta>

            {infoCambio ? (
              <Sezione titolo={t('Quando parte', 'When it starts')}>
                <DaCambio fine={infoCambio.fine} inizio={infoCambio.nuovo_inizio} piano={infoCambio.piano} conData />
              </Sezione>
            ) : persona.da_guest_pass && persona.inizio_min ? (
              <Sezione titolo={t('Quando parte', 'When it starts')}>
                <DallaProva inizio={persona.inizio_min} quota={stato.quota_attivazione} conData />
              </Sezione>
            ) : (
            <Sezione titolo={t('Quando parte', 'When it starts')}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
                {giorni.map((g) => {
                  const attivo = g === inizio
                  return (
                    <Tocco
                      key={g}
                      vibra="scelta"
                      stato={{ selected: attivo }}
                      etichetta={t(`Parte il ${giornoBreve(g)}`, `Starts ${giornoBreve(g)}`)}
                      onPress={() => setInizio(g)}
                      style={[stili.giorno, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                    >
                      <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 13 }}>{giornoBreve(g)}</Text>
                    </Tocco>
                  )
                })}
              </ScrollView>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t('Puoi farlo partire oggi o fino a due settimane dopo. Si paga alla firma, ma la data decide cosa copre la prima quota.', 'You can start it today or up to two weeks later. You pay when you sign, but the start date decides what the first payment covers.')}
              </Text>
            </Sezione>
            )}

            <Sezione titolo={t('Il tuo piano di pagamento', 'Your payment plan')}>
              {costi ? (
                <RiepilogoCosti importi={costi} />
              ) : costiInCorso ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Calcoliamo i costi…', 'Calculating the costs…')}</Text>
              ) : (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Scegli la data di partenza per vedere i costi.', 'Choose the start date to see the costs.')}</Text>
              )}
            </Sezione>

            <Pulsante testo={t('Continua', 'Continue')} icona="avanti" onPress={() => vai(3)} disabilitato={!pronto || !costi} />
            <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={() => vai(1)} />
          </>
        ) : null}

        {passo === 3 && stato && persona && piano ? (
          <>
            <Sezione titolo={anteprima?.genitore ? t('I dati del contratto', 'Contract details') : t('I tuoi dati', 'Your details')}>
              {apertura && !anteprima ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Prepariamo il contratto…', 'Preparing the contract…')}</Text>
              ) : anteprima ? (
                <>
                  <Carta piatta>
                    <View style={{ gap: spazio.due }}>
                      <RigaDato nome={t('Nome e cognome', 'Full name')} valore={`${anteprima.contraente.nome} ${anteprima.contraente.cognome}`.trim()} />
                      <RigaDato nome={t('Nato/a il', 'Born on')} valore={anteprima.contraente.data_nascita ? dataLunga(anteprima.contraente.data_nascita) : null} />
                      <RigaDato nome={t('Codice fiscale', 'Tax code')} valore={anteprima.contraente.codice_fiscale?.toUpperCase() ?? (anteprima.contraente.senza_codice_fiscale ? CODICE_FISCALE_NON_ATTRIBUITO : null)} />
                      <RigaDato nome={t('Residenza', 'Address')} valore={residenzaConPaese(anteprima.contraente)} />
                      <RigaDato nome={t('Email', 'Email')} valore={anteprima.contraente.email} />
                      <RigaDato nome={t('Telefono', 'Phone')} valore={anteprima.contraente.telefono} />
                      {anteprima.genitore ? <RigaDato nome={t('Firma il genitore', 'Parent signing')} valore={`${anteprima.genitore.nome} ${anteprima.genitore.cognome}`.trim()} /> : null}
                    </View>
                  </Carta>
                  {personeDati.map((d) => (
                    <CorreggiDati key={`${d.member_id}-${d.codice_fiscale}-${d.paese}-${d.telefono}-${d.indirizzo?.via}-${d.indirizzo?.cap}-${d.indirizzo?.paese}`} persona={d} titolo={d.ruolo === 'genitore' ? t('Dati del genitore che firma', 'Details of the signing parent') : t('Correggi i tuoi dati', 'Correct your details')} onSalvato={caricaContratto} />
                  ))}
                  <Casella spuntata={datiOk} onCambia={() => setDatiOk((v) => !v)} etichetta={t('Confermo che i dati sono corretti', 'I confirm my details are correct')}>
                    <Text style={{ color: p.testo, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>{t('Confermo che questi dati sono corretti.', 'I confirm these details are correct.')}</Text>
                  </Casella>
                </>
              ) : mancanti?.length ? (
                <>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Per il contratto servono dati corretti: completali qui sotto, poi si va avanti.', 'The contract needs correct details: complete them below, then you can continue.')}</Text>
                  {personeDati.map((d) => (
                    <CorreggiDati
                      key={`${d.member_id}-m`}
                      persona={d}
                      titolo={d.ruolo === 'genitore' ? t('Dati del genitore che firma', 'Details of the signing parent') : t('I tuoi dati', 'Your details')}
                      apertoDa
                      mancanti={mancanti}
                      onSalvato={caricaContratto}
                    />
                  ))}
                </>
              ) : null}
            </Sezione>

            {infoCambio ? (
              <Sezione titolo={t('Metodo di pagamento', 'Payment method')}>
                {infoCambio.metodi.carta || infoCambio.metodi.conto ? (
                  <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
                    {infoCambio.metodi.carta ? (
                      <SchedaScelta
                        attiva={metodoCambio === 'carta'}
                        etichetta={t('Usa la carta salvata', 'Use the saved card')}
                        icona="carta"
                        titolo={t(`Carta${infoCambio.metodi.carta.finale ? ` •••• ${infoCambio.metodi.carta.finale}` : ''}`, `Card${infoCambio.metodi.carta.finale ? ` •••• ${infoCambio.metodi.carta.finale}` : ''}`)}
                        sotto={t('La carta già salvata: le quote si addebitano su questa.', 'Your saved card: payments are charged to it.')}
                        onPress={() => setMetodoCambio('carta')}
                      />
                    ) : null}
                    {infoCambio.metodi.conto ? (
                      <SchedaScelta
                        attiva={metodoCambio === 'conto'}
                        etichetta={t('Usa il conto salvato', 'Use the saved account')}
                        icona="banca"
                        titolo={t(`Conto corrente${infoCambio.metodi.conto.finale ? ` •••• ${infoCambio.metodi.conto.finale}` : ''}`, `Bank account${infoCambio.metodi.conto.finale ? ` •••• ${infoCambio.metodi.conto.finale}` : ''}`)}
                        sotto={t('Il conto già salvato, con il mandato SEPA già firmato.', 'Your saved account, with the SEPA mandate already signed.')}
                        onPress={() => setMetodoCambio('conto')}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Messaggio tono="attenzione" titolo={t('Manca il metodo di pagamento', 'No payment method yet')}>
                    {t('Aggiungi una carta o un conto corrente: poi torna qui e riprendi dal contratto.', 'Add a card or a bank account: then come back here and carry on from the contract.')}
                  </Messaggio>
                )}
                <Pulsante testo={infoCambio.metodi.carta || infoCambio.metodi.conto ? t('Aggiungi un altro metodo', 'Add another method') : t('Aggiungi il metodo di pagamento', 'Add a payment method')} icona="carta" variante={infoCambio.metodi.carta || infoCambio.metodi.conto ? 'fantasma' : 'secondario'} piccolo={!!(infoCambio.metodi.carta || infoCambio.metodi.conto)} onPress={() => router.push('/metodo-pagamento')} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Non addebitiamo niente adesso: il metodo serve solo per le quote future, che gestisce la segreteria.', 'We don’t charge anything now: the method is only for future payments, which the front desk handles.')}</Text>
              </Sezione>
            ) : null}

            <Messaggio tono="attenzione" titolo={t('Adesso il contratto', 'Now the contract')} icona="documento">
              {infoCambio
                ? t('Lo leggi, spunti le dichiarazioni e firmi con il dito o con il mouse. Alla firma il tuo abbonamento attuale viene chiuso alla sua scadenza e il nuovo parte il giorno dopo. Non c’è nessun pagamento adesso.', 'You read it, tick the declarations and sign with a finger or a mouse. When you sign, your current membership is closed at its end date and the new one starts the day after. There’s no payment now.')
                : persona.firmatario === 'genitore'
                ? t('Lo leggi, spunti le dichiarazioni e firma il genitore, con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.', 'You read it, tick the declarations and the parent signs, with a finger or a mouse. Payment comes next: you choose card or bank account then.')
                : t('Lo leggi, spunti le dichiarazioni e firmi con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.', 'You read it, tick the declarations and sign with a finger or a mouse. Payment comes next: you choose card or bank account then.')}
            </Messaggio>

            <Pulsante testo={t('Leggi il contratto e firma', 'Read the contract and sign')} icona="documento" onPress={apriFoglio} disabilitato={!anteprima || !datiOk || (!!infoCambio && !metodoCambio)} />
            {anteprima && !datiOk ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Conferma i tuoi dati per continuare.', 'Confirm your details to continue.')}</Text> : null}
            <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={() => vai(2)} />
          </>
        ) : null}

        {passo === 4 && stato && firmato ? (
          <>
            <Messaggio tono="ok" titolo={t('Contratto firmato', 'Contract signed')} icona="ok">
              {t(`${firmato.piano}${firmato.nome ? ` · ${firmato.nome}` : ''}. Il contratto non vincola il metodo di pagamento: scegli ora come pagare, e lo potrai cambiare.`, `${firmato.piano}${firmato.nome ? ` · ${firmato.nome}` : ''}. The contract doesn’t tie you to a payment method: choose how to pay now, and you can change it later.`)}
            </Messaggio>
            {firmato.errore ? <Messaggio tono="errore">{firmato.errore}</Messaggio> : null}

            <Sezione titolo={t('Come paghi', 'How you pay')}>
              <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
                <SchedaScelta
                  attiva={metodo === 'carta'}
                  etichetta={t('Paga con carta', 'Pay by card')}
                  icona="carta"
                  titolo={t('Carta', 'Card')}
                  sotto={
                    stato.metodi.carta
                      ? t(`Usiamo la carta salvata${stato.metodi.carta.finale ? ` •••• ${stato.metodi.carta.finale}` : ''}: la prima quota subito, le altre quando scadono, sulla stessa carta.`, `We’ll use your saved card${stato.metodi.carta.finale ? ` •••• ${stato.metodi.carta.finale}` : ''}: the first payment now, the others when they’re due, on the same card.`)
                      : t('La prima quota la paghi sulla pagina sicura della banca, che salva la carta: le quote dopo si addebitano da sole.', 'You pay the first installment on the bank’s secure page, which saves your card: later payments are charged automatically.')
                  }
                  onPress={() => {
                    setMetodo('carta')
                    setErrorePagamento(null)
                  }}
                />
                <SchedaScelta
                  attiva={metodo === 'conto'}
                  etichetta={t('Paga con conto corrente', 'Pay by bank account')}
                  icona="banca"
                  titolo={t('Conto corrente (addebito SEPA)', 'Bank account (SEPA direct debit)')}
                  sotto={t('Le quote, la prima compresa, si addebitano sul tuo conto con il mandato SEPA. Non devi pagare altro adesso.', 'All payments, the first included, are charged to your account under the SEPA mandate. You don’t have to pay anything else now.')}
                  onPress={() => {
                    setMetodo('conto')
                    setErrorePagamento(null)
                  }}
                />
              </View>
              {metodo === 'conto' ? (
                stato.metodi.conto && usaContoSalvato && !contoNuovo ? (
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>
                      {t(`Usiamo il conto salvato${stato.metodi.conto.finale ? ` •••• ${stato.metodi.conto.finale}` : ''}, con il mandato SEPA già firmato.`, `We’ll use your saved account${stato.metodi.conto.finale ? ` •••• ${stato.metodi.conto.finale}` : ''}, with the SEPA mandate already signed.`)}
                    </Text>
                    <Pulsante testo={t('Usa un altro conto', 'Use another account')} variante="fantasma" piccolo pieno={false} onPress={() => setUsaContoSalvato(false)} />
                  </View>
                ) : contoNuovo ? (
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Conto •••• ${contoNuovo.iban.slice(-4)}, intestato a ${contoNuovo.intestatario}.`, `Account •••• ${contoNuovo.iban.slice(-4)}, in the name of ${contoNuovo.intestatario}.`)}</Text>
                    <Pulsante testo={t('Cambia conto', 'Change account')} variante="fantasma" piccolo pieno={false} onPress={() => setContoNuovo(null)} />
                  </View>
                ) : (
                  <ModuloIban
                    nomeCompleto={firmato.nome ?? nomePersona}
                    introduzione={<Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Scrivi l’IBAN su cui addebitare le quote.', 'Enter the IBAN to charge the installments to.')}</Text>}
                    etichettaInvio={t('Usa questo conto', 'Use this account')}
                    onInvia={async (d) => {
                      setContoNuovo(d)
                      return null
                    }}
                    onIndietro={() => (stato.metodi.conto ? setUsaContoSalvato(true) : setMetodo('carta'))}
                  />
                )
              ) : null}
            </Sezione>

            <Sezione titolo={t('Il tuo piano di pagamento', 'Your payment plan')}>
              <RiepilogoCosti importi={firmato.importi} metodo={metodo} senzaTotale={firmato.importi.formula === 'flex'} />
            </Sezione>

            {errorePagamento ? <Messaggio>{errorePagamento}</Messaggio> : null}
            <Pulsante
              testo={metodo === 'conto' ? t('Conferma e attiva', 'Confirm and activate') : stato.metodi.carta ? t(`Paga ${euro(firmato.importi.calendario.totale_oggi)}`, `Pay ${euro(firmato.importi.calendario.totale_oggi)}`) : t('Vai al pagamento sicuro', 'Go to secure payment')}
              icona="carta"
              onPress={paga}
              inCorso={pagando}
              disabilitato={!metodoScelto()}
            />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Contratto n. ${firmato.numero}. Se non completi ora, torna qui: il contratto resta firmato e riprendi dal pagamento.`, `Contract no. ${firmato.numero}. If you don’t finish now, come back here: the contract stays signed and you pick up from the payment.`)}</Text>
          </>
        ) : null}
      </View>

      <Foglio
        aperto={foglio && !!anteprima}
        titolo={t('Il tuo contratto', 'Your contract')}
        sottotitolo={t('Leggilo, oppure vai subito alle dichiarazioni e alla firma.', 'Read it, or go straight to the declarations and the signature.')}
        onChiudi={() => !firmando && setFoglio(false)}
        scorrimento={scorrimentoFoglio}
        onScorri={scorriFoglio}
        flottante={
          anteprima && !firmaVicina ? (
            <Tocco
              onPress={vaiAllaFirma}
              etichetta={t('Firma ora: vai alle dichiarazioni e alla firma', 'Sign now: go to the declarations and the signature')}
              scala={0.96}
              style={[stili.firmaOra, { backgroundColor: p.accento }]}
            >
              <Text style={{ color: '#fff', fontFamily: F.extra, fontSize: 15 }}>{t('Firma ora', 'Sign now')}</Text>
              <Icona nome="giu" size={18} colore="#fff" />
            </Tocco>
          ) : null
        }
      >
        {anteprima ? (
          <View style={{ gap: spazio.tre }} onLayout={(e) => (posti.current.corpo = e.nativeEvent.layout.y)}>
            <RiepilogoCosti importi={anteprima.importi} />
            <DocumentoContratto blocchi={anteprima.documento.blocchi} />

            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, marginTop: spazio.tre }} onLayout={(e) => (posti.current.firma = e.nativeEvent.layout.y)}>
              {t('Dichiarazioni', 'Declarations')}
            </Text>
            {anteprima.consensi.some((c) => !c.obbligatorio) ? (
              <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 18 }}>
                {t('Le dichiarazioni del contratto sono già spuntate. Puoi togliere solo quella facoltativa, per le comunicazioni.', 'The contract declarations are already ticked. You can only untick the optional one, for communications.')}
              </Text>
            ) : null}
            {anteprima.consensi.map((c) => (
              <Casella key={c.chiave} spuntata={!!consensi[c.chiave]} bloccata={c.obbligatorio} onCambia={() => setConsensi((x) => ({ ...x, [c.chiave]: !x[c.chiave] }))} etichetta={c.testo}>
                <Text style={{ color: p.testo, fontFamily: F.normale, fontSize: 13, lineHeight: 19 }}>
                  {c.testo}
                  {c.obbligatorio ? '' : t(' (facoltativo)', ' (optional)')}
                </Text>
              </Casella>
            ))}

            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, marginTop: spazio.tre }}>
              {anteprima.firmatario === 'genitore' ? t('Firma del genitore', 'Parent’s signature') : t('La tua firma', 'Your signature')}
            </Text>
            <FirmaPad onCambia={setFirmaPng} />
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12, lineHeight: 17 }}>
              {t('Firmando confermi di aver letto il contratto. Conserviamo la firma insieme a data, ora, indirizzo IP e dispositivo, come prova della sottoscrizione.', 'By signing you confirm you’ve read the contract. We keep the signature together with the date, time, IP address and device, as proof of signing.')}
            </Text>
            {errorefirma ? <Messaggio>{errorefirma}</Messaggio> : null}
            <Pulsante testo={t('Firma il contratto', 'Sign the contract')} icona="impronta" onPress={firma} inCorso={firmando} disabilitato={!obbligatoriOk || !firmaPng} />
            {!obbligatoriOk ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Spunta tutte le dichiarazioni obbligatorie per firmare.', 'Tick all the required declarations to sign.')}</Text> : null}
          </View>
        ) : null}
      </Foglio>
    </Schermata>
  )
}

/** Dopo la firma: se la prima quota e il contratto sono a posto. Si aggiorna da solo per qualche secondo. */
function EsitoContrattoVista({ numero, onFine, onRiprova }: { numero: string; onFine: () => void; onRiprova: () => void }) {
  const p = usePalette()
  const [esito, setEsito] = useState<EsitoContratto | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const giri = useRef(0)

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout>
    async function giro() {
      const r = await esitoAbbonamento(numero)
      if (!vivo) return
      if (!r.ok) setErrore(r.errore)
      else {
        setErrore(null)
        setEsito(r.esito)
        const finito = r.esito.stato === 'completato' || r.esito.stato === 'errore' || !!r.esito.pagamento?.errore
        // La sezione Junior non aspetta il mirror: il pagamento a posto si dice subito, e le letture di prima si rifanno.
        if (r.esito.stato === 'completato') segnaPagataInCorso(numero)
        scorda('abbonamenti:contratti')
        scordaPrefisso('junior:corsi')
        scorda('junior:gruppi')
        scorda('area')
        giri.current += 1
        if (!finito && giri.current < 15) timer = setTimeout(giro, 3000)
      }
    }
    giro()
    return () => {
      vivo = false
      clearTimeout(timer)
    }
  }, [numero])

  const fatto = esito?.stato === 'completato'
  const guasto = esito?.stato === 'errore' || !!esito?.pagamento?.errore
  return (
    <Schermata titolo={fatto ? t('Abbonamento attivo', 'Membership active') : t('Stiamo finendo', 'Almost there')} sopratitolo={t('Abbonamento', 'Membership')} barra>
      <View style={{ gap: spazio.tre }}>
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        {fatto ? (
          <Messaggio tono="ok" titolo={t('Tutto a posto', 'All set')} icona="ok">
            {t('Il contratto è firmato e l’abbonamento è attivo. Il documento firmato è nella tua area riservata sul club.', 'The contract is signed and your membership is active. The signed document is in your member area.')}
          </Messaggio>
        ) : guasto ? (
          <Messaggio tono="errore" titolo={t('Serve un controllo', 'A check is needed')}>
            {esito?.errore ?? esito?.pagamento?.errore ?? t('Qualcosa non è andato a buon fine.', 'Something went wrong.')} {t('Il contratto è firmato e conservato: puoi riprovare a pagare, anche con un altro metodo.', 'The contract is signed and stored: you can try paying again, even with a different method.')}
          </Messaggio>
        ) : (
          <Messaggio tono="attenzione" titolo={t('Un attimo', 'One moment')} icona="clessidra">
            {t('Stiamo verificando il pagamento e preparando il documento firmato. Non chiudere la pagina.', 'We’re verifying the payment and preparing the signed document. Don’t close the page.')}
          </Messaggio>
        )}
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{t(`Contratto n. ${numero}`, `Contract no. ${numero}`)}</Text>
        {guasto ? <Pulsante testo={t('Riprova il pagamento', 'Try the payment again')} onPress={onRiprova} /> : null}
        <Pulsante testo={t('Torna alla home', 'Back to home')} onPress={onFine} variante={fatto ? 'primario' : guasto ? 'fantasma' : 'secondario'} />
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  scelta: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre, borderRadius: 18, borderWidth: 2 },
  giorno: { paddingHorizontal: 16, minHeight: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  filtro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  firmaOra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
})
