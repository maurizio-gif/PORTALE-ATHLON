import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import type Animated from 'react-native-reanimated'

import {
  anteprimaAbbonamento,
  esitoAbbonamento,
  firmaAbbonamento,
  pagaAbbonamento,
  riepilogoAbbonamento,
  statoAbbonamento,
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
} from '@/api/abbonamento'
import { Casella } from '@/components/Casella'
import { ModuloIban, type DatiConto } from '@/features/metodo-pagamento/ModuloIban'
import { euro } from '@/lib/eventi'
import { CODICE_FISCALE_NON_ATTRIBUITO, ITALIA, nomePaese } from '@/lib/residenteEstero'
import { spazio } from '@/theme'

import { CorreggiDati } from './abbonamento/CorreggiDati'
import { Indicatore, SchedaScelta } from './abbonamento/Passi'
import { FORMULE, Listino } from './abbonamento/Listino'
import { FirmaPad } from './FirmaPad'
import { dataLunga, RiepilogoCosti } from './RiepilogoCosti'
import { Foglio } from './ui/Foglio'
import { Carta, Etichetta, Messaggio, Pulsante, Sezione } from './ui/kit'
import { SchermataInArrivo } from './ui/Attesa'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

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

function giornoBreve(iso: string): string {
  const [a, m, g] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, g)))
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
      {parti.map((t, i) => (i % 2 ? <Text key={i} style={{ fontFamily: F.extra }}>{t}</Text> : t))}
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

/** Un dato del contratto, con la sua etichetta: «Nato/a il · 3 marzo 1990». */
function RigaDato({ nome, valore }: { nome: string; valore: string | null | undefined }) {
  const p = usePalette()
  return (
    <View style={{ flexDirection: 'row', gap: spazio.due }}>
      <Text style={[stili.nota, { color: p.testoSecondario, width: 112 }]}>{nome}</Text>
      <Text style={{ color: valore ? p.testo : p.errore, fontFamily: F.bold, fontSize: 14, flex: 1, lineHeight: 20 }}>{valore || 'Manca'}</Text>
    </View>
  )
}

/** «Via Ugo Ojetti 134, 00137 Roma»; per chi risiede all'estero, con il Paese in fondo (se la riga non lo dice gia'). */
function residenzaConPaese(c: DatiContraente): string | null {
  const paese = c.senza_codice_fiscale && c.paese && c.paese !== ITALIA ? nomePaese(c.paese) : null
  if (!c.residenza || !paese) return c.residenza
  return c.residenza.toLowerCase().includes(paese.toLowerCase()) ? c.residenza : `${c.residenza}, ${paese}`
}

/** Un contratto firmato e creato, in attesa del pagamento. */
type Firmato = { numero: string; importi: ImportiContratto; piano: string; nome: string | null; errore: string | null }

export function Abbonamento() {
  const p = usePalette()
  const { contratto } = useLocalSearchParams<{ contratto?: string }>()
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

  const carica = useCallback(async () => {
    const r = await statoAbbonamento()
    if (!r.ok) return setErrore(r.errore)
    setStato(r.stato)
    setMembro((m) => m ?? r.stato.persone.find((x) => x.puo_comprare)?.member_id ?? r.stato.persone[0]?.member_id ?? null)
    // Firmato e non pagato: si riprende dal pagamento, senza rifirmare.
    const d = r.stato.da_pagare
    if (d) {
      setFirmato({ numero: d.numero, importi: d.importi, piano: d.piano, nome: d.nome, errore: d.errore })
      setPasso(4)
    }
  }, [])
  useEffect(() => {
    if (!numero) carica()
  }, [carica, numero])

  const persona: PersonaAbbonamento | undefined = stato?.persone.find((x) => x.member_id === membro)
  const piano: PianoAbbonamento | undefined = stato?.piani.find((x) => x.piano_id === pianoId)
  useEffect(() => {
    if (persona?.inizio_min) setInizio((i) => (i && persona.inizio_min! <= i && i <= persona.inizio_max! ? i : persona.inizio_min))
  }, [persona?.inizio_min, persona?.inizio_max, persona])
  const giorni = useMemo(() => (persona?.inizio_min && persona.inizio_max ? giorniFra(persona.inizio_min, persona.inizio_max) : []), [persona])

  function scelta(): SceltaAbbonamento | null {
    if (!persona || !pianoId || !inizio) return null
    return { member_id: persona.member_id, piano_id: pianoId, data_inizio: inizio }
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
    const t = setTimeout(async () => {
      const r = await riepilogoAbbonamento(s)
      if (giro !== giroCosti.current) return
      setCostiInCorso(false)
      if (r.ok) setCosti(r.importi)
      else {
        setCosti(null)
        setErrore(r.errore)
      }
    }, 250)
    return () => clearTimeout(t)
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
    setConsensi(Object.fromEntries(r.anteprima.consensi.map((c) => [c.chiave, c.preselezionato])))
    setFirmaPng(null)
    setErroreFirma(null)
    setAnteprima(r.anteprima)
  }

  const obbligatoriOk = !!anteprima && anteprima.consensi.every((c) => !c.obbligatorio || consensi[c.chiave])

  async function firma() {
    const s = scelta()
    if (!s || !anteprima || !firmaPng || !piano) return
    setErroreFirma(null)
    setFirmando(true)
    const r = await firmaAbbonamento(s, anteprima.impronta, consensi, firmaPng)
    if (!r.ok) {
      setFirmando(false)
      colpetto('errore')
      return setErroreFirma(r.errore)
    }
    colpetto('ok')
    setFoglio(false)
    setFirmando(false)
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
      if (Platform.OS === 'web') window.location.assign(r.esito.url)
      else await Linking.openURL(r.esito.url)
      setPagando(false)
      return
    }
    setPagando(false)
    setNumero(r.esito.numero)
  }

  if (numero) return <EsitoContrattoVista numero={numero} onFine={() => router.replace('/lab')} onRiprova={() => setNumero(null)} />
  if (!stato && !errore) return <SchermataInArrivo titolo="Abbonamento" sopratitolo="Laboratorio" />

  const pronto = !!scelta()
  const NOMI_PASSI = ['Abbonamento', 'Data', 'Dati e firma', 'Pagamento']
  const SOTTOTITOLI = [
    'Scegli l’abbonamento e la formula: qui sotto trovi cosa comprende e le condizioni.',
    'Scegli quando parte: vedi subito quanto e quando paghi.',
    'Conferma i tuoi dati, leggi il contratto e firma.',
    'Il contratto è firmato. Ultimo passo: scegli come pagare.',
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
    <Schermata titolo="Abbonamento" sopratitolo="Laboratorio" sottotitolo={SOTTOTITOLI[passo - 1]} indietro="/lab" scorrimento={scorrimento}>
      <View style={{ gap: spazio.quattro }}>
        <Indicatore passo={passo} nomi={NOMI_PASSI} />
        {errore ? <Messaggio>{errore}</Messaggio> : null}

        {passo === 1 && stato ? (
          <>
            {stato.persone.length > 1 ? (
              <Sezione titolo="Per chi">
                <View style={{ gap: spazio.due }}>
                  {stato.persone.map((x) => {
                    const attivo = x.member_id === membro
                    return (
                      <SchedaScelta
                        key={x.member_id}
                        attiva={attivo}
                        etichetta={`Per ${x.nome ?? ''} ${x.cognome ?? ''}`}
                        onPress={() => setMembro(x.member_id)}
                        titolo={`${x.nome ?? ''} ${x.cognome ?? ''}`.trim()}
                        sotto={x.puo_comprare ? (x.firmatario === 'genitore' ? 'Firma il genitore' : x.titolare ? 'Firmi tu' : 'Firma lui') : (x.motivo ?? undefined)}
                        destra={x.puo_comprare ? undefined : <Etichetta testo="Non disponibile" tono="neutro" />}
                      />
                    )
                  })}
                </View>
              </Sezione>
            ) : null}

            {persona && !persona.puo_comprare ? (
              <Messaggio tono="attenzione" titolo="Per ora non si può comprare">
                {persona.motivo}
              </Messaggio>
            ) : null}

            {persona?.puo_comprare ? (
              <>
                <Listino piani={stato.piani} pianoId={pianoId} onScegli={setPianoId} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {stato.quota_attivazione > 0
                    ? `A ogni abbonamento si aggiunge la quota di attivazione di ${euro(stato.quota_attivazione)}, che non si paga se il nuovo abbonamento parte il giorno dopo la scadenza del precedente. `
                    : ''}
                  Tutto quello che scegli lo rivedi prima di firmare.
                </Text>
                <Pulsante testo="Continua" icona="avanti" onPress={() => vai(2)} disabilitato={!pianoId} />
                <Pulsante testo="I miei abbonamenti" variante="fantasma" piccolo pieno={false} onPress={() => router.navigate('/lab/abbonamenti')} />
              </>
            ) : null}
          </>
        ) : null}

        {passo === 2 && stato && persona && piano ? (
          <>
            <Carta piatta>
              <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>La tua scelta</Text>
              <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 }}>{`${piano.abbonamento} · ${formula?.titolo ?? ''}`}</Text>
              <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>
                {`${euro(piano.importo)} ${piano.periodo.includes('anno') ? 'all’anno' : 'al mese'}${stato.persone.length > 1 ? ` · per ${nomePersona}` : ''}`}
              </Text>
            </Carta>

            <Sezione titolo="Quando parte">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
                {giorni.map((g) => {
                  const attivo = g === inizio
                  return (
                    <Tocco
                      key={g}
                      vibra="scelta"
                      stato={{ selected: attivo }}
                      etichetta={`Parte il ${giornoBreve(g)}`}
                      onPress={() => setInizio(g)}
                      style={[stili.giorno, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                    >
                      <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 13 }}>{giornoBreve(g)}</Text>
                    </Tocco>
                  )
                })}
              </ScrollView>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                Puoi farlo partire oggi o fino a due settimane dopo. Si paga alla firma, ma la data decide cosa copre la prima quota.
              </Text>
            </Sezione>

            <Sezione titolo="Il tuo piano di pagamento">
              {costi ? (
                <RiepilogoCosti importi={costi} />
              ) : costiInCorso ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Calcoliamo i costi…</Text>
              ) : (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Scegli la data di partenza per vedere i costi.</Text>
              )}
            </Sezione>

            <Pulsante testo="Continua" icona="avanti" onPress={() => vai(3)} disabilitato={!pronto || !costi} />
            <Pulsante testo="Indietro" variante="fantasma" piccolo pieno={false} onPress={() => vai(1)} />
          </>
        ) : null}

        {passo === 3 && stato && persona && piano ? (
          <>
            <Carta piatta>
              <View style={{ gap: spazio.tre }}>
                {(
                  [
                    ['Abbonamento', `${piano.abbonamento} · ${formula?.titolo ?? ''}`, 1],
                    ...(stato.persone.length > 1 ? ([['Per', nomePersona, 1]] as const) : []),
                    ['Parte il', inizio ? giornoBreve(inizio) : '—', 2],
                  ] as const
                ).map(([nome, valore, dove]) => (
                  <View key={nome} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due }}>
                    <Text style={[stili.nota, { color: p.testoSecondario, width: 92 }]}>{nome}</Text>
                    <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 14, flex: 1, lineHeight: 20 }}>{valore}</Text>
                    <Tocco ruolo="button" etichetta={`Modifica: ${nome}`} onPress={() => vai(dove)} style={{ paddingVertical: 2, paddingHorizontal: 4 }}>
                      <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 13 }}>Modifica</Text>
                    </Tocco>
                  </View>
                ))}
              </View>
            </Carta>

            {costi ? <RiepilogoCosti importi={costi} /> : null}

            <Sezione titolo={anteprima?.genitore ? 'I dati del contratto' : 'I tuoi dati'}>
              {apertura && !anteprima ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Prepariamo il contratto…</Text>
              ) : anteprima ? (
                <>
                  <Carta piatta>
                    <View style={{ gap: spazio.due }}>
                      <RigaDato nome="Nome e cognome" valore={`${anteprima.contraente.nome} ${anteprima.contraente.cognome}`.trim()} />
                      <RigaDato nome="Nato/a il" valore={anteprima.contraente.data_nascita ? dataLunga(anteprima.contraente.data_nascita) : null} />
                      <RigaDato nome="Codice fiscale" valore={anteprima.contraente.codice_fiscale?.toUpperCase() ?? (anteprima.contraente.senza_codice_fiscale ? CODICE_FISCALE_NON_ATTRIBUITO : null)} />
                      <RigaDato nome="Residenza" valore={residenzaConPaese(anteprima.contraente)} />
                      <RigaDato nome="Email" valore={anteprima.contraente.email} />
                      <RigaDato nome="Telefono" valore={anteprima.contraente.telefono} />
                      {anteprima.genitore ? <RigaDato nome="Firma il genitore" valore={`${anteprima.genitore.nome} ${anteprima.genitore.cognome}`.trim()} /> : null}
                    </View>
                  </Carta>
                  {personeDati.map((d) => (
                    <CorreggiDati key={`${d.member_id}-${d.codice_fiscale}-${d.paese}-${d.telefono}-${d.indirizzo?.via}-${d.indirizzo?.cap}-${d.indirizzo?.paese}`} persona={d} titolo={d.ruolo === 'genitore' ? 'Dati del genitore che firma' : 'Correggi i tuoi dati'} onSalvato={caricaContratto} />
                  ))}
                  <Casella spuntata={datiOk} onCambia={() => setDatiOk((v) => !v)} etichetta="Confermo che i dati sono corretti">
                    <Text style={{ color: p.testo, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>Confermo che questi dati sono corretti.</Text>
                  </Casella>
                </>
              ) : mancanti?.length ? (
                <>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>Per il contratto servono dati corretti: completali qui sotto, poi si va avanti.</Text>
                  {personeDati.map((d) => (
                    <CorreggiDati
                      key={`${d.member_id}-m`}
                      persona={d}
                      titolo={d.ruolo === 'genitore' ? 'Dati del genitore che firma' : 'I tuoi dati'}
                      apertoDa
                      mancanti={mancanti}
                      onSalvato={caricaContratto}
                    />
                  ))}
                </>
              ) : null}
            </Sezione>

            <Messaggio tono="attenzione" titolo="Adesso il contratto" icona="documento">
              {persona.firmatario === 'genitore'
                ? 'Lo leggi fino in fondo, spunti le dichiarazioni e firma il genitore, con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.'
                : 'Lo leggi fino in fondo, spunti le dichiarazioni e firmi con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.'}
            </Messaggio>

            <Pulsante testo="Leggi il contratto e firma" icona="documento" onPress={() => setFoglio(true)} disabilitato={!anteprima || !datiOk} />
            {anteprima && !datiOk ? <Text style={[stili.nota, { color: p.testoSecondario }]}>Conferma i tuoi dati per continuare.</Text> : null}
            <Pulsante testo="Indietro" variante="fantasma" piccolo pieno={false} onPress={() => vai(2)} />
          </>
        ) : null}

        {passo === 4 && stato && firmato ? (
          <>
            <Messaggio tono="ok" titolo="Contratto firmato" icona="ok">
              {`${firmato.piano}${firmato.nome ? ` · ${firmato.nome}` : ''}. Il contratto non vincola il metodo di pagamento: scegli ora come pagare, e lo potrai cambiare.`}
            </Messaggio>
            {firmato.errore ? <Messaggio tono="errore">{firmato.errore}</Messaggio> : null}

            <Sezione titolo="Come paghi">
              <View style={{ gap: spazio.due }} accessibilityRole="radiogroup">
                <SchedaScelta
                  attiva={metodo === 'carta'}
                  etichetta="Paga con carta"
                  icona="carta"
                  titolo="Carta"
                  sotto={
                    stato.metodi.carta
                      ? `Usiamo la carta salvata${stato.metodi.carta.finale ? ` •••• ${stato.metodi.carta.finale}` : ''}: la prima quota subito, le altre quando scadono, sulla stessa carta.`
                      : 'La prima quota la paghi sulla pagina sicura della banca, che salva la carta: le quote dopo si addebitano da sole.'
                  }
                  onPress={() => {
                    setMetodo('carta')
                    setErrorePagamento(null)
                  }}
                />
                <SchedaScelta
                  attiva={metodo === 'conto'}
                  etichetta="Paga con conto corrente"
                  icona="banca"
                  titolo="Conto corrente (addebito SEPA)"
                  sotto="Le quote, la prima compresa, si addebitano sul tuo conto con il mandato SEPA. Non devi pagare altro adesso."
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
                      {`Usiamo il conto salvato${stato.metodi.conto.finale ? ` •••• ${stato.metodi.conto.finale}` : ''}, con il mandato SEPA già firmato.`}
                    </Text>
                    <Pulsante testo="Usa un altro conto" variante="fantasma" piccolo pieno={false} onPress={() => setUsaContoSalvato(false)} />
                  </View>
                ) : contoNuovo ? (
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Conto •••• ${contoNuovo.iban.slice(-4)}, intestato a ${contoNuovo.intestatario}.`}</Text>
                    <Pulsante testo="Cambia conto" variante="fantasma" piccolo pieno={false} onPress={() => setContoNuovo(null)} />
                  </View>
                ) : (
                  <ModuloIban
                    nomeCompleto={firmato.nome ?? nomePersona}
                    introduzione={<Text style={[stili.nota, { color: p.testoSecondario }]}>Scrivi l’IBAN su cui addebitare le quote.</Text>}
                    etichettaInvio="Usa questo conto"
                    onInvia={async (d) => {
                      setContoNuovo(d)
                      return null
                    }}
                    onIndietro={() => (stato.metodi.conto ? setUsaContoSalvato(true) : setMetodo('carta'))}
                  />
                )
              ) : null}
            </Sezione>

            <Sezione titolo="Il tuo piano di pagamento">
              <RiepilogoCosti importi={firmato.importi} metodo={metodo} />
            </Sezione>

            {errorePagamento ? <Messaggio>{errorePagamento}</Messaggio> : null}
            <Pulsante
              testo={metodo === 'conto' ? 'Conferma e attiva' : stato.metodi.carta ? `Paga ${euro(firmato.importi.calendario.totale_oggi)}` : 'Vai al pagamento sicuro'}
              icona="carta"
              onPress={paga}
              inCorso={pagando}
              disabilitato={!metodoScelto()}
            />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Contratto n. ${firmato.numero}. Se non completi ora, torna qui: il contratto resta firmato e riprendi dal pagamento.`}</Text>
          </>
        ) : null}
      </View>

      <Foglio aperto={foglio && !!anteprima} titolo="Il tuo contratto" sottotitolo="Leggilo fino in fondo, poi spunta le dichiarazioni e firma." onChiudi={() => !firmando && setFoglio(false)}>
        {anteprima ? (
          <View style={{ gap: spazio.tre }}>
            <RiepilogoCosti importi={anteprima.importi} />
            {anteprima.documento.blocchi.map((b, i) => (
              <BloccoDocumento key={i} b={b} />
            ))}

            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, marginTop: spazio.tre }}>Dichiarazioni</Text>
            {anteprima.consensi.map((c) => (
              <Casella key={c.chiave} spuntata={!!consensi[c.chiave]} onCambia={() => setConsensi((x) => ({ ...x, [c.chiave]: !x[c.chiave] }))} etichetta={c.testo}>
                <Text style={{ color: p.testo, fontFamily: F.normale, fontSize: 13, lineHeight: 19 }}>
                  {c.testo}
                  {c.obbligatorio ? '' : ' (facoltativo)'}
                </Text>
              </Casella>
            ))}

            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, marginTop: spazio.tre }}>
              {anteprima.firmatario === 'genitore' ? 'Firma del genitore' : 'La tua firma'}
            </Text>
            <FirmaPad onCambia={setFirmaPng} />
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12, lineHeight: 17 }}>
              Firmando confermi di aver letto il contratto. Conserviamo la firma insieme a data, ora, indirizzo IP e dispositivo, come prova della sottoscrizione.
            </Text>
            {errorefirma ? <Messaggio>{errorefirma}</Messaggio> : null}
            <Pulsante testo="Firma il contratto" icona="impronta" onPress={firma} inCorso={firmando} disabilitato={!obbligatoriOk || !firmaPng} />
            {!obbligatoriOk ? <Text style={[stili.nota, { color: p.testoSecondario }]}>Spunta tutte le dichiarazioni obbligatorie per firmare.</Text> : null}
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
    <Schermata titolo={fatto ? 'Abbonamento attivo' : 'Stiamo finendo'} sopratitolo="Abbonamento" barra>
      <View style={{ gap: spazio.tre }}>
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        {fatto ? (
          <Messaggio tono="ok" titolo="Tutto a posto" icona="ok">
            Il contratto è firmato e l’abbonamento è attivo. Il documento firmato è nella tua area riservata sul club.
          </Messaggio>
        ) : guasto ? (
          <Messaggio tono="errore" titolo="Serve un controllo">
            {esito?.errore ?? esito?.pagamento?.errore ?? 'Qualcosa non è andato a buon fine.'} Il contratto è firmato e conservato: puoi riprovare a pagare, anche con un altro metodo.
          </Messaggio>
        ) : (
          <Messaggio tono="attenzione" titolo="Un attimo" icona="clessidra">
            Stiamo verificando il pagamento e preparando il documento firmato. Non chiudere la pagina.
          </Messaggio>
        )}
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{`Contratto n. ${numero}`}</Text>
        {guasto ? <Pulsante testo="Riprova il pagamento" onPress={onRiprova} /> : null}
        <Pulsante testo="Torna alla home" onPress={onFine} variante={fatto ? 'primario' : guasto ? 'fantasma' : 'secondario'} />
      </View>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  scelta: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre, borderRadius: 18, borderWidth: 2 },
  giorno: { paddingHorizontal: 16, minHeight: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  filtro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
})
