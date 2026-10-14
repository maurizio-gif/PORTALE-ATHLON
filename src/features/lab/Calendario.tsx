import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  acquistaLezione,
  disdiciLezione,
  esitoAcquistoLezione,
  leggiGiorno,
  pagaLezioneConCarta,
  prenotaLezione,
  type DaPagare,
  type EsitoAcquisto,
  type Giorno,
  type Lezione,
  type PersonaCalendario,
  type SchedaLezione,
} from '@/api/lab'
import { InfoAdyen } from '@/components/InfoAdyen'
import { euro, giornoEsteso, ora } from '@/lib/eventi'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { posizione } from './SchedaLezione'
import { FoglioLezione } from './ui/FoglioLezione'
import { Icona } from './ui/Icona'
import { Avatar, Barra, Carta, Entra, Etichetta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// Il calendario del laboratorio: le lezioni di gruppo di oggi e dei tre giorni
// dopo, e la prenotazione vera su PerfectGym, per se' o per un figlio.
// Le regole (apertura, posti, disdetta, quote da saldare) le applica
// PerfectGym; qui si mostrano i suoi rifiuti.

/** Nome e cognome per esteso, come sulla scheda del club. */
function nomeCompleto(p: Pick<PersonaCalendario, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

function maiuscola(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function etichettaGiorno(data: string): { settimana: string; numero: string } {
  const [settimana, numero] = giornoEsteso(data).split(' ')
  return { settimana: settimana.slice(0, 3), numero }
}

/** «gio 22 ott, 10:00», all'ora di Roma. */
function apertura(iso: string): string {
  const d = new Date(iso)
  const giorno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(d)
  return `${giorno}, ${ora(iso)}`
}

/** Il nome sopra e il cognome sotto: in una riga sola un nome lungo veniva tagliato. */
function suDueRighe(chi: string): string {
  const [nome, ...resto] = chi.trim().split(/\s+/)
  return resto.length ? `${nome}\n${resto.join(' ')}` : nome
}

function minuti(inizio: string, fine: string): number {
  return Math.round((new Date(fine).getTime() - new Date(inizio).getTime()) / 60000)
}

/** La copertina della lezione: la foto del sito, sfumata, col nome sopra. */
function Copertina({ l, scheda, onScheda }: { l: Lezione; scheda: SchedaLezione | null; onScheda: () => void }) {
  const p = usePalette()
  const b = l.prenotazione
  const tono = l.liberi <= 0 ? 'errore' : l.liberi < 5 ? 'attenzione' : 'ok'
  const corpo = (
    <View style={stili.copertina}>
      {scheda?.foto ? (
        <Image source={{ uri: scheda.foto }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={posizione(scheda.fuoco)} transition={200} />
      ) : (
        <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', right: -10, top: -6, transform: [{ rotate: '-14deg' }] }}>
            <Icona nome="abbonamento" size={130} colore="rgba(255,255,255,0.07)" />
          </View>
        </LinearGradient>
      )}
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={stili.copertinaAlto}>
        <Tag testo={l.categoria} colore="#fff" fondo="rgba(0,0,0,0.25)" />
        {b ? (
          <View style={[stili.vetrino, { backgroundColor: b.attesa ? p.attenzione : p.ok }]}>
            <Icona nome={b.attesa ? 'clessidra' : 'spunta'} size={13} colore="#fff" />
            <Text style={stili.vetrinoTesto}>{b.attesa ? 'In attesa' : 'Prenotata'}</Text>
          </View>
        ) : l.iniziata ? (
          <View style={stili.vetrino}>
            <Text style={stili.vetrinoTesto}>Già cominciata</Text>
          </View>
        ) : (
          <View style={stili.vetrino} accessibilityLabel={l.liberi <= 0 ? 'Lezione completa' : `${l.liberi} ${l.liberi === 1 ? 'posto libero' : 'posti liberi'}`}>
            <View style={[stili.puntino, { backgroundColor: tono === 'ok' ? '#6DD58C' : tono === 'attenzione' ? '#F2B84B' : '#FF6B6B' }]} />
            <Text style={stili.vetrinoTesto}>{l.liberi <= 0 ? 'Completa' : `${l.liberi} ${l.liberi === 1 ? 'posto' : 'posti'}`}</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={stili.copertinaNome} numberOfLines={2}>
          {l.nome}
        </Text>
        {l.istruttore ? <Text style={stili.copertinaIstruttore}>con {l.istruttore}</Text> : null}
      </View>
      {scheda ? (
        <View style={stili.info}>
          <Icona nome="play" size={16} colore="#fff" />
        </View>
      ) : null}
    </View>
  )
  return scheda ? (
    <Tocco onPress={onScheda} scala={0.99} etichetta={`Scheda di ${l.nome}: video e descrizione`}>
      {corpo}
    </Tocco>
  ) : (
    corpo
  )
}

function RigaLezione({
  l,
  scheda,
  onScheda,
  occupato,
  onPrenota,
  onAcquista,
  onPagaCarta,
  onDisdici,
}: {
  l: Lezione
  scheda: SchedaLezione | null
  onScheda: () => void
  occupato: boolean
  /** Null se e' andata; altrimenti il motivo e, se manca solo il prodotto, cosa comprare (col link gia' aperto). */
  onPrenota: () => Promise<({ errore: string } & Partial<DaPagare>) | null>
  onAcquista: (url?: string) => Promise<string | null>
  onPagaCarta: (acquistoId: string) => Promise<string | null>
  onDisdici: () => Promise<string | null>
}) {
  const p = usePalette()
  const [conferma, setConferma] = useState(false)
  // Il prodotto da comprare, dopo che PerfectGym ha detto che la lezione non e' compresa.
  const [daPagare, setDaPagare] = useState<DaPagare | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const b = l.prenotazione

  async function esegui(azione: () => Promise<string | null>) {
    setErrore(null)
    setAttesa(true)
    const problema = await azione()
    setAttesa(false)
    setConferma(false)
    if (problema) {
      colpetto('errore')
      setErrore(problema)
    }
  }

  // I posti sono la cosa che si guarda per prima: verdi quando ce n'e',
  // gialli quando stanno finendo, rossi quando la lezione e' completa.
  const colorePosti = l.liberi <= 0 ? p.errore : l.liberi < 5 ? p.attenzione : p.ok
  const dettagli = [
    { valore: ora(l.inizio), etichetta: 'Inizio' },
    { valore: `${minuti(l.inizio, l.fine)}′`, etichetta: 'Durata' },
    { valore: l.iniziata ? '—' : `${Math.max(0, l.liberi)}/${l.posti}`, etichetta: 'Posti liberi' },
  ]

  return (
    <View style={[stili.lezione, { backgroundColor: p.carta, borderColor: b ? (b.attesa ? p.attenzione : p.ok) : p.linea, borderWidth: b ? 2 : StyleSheet.hairlineWidth, boxShadow: p.ombra }]}>
      <Copertina l={l} scheda={scheda} onScheda={onScheda} />
      <View style={stili.corpo}>
        <View style={stili.cifre}>
          {dettagli.map((d, i) => (
            <View key={d.etichetta} style={[stili.cifra, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
              <Text style={[stili.cifraValore, { color: i === 2 && !l.iniziata ? colorePosti : p.testo }]}>{d.valore}</Text>
              <Text style={[stili.cifraEtichetta, { color: p.testoSecondario }]}>{d.etichetta}</Text>
            </View>
          ))}
        </View>
        {!l.iniziata ? <Barra valore={l.posti ? l.iscritti / l.posti : 0} colore={colorePosti} altezza={6} animata ritardo={250} /> : null}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        {l.iniziata ? null : b ? (
          conferma ? (
            <View style={stili.azioni}>
              <Pulsante testo="Sì, disdici" variante="pericolo" onPress={() => esegui(onDisdici)} inCorso={attesa} />
              <Pulsante testo="No" variante="secondario" onPress={() => setConferma(false)} disabilitato={attesa} />
            </View>
          ) : (
            <Pulsante testo="Disdici" variante="contorno" icona="chiudi" onPress={() => setConferma(true)} disabilitato={occupato} />
          )
        ) : l.limite ? (
          <Messaggio tono="attenzione">{l.limite.messaggio}</Messaggio>
        ) : l.prenotabile_dal ? (
          <View style={[stili.apertura, { backgroundColor: p.incavo }]}>
            <Icona nome="lucchetto" size={16} colore={p.testoSecondario} />
            <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 14 }}>Prenotabile da {apertura(l.prenotabile_dal)}</Text>
          </View>
        ) : daPagare ? (
          // Salva e paga: con la carta gia' salvata si paga con quella (o con
          // un'altra); senza, sulla pagina di Adyen, e la carta resta salvata.
          <View style={{ gap: spazio.due }}>
            {daPagare.carta && daPagare.acquisto_id && daPagare.prodotto.prezzo != null ? (
              <>
                <Pulsante
                  testo={`Paga ${euro(daPagare.prodotto.prezzo)} con la carta${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`}
                  icona="carta"
                  onPress={() => esegui(() => onPagaCarta(daPagare.acquisto_id!))}
                  inCorso={attesa}
                  disabilitato={occupato}
                />
                <Pulsante testo="Usa un’altra carta" variante="fantasma" piccolo onPress={() => esegui(() => onAcquista(daPagare.url))} />
              </>
            ) : (
              <Pulsante
                testo={`Acquista e prenota${daPagare.prodotto.prezzo != null ? ` · ${euro(daPagare.prodotto.prezzo)}` : ''}`}
                icona="carta"
                onPress={() => esegui(() => onAcquista(daPagare.url))}
                inCorso={attesa}
                disabilitato={occupato}
              />
            )}
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {daPagare.carta ? 'La carta la custodisce ' : 'Paghi sulla pagina protetta di '}
              <InfoAdyen />
              {daPagare.carta
                ? ': il club non vede mai il numero completo.'
                : ', in un passo solo: la carta resta salvata per i prossimi acquisti e il club non ne vede mai il numero completo.'}
            </Text>
          </View>
        ) : (
          <View style={stili.azioni}>
            {scheda ? <Pulsante testo="Dettagli" variante="contorno" onPress={onScheda} /> : null}
            <Pulsante
              testo={l.liberi <= 0 ? 'Lista d’attesa' : 'Prenota'}
              icona={l.liberi <= 0 ? 'clessidra' : 'avanti'}
              variante={l.liberi <= 0 ? 'scuro' : 'primario'}
              onPress={async () => {
                setErrore(null)
                setAttesa(true)
                const r = await onPrenota()
                setAttesa(false)
                if (r) {
                  colpetto('errore')
                  setErrore(r.errore)
                } else colpetto('ok')
                if (r?.prodotto) setDaPagare({ prodotto: r.prodotto, url: r.url, acquisto_id: r.acquisto_id, carta: r.carta ?? null })
              }}
              inCorso={attesa}
              disabilitato={occupato}
            />
          </View>
        )}
      </View>
    </View>
  )
}

const SUBENTRO = 'Potrai ricevere una notifica via email in caso di subentro, entro massimo un’ora dal suo inizio.'

/** La «i» della lista d'attesa: sul web al passaggio del mouse, sul telefono al tocco. */
function InfoAttesa() {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={() => setAperta((a) => !a)}
        onHoverIn={() => setAperta(true)}
        onHoverOut={() => setAperta(false)}
        accessibilityRole="button"
        accessibilityLabel={SUBENTRO}
        hitSlop={8}
      >
        <Icona nome="info" size={18} colore={p.attenzione} />
      </Pressable>
      {aperta ? (
        <View style={[stili.fumetto, { backgroundColor: p.carbone }]}>
          <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18, fontFamily: F.medio }}>{SUBENTRO}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** Le lezioni prenotate del giorno, per la persona scelta: prenotata o in lista d'attesa, e Annulla. */
function LezioniPrenotate({ lezioni, occupato, onAnnulla }: { lezioni: Lezione[]; occupato: boolean; onAnnulla: (l: Lezione) => Promise<string | null> }) {
  const [conferma, setConferma] = useState<number | null>(null)
  const [inCorso, setInCorso] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function annulla(l: Lezione) {
    setErrore(null)
    setInCorso(l.class_id)
    const problema = await onAnnulla(l)
    setInCorso(null)
    setConferma(null)
    if (problema) setErrore(problema)
  }

  return (
    <Sezione titolo="Le tue prenotazioni" conteggio={lezioni.length}>
      <Carta style={{ paddingVertical: spazio.due, zIndex: 2 }}>
        {lezioni.map((l, i) => {
          const attesa = !!l.prenotazione?.attesa
          return (
            <View key={l.class_id} style={{ zIndex: lezioni.length - i }}>
              <Riga
                prima={i === 0}
                testa={
                  <LinearGradient colors={attesa ? ['#F5B33B', '#C27800'] : FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.orario}>
                    <Text style={stili.orarioTesto}>{ora(l.inizio)}</Text>
                  </LinearGradient>
                }
                titolo={l.nome}
                sotto={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Etichetta testo={attesa ? 'In lista d’attesa' : 'Prenotata'} tono={attesa ? 'attenzione' : 'ok'} />
                    {attesa ? <InfoAttesa /> : null}
                  </View>
                }
                coda={
                  l.iniziata ? null : conferma === l.class_id ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pulsante testo="Sì, annulla" variante="pericolo" piccolo pieno={false} onPress={() => annulla(l)} inCorso={inCorso === l.class_id} />
                      <Pulsante testo="No" variante="secondario" piccolo pieno={false} onPress={() => setConferma(null)} disabilitato={inCorso !== null} />
                    </View>
                  ) : (
                    <Pulsante testo="Annulla" variante="secondario" piccolo pieno={false} onPress={() => setConferma(l.class_id)} disabilitato={occupato || inCorso !== null} />
                  )
                }
              />
            </View>
          )
        })}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
      </Carta>
    </Sezione>
  )
}

export function Calendario() {
  const p = usePalette()
  const [giorno, setGiorno] = useState<Giorno | null>(inMemoria<{ ok: true; giorno: Giorno }>('giorno::')?.giorno ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [carica, setCarica] = useState(true)
  const [occupato, setOccupato] = useState(false)
  // La categoria scelta (Corsi Fitness, Group Reformer, …) resta passando da
  // un giorno all'altro: chi cerca il Reformer lo cerca in tutta la settimana.
  const [attivita, setAttivita] = useState<string | null>(null)
  const [aperta, setAperta] = useState<Lezione | null>(null)

  // Il giorno gia' letto si mostra subito (memoria del laboratorio) e intanto
  // si rilegge; la Home precarica quello di oggi ('giorno::').
  const chiaveGiorno = useRef('giorno::')
  const leggi = useCallback(async (data?: string, memberId?: number) => {
    const chiave = `giorno:${data ?? ''}:${memberId ?? ''}`
    chiaveGiorno.current = chiave
    const gia = inMemoria<{ ok: true; giorno: Giorno }>(chiave)
    if (gia) setGiorno(gia.giorno)
    setCarica(!gia)
    setErrore(null)
    const esito = await prendi(chiave, () => leggiGiorno(data, memberId))
    if (chiaveGiorno.current !== chiave) return
    if (esito.ok) setGiorno(esito.giorno)
    else setErrore(esito.errore)
    setCarica(false)
  }, [])

  useEffect(() => {
    leggi()
  }, [leggi])

  // Il ritorno dal pagamento di PerfectGym (?acquisto=<id>): si chiede
  // com'e' andata finche' la prenotazione non c'e' (il pagamento arriva a
  // PerfectGym qualche secondo dopo), per due minuti; poi si rilegge il giorno.
  const { acquisto } = useLocalSearchParams<{ acquisto?: string }>()
  const [ritorno, setRitorno] = useState<EsitoAcquisto | { stato: 'avviato' } | null>(null)
  const avviato = useRef(false)
  useEffect(() => {
    if (!acquisto || avviato.current) return
    avviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const r = await esitoAcquistoLezione(acquisto)
      if (fermo) return
      if (!r.ok) return setRitorno({ stato: 'errore', errore: r.errore, class_id: 0, member_id: 0 })
      if (r.esito.stato === 'avviato' && ++giri < 30) {
        setRitorno(r.esito)
        setTimeout(giro, 4000)
        return
      }
      setRitorno(r.esito.stato === 'avviato' ? { ...r.esito, stato: 'errore', errore: null } : r.esito)
      leggi(undefined, r.esito.member_id || undefined)
    }
    setRitorno({ stato: 'avviato' })
    giro()
    return () => {
      fermo = true
    }
  }, [acquisto, leggi])

  // Dopo un clic si aggiorna la riga subito, con quello che dice PerfectGym,
  // senza ricaricare la giornata: il mirror puo' essere indietro.
  function aggiorna(classId: number, prenotazione: Lezione['prenotazione'], delta: number) {
    setGiorno((g) => {
      if (!g) return g
      const nuovo = {
        ...g,
        lezioni: g.lezioni.map((l) =>
          l.class_id === classId ? { ...l, prenotazione, iscritti: l.iscritti + delta, liberi: Math.max(0, l.liberi - delta) } : l
        ),
      }
      // Anche la memoria: tornando qui la prenotazione appena fatta c'e' gia'.
      ricorda(chiaveGiorno.current, { ok: true, giorno: nuovo })
      return nuovo
    })
  }

  async function prenota(l: Lezione): Promise<({ errore: string } & Partial<DaPagare>) | null> {
    if (!giorno) return null
    setOccupato(true)
    const esito = await prenotaLezione(l.class_id, giorno.member_id)
    setOccupato(false)
    if (!esito.ok) return esito
    aggiorna(l.class_id, { booking_id: esito.booking_id ?? 0, attesa: esito.esito === 'attesa' }, esito.esito === 'attesa' ? 0 : 1)
    return null
  }

  /** Alla pagina di pagamento di PerfectGym; si torna qui con ?acquisto=<id>. */
  async function acquista(l: Lezione, pronto?: string): Promise<string | null> {
    if (!giorno) return null
    let url = pronto
    if (!url) {
      setOccupato(true)
      const r = await acquistaLezione(l.class_id, giorno.member_id)
      setOccupato(false)
      if (!r.ok) return r.errore
      url = r.url
    }
    if (Platform.OS === 'web') window.location.assign(url)
    else await Linking.openURL(url)
    return null
  }

  /** Con la carta salvata: l'addebito, poi l'esito come al ritorno dal pagamento. */
  async function pagaCarta(acquistoId: string): Promise<string | null> {
    setOccupato(true)
    const r = await pagaLezioneConCarta(acquistoId)
    setOccupato(false)
    if (!r.ok) return r.errore
    if (Platform.OS === 'web') window.location.assign(`/lab/calendario?acquisto=${acquistoId}`)
    else router.replace({ pathname: '/lab/calendario', params: { acquisto: acquistoId } })
    return null
  }

  async function disdici(l: Lezione): Promise<string | null> {
    if (!giorno) return null
    setOccupato(true)
    const esito = await disdiciLezione(l.class_id, giorno.member_id)
    setOccupato(false)
    if (!esito.ok) return esito.errore
    aggiorna(l.class_id, null, l.prenotazione?.attesa ? 0 : -1)
    return null
  }

  if (errore && !giorno) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Prenotazioni">
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" onPress={() => leggi()} />
      </Schermata>
    )
  }
  if (!giorno) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Prenotazioni">
        <SchedeInArrivo />
      </Schermata>
    )
  }

  const mie = giorno.lezioni.filter((l) => l.prenotazione)
  // Le lezioni gia' cominciate non si prenotano piu': si tengono solo quelle
  // con una prenotazione, che dicono «ci sei andato».
  const visibili = giorno.lezioni.filter((l) => !l.iniziata || l.prenotazione)
  const nascoste = giorno.lezioni.length - visibili.length
  const conteggi = new Map<string, number>()
  for (const l of visibili) conteggi.set(l.categoria, (conteggi.get(l.categoria) ?? 0) + 1)
  const attivitaDelGiorno = [...conteggi.keys()].sort((x, y) => x.localeCompare(y, 'it'))
  const filtrate = attivita ? visibili.filter((l) => l.categoria === attivita) : visibili
  const perChi = giorno.persone.find((x) => x.member_id === giorno.member_id)
  const schedaAperta = aperta?.scheda ? giorno.schede?.[aperta.scheda] ?? null : null
  return (
    <Schermata larga sopratitolo="Laboratorio" titolo="Prenotazioni">
      {ritorno ? (
        ritorno.stato === 'avviato' ? (
          <Messaggio tono="attenzione" icona="clessidra" titolo="Aspettiamo la conferma">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
              <ActivityIndicator color={p.attenzione} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>Aspettiamo da PerfectGym la conferma del pagamento, poi prenotiamo. Non chiudere la pagina.</Text>
            </View>
          </Messaggio>
        ) : ritorno.stato === 'prenotato' ? (
          <Messaggio tono="ok" titolo="Pagamento ricevuto">
            La lezione è prenotata. La trovi qui sotto e nell’app Athlon.
          </Messaggio>
        ) : ritorno.stato === 'attesa' ? (
          <Messaggio tono="attenzione" titolo="Pagamento ricevuto: sei in lista d’attesa">
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {`I posti di ${'lezione' in ritorno && ritorno.lezione ? `«${ritorno.lezione}»` : 'questa lezione'}${
                  'inizio' in ritorno && ritorno.inizio ? ` del ${giornoEsteso(ritorno.giorno ?? ritorno.inizio.slice(0, 10))} alle ${ora(ritorno.inizio)}` : ''
                } sono finiti mentre pagavi, quindi ti abbiamo messo in lista d’attesa. Se si libera un posto subentri tu, e ti avvisiamo via email. Se non subentrerai, l’ingresso che hai acquistato resta valido per un’altra prenotazione ${
                  'categoria' in ritorno && ritorno.categoria ? `di ${ritorno.categoria}` : 'della stessa categoria'
                }.`}
              </Text>
              {'categoria' in ritorno && ritorno.categoria ? (
                <Pulsante testo={`Vedi le altre lezioni di ${ritorno.categoria}`} variante="contorno" piccolo onPress={() => setAttivita(ritorno.categoria ?? null)} />
              ) : null}
            </View>
          </Messaggio>
        ) : (
          <Messaggio>{('errore' in ritorno && ritorno.errore) || 'Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.'}</Messaggio>
        )
      ) : null}

      <View style={{ gap: spazio.tre }}>
        {giorno.persone.length > 1 ? (
          // Per chi si prenota: la persona scelta in arancio come il giorno, gli altri della famiglia in chiaro.
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
            {giorno.persone.map((x) => {
              const attivo = x.member_id === giorno.member_id
              return (
                <Tocco
                  key={x.member_id}
                  vibra="scelta"
                  stato={{ selected: attivo }}
                  onPress={() => leggi(giorno.data, x.member_id)}
                  etichetta={`Prenota per ${nomeCompleto(x)}`}
                  style={[stili.persona, attivo ? { backgroundColor: p.accento, borderColor: p.accento, boxShadow: '0 8px 18px rgba(255,87,1,0.3)' } : { backgroundColor: p.carta, borderColor: p.linea }]}
                >
                  <Avatar nome={x.nome} cognome={x.cognome} size={30} anello={attivo ? 'rgba(255,255,255,0.9)' : undefined} />
                  <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{x.nome || nomeCompleto(x)}</Text>
                </Tocco>
              )
            })}
          </ScrollView>
        ) : null}
        {perChi ? (
          <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
            Stai prenotando per <Text style={{ fontFamily: F.bold, color: p.testo }}>{nomeCompleto(perChi)}</Text>
          </Text>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
          {giorno.giorni.map((d) => {
            const attivo = d === giorno.data
            const e = etichettaGiorno(d)
            const contenuto = (
              <>
                <Text style={[stili.settimana, { color: attivo ? 'rgba(255,255,255,0.85)' : p.testoSecondario }]}>{e.settimana}</Text>
                <Text style={[stili.numero, { color: attivo ? '#fff' : p.testo }]}>{e.numero}</Text>
              </>
            )
            return (
              <Tocco key={d} vibra="scelta" stato={{ selected: attivo }} onPress={() => leggi(d, giorno.member_id)} etichetta={giornoEsteso(d)}>
                {attivo ? (
                  <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.giorno, { boxShadow: '0 10px 20px rgba(255,87,1,0.3)' }]}>
                    {contenuto}
                  </LinearGradient>
                ) : (
                  <View style={[stili.giorno, { backgroundColor: p.carta, borderColor: p.linea, borderWidth: StyleSheet.hairlineWidth }]}>{contenuto}</View>
                )}
              </Tocco>
            )
          })}
        </ScrollView>
      </View>

      <View style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          <Text style={[stili.giornoTitolo, { color: p.testo }]}>{maiuscola(giornoEsteso(giorno.data))}</Text>
          <Text style={{ color: p.testoTerzo, fontFamily: F.semi, fontSize: 13 }}>{`${visibili.length} ${visibili.length === 1 ? 'lezione' : 'lezioni'}`}</Text>
        </View>
        {attivitaDelGiorno.length > 1 || attivita ? (
          // La scelta attiva subito dopo «Tutte», e la fila torna all'inizio a
          // ogni giorno (key): l'attivita' scelta non resta mai fuori vista.
          <ScrollView key={giorno.data} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
            {[null, ...(attivita ? [attivita] : []), ...attivitaDelGiorno.filter((x) => x !== attivita)].map((a) => {
              const attivo = a === attivita
              const n = a ? conteggi.get(a) ?? 0 : visibili.length
              return (
                <Tocco
                  key={a ?? 'tutte'}
                  vibra="scelta"
                  stato={{ selected: attivo }}
                  onPress={() => setAttivita(a)}
                  etichetta={`${a ?? 'Tutte le attività'}, ${n}`}
                  style={[stili.filtro, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
                >
                  <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{a ?? 'Tutte'}</Text>
                  <View style={[stili.conta, { backgroundColor: attivo ? p.accento : p.incavo }]}>
                    <Text style={{ color: attivo ? '#fff' : p.testoSecondario, fontFamily: F.extra, fontSize: 11 }}>{n}</Text>
                  </View>
                </Tocco>
              )
            })}
          </ScrollView>
        ) : null}
      </View>

      {!giorno.prenotazioni_lette ? <Messaggio tono="attenzione">PerfectGym non risponde: le tue prenotazioni potrebbero non comparire.</Messaggio> : null}
      {mie.length ? <LezioniPrenotate lezioni={mie} occupato={occupato} onAnnulla={disdici} /> : null}

      {carica ? (
        <SchedeInArrivo quante={2} />
      ) : visibili.length === 0 ? (
        <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
          <Icona nome="calendario" size={34} colore={p.testoTerzo} />
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>Nessuna lezione ancora da cominciare in questo giorno.</Text>
        </Carta>
      ) : filtrate.length === 0 ? (
        <Carta style={{ alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.cinque }}>
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>Nessuna lezione di «{attivita}» ancora da cominciare in questo giorno.</Text>
          <Pulsante testo="Mostra tutte le attività" variante="contorno" piccolo pieno={false} onPress={() => setAttivita(null)} />
        </Carta>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {nascoste && !attivita ? (
            <Text style={[stili.nota, { color: p.testoTerzo, paddingHorizontal: 2 }]}>{nascoste === 1 ? 'Una lezione è già cominciata.' : `${nascoste} lezioni sono già cominciate.`}</Text>
          ) : null}
          <View style={stili.griglia}>
            {filtrate.map((l, i) => (
              <Entra
                // Con la persona cambia anche cosa le manca: la riga riparte da «Prenota».
                key={`${giorno.member_id}-${l.class_id}`}
                indice={i}
                style={stili.cella}
              >
                <RigaLezione
                  l={l}
                  scheda={l.scheda ? giorno.schede?.[l.scheda] ?? null : null}
                  onScheda={() => setAperta(l)}
                  occupato={occupato}
                  onPrenota={() => prenota(l)}
                  onAcquista={(url) => acquista(l, url)}
                  onPagaCarta={pagaCarta}
                  onDisdici={() => disdici(l)}
                />
              </Entra>
            ))}
          </View>
        </View>
      )}
      <FoglioLezione
        scheda={schedaAperta}
        titolo={aperta?.nome ?? ''}
        categoria={aperta?.categoria}
        dettagli={
          aperta
            ? [
                { valore: ora(aperta.inizio), etichetta: 'Inizio' },
                { valore: `${minuti(aperta.inizio, aperta.fine)} min`, etichetta: 'Durata' },
                { valore: aperta.istruttore ? suDueRighe(aperta.istruttore) : '—', etichetta: 'Istruttore' },
              ]
            : undefined
        }
        onChiudi={() => setAperta(null)}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 18, paddingVertical: 6, paddingLeft: 6, paddingRight: spazio.tre, borderWidth: StyleSheet.hairlineWidth },
  giorno: { width: 64, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2 },
  settimana: { fontSize: 11, fontFamily: F.extra, textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 24, fontFamily: F.extra, letterSpacing: -0.6 },
  giornoTitolo: { fontSize: 22, fontFamily: F.extra, letterSpacing: -0.6 },
  filtro: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 999, paddingVertical: 9, paddingLeft: spazio.tre, paddingRight: 9, borderWidth: StyleSheet.hairlineWidth },
  conta: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
  cella: { flexGrow: 1, flexBasis: 340, minWidth: 0, maxWidth: 560 },
  lezione: { borderRadius: 30, overflow: 'hidden' },
  copertina: { height: 178, padding: spazio.tre, justifyContent: 'space-between', backgroundColor: '#111' },
  copertinaAlto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spazio.due },
  copertinaNome: { color: '#fff', fontFamily: F.extra, fontSize: 25, lineHeight: 29, letterSpacing: -0.8, maxWidth: '85%' },
  copertinaIstruttore: { color: 'rgba(255,255,255,0.78)', fontFamily: F.semi, fontSize: 13.5 },
  vetrino: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.45)' },
  vetrinoTesto: { color: '#fff', fontFamily: F.extra, fontSize: 12 },
  puntino: { width: 7, height: 7, borderRadius: 4 },
  info: { position: 'absolute', right: spazio.tre, bottom: spazio.tre, width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  corpo: { padding: spazio.tre + 2, gap: spazio.tre },
  cifre: { flexDirection: 'row' },
  cifra: { flex: 1, alignItems: 'center', gap: 1 },
  cifraValore: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  cifraEtichetta: { fontFamily: F.semi, fontSize: 11.5 },
  azioni: { flexDirection: 'row', gap: spazio.due },
  apertura: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spazio.due, minHeight: 52, borderRadius: 18 },
  nota: { fontSize: 13.5, lineHeight: 20, fontFamily: F.medio },
  orario: { width: 56, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orarioTesto: { color: '#fff', fontFamily: F.extra, fontSize: 14, fontVariant: ['tabular-nums'] },
  fumetto: { position: 'absolute', top: 26, left: -120, width: 250, borderRadius: 14, padding: spazio.tre - 4, zIndex: 10, elevation: 4 },
})
