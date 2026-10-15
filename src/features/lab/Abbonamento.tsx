import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  anteprimaAbbonamento,
  esitoAbbonamento,
  firmaAbbonamento,
  statoAbbonamento,
  type AnteprimaContratto,
  type Blocco,
  type EsitoContratto,
  type PersonaAbbonamento,
  type PianoAbbonamento,
  type SceltaAbbonamento,
  type StatoAbbonamento,
} from '@/api/abbonamento'
import { Casella } from '@/components/Casella'
import { ModuloIban, type DatiConto } from '@/features/metodo-pagamento/ModuloIban'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { FirmaPad } from './FirmaPad'
import { Foglio } from './ui/Foglio'
import { Icona } from './ui/Icona'
import { Carta, Etichetta, Messaggio, Pulsante, Sezione } from './ui/kit'
import { SchermataInArrivo } from './ui/Attesa'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// L'abbonamento principale comprato dal portale (16/10/2026): Smart o Premium,
// nelle tre formule, con il contratto da leggere e firmare come su Adobe o
// DocuSign. Chi puo' comprare, i prezzi, le date e il contratto li decide il
// server (portale-abbonamento): qui si sceglie, si legge e si firma.
//
// Un adulto firma da se'; per un minorenne (dai 13 ai 17 anni) firma il
// genitore, dal suo account. Sotto i 13 anni non si vende un abbonamento adulti.
// Il contratto che si firma e' quello che si e' letto: il server ricompone il
// documento e ne confronta l'impronta con quella dell'anteprima.

const FORMULE: Record<string, { titolo: string; sotto: string }> = {
  'annuale-rate': { titolo: 'Annuale, a rate', sotto: '12 mesi, pagati ogni mese' },
  'annuale-unico': { titolo: 'Annuale, in un’unica soluzione', sotto: '12 mesi, pagati subito' },
  flex: { titolo: 'Mensile Flex', sotto: 'Si rinnova di mese in mese' },
}

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

export function Abbonamento() {
  const p = usePalette()
  const { contratto } = useLocalSearchParams<{ contratto?: string }>()
  const [stato, setStato] = useState<StatoAbbonamento | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [membro, setMembro] = useState<number | null>(null)
  const [pianoId, setPianoId] = useState<number | null>(null)
  const [inizio, setInizio] = useState<string | null>(null)
  const [metodo, setMetodo] = useState<'carta' | 'conto'>('carta')
  /** Sul conto: il salvato, o un IBAN nuovo (restano nello stato fino alla firma). */
  const [contoNuovo, setContoNuovo] = useState<DatiConto | null>(null)
  const [usaContoSalvato, setUsaContoSalvato] = useState(true)
  const [apertura, setApertura] = useState(false)
  const [anteprima, setAnteprima] = useState<AnteprimaContratto | null>(null)
  const [consensi, setConsensi] = useState<Record<string, boolean>>({})
  const [firmaPng, setFirmaPng] = useState<string | null>(null)
  const [firmando, setFirmando] = useState(false)
  const [errorefirma, setErroreFirma] = useState<string | null>(null)
  const [numero, setNumero] = useState<string | null>(typeof contratto === 'string' ? contratto : null)

  const carica = useCallback(async () => {
    const r = await statoAbbonamento()
    if (!r.ok) return setErrore(r.errore)
    setStato(r.stato)
    setMembro((m) => m ?? r.stato.persone.find((x) => x.puo_comprare)?.member_id ?? r.stato.persone[0]?.member_id ?? null)
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

  const gruppi = useMemo(() => {
    const m = new Map<string, PianoAbbonamento[]>()
    for (const x of stato?.piani ?? []) m.set(x.abbonamento, [...(m.get(x.abbonamento) ?? []), x])
    return [...m.entries()]
  }, [stato])

  function scelta(): SceltaAbbonamento | null {
    if (!persona || !pianoId || !inizio) return null
    const base = { member_id: persona.member_id, piano_id: pianoId, data_inizio: inizio }
    if (metodo === 'carta') return { ...base, metodo: 'carta', con_carta: !!stato?.metodi.carta }
    if (contoNuovo) return { ...base, metodo: 'conto', iban: contoNuovo.iban, intestatario: contoNuovo.intestatario, via: contoNuovo.via, cap: contoNuovo.cap, citta: contoNuovo.citta }
    if (stato?.metodi.conto && usaContoSalvato) return { ...base, metodo: 'conto', conto_salvato: true }
    return null
  }

  async function apri() {
    const s = scelta()
    if (!s) return
    setErrore(null)
    setApertura(true)
    const r = await anteprimaAbbonamento(s)
    setApertura(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.mancanti?.length ? `${r.errore} Completa nel profilo: ${r.mancanti.join(', ')}.` : r.errore)
    }
    setConsensi(Object.fromEntries(r.anteprima.consensi.map((c) => [c.chiave, c.preselezionato])))
    setFirmaPng(null)
    setErroreFirma(null)
    setAnteprima(r.anteprima)
  }

  const obbligatoriOk = !!anteprima && anteprima.consensi.every((c) => !c.obbligatorio || consensi[c.chiave])

  async function firma() {
    const s = scelta()
    if (!s || !anteprima || !firmaPng) return
    setErroreFirma(null)
    setFirmando(true)
    const r = await firmaAbbonamento(s, anteprima.impronta, consensi, firmaPng)
    if (!r.ok) {
      setFirmando(false)
      colpetto('errore')
      return setErroreFirma(r.errore)
    }
    colpetto('ok')
    setAnteprima(null)
    setFirmando(false)
    if (r.esito.url) {
      if (Platform.OS === 'web') window.location.assign(r.esito.url)
      else await Linking.openURL(r.esito.url)
      return
    }
    setNumero(r.esito.numero)
  }

  if (numero) return <EsitoContrattoVista numero={numero} onFine={() => router.replace('/lab')} />
  if (!stato && !errore) return <SchermataInArrivo titolo="Abbonamento" sopratitolo="Laboratorio" />

  const pronto = !!scelta()
  return (
    <Schermata titolo="Abbonamento" sopratitolo="Laboratorio" sottotitolo="Scegli, leggi il contratto e firma: fatto in pochi minuti." indietro="/lab">
      <View style={{ gap: spazio.quattro }}>
        {errore ? <Messaggio>{errore}</Messaggio> : null}

        {stato && stato.persone.length > 1 ? (
          <Sezione titolo="Per chi">
            <View style={{ gap: spazio.due }}>
              {stato.persone.map((x) => {
                const attivo = x.member_id === membro
                return (
                  <Tocco
                    key={x.member_id}
                    vibra="scelta"
                    stato={{ selected: attivo }}
                    etichetta={`${x.nome ?? ''} ${x.cognome ?? ''}`}
                    onPress={() => setMembro(x.member_id)}
                    style={[stili.scelta, attivo ? { borderColor: p.accento, backgroundColor: p.incavo } : { borderColor: p.linea, backgroundColor: p.carta }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{`${x.nome ?? ''} ${x.cognome ?? ''}`.trim()}</Text>
                      <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>
                        {x.puo_comprare ? (x.firmatario === 'genitore' ? 'Firma il genitore' : x.titolare ? 'Firmi tu' : 'Firma lui') : x.motivo}
                      </Text>
                    </View>
                    {x.puo_comprare ? null : <Etichetta testo="Non disponibile" tono="neutro" />}
                  </Tocco>
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

        {persona?.puo_comprare && stato ? (
          <>
            {gruppi.map(([nome, piani]) => (
              <Sezione key={nome} titolo={nome}>
                <View style={{ gap: spazio.due }}>
                  {piani.map((x) => {
                    const attivo = x.piano_id === pianoId
                    const f = FORMULE[x.formula]
                    return (
                      <Tocco
                        key={x.piano_id}
                        vibra="scelta"
                        stato={{ selected: attivo }}
                        etichetta={`${nome}, ${f.titolo}`}
                        onPress={() => setPianoId(x.piano_id)}
                        style={[stili.scelta, attivo ? { borderColor: p.accento, backgroundColor: p.incavo } : { borderColor: p.linea, backgroundColor: p.carta }]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{f.titolo}</Text>
                          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{f.sotto}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5 }}>{euro(x.importo)}</Text>
                          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{x.periodo.includes('anno') ? 'all’anno' : 'al mese'}</Text>
                        </View>
                      </Tocco>
                    )
                  })}
                </View>
              </Sezione>
            ))}

            {piano ? (
              <Carta piatta>
                <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 14, marginBottom: 4 }}>Comprende</Text>
                <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>{piano.attivita.join(', ')}</Text>
                {stato.quota_attivazione > 0 ? (
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12, marginTop: 6 }}>
                    {`Più ${euro(stato.quota_attivazione)} di quota di attivazione, se non rinnovi senza interruzione un abbonamento scaduto.`}
                  </Text>
                ) : null}
              </Carta>
            ) : null}

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
            </Sezione>

            <Sezione titolo="Come paghi">
              <View style={{ flexDirection: 'row', gap: spazio.due }}>
                {(
                  [
                    ['carta', 'Carta', 'carta'],
                    ['conto', 'Conto corrente', 'banca'],
                  ] as const
                ).map(([chiave, nome, icona]) => {
                  const attivo = metodo === chiave
                  return (
                    <Tocco
                      key={chiave}
                      vibra="scelta"
                      stato={{ selected: attivo }}
                      etichetta={`Paga con ${nome.toLowerCase()}`}
                      onPress={() => {
                        setMetodo(chiave)
                        setErrore(null)
                      }}
                      style={[stili.filtro, { flex: 1 }, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                    >
                      <Icona nome={icona} size={18} colore={attivo ? '#fff' : p.testoSecondario} />
                      <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{nome}</Text>
                    </Tocco>
                  )
                })}
              </View>
              {metodo === 'carta' ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {stato.metodi.carta
                    ? `Addebitiamo la prima quota sulla carta salvata${stato.metodi.carta.finale ? ` •••• ${stato.metodi.carta.finale}` : ''}; le altre ogni mese sulla stessa.`
                    : 'Paghi la prima quota sulla pagina sicura della banca, che salva la carta per le quote dopo.'}
                </Text>
              ) : stato.metodi.conto && usaContoSalvato && !contoNuovo ? (
                <View style={{ gap: spazio.due }}>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {`Usiamo il conto salvato${stato.metodi.conto.finale ? ` •••• ${stato.metodi.conto.finale}` : ''}, con il mandato SEPA già firmato: le quote, la prima compresa, si addebitano da lì.`}
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
                  nomeCompleto={[persona.nome, persona.cognome].filter(Boolean).join(' ')}
                  introduzione={<Text style={[stili.nota, { color: p.testoSecondario }]}>Scrivi l’IBAN su cui addebitare le quote. Adesso non paghi niente: prima leggi il contratto.</Text>}
                  etichettaInvio="Continua"
                  onInvia={async (d) => {
                    setContoNuovo(d)
                    return null
                  }}
                  onIndietro={() => (stato.metodi.conto ? setUsaContoSalvato(true) : setMetodo('carta'))}
                />
              )}
            </Sezione>

            <Pulsante testo="Leggi e firma il contratto" icona="documento" onPress={apri} inCorso={apertura} disabilitato={!pronto} />
          </>
        ) : null}
      </View>

      <Foglio aperto={!!anteprima} titolo="Il tuo contratto" sottotitolo="Leggilo fino in fondo, poi firma." onChiudi={() => !firmando && setAnteprima(null)}>
        {anteprima ? (
          <View style={{ gap: spazio.tre }}>
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
            <Pulsante testo="Firma e attiva" icona="impronta" onPress={firma} inCorso={firmando} disabilitato={!obbligatoriOk || !firmaPng} />
            {!obbligatoriOk ? <Text style={[stili.nota, { color: p.testoSecondario }]}>Spunta tutte le dichiarazioni obbligatorie per firmare.</Text> : null}
          </View>
        ) : null}
      </Foglio>
    </Schermata>
  )
}

/** Dopo la firma: se la prima quota e il contratto sono a posto. Si aggiorna da solo per qualche secondo. */
function EsitoContrattoVista({ numero, onFine }: { numero: string; onFine: () => void }) {
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
            {esito?.errore ?? esito?.pagamento?.errore ?? 'Qualcosa non è andato a buon fine.'} Il contratto è firmato e conservato: scrivi al club e ti aiutiamo a completarlo.
          </Messaggio>
        ) : (
          <Messaggio tono="attenzione" titolo="Un attimo" icona="clessidra">
            Stiamo verificando il pagamento e preparando il documento firmato. Non chiudere la pagina.
          </Messaggio>
        )}
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{`Contratto n. ${numero}`}</Text>
        <Pulsante testo="Torna alla home" onPress={onFine} variante={fatto ? 'primario' : 'secondario'} />
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
