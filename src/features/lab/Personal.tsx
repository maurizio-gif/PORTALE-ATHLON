import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'

import {
  acquistaPersonal,
  disdiciPersonal,
  esitoAcquistoPersonal,
  orariPersonal,
  pagaPersonalConCarta,
  prenotaPersonal,
  statoPersonal,
  type DaPagare,
  type EsitoAcquistoPersonal,
  type OrariPersonal,
  type SedutaPersonal,
  type StatoPersonal,
} from '@/api/lab'
import { InfoAdyen } from '@/components/InfoAdyen'
import { euro, giornoEsteso, ora } from '@/lib/eventi'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from './memoria'
import { Icona } from './ui/Icona'
import { Avatar, Carta, Etichetta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from './ui/kit'
import { SceltaPrenotazioni } from './ui/SceltaPrenotazioni'
import { Schermata } from './ui/Schermata'
import { F, FUOCO, usePalette, velo } from './ui/tema'
import { colpetto, Tocco } from './ui/Tocco'

// Il personal training del laboratorio (15/10/2026): la seconda faccia di
// «Prenotazioni». Funziona come PerfectGym lo fa funzionare (vedi
// portale-lab-personal): ogni tipo di seduta ha il suo prodotto, che si scala
// alla prenotazione. Chi ha sedute (il pacchetto del mese dell'abbonamento PT,
// un omaggio, una seduta gia' comprata) sceglie giorno, ora e trainer e
// prenota; chi non ne ha prenota lo stesso, e la seduta si paga in quel passo
// (salva e paga, come le lezioni), poi si torna qui e la prenotazione si fa da
// sola.
//
// Gli orari sono quelli liberi dei trainer nei prossimi 14 giorni, dalla loro
// disponibilita' su PerfectGym. Un orario con piu' trainer liberi si tocca e
// poi si sceglie con chi.

/** Il nome di un tipo di seduta, detto come lo dice il club e senza prezzi dentro. */
function nomeSeduta(nome: string): string {
  if (/pacchetto/i.test(nome)) return 'Pacchetto PT'
  if (/omaggio/i.test(nome)) return 'Seduta omaggio'
  if (/coppia/i.test(nome)) return 'Seduta in coppia'
  if (/seduta|non iscritt|€/i.test(nome)) return 'Seduta singola'
  return nome
}

function maiuscola(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** «31 ottobre», a Roma. */
function giornoMese(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(new Date(iso))
}

/** Il giorno a Roma di un istante: «2026-10-19». */
function giornoDi(iso: string): string {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  return `${parti.year}-${parti.month}-${parti.day}`
}

function etichettaGiorno(data: string): { settimana: string; numero: string } {
  const [settimana, numero] = giornoEsteso(data).split(' ')
  return { settimana: settimana.slice(0, 3), numero }
}

function nomeProprio(nome: string): string {
  return nome.split(' ')[0]
}

const FASCE = [
  { nome: 'Mattina', fino: 12 },
  { nome: 'Pomeriggio', fino: 17 },
  { nome: 'Sera', fino: 24 },
] as const

/** Una delle sedute che si possono usare: un credito, o la seduta singola da comprare. */
type Opzione = { definition_id: number; titolo: string; sotto: string; acquisto: boolean }

function opzioniDi(s: StatoPersonal): Opzione[] {
  const out: Opzione[] = s.crediti.map((c) => ({
    definition_id: c.definition_id,
    titolo: nomeSeduta(c.nome),
    sotto: `${c.quantita} ${c.quantita === 1 ? 'seduta da usare' : 'sedute da usare'}${c.scadenza ? ` · ${c.quantita === 1 ? 'scade' : 'scadono'} il ${giornoMese(c.scadenza)}` : ''}`,
    acquisto: false,
  }))
  if (s.acquisto && !out.some((o) => o.definition_id === s.acquisto?.definition_id)) {
    out.push({
      definition_id: s.acquisto.definition_id,
      titolo: `Seduta singola${s.acquisto.prodotto.prezzo != null ? ` · ${euro(s.acquisto.prodotto.prezzo)}` : ''}`,
      sotto: `${s.acquisto.minuti} minuti con un trainer, la paghi quando prenoti`,
      acquisto: true,
    })
  }
  return out
}

/** Le sedute gia' prenotate, con «Annulla» finche' mancano piu' delle ore della regola. */
function SedutePrenotate({ sedute, ore, onAnnulla }: { sedute: SedutaPersonal[]; ore: number; onAnnulla: (s: SedutaPersonal) => Promise<string | null> }) {
  const p = usePalette()
  const [conferma, setConferma] = useState<number | null>(null)
  const [inCorso, setInCorso] = useState<number | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function annulla(s: SedutaPersonal) {
    setErrore(null)
    setInCorso(s.booking_id)
    const problema = await onAnnulla(s)
    setInCorso(null)
    setConferma(null)
    if (problema) {
      colpetto('errore')
      setErrore(problema)
    } else colpetto('ok')
  }

  return (
    <Sezione titolo="Le tue sedute prenotate" conteggio={sedute.length}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {sedute.map((s, i) => {
          const disdicibile = new Date(s.inizio).getTime() - Date.now() >= ore * 3600_000
          return (
            <Riga
              key={s.booking_id}
              prima={i === 0}
              testa={
                <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.orario}>
                  <Text style={stili.orarioTesto}>{ora(s.inizio)}</Text>
                </LinearGradient>
              }
              titolo={`${maiuscola(giornoEsteso(giornoDi(s.inizio)))}`}
              sotto={`${nomeSeduta(s.nome)}${s.trainer ? ` con ${s.trainer}` : ''}`}
              coda={
                s.completata ? (
                  <Etichetta testo="Fatta" tono="ok" />
                ) : !disdicibile ? (
                  <Etichetta testo={`Meno di ${ore} ore`} tono="neutro" />
                ) : conferma === s.booking_id ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pulsante testo="Sì, annulla" variante="pericolo" piccolo pieno={false} onPress={() => annulla(s)} inCorso={inCorso === s.booking_id} />
                    <Pulsante testo="No" variante="secondario" piccolo pieno={false} onPress={() => setConferma(null)} disabilitato={inCorso !== null} />
                  </View>
                ) : (
                  <Pulsante testo="Annulla" variante="secondario" piccolo pieno={false} onPress={() => setConferma(s.booking_id)} disabilitato={inCorso !== null} />
                )
              }
            />
          )
        })}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Text style={[stili.nota, { color: p.testoTerzo, paddingTop: spazio.due }]}>
          {`Una seduta si annulla fino a ${ore} ore prima, e torna sul tuo conto. Dopo, scrivi al club.`}
        </Text>
      </Carta>
    </Sezione>
  )
}

export function Personal() {
  const p = usePalette()
  const [stato, setStato] = useState<StatoPersonal | null>(inMemoria<{ ok: true; stato: StatoPersonal }>('personal:stato:')?.stato ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [definizione, setDefinizione] = useState<number | null>(null)
  const [orari, setOrari] = useState<OrariPersonal | null>(null)
  const [erroreOrari, setErroreOrari] = useState<string | null>(null)
  const [caricaOrari, setCaricaOrari] = useState(false)
  const [giorno, setGiorno] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<number | null>(null)
  const [scelto, setScelto] = useState<{ locale: string; inizio: string } | null>(null)
  const [trainer, setTrainer] = useState<number | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [erroreAzione, setErroreAzione] = useState<string | null>(null)
  const [daPagare, setDaPagare] = useState<DaPagare | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)
  const riquadro = useRef<View>(null)

  // Lo stato gia' letto si mostra subito, e intanto si rilegge.
  const chiaveStato = useRef('personal:stato:')
  const leggi = useCallback(async (memberId?: number) => {
    const chiave = `personal:stato:${memberId ?? ''}`
    chiaveStato.current = chiave
    const gia = inMemoria<{ ok: true; stato: StatoPersonal }>(chiave)
    if (gia) setStato(gia.stato)
    setErrore(null)
    const r = await prendi(chiave, () => statoPersonal(memberId))
    if (chiaveStato.current !== chiave) return
    if (r.ok) setStato(r.stato)
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    leggi()
  }, [leggi])

  const opzioni = useMemo(() => (stato ? opzioniDi(stato) : []), [stato])
  // Si parte dalla prima seduta che si ha (la prima che scade), o da quella da comprare.
  useEffect(() => {
    if (!stato) return
    if (definizione == null || !opzioni.some((o) => o.definition_id === definizione)) setDefinizione(opzioni[0]?.definition_id ?? null)
  }, [stato, opzioni, definizione])

  const caricaGliOrari = useCallback(async (memberId: number, definitionId: number) => {
    setCaricaOrari(true)
    setErroreOrari(null)
    const r = await prendi(`personal:orari:${memberId}:${definitionId}`, () => orariPersonal(memberId, definitionId))
    setCaricaOrari(false)
    if (!r.ok) return setErroreOrari(r.errore)
    setOrari(r.orari)
    // Il primo giorno con un orario libero, se quello scelto non ne ha.
    setGiorno((g) => (g && r.orari.orari.some((o) => giornoDi(o.inizio) === g) ? g : r.orari.orari[0] ? giornoDi(r.orari.orari[0].inizio) : r.orari.giorni[0]))
  }, [])

  useEffect(() => {
    if (!stato || definizione == null) return
    setScelto(null)
    setDaPagare(null)
    caricaGliOrari(stato.member_id, definizione)
  }, [stato?.member_id, definizione, caricaGliOrari]) // eslint-disable-line react-hooks/exhaustive-deps

  // Il ritorno dal pagamento (?acquisto=<id>): si chiede com'e' andata finche'
  // la seduta non e' prenotata (il pagamento arriva a PerfectGym qualche
  // secondo dopo), per due minuti; poi si rilegge tutto.
  const { acquisto } = useLocalSearchParams<{ acquisto?: string }>()
  const [ritorno, setRitorno] = useState<EsitoAcquistoPersonal | { stato: 'avviato' } | null>(null)
  const avviato = useRef(false)
  useEffect(() => {
    if (!acquisto || avviato.current) return
    avviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const r = await esitoAcquistoPersonal(acquisto)
      if (fermo) return
      if (!r.ok) return setRitorno({ stato: 'errore', errore: r.errore, member_id: 0, inizio: null, trainer: null })
      if (r.esito.stato === 'avviato' && ++giri < 30) {
        setRitorno(r.esito)
        setTimeout(giro, 4000)
        return
      }
      setRitorno(r.esito.stato === 'avviato' ? { ...r.esito, stato: 'errore', errore: null } : r.esito)
      ricorda(`personal:stato:${r.esito.member_id || ''}`, undefined)
      leggi(r.esito.member_id || undefined)
    }
    setRitorno({ stato: 'avviato' })
    giro()
    return () => {
      fermo = true
    }
  }, [acquisto, leggi])

  if (errore && !stato) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Prenotazioni">
        <SceltaPrenotazioni attiva="personal" />
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" onPress={() => leggi()} />
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Prenotazioni">
        <SceltaPrenotazioni attiva="personal" />
        <SchedeInArrivo />
      </Schermata>
    )
  }

  const opzione = opzioni.find((o) => o.definition_id === definizione) ?? null
  const nomeTrainer = new Map((orari?.trainer ?? stato.trainer).map((t) => [t.id, t.nome]))
  // Gli orari liberi del giorno scelto, col filtro del trainer, raccolti per ora.
  const delGiorno = (orari?.orari ?? []).filter((o) => giornoDi(o.inizio) === giorno && (filtro == null || o.trainer_id === filtro))
  const perOra = new Map<string, { locale: string; inizio: string; trainer: number[] }>()
  for (const o of delGiorno) {
    const g = perOra.get(o.locale) ?? { locale: o.locale, inizio: o.inizio, trainer: [] }
    g.trainer.push(o.trainer_id)
    perOra.set(o.locale, g)
  }
  const ore = [...perOra.values()]
  const quantiPerGiorno = new Map<string, number>()
  for (const o of orari?.orari ?? []) {
    if (filtro != null && o.trainer_id !== filtro) continue
    quantiPerGiorno.set(giornoDi(o.inizio), (quantiPerGiorno.get(giornoDi(o.inizio)) ?? 0) + 1)
  }
  // I trainer con almeno un orario libero nei 14 giorni.
  const conOrari = [...new Set((orari?.orari ?? []).map((o) => o.trainer_id))].sort((a, b) => (nomeTrainer.get(a) ?? '').localeCompare(nomeTrainer.get(b) ?? '', 'it'))
  const sceltoQui = scelto ? perOra.get(scelto.locale) ?? null : null
  const conChi = trainer ?? (sceltoQui?.trainer.length === 1 ? sceltoQui.trainer[0] : null)

  function scegliOra(locale: string, inizio: string, liberi: number[]) {
    setScelto({ locale, inizio })
    setTrainer(liberi.length === 1 ? liberi[0] : null)
    setDaPagare(null)
    setErroreAzione(null)
    setFatto(null)
    requestAnimationFrame(() => {
      if (Platform.OS === 'web') (riquadro.current as unknown as HTMLElement | null)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    })
  }

  async function prenota() {
    if (!stato || !scelto || conChi == null || definizione == null) return
    setErroreAzione(null)
    setAttesa(true)
    const r = await prenotaPersonal({ member_id: stato.member_id, definition_id: definizione, trainer_id: conChi, locale: scelto.locale })
    setAttesa(false)
    if (r.ok) {
      colpetto('ok')
      setFatto(`Seduta prenotata: ${giornoEsteso(giornoDi(scelto.inizio))} alle ${ora(scelto.inizio)} con ${nomeTrainer.get(conChi) ?? 'il trainer'}.`)
      setScelto(null)
      // Le sedute e gli orari sono cambiati: si rileggono.
      ricorda(`personal:orari:${stato.member_id}:${definizione}`, undefined)
      ricorda(chiaveStato.current, undefined)
      await leggi(stato.member_id)
      caricaGliOrari(stato.member_id, definizione)
      return
    }
    colpetto('errore')
    setErroreAzione(r.errore)
    if (r.prodotto) setDaPagare({ prodotto: r.prodotto, url: r.url, acquisto_id: r.acquisto_id, carta: r.carta ?? null })
  }

  /** Alla pagina di pagamento; si torna qui con ?acquisto=<id>. */
  async function vaiAlPagamento(pronto?: string) {
    if (!stato || !scelto || conChi == null) return
    let url = pronto
    if (!url) {
      setAttesa(true)
      const r = await acquistaPersonal({ member_id: stato.member_id, trainer_id: conChi, locale: scelto.locale })
      setAttesa(false)
      if (!r.ok) return setErroreAzione(r.errore)
      url = r.url
    }
    if (Platform.OS === 'web') window.location.assign(url)
    else await Linking.openURL(url)
  }

  async function pagaConCarta(acquistoId: string) {
    setErroreAzione(null)
    setAttesa(true)
    const r = await pagaPersonalConCarta(acquistoId)
    setAttesa(false)
    if (!r.ok) {
      colpetto('errore')
      return setErroreAzione(r.errore)
    }
    if (Platform.OS === 'web') window.location.assign(`/lab/personal?acquisto=${acquistoId}`)
    else router.replace({ pathname: '/lab/personal', params: { acquisto: acquistoId } })
  }

  async function annulla(s: SedutaPersonal): Promise<string | null> {
    if (!stato) return null
    const r = await disdiciPersonal(stato.member_id, s.booking_id)
    if (!r.ok) return r.errore
    ricorda(chiaveStato.current, undefined)
    if (definizione != null) ricorda(`personal:orari:${stato.member_id}:${definizione}`, undefined)
    await leggi(stato.member_id)
    if (definizione != null) caricaGliOrari(stato.member_id, definizione)
    return null
  }

  const perChi = stato.persone.find((x) => x.member_id === stato.member_id)

  return (
    <Schermata larga sopratitolo="Laboratorio" titolo="Prenotazioni">
      <SceltaPrenotazioni attiva="personal" />

      {ritorno ? (
        ritorno.stato === 'avviato' ? (
          <Messaggio tono="attenzione" icona="clessidra" titolo="Aspettiamo la conferma">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
              <ActivityIndicator color={p.attenzione} />
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>Aspettiamo da PerfectGym la conferma del pagamento, poi prenotiamo la seduta. Non chiudere la pagina.</Text>
            </View>
          </Messaggio>
        ) : ritorno.stato === 'prenotato' ? (
          <Messaggio tono="ok" titolo="Pagamento ricevuto">
            {`La seduta è prenotata${'inizio' in ritorno && ritorno.inizio ? `: ${giornoEsteso(giornoDi(ritorno.inizio))} alle ${ora(ritorno.inizio)}` : ''}${
              'trainer' in ritorno && ritorno.trainer ? ` con ${ritorno.trainer}` : ''
            }. La trovi qui sotto e nell’app Athlon.`}
          </Messaggio>
        ) : (
          <Messaggio>{('errore' in ritorno && ritorno.errore) || 'Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.'}</Messaggio>
        )
      ) : null}

      {stato.persone.length > 1 ? (
        <View style={{ gap: spazio.due }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
            {stato.persone.map((x) => {
              const attivo = x.member_id === stato.member_id
              return (
                <Tocco
                  key={x.member_id}
                  vibra="scelta"
                  stato={{ selected: attivo }}
                  onPress={() => {
                    setDefinizione(null)
                    setOrari(null)
                    leggi(x.member_id)
                  }}
                  etichetta={`Personal per ${[x.nome, x.cognome].filter(Boolean).join(' ')}`}
                  style={[stili.persona, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                >
                  <Avatar nome={x.nome} cognome={x.cognome} size={30} anello={attivo ? 'rgba(255,255,255,0.9)' : undefined} />
                  <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{x.nome || 'Senza nome'}</Text>
                </Tocco>
              )
            })}
          </ScrollView>
          {perChi ? (
            <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>
              Stai prenotando per <Text style={{ fontFamily: F.bold, color: p.testo }}>{[perChi.nome, perChi.cognome].filter(Boolean).join(' ')}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}

      {!stato.letti ? <Messaggio tono="attenzione">PerfectGym non risponde: le tue sedute potrebbero non comparire.</Messaggio> : null}
      {fatto ? (
        <Messaggio tono="ok" titolo="Fatto">
          {fatto}
        </Messaggio>
      ) : null}

      {stato.prenotate.length ? <SedutePrenotate sedute={stato.prenotate} ore={stato.disdetta_ore} onAnnulla={annulla} /> : null}

      <Sezione titolo="Le tue sedute">
        {opzioni.length ? (
          <Carta style={{ paddingVertical: spazio.due }}>
            {opzioni.map((o, i) => {
              const qui = o.definition_id === definizione
              return (
                <Riga
                  key={o.definition_id}
                  prima={i === 0}
                  icona={o.acquisto ? 'carta' : 'pass'}
                  tono={o.acquisto ? 'neutro' : 'accento'}
                  titolo={o.titolo}
                  sotto={o.sotto}
                  onPress={opzioni.length > 1 ? () => setDefinizione(o.definition_id) : undefined}
                  coda={
                    opzioni.length > 1 ? (
                      <View style={[stili.radio, { borderColor: qui ? p.accento : p.linea, backgroundColor: qui ? p.accento : 'transparent' }]}>
                        {qui ? <Icona nome="spunta" size={13} colore="#fff" /> : null}
                      </View>
                    ) : undefined
                  }
                />
              )
            })}
            {!stato.crediti.length ? (
              <Text style={[stili.nota, { color: p.testoSecondario, paddingTop: spazio.due }]}>
                Non hai sedute di personal da usare: scegli l’orario e il trainer, e la seduta la paghi nello stesso passo.
              </Text>
            ) : null}
          </Carta>
        ) : (
          <Messaggio tono="attenzione">Non hai sedute di personal da usare, e la seduta non si può acquistare online: chiedi al club.</Messaggio>
        )}
      </Sezione>

      {opzione ? (
        <Sezione titolo="Scegli giorno e orario">
          {erroreOrari ? (
            <View style={{ gap: spazio.due }}>
              <Messaggio>{erroreOrari}</Messaggio>
              <Pulsante testo="Riprova" icona="aggiorna" variante="contorno" onPress={() => definizione != null && caricaGliOrari(stato.member_id, definizione)} />
            </View>
          ) : !orari || caricaOrari ? (
            <SchedeInArrivo quante={1} />
          ) : !orari.orari.length ? (
            <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
              <Icona nome="calendario" size={34} colore={p.testoTerzo} />
              <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
                Nei prossimi 14 giorni i trainer non hanno orari liberi. Riprova fra qualche giorno, o chiedi al club.
              </Text>
            </Carta>
          ) : (
            <View style={{ gap: spazio.tre }}>
              {orari.incompleti ? <Messaggio tono="attenzione">Gli orari di qualche trainer non si leggono adesso: ne mancano alcuni.</Messaggio> : null}
              {conOrari.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
                  {[null, ...conOrari].map((t) => {
                    const attivo = t === filtro
                    return (
                      <Tocco
                        key={t ?? 'tutti'}
                        vibra="scelta"
                        stato={{ selected: attivo }}
                        onPress={() => {
                          setFiltro(t)
                          setScelto(null)
                        }}
                        etichetta={t == null ? 'Tutti i trainer' : `Solo ${nomeTrainer.get(t)}`}
                        style={[stili.filtro, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
                      >
                        {t != null ? <Avatar nome={nomeTrainer.get(t) ?? ''} size={24} /> : null}
                        <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>
                          {t == null ? 'Tutti i trainer' : nomeTrainer.get(t) ?? 'Trainer'}
                        </Text>
                      </Tocco>
                    )
                  })}
                </ScrollView>
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
                {orari.giorni.map((d) => {
                  const attivo = d === giorno
                  const quanti = quantiPerGiorno.get(d) ?? 0
                  const e = etichettaGiorno(d)
                  const contenuto = (
                    <>
                      <Text style={[stili.settimana, { color: attivo ? 'rgba(255,255,255,0.85)' : quanti ? p.testoSecondario : p.testoTerzo }]}>{e.settimana}</Text>
                      <Text style={[stili.numero, { color: attivo ? '#fff' : quanti ? p.testo : p.testoTerzo }]}>{e.numero}</Text>
                      <View style={[stili.puntino, { backgroundColor: quanti ? (attivo ? '#fff' : p.ok) : 'transparent' }]} />
                    </>
                  )
                  return (
                    <Tocco
                      key={d}
                      vibra="scelta"
                      stato={{ selected: attivo, disabled: !quanti }}
                      onPress={() => {
                        if (!quanti) return
                        setGiorno(d)
                        setScelto(null)
                      }}
                      etichetta={`${giornoEsteso(d)}, ${quanti ? `${quanti} orari liberi` : 'nessun orario libero'}`}
                    >
                      {attivo ? (
                        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.giorno, { boxShadow: '0 10px 20px rgba(255,87,1,0.3)' }]}>
                          {contenuto}
                        </LinearGradient>
                      ) : (
                        <View style={[stili.giorno, { backgroundColor: quanti ? p.carta : 'transparent', borderColor: p.linea, borderWidth: StyleSheet.hairlineWidth, opacity: quanti ? 1 : 0.6 }]}>{contenuto}</View>
                      )}
                    </Tocco>
                  )
                })}
              </ScrollView>

              <Carta style={{ gap: spazio.tre }}>
                <Text style={[stili.giornoTitolo, { color: p.testo }]}>{giorno ? maiuscola(giornoEsteso(giorno)) : ''}</Text>
                {!ore.length ? (
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {filtro != null ? `${nomeTrainer.get(filtro)} non ha orari liberi in questo giorno.` : 'Nessun orario libero in questo giorno.'}
                  </Text>
                ) : (
                  FASCE.map((f, i) => {
                    const da = i ? FASCE[i - 1].fino : 0
                    const qui = ore.filter((o) => {
                      const h = Number(ora(o.inizio).slice(0, 2))
                      return h >= da && h < f.fino
                    })
                    if (!qui.length) return null
                    return (
                      <View key={f.nome} style={{ gap: spazio.due }}>
                        <Text style={[stili.fascia, { color: p.testoSecondario }]}>{f.nome.toUpperCase()}</Text>
                        <View style={stili.orari}>
                          {qui.map((o) => {
                            const attivo = scelto?.locale === o.locale
                            return (
                              <View key={o.locale} style={stili.orarioCella}>
                                <Tocco
                                  vibra="scelta"
                                  stato={{ selected: attivo }}
                                  onPress={() => scegliOra(o.locale, o.inizio, o.trainer)}
                                  etichetta={`${ora(o.inizio)}, ${o.trainer.length === 1 ? `con ${nomeTrainer.get(o.trainer[0])}` : `${o.trainer.length} trainer liberi`}`}
                                  style={[stili.turno, { backgroundColor: attivo ? p.accento : velo(p, 'ok', 0.12) }]}
                                >
                                  <Text style={[stili.turnoOra, { color: attivo ? '#fff' : p.testo }]}>{ora(o.inizio)}</Text>
                                  <Text style={[stili.turnoSotto, { color: attivo ? 'rgba(255,255,255,0.9)' : p.testoSecondario }]} numberOfLines={1}>
                                    {o.trainer.length === 1 ? nomeProprio(nomeTrainer.get(o.trainer[0]) ?? '') : `${o.trainer.length} trainer`}
                                  </Text>
                                </Tocco>
                              </View>
                            )
                          })}
                        </View>
                      </View>
                    )
                  })
                )}

                {scelto && sceltoQui ? (
                  <View ref={riquadro} style={[stili.scelto, { borderTopColor: p.linea }]}>
                    <Text style={[stili.sceltoOra, { color: p.testo }]}>
                      {`${ora(scelto.inizio)} – ${ora(new Date(new Date(scelto.inizio).getTime() + (orari.minuti || 60) * 60_000).toISOString())}`}
                    </Text>
                    {sceltoQui.trainer.length > 1 ? (
                      <View style={{ gap: spazio.due }}>
                        <Text style={[stili.nota, { color: p.testoSecondario }]}>Con chi?</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due }}>
                          {sceltoQui.trainer.map((t) => {
                            const attivo = conChi === t
                            return (
                              <Tocco
                                key={t}
                                vibra="scelta"
                                stato={{ selected: attivo }}
                                onPress={() => {
                                  setTrainer(t)
                                  setDaPagare(null)
                                  setErroreAzione(null)
                                }}
                                etichetta={`Con ${nomeTrainer.get(t)}`}
                                style={[stili.persona, attivo ? { backgroundColor: p.accento, borderColor: p.accento } : { backgroundColor: p.carta, borderColor: p.linea }]}
                              >
                                <Avatar nome={nomeTrainer.get(t) ?? ''} size={28} anello={attivo ? 'rgba(255,255,255,0.9)' : undefined} />
                                <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{nomeTrainer.get(t) ?? 'Trainer'}</Text>
                              </Tocco>
                            )
                          })}
                        </View>
                      </View>
                    ) : conChi != null ? (
                      <View style={stili.conChi}>
                        <Avatar nome={nomeTrainer.get(conChi) ?? ''} size={32} />
                        <Text style={[stili.nota, { color: p.testoSecondario, flexShrink: 1 }]}>
                          Con <Text style={{ color: p.testo, fontFamily: F.bold }}>{nomeTrainer.get(conChi)}</Text>
                        </Text>
                      </View>
                    ) : null}

                    {erroreAzione ? <Messaggio tono={daPagare ? 'attenzione' : 'errore'}>{erroreAzione}</Messaggio> : null}
                    {daPagare ? (
                      // Salva e paga, come per le lezioni.
                      <View style={{ gap: spazio.due }}>
                        {daPagare.carta && daPagare.acquisto_id && daPagare.prodotto.prezzo != null ? (
                          <>
                            <Pulsante
                              testo={`Paga ${euro(daPagare.prodotto.prezzo)} con la carta${daPagare.carta.finale ? ` •••• ${daPagare.carta.finale}` : ''}`}
                              icona="carta"
                              onPress={() => pagaConCarta(daPagare.acquisto_id!)}
                              inCorso={attesa}
                            />
                            <Pulsante testo="Usa un’altra carta" variante="fantasma" piccolo onPress={() => vaiAlPagamento(daPagare.url)} disabilitato={attesa} />
                          </>
                        ) : (
                          <Pulsante
                            testo={`Acquista e prenota${daPagare.prodotto.prezzo != null ? ` · ${euro(daPagare.prodotto.prezzo)}` : ''}`}
                            icona="carta"
                            onPress={() => vaiAlPagamento(daPagare.url)}
                            inCorso={attesa}
                          />
                        )}
                        <Text style={[stili.nota, { color: p.testoSecondario }]}>
                          {daPagare.carta ? 'La carta la custodisce ' : 'Paghi sulla pagina protetta di '}
                          <InfoAdyen />
                          {daPagare.carta
                            ? ': il club non vede mai il numero completo. Pagata la seduta, la prenotiamo a questo orario.'
                            : ', in un passo solo: la carta resta salvata per i prossimi acquisti, e pagata la seduta la prenotiamo a questo orario.'}
                        </Text>
                      </View>
                    ) : (
                      <Pulsante
                        testo={
                          conChi == null
                            ? 'Scegli il trainer'
                            : opzione.acquisto
                              ? `Prenota ${ora(scelto.inizio)}${stato.acquisto?.prodotto.prezzo != null ? ` · ${euro(stato.acquisto.prodotto.prezzo)}` : ''}`
                              : `Prenota ${ora(scelto.inizio)} · usa una seduta`
                        }
                        icona="avanti"
                        onPress={prenota}
                        inCorso={attesa}
                        disabilitato={conChi == null}
                      />
                    )}
                    {!daPagare && !opzione.acquisto ? (
                      <Text style={[stili.nota, { color: p.testoTerzo }]}>{`Prenotando si scala una seduta da «${opzione.titolo}».`}</Text>
                    ) : null}
                  </View>
                ) : null}
              </Carta>
            </View>
          )}
        </Sezione>
      ) : null}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 18, paddingVertical: 6, paddingLeft: 6, paddingRight: spazio.tre, borderWidth: StyleSheet.hairlineWidth },
  filtro: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 999, paddingVertical: 7, paddingHorizontal: spazio.tre, borderWidth: StyleSheet.hairlineWidth, minHeight: 40 },
  giorno: { width: 64, height: 86, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2 },
  settimana: { fontSize: 11, fontFamily: F.extra, textTransform: 'uppercase', letterSpacing: 1 },
  numero: { fontSize: 24, fontFamily: F.extra, letterSpacing: -0.6 },
  puntino: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  giornoTitolo: { fontSize: 20, fontFamily: F.extra, letterSpacing: -0.5 },
  nota: { fontSize: 13.5, lineHeight: 20, fontFamily: F.medio },
  orario: { width: 56, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orarioTesto: { color: '#fff', fontFamily: F.extra, fontSize: 14, fontVariant: ['tabular-nums'] },
  fascia: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2 },
  orari: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  orarioCella: { width: '25%', padding: 4 },
  turno: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 1 },
  turnoOra: { fontFamily: F.extra, fontSize: 15, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  turnoSotto: { fontFamily: F.bold, fontSize: 11 },
  scelto: { gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  sceltoOra: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  conChi: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
