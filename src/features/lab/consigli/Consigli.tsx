import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import { MESSAGGIO_SCUOLA_NUOTO, statoPersonal, type SchedaLezione, type StatoPersonal } from '@/api/lab'
import {
  BISOGNI,
  chiediConsigli,
  DISCIPLINE,
  ESPERIENZE,
  FASCE,
  INTENSITA,
  LIVELLI,
  OBIETTIVI,
  OBIETTIVI_MAX,
  PAUSE,
  PERSONAL_ESPERIENZE,
  PERSONAL_INTERESSI,
  statoConsigli,
  ultimiConsigli,
  type ConsiglioPersonal,
  type ConsiglioRisolto,
  type OrarioLezione,
  type RispostaConsigli,
  type SedutaConsigliata,
  type StatoConsigli,
} from '@/api/percorso'
import { euro } from '@/lib/eventi'
import { t as tr, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from '../memoria'
import { PERCORSO_IN_STANDBY } from '../percorso/standby'
import { GIORNI, GIORNO_BREVE, NOME_FASCIA } from '../percorso/comune'
import { giornoRoma } from '../schede/contatoreCalorie'
import { notaSalto, testoAbitudine, volteConsigliate } from '../schede/abitudine'
import { abitudineNota, ricordaAbitudine } from '../schede/abitudineMemoria'
import { aggiornaProfilo, CHIAVI_CONSIGLI, consigliDaProfilo, daConsigli, leggiProfilo, momentoDaVisiteAlPosto, senzaToccate, type CampoConsigli } from '../schede/profiloComune'
import { nomeObiettivo } from '../schede/questionario'
import { Scelte, SceltePiu } from '../ui/Campi'
import { FoglioLezione } from '../ui/FoglioLezione'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, Entra, Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { usePrenotazioneLezione } from '../usePrenotazioneLezione'
import { vistaCorrente } from '../vista'
import { dimenticaGiornoCalendario } from '../percorso/useSettimana'
import {
  CHIAVE_RIPORTATE_CONSIGLI,
  CHIAVE_SCELTE_CONSIGLI,
  CHIAVE_STATO_CONSIGLI,
  CHIAVE_ULTIMI_CONSIGLI,
  BISOGNO_TESTO,
  conGusti,
  conPrenotazione,
  cosaManca,
  destinazioniSeduta,
  DISCIPLINA_TESTO,
  ESPERIENZA_TESTO,
  formulePersonal,
  giorniTesto,
  GUSTI,
  gustiDi,
  INTENSITA_TESTO,
  LIVELLO_TESTO,
  orariOrdinati,
  PAUSA_TESTO,
  PERSONAL_ESPERIENZA_TESTO,
  PERSONAL_INTERESSE_TESTO,
  questionarioDa,
  SCELTE_DI_PARTENZA,
  sedutePersonalTesto,
  testoOrario,
  trovaLezione,
  volteTesto,
  type FormulaPersonal,
  type SceltePerConsigli,
  giornoEsteso,
  quotaFinita,
  scelteDa,
} from './comune'
import { ElencoLezioni, type ApriScheda, type AzioniPrenotazione } from './Lezioni'

// I consigli di Athlon (20/10/2026, rifatti il 21/10/2026 su richiesta di Maurizio). Il socio racconta chi e': uno o piu'
// obiettivi, se ha mai praticato, se ha smesso o se pratica gia' (e cosa), cosa gli piace fare, l'intensita' che preferisce,
// e quando gli piacerebbe venire. L'assistente gli dice quali lezioni **potrebbero interessargli e perche'**, con le
// alternative, e **in quali orari le trova**; la funzione aggiunge le prossime lezioni vere, coi posti. Si prenota dal
// Calendario o da qui, una lezione alla volta e con le regole di sempre: nessun limite «dentro il percorso», niente si salva.
//
// **Giorni e fasce orarie non sono vincoli**: ordinano le lezioni e segnano gli orari «tuoi», ma una lezione adatta che si tiene
// in un altro momento resta, e lo si dice. L'unico limite duro sono le lezioni che il socio evita.
//
// **Sala e vasca non sono lezioni**: dove servono (un lavoro di forza, un riscaldamento prima di una lezione, il Nuoto Libero
// come recupero) l'assistente lo dice in due parole, «potresti metterla il martedi'», e la carta porta a **comporre il piano**
// («Componi il tuo piano», `/allenamento/agente`, gia' in sala o in vasca) e al calendario per prenotare il turno. Il piano se lo
// costruisce il socio, con il suo obiettivo: qui non si scrivono esercizi. La vasca c'e' solo per chi sa stile libero e dorso.
//
// **Il personal trainer** (21/10/2026): domande dirette (se l'ha mai seguito un personal, se gli piacerebbe) e indirette (cosa c'e'
// dietro agli obiettivi: la tecnica, una data, ripartire, la costanza, un lavoro su misura). Se serve, i consigli propongono di
// affiancare una seduta al mese o un abbonamento PT da due, quattro o otto: la carta mostra i prezzi di PerfectGym
// (`statoPersonal`, gli stessi della schermata Personal) e porta a prenotare e pagare la seduta, o ad attivare l'abbonamento.
// A chi ha risposto «No, grazie» non si propone.
//
// Le limitazioni sono dati sulla salute: arrivano all'AI e basta, e **non stanno nemmeno nella memoria dell'app**. Gli ultimi
// consigli invece **restano salvati dalla funzione** (21/10/2026, `consigli_ultimi`): chi riapre la schermata li ritrova, con le
// lezioni di adesso, e il questionario si riapre com'era (senza le limitazioni). Nella memoria dell'app (mai sul disco) restano
// le scelte e l'ultima risposta, cosi' dopo un pagamento o un «Dettagli» si ritrova quello che si stava guardando. I consigli si
// chiedono una volta a settimana, e la schermata lo dice; **in prova il limite non si applica** (`quota.in_prova`). Nella vista cliente dello staff non si chiede
// niente: la funzione risponde 403 e qui non compare nessun comando.

const intestazione = { sopratitolo: tr('Consigli Athlon', 'Athlon Tips'), indietro: '/allenamento' as const }

const ATTESA = tv(
  ['Leggo quello che mi hai raccontato…', 'Guardo le lezioni che ci sono…', 'Scelgo quelle che fanno per te…', 'Cerco le prossime lezioni…', 'Ancora qualche secondo…'],
  ['Reading what you told me…', 'Looking at the classes available…', 'Picking the ones that suit you…', 'Finding the next classes…', 'Just a few more seconds…'],
)

type Fase = 'domande' | 'attesa' | 'consigli'

export function Consigli() {
  const p = usePalette()
  const vista = !!vistaCorrente()
  const [stato, setStato] = useState<StatoConsigli | null>(() => inMemoria<{ ok: true } & StatoConsigli>(CHIAVE_STATO_CONSIGLI) ?? null)
  const [erroreStato, setErroreStato] = useState<{ messaggio: string; nonAttivo: boolean } | null>(null)
  const [risposta, setRisposta] = useState<RispostaConsigli | null>(() => {
    const r = inMemoria<RispostaConsigli>(CHIAVE_ULTIMI_CONSIGLI)
    return r ? { ...r, sedute: r.sedute ?? [] } : null
  })
  const [fase, setFase] = useState<Fase>(() => (inMemoria<RispostaConsigli>(CHIAVE_ULTIMI_CONSIGLI) ? 'consigli' : 'domande'))
  // Le scelte ricordate si fondono con quelle di partenza: una memoria scritta da una versione di prima non ha i campi nuovi. Quello che la
  // persona ha gia' detto nel piano in sala (o in un questionario di prima) si ritrova scelto e segnato finche' non lo tocca; le risposte che
  // ha gia' dato qui non si cambiano mai (`schede/profiloComune.ts`).
  const partenza = useRef<ReturnType<typeof consigliDaProfilo> | null>(null)
  if (!partenza.current) {
    const base: SceltePerConsigli = { ...SCELTE_DI_PARTENZA, ...(inMemoria<Partial<SceltePerConsigli>>(CHIAVE_SCELTE_CONSIGLI) ?? {}) }
    partenza.current = consigliDaProfilo(base, inMemoria<CampoConsigli[]>(CHIAVE_RIPORTATE_CONSIGLI) ?? [], leggiProfilo())
  }
  const [scelte, setScelte] = useState<SceltePerConsigli>(partenza.current.scelte)
  const [riportate, setRiportate] = useState<CampoConsigli[]>(partenza.current.riportate)
  const scelteCorrenti = useRef(scelte)
  scelteCorrenti.current = scelte
  const riportateCorrenti = useRef(riportate)
  riportateCorrenti.current = riportate
  // Le limitazioni sono dati sulla salute: vivono solo qui, nel campo di testo.
  const [limitazioni, setLimitazioni] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [frase, setFrase] = useState(0)
  const [aperta, setAperta] = useState<{ nome: string; categoria: string; scheda: SchedaLezione } | null>(null)

  // Chi esce dalla schermata mentre l'AI lavora non deve ritrovarsi, dopo, con i consigli aperti da sola.
  const qui = useRef(true)
  const rispostaCorrente = useRef(risposta)
  rispostaCorrente.current = risposta
  useEffect(() => {
    qui.current = true
    return () => {
      qui.current = false
    }
  }, [])

  // Senza una risposta in memoria si cercano gli ultimi consigli salvati, una volta per apertura della schermata: finche'
  // non si sa, al posto del questionario c'e' lo scheletro (chi li ha non deve vedere le domande per un istante).
  const [cercati, setCercati] = useState(() => !!inMemoria<RispostaConsigli>(CHIAVE_ULTIMI_CONSIGLI))
  const cercatiRef = useRef(cercati)
  const ricarica = useCallback(async () => {
    if (vista) return
    const cerca = !cercatiRef.current
    cercatiRef.current = true
    const [r, salvati] = await Promise.all([prendi(CHIAVE_STATO_CONSIGLI, statoConsigli), cerca ? ultimiConsigli() : Promise.resolve(null)])
    if (!qui.current) return
    // L'abitudine (quanto viene al club e quando) arriva con lo stato; se prima non c'era (si e' aperta la schermata da un link) i giorni e
    // il momento si propongono dopo, solo dove la persona non ha ancora risposto.
    const abitudinePrima = abitudineNota()
    if (r.ok) {
      setStato(r)
      setErroreStato(null)
      ricordaAbitudine(r.abitudine)
    } else setErroreStato({ messaggio: r.errore, nonAttivo: r.stato === 404 || r.stato === 503 })
    const ritrovati = !!(salvati?.ok && salvati.risposta && !rispostaCorrente.current)
    if (ritrovati && salvati?.ok && salvati.risposta) {
      const ritrovata = salvati.risposta
      ricorda(CHIAVE_ULTIMI_CONSIGLI, ritrovata)
      setRisposta(ritrovata)
      setFase('consigli')
      // Il questionario si riapre com'era, se in questa apertura il socio non ha gia' cominciato a cambiarlo.
      if (!inMemoria(CHIAVE_SCELTE_CONSIGLI)) {
        const nuove = { ...SCELTE_DI_PARTENZA, ...scelteDa(ritrovata.questionario) }
        ricorda(CHIAVE_SCELTE_CONSIGLI, nuove)
        setScelte(nuove)
        // Le sue risposte salvate valgono piu' di quelle portate dal profilo.
        ricorda(CHIAVE_RIPORTATE_CONSIGLI, [])
        setRiportate([])
      }
    }
    if (r.ok && r.abitudine && !abitudinePrima && !ritrovati && !rispostaCorrente.current) {
      const dal = consigliDaProfilo(scelteCorrenti.current, riportateCorrenti.current, leggiProfilo())
      if (dal.riportate.length) {
        ricorda(CHIAVE_SCELTE_CONSIGLI, dal.scelte)
        ricorda(CHIAVE_RIPORTATE_CONSIGLI, dal.riportate)
        setScelte(dal.scelte)
        setRiportate(dal.riportate)
      }
    }
    if (cerca) setCercati(true)
  }, [vista])
  useFocusEffect(
    useCallback(() => {
      ricarica()
    }, [ricarica]),
  )

  useEffect(() => {
    if (fase !== 'attesa') return
    setFrase(0)
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 7000)
    return () => clearInterval(t)
  }, [fase])

  const cambia = (n: Partial<SceltePerConsigli>) => {
    const nuove = { ...scelte, ...n }
    setScelte(nuove)
    ricorda(CHIAVE_SCELTE_CONSIGLI, nuove)
    // Quello che tocca e' suo (non si segna piu' come riportato) e quello che e' in comune passa al profilo, per il piano in sala.
    const chiavi = Object.keys(n)
    const restano = senzaToccate(riportate, chiavi, (c) => CHIAVI_CONSIGLI[c])
    setRiportate(restano)
    ricorda(CHIAVE_RIPORTATE_CONSIGLI, restano)
    aggiornaProfilo(daConsigli(nuove, chiavi))
  }

  // Dopo un clic la riga si aggiorna subito con quello che ha detto PerfectGym; la memoria del giorno del calendario non vale piu'.
  const aggiorna = (classId: number, nuova: { booking_id: number; attesa: boolean } | null, delta: number, deltaAttesa: number) => {
    const r = rispostaCorrente.current
    if (!r) return
    const l = trovaLezione(r, classId)
    if (l) dimenticaGiornoCalendario(giornoRoma(l.inizio), r.member_id)
    const nuovo = conPrenotazione(r, classId, nuova, delta, deltaAttesa)
    ricorda(CHIAVE_ULTIMI_CONSIGLI, nuovo)
    setRisposta(nuovo)
  }
  const azioni: AzioniPrenotazione = usePrenotazioneLezione(risposta?.member_id ?? stato?.member_id, {
    prenotata: (id, b) => aggiorna(id, b, b.attesa ? 0 : 1, b.attesa ? 1 : 0),
    disdetta: (id, inAttesa) => aggiorna(id, null, inAttesa ? 0 : -1, inAttesa ? -1 : 0),
  })

  const questionario = questionarioDa(scelte, limitazioni)
  const manca = cosaManca(scelte)
  const finita = quotaFinita(stato?.quota)
  // Quanto viene al club davvero: il «consigliato» delle volte a settimana e le cifre vere accanto (`schede/abitudine.ts`).
  const abitudine = abitudineNota()
  const consigliate = volteConsigliate(abitudine)

  async function chiedi() {
    if (!questionario || finita) return
    setErrore(null)
    setFase('attesa')
    const r = await chiediConsigli(questionario)
    if (!qui.current) return
    if (!r.ok) {
      colpetto('errore')
      setErrore(r.errore)
      return setFase('domande')
    }
    colpetto('ok')
    // Quello che ha confermato si ritrova nel piano in sala.
    aggiornaProfilo(daConsigli(scelte))
    ricorda(CHIAVE_ULTIMI_CONSIGLI, r.risposta)
    if (stato) {
      const nuovo = { ...stato, quota: r.risposta.quota }
      ricorda(CHIAVE_STATO_CONSIGLI, { ok: true, ...nuovo })
      setStato(nuovo)
    }
    setRisposta(r.risposta)
    setFase('consigli')
  }

  // ---------------------------------------------------------------------------

  if (vista) {
    return (
      <Schermata {...intestazione} titolo={tr('Consigli su misura', 'Tailored tips')} barra={false}>
        <Messaggio tono="attenzione">{tr('In vista cliente i consigli non si chiedono: li chiede solo il socio.', 'In member view tips can’t be requested: only the member can request them.')}</Messaggio>
      </Schermata>
    )
  }
  if (erroreStato?.nonAttivo || (stato && !stato.attivo)) {
    return (
      <Schermata {...intestazione} titolo={tr('Consigli su misura', 'Tailored tips')} barra={false}>
        <Messaggio tono="attenzione" titolo={tr('Non sono ancora attivi', 'Not active yet')}>
          {erroreStato?.messaggio ?? tr('I consigli non sono ancora attivi: riprova più avanti.', 'Tips aren’t active yet: try again later.')}
        </Messaggio>
        <AltraStrada />
      </Schermata>
    )
  }
  if (!stato || !cercati) {
    return (
      <Schermata {...intestazione} titolo={tr('Consigli su misura', 'Tailored tips')} barra={false}>
        {erroreStato ? (
          <>
            <Messaggio>{erroreStato.messaggio}</Messaggio>
            <Pulsante testo={tr('Riprova', 'Try again')} icona="aggiorna" onPress={ricarica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return (
      <Schermata {...intestazione} titolo={tr('Consigli su misura', 'Tailored tips')} barra={false}>
        <Messaggio tono="attenzione">{tr('I consigli sono riservati ai maggiorenni.', 'Tips are for adults only.')}</Messaggio>
      </Schermata>
    )
  }

  if (fase === 'attesa') {
    return (
      <Schermata {...intestazione} titolo={tr('I tuoi consigli', 'Your tips')} barra={false}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.attesa}>
          <Icona nome="stella" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>{tr('Ci vogliono pochi secondi, a volte mezzo minuto: resta su questa pagina.', 'It takes a few seconds, sometimes half a minute: stay on this page.')}</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  if (fase === 'consigli' && risposta) {
    return (
      <Schermata {...intestazione} titolo={tr('I tuoi consigli', 'Your tips')} sottotitolo={risposta.sintesi ?? undefined}>
        <Risposta risposta={risposta} azioni={azioni} onScheda={setAperta} onCambia={() => setFase('domande')} />
        {aperta ? <FoglioLezione scheda={aperta.scheda} titolo={aperta.nome} categoria={aperta.categoria} onChiudi={() => setAperta(null)} /> : null}
      </Schermata>
    )
  }

  const nuotoNonCompreso = scelte.nuotare && scelte.saNuotare === true && stato.idoneita.categorie != null && !stato.idoneita.categorie.includes('Nuoto Libero') && !scelte.includi_non_comprese
  const esperienza = scelte.esperienza
  return (
    <Schermata
      {...intestazione}
      titolo={tr('Consigli su misura', 'Tailored tips')}
      barra={false}
      sottotitolo={tr('Raccontaci chi sei e cosa ti piace: ti diciamo quali lezioni potrebbero fare per te, perché, e quando le trovi.', 'Tell us who you are and what you like: we’ll tell you which classes might suit you, why, and when you can find them.')}
    >
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{tr('Consigli, non un programma', 'Tips, not a program')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {tr(
            'Non c’è una settimana da rispettare: scegli tu quali lezioni fare e quando. Le prenoti dal Calendario o da qui, una alla volta, come sempre. Per la sala e la vasca ti portiamo a comporre il tuo piano di allenamento.',
            'There’s no weekly schedule to follow: you choose which classes to do and when. Book them from the Calendar or from here, one at a time, as usual. For the gym floor and the pool we take you to build your workout plan.',
          )}
        </Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {tr('I consigli restano salvati e li ritrovi qui quando torni. Puoi chiederne di nuovi una volta a settimana.', 'Your tips are saved and you’ll find them here when you come back. You can ask for new ones once a week.')}
        </Text>
      </Carta>

      <Sezione titolo={tr('I tuoi obiettivi', 'Your goals')}>
        <SceltePiu
          valori={OBIETTIVI.map((o) => ({ valore: o, testo: nomeObiettivo(o) }))}
          scelti={scelte.obiettivi}
          onCambia={(obiettivi) => obiettivi.length <= OBIETTIVI_MAX && cambia({ obiettivi })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.obiettivi.length > 1
            ? tr(
                `Il primo che hai scelto, ${nomeObiettivo(scelte.obiettivi[0])}, è quello principale.${scelte.obiettivi.length >= OBIETTIVI_MAX ? ' Ne puoi scegliere fino a tre.' : ''}`,
                `The first one you chose, ${nomeObiettivo(scelte.obiettivi[0])}, is the main one.${scelte.obiettivi.length >= OBIETTIVI_MAX ? ' You can choose up to three.' : ''}`,
              )
            : tr('Puoi sceglierne più di uno, fino a tre: il primo è quello principale.', 'You can choose more than one, up to three: the first is the main one.')}
        </Text>
        <Riportata mostra={riportate.includes('obiettivi')} />
      </Sezione>

      <Sezione titolo={tr('Cosa c’è dietro ai tuoi obiettivi', 'What’s behind your goals')} destra={<Facoltativo />}>
        <SceltePiu valori={BISOGNI.map((b) => ({ valore: b, testo: BISOGNO_TESTO[b].testo }))} scelti={scelte.bisogni} onCambia={(bisogni) => cambia({ bisogni })} />
        {scelte.bisogni.length ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{scelte.bisogni.map((b) => `${BISOGNO_TESTO[b].testo}: ${BISOGNO_TESTO[b].nota}`).join(' · ')}</Text>
        ) : null}
      </Sezione>

      <Sezione titolo={tr('La tua esperienza', 'Your experience')}>
        <Scelte valori={ESPERIENZE.map((e) => ({ valore: e, testo: ESPERIENZA_TESTO[e].testo }))} scelto={esperienza} onScegli={(e) => cambia({ esperienza: e })} />
        {esperienza ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{ESPERIENZA_TESTO[esperienza].nota}</Text> : null}
        <Riportata mostra={riportate.includes('esperienza')} />
      </Sezione>

      {esperienza === 'ex' ? (
        <Sezione titolo={tr('Quando hai smesso', 'When you stopped')} destra={<Facoltativo />}>
          <Scelte valori={PAUSE.map((v) => ({ valore: v, testo: PAUSA_TESTO[v] }))} scelto={scelte.pausa} onScegli={(pausa) => cambia({ pausa })} />
        </Sezione>
      ) : null}

      {esperienza === 'ex' || esperienza === 'pratico' ? (
        <>
          <Sezione titolo={esperienza === 'ex' ? tr('Cosa facevi', 'What you used to do') : tr('Cosa fai', 'What you do')} destra={<Facoltativo />}>
            <SceltePiu valori={DISCIPLINE.map((d) => ({ valore: d, testo: DISCIPLINA_TESTO[d] }))} scelti={scelte.discipline} onCambia={(discipline) => cambia({ discipline })} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {esperienza === 'ex' ? tr('Ripartire da quello che conosci rende la ripresa più facile.', 'Starting from what you know makes getting back into it easier.') : tr('Ti proponiamo qualcosa che completi quello che fai già, senza ripeterlo.', 'We’ll suggest something that complements what you already do, without repeating it.')}
            </Text>
          </Sezione>
          <Sezione titolo={tr('Com’è la tua forma oggi', 'How fit you are today')}>
            <Scelte valori={LIVELLI.map((l) => ({ valore: l, testo: LIVELLO_TESTO[l].testo }))} scelto={scelte.livello} onScegli={(livello) => cambia({ livello })} />
            {scelte.livello ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{LIVELLO_TESTO[scelte.livello].nota}</Text> : null}
            <Riportata mostra={riportate.includes('livello')} />
          </Sezione>
        </>
      ) : null}

      <Sezione titolo={tr('Cosa ti piace fare', 'What you like to do')} destra={<Facoltativo />}>
        <SceltePiu valori={GUSTI.map((g) => ({ valore: g.valore, testo: g.testo }))} scelti={gustiDi(scelte)} onCambia={(gusti) => cambia(conGusti(scelte, gusti))} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {gustiDi(scelte).length
            ? GUSTI.filter((g) => gustiDi(scelte).includes(g.valore))
                .map((g) => `${g.testo}: ${g.nota}`)
                .join(' · ')
            : tr('Se non scegli niente, guardiamo tutte le lezioni.', 'If you don’t choose anything, we look at all the classes.')}
        </Text>
      </Sezione>

      {scelte.nuotare ? (
        <Sezione titolo={tr('Sai nuotare stile libero e dorso?', 'Can you swim freestyle and backstroke?')}>
          <Scelte
            valori={[
              { valore: 'si', testo: tr('Sì', 'Yes') },
              { valore: 'no', testo: tr('Non ancora', 'Not yet') },
            ]}
            scelto={scelte.saNuotare === null ? null : scelte.saNuotare ? 'si' : 'no'}
            onScegli={(v) => cambia({ saNuotare: v === 'si' })}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {scelte.saNuotare === true
              ? tr('Ti diciamo come inserire il Nuoto Libero Assistito nella settimana, e ti portiamo a comporre il tuo piano di nuoto.', 'We’ll tell you how to fit Nuoto Libero Assistito into your week, and take you to build your swim plan.')
              : scelte.saNuotare === false
                ? tr('Ti consigliamo la Scuola Nuoto Adulti, dove si comincia: sono gli istruttori a dirti quando passare al nuoto libero.', 'We recommend Scuola Nuoto Adulti, where you start: the instructors will tell you when to move on to lap swimming.')
                : MESSAGGIO_SCUOLA_NUOTO}
          </Text>
          {nuotoNonCompreso ? (
            <Messaggio tono="attenzione">{tr('Il Nuoto Libero non risulta nel tuo abbonamento: i turni si prenotano a pagamento, come lezione singola.', 'Nuoto Libero isn’t in your membership: slots are booked for a fee, as a single class.')}</Messaggio>
          ) : null}
        </Sezione>
      ) : null}

      <Sezione titolo={tr('Che intensità preferisci', 'What intensity you prefer')} destra={<Facoltativo />}>
        <Scelte valori={INTENSITA.map((i) => ({ valore: i, testo: INTENSITA_TESTO[i].testo }))} scelto={scelte.intensita} onScegli={(intensita) => cambia({ intensita: intensita === scelte.intensita ? null : intensita })} />
        {scelte.intensita ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{INTENSITA_TESTO[scelte.intensita].nota}</Text> : null}
        <Riportata mostra={riportate.includes('intensita')} />
      </Sezione>

      <Sezione titolo={tr('Quante volte a settimana pensi di venire', 'How many times a week you plan to come')}>
        <Scelte
          valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: n === consigliate ? `${n} · ${tr('consigliato', 'suggested')}` : String(n) }))}
          scelto={scelte.volte_settimana}
          onScegli={(volte_settimana) => cambia({ volte_settimana })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {[tr(`Ti proponiamo cose per ${volteTesto(scelte.volte_settimana)}, più o meno: poi scegli tu.`, `We’ll suggest things for about ${volteTesto(scelte.volte_settimana)}: then it’s up to you.`), testoAbitudine(abitudine), notaSalto(scelte.volte_settimana, abitudine)].filter(Boolean).join(' ')}
        </Text>
      </Sezione>

      <Sezione titolo={tr('Quando ti piacerebbe venire', 'When you’d like to come')} destra={<Facoltativo />}>
        <SceltePiu valori={GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] }))} scelti={scelte.giorni} onCambia={(v) => cambia({ giorni: [...v].sort((a, b) => a - b) })} />
        <SceltePiu valori={FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo }))} scelti={scelte.fasce} onCambia={(fasce) => cambia({ fasce })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.fasce.length ? `${scelte.fasce.map((f) => `${NOME_FASCIA[f].titolo}: ${NOME_FASCIA[f].nota}`).join(' · ')}. ` : ''}
          {tr('Non è un vincolo: ti mostriamo prima le lezioni che ci stanno, ma ti diciamo anche quelle adatte a te in altri momenti.', 'It’s not a constraint: we show the classes that fit first, but we also tell you about ones that suit you at other times.')}
        </Text>
        <Riportata mostra={riportate.includes('fasce') || riportate.includes('giorni')} daVisite={riportate.includes('giorni') || (riportate.includes('fasce') && momentoDaVisiteAlPosto())} />
      </Sezione>

      <Sezione titolo={tr('Ti ha mai seguito un personal trainer?', 'Have you ever worked with a personal trainer?')} destra={<Facoltativo />}>
        <Scelte
          valori={PERSONAL_ESPERIENZE.map((v) => ({ valore: v, testo: PERSONAL_ESPERIENZA_TESTO[v] }))}
          scelto={scelte.personal_esperienza}
          onScegli={(v) => cambia({ personal_esperienza: v === scelte.personal_esperienza ? null : v })}
        />
      </Sezione>

      <Sezione titolo={tr('Ti piacerebbe allenarti con un personal trainer?', 'Would you like to train with a personal trainer?')} destra={<Facoltativo />}>
        <Scelte
          valori={PERSONAL_INTERESSI.map((v) => ({ valore: v, testo: PERSONAL_INTERESSE_TESTO[v] }))}
          scelto={scelte.personal_interesse}
          onScegli={(v) => cambia({ personal_interesse: v === scelte.personal_interesse ? null : v })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.personal_interesse === 'no'
            ? tr('Va bene: non te lo proponiamo.', 'That’s fine: we won’t suggest it.')
            : tr('Un trainer del club che lavora solo con te, accanto alle lezioni: se ti può servire, ti diciamo quante sedute al mese avrebbero senso.', 'A club trainer who works only with you, alongside classes: if it could help, we’ll tell you how many sessions a month would make sense.')}
        </Text>
      </Sezione>

      <Sezione titolo={tr('Lezioni che vuoi evitare', 'Classes you want to avoid')} destra={<Facoltativo />}>
        <Carta style={{ gap: spazio.due }}>
          <TextInput
            value={scelte.evitate}
            onChangeText={(v) => cambia({ evitate: v.slice(0, 200) })}
            placeholder={tr('Per esempio: boxing, step. Separale con una virgola.', 'For example: boxing, step. Separate them with a comma.')}
            placeholderTextColor={p.testoTerzo}
            style={[stili.riga, { color: p.testo, backgroundColor: p.incavo }]}
            accessibilityLabel={tr('Lezioni da evitare', 'Classes to avoid')}
          />
        </Carta>
      </Sezione>

      {stato.idoneita.categorie != null ? (
        <Sezione titolo={tr('Lezioni non comprese', 'Classes not included')}>
          <Scelte
            valori={[
              { valore: 'no', testo: tr('Solo quelle comprese', 'Only those included') },
              { valore: 'si', testo: tr('Includi anche le altre', 'Include the others too') },
            ]}
            scelto={scelte.includi_non_comprese ? 'si' : 'no'}
            onScegli={(v) => cambia({ includi_non_comprese: v === 'si' })}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {tr('Quelle fuori dal tuo abbonamento compaiono segnate «da acquistare» e si prenotano come lezione singola, a pagamento. Di base le lasciamo fuori.', 'Those outside your membership are marked “to purchase” and are booked as a paid single class. By default we leave them out.')}
          </Text>
        </Sezione>
      ) : null}

      <Sezione titolo={tr('Limitazioni o infortuni', 'Limitations or injuries')} destra={<Facoltativo />}>
        <Carta style={{ gap: spazio.due }}>
          <TextInput
            value={limitazioni}
            onChangeText={(v) => setLimitazioni(v.slice(0, 500))}
            placeholder={tr('Per esempio: mal di schiena, una spalla da proteggere. Lascia vuoto se non ne hai.', 'For example: back pain, a shoulder to protect. Leave empty if you have none.')}
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
            accessibilityLabel={tr('Limitazioni o infortuni', 'Limitations or injuries')}
          />
        </Carta>
      </Sezione>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {finita ? (
        <Messaggio tono="attenzione">
          {risposta?.salvati_il
            ? tr(
                `Puoi chiedere nuovi consigli una volta a settimana: i tuoi li ritrovi qui, e potrai chiederne di nuovi da ${giornoEsteso(risposta.salvati_il, 7)}.`,
                `You can ask for new tips once a week: you’ll find yours here, and you can ask for new ones from ${giornoEsteso(risposta.salvati_il, 7)}.`,
              )
            : tr('Puoi chiedere nuovi consigli una volta a settimana: i tuoi li ritrovi qui.', 'You can ask for new tips once a week: you’ll find yours here.')}
        </Messaggio>
      ) : null}
      {manca.length ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{tr(`Per continuare manca ${manca.join(', ')}.`, `To continue we still need ${manca.join(', ')}.`)}</Text> : null}
      <Pulsante testo={tr('Dammi i consigli', 'Give me tips')} icona="stella" onPress={chiedi} disabilitato={!questionario || finita} />
      {risposta ? <Pulsante testo={tr('Torna ai consigli di prima', 'Back to the previous tips')} variante="fantasma" onPress={() => setFase('consigli')} /> : null}
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        {tr(
          'I consigli li scrive un’intelligenza artificiale. Le limitazioni che scrivi non vengono conservate; i consigli e le altre risposte restano salvati, così li ritrovi quando torni. Non sostituiscono il parere di un medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.',
          'The tips are written by an artificial intelligence. The limitations you write aren’t stored; the tips and your other answers are saved, so you’ll find them when you come back. They don’t replace a doctor’s advice: if you have pain, injuries or medical conditions, talk to an instructor on the gym floor first.',
        )}
      </Text>
      <AltraStrada />
    </Schermata>
  )
}

const Facoltativo = () => {
  const p = usePalette()
  return <Text style={[stili.facoltativo, { color: p.testoTerzo }]}>{tr('FACOLTATIVO', 'OPTIONAL')}</Text>
}

/** Per chi preferisce la settimana a tappe del tutor (il Percorso Athlon): in standby non si offre (`percorso/standby.ts`). */
function AltraStrada() {
  const p = usePalette()
  if (PERCORSO_IN_STANDBY) return null
  return (
    <Tocco onPress={() => router.push('/allenamento/percorso')} etichetta={tr('Apri il Percorso Athlon, la settimana a tappe', 'Open the Athlon Program, the week in steps')} style={stili.altraStrada}>
      <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
        {tr('Preferisci una settimana già a tappe? ', 'Prefer a week already planned in steps? ')}
        <Text style={{ color: p.accento, fontFamily: F.bold }}>{tr('Apri il Percorso Athlon', 'Open the Athlon Program')}</Text>
      </Text>
    </Tocco>
  )
}

// ---------------------------------------------------------------------------
// I consigli

function Risposta({ risposta, azioni, onScheda, onCambia }: { risposta: RispostaConsigli; azioni: AzioniPrenotazione; onScheda: ApriScheda; onCambia: () => void }) {
  const p = usePalette()
  const { schede } = risposta
  return (
    <>
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{tr('Come leggere questi consigli', 'How to read these tips')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {risposta.salvati_il
            ? tr(
                `Sono suggerimenti basati sulle risposte che ci hai dato ${giornoEsteso(risposta.salvati_il)}, non un programma da seguire. Restano salvati: quando torni li ritrovi qui.`,
                `They’re suggestions based on the answers you gave us on ${giornoEsteso(risposta.salvati_il)}, not a program to follow. They’re saved: you’ll find them here when you come back.`,
              )
            : tr('Sono suggerimenti basati sulle risposte che ci hai dato, non un programma da seguire.', 'They’re suggestions based on the answers you gave us, not a program to follow.')}{' '}
          {tr(
            'Le lezioni che puoi prenotare cambiano da sole, perché la prenotazione si apre tre giorni prima: quelle più avanti compaiono man mano.',
            'The classes you can book change by themselves, because booking opens three days before: later ones appear as time goes on.',
          )}
        </Text>
        {testoAbitudine(risposta.abitudine) ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {tr('Abbiamo tenuto conto anche di quanto vieni al club. ', 'We also took into account how often you come to the club. ')}
            {testoAbitudine(risposta.abitudine)}{' '}
            {tr('Le volte a settimana che ti consigliamo per ogni lezione partono da lì, e le lezioni che fai già sono segnate.', 'The times a week we suggest for each class start from there, and classes you already go to are marked.')}
          </Text>
        ) : null}
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Puoi chiedere nuovi consigli una volta a settimana.', 'You can ask for new tips once a week.')}</Text>
      </Carta>

      {risposta.integrazione ? (
        <Carta style={{ gap: spazio.due }}>
          <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{tr('Come metterle insieme', 'How to put them together')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{risposta.integrazione}</Text>
        </Carta>
      ) : null}

      {!risposta.prenotazioni_lette ? (
        <Messaggio tono="attenzione">{tr('Non riusciamo a leggere le tue prenotazioni adesso: le lezioni si vedono, ma non sappiamo cosa hai già prenotato.', 'We can’t read your bookings right now: you can see the classes, but we don’t know what you’ve already booked.')}</Messaggio>
      ) : null}

      {risposta.consigli.length ? (
        <Sezione titolo={tr('Le lezioni che potrebbero interessarti', 'Classes you might like')}>
          <View style={{ gap: spazio.quattro }}>
            {risposta.consigli.map((c, i) => (
              <Entra key={c.tipo.id} indice={i}>
                <CartaConsiglio c={c} schede={schede} azioni={azioni} onScheda={onScheda} />
              </Entra>
            ))}
          </View>
        </Sezione>
      ) : null}

      {risposta.sedute.length ? <BloccoSedute sedute={risposta.sedute} /> : null}
      {risposta.personal ? <CartaPersonal c={risposta.personal} memberId={risposta.member_id} /> : null}

      {risposta.avvisi.map((a) => (
        <Messaggio key={a} tono="attenzione">
          {a}
        </Messaggio>
      ))}

      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        {tr(
          'I posti cambiano in fretta: l’ultima parola è del Calendario. Prima di una nuova lezione contano le regole di sempre, per esempio quante prenotazioni attive si possono avere per categoria.',
          'Spots change quickly: the Calendar has the final say. The usual rules apply before a new class, for example how many active bookings you can have per category.',
        )}
      </Text>

      <View style={{ gap: spazio.due }}>
        <Pulsante testo={tr('Cambia le risposte', 'Change your answers')} icona="modifica" variante="scuro" onPress={onCambia} />
      </View>
    </>
  )
}

const ICONA_CATEGORIA = (categoria: string) => (/acqua|nuoto/i.test(categoria) ? ('goccia' as const) : ('calendario' as const))

function CartaConsiglio({ c, schede, azioni, onScheda }: { c: ConsiglioRisolto; schede: Record<string, SchedaLezione>; azioni: AzioniPrenotazione; onScheda: ApriScheda }) {
  const p = usePalette()
  const [alternative, setAlternative] = useState(false)
  const comune = { schede, azioni, onScheda }
  const schedaSito = c.tipo.scheda ? (schede[c.tipo.scheda] ?? null) : null
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona={ICONA_CATEGORIA(c.tipo.categoria)} tono={/acqua|nuoto/i.test(c.tipo.categoria) ? 'blu' : 'accento'} size={42} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{c.tipo.nome}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{[c.tipo.categoria !== c.tipo.nome ? c.tipo.categoria : null, `${c.tipo.minuti} min`, volteTesto(c.volte)].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      {c.tipo.compresa === false ? (
        <View style={stili.etichette}>
          <Etichetta testo={tr('Da acquistare', 'To purchase')} tono="attenzione" />
        </View>
      ) : null}
      {c.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{c.perche}</Text> : null}
      {c.gia_fatta ? (
        <Text style={[stili.nota, { color: p.accento, fontFamily: F.bold }]}>
          {tr(
            `La fai già: ${c.gia_fatta.volte} ${c.gia_fatta.volte === 1 ? 'volta' : 'volte'} nelle ultime otto settimane, l’ultima ${giornoEsteso(c.gia_fatta.ultima)}.`,
            `You already go: ${c.gia_fatta.volte} ${c.gia_fatta.volte === 1 ? 'time' : 'times'} in the last eight weeks, most recently on ${giornoEsteso(c.gia_fatta.ultima)}.`,
          )}
        </Text>
      ) : null}

      <OrariDiSolito orari={c.orari} />

      <View style={{ gap: spazio.due }}>
        <Text style={[stili.sottoTitolo, { color: p.testo }]}>{tr('Le prossime', 'Upcoming')}</Text>
        <ElencoLezioni lezioni={c.prossime} vuoto={tr('Nei prossimi giorni non ce ne sono: guarda le alternative, o il Calendario più avanti.', 'There are none in the next few days: look at the alternatives, or at the Calendar further ahead.')} {...comune} />
        {!c.prossime.length && schedaSito ? (
          <Pulsante testo={tr('Com’è la lezione', 'What the class is like')} variante="fantasma" piccolo onPress={() => onScheda({ nome: c.tipo.nome, categoria: c.tipo.categoria, scheda: schedaSito })} />
        ) : null}
      </View>

      {c.alternative.length ? (
        <View style={{ gap: spazio.due }}>
          <Tocco onPress={() => setAlternative((a) => !a)} vibra="scelta" etichetta={tr(`${alternative ? 'Nascondi' : 'Mostra'} le alternative a ${c.tipo.nome}`, `${alternative ? 'Hide' : 'Show'} alternatives to ${c.tipo.nome}`)} style={stili.alternativeTesta}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[stili.sottoTitolo, { color: p.testo }]}>{tr(`Se questa non va: ${c.alternative.length} ${c.alternative.length === 1 ? 'alternativa' : 'alternative'}`, `If this one doesn’t work: ${c.alternative.length} ${c.alternative.length === 1 ? 'alternative' : 'alternatives'}`)}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]} numberOfLines={alternative ? undefined : 1}>
                {c.alternative.map((a) => a.tipo.nome).join(' · ')}
              </Text>
            </View>
            <Icona nome={alternative ? 'meno' : 'piu'} size={18} colore={p.accento} />
          </Tocco>
          {alternative
            ? c.alternative.map((a) => (
                <View key={a.tipo.id} style={[stili.alternativa, { borderLeftColor: p.linea }]}>
                  <View style={{ gap: 2 }}>
                    <Text style={[stili.sottoTitolo, { color: p.testo }]}>{a.tipo.nome}</Text>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>{[a.tipo.categoria !== a.tipo.nome ? a.tipo.categoria : null, `${a.tipo.minuti} min`].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <OrariDiSolito orari={a.orari} piccolo />
                  {a.tipo.compresa === false ? (
                    <View style={stili.etichette}>
                      <Etichetta testo={tr('Da acquistare', 'To purchase')} tono="attenzione" />
                    </View>
                  ) : null}
                  <ElencoLezioni lezioni={a.prossime} vuoto={tr('Nei prossimi giorni non ce ne sono.', 'There are none in the next few days.')} {...comune} />
                </View>
              ))
            : null}
        </View>
      ) : null}
    </Carta>
  )
}

/**
 * Quando la lezione si tiene di solito: una pillola per orario, prima quelli nei giorni e nelle fasce che il socio preferisce
 * (segnati), poi gli altri. Se nessuno cade nelle sue preferenze lo si dice: la lezione resta fra i consigli, perche' le
 * preferenze non sono un vincolo.
 */
function OrariDiSolito({ orari, piccolo }: { orari: OrarioLezione[]; piccolo?: boolean }) {
  const p = usePalette()
  if (!orari.length) return null
  const { orari: ordinati, fuori } = orariOrdinati(orari)
  return (
    <View style={{ gap: spazio.due }}>
      {piccolo ? null : <Text style={[stili.sottoTitolo, { color: p.testo }]}>{tr('La trovi di solito', 'Usually held')}</Text>}
      <View style={stili.etichette}>
        {ordinati.map((o) => (
          <View key={`${o.giorno}-${o.ora}`} style={[stili.orario, { backgroundColor: o.tuo ? p.accento : p.incavo }]}>
            <Text style={[stili.orarioTesto, { color: o.tuo ? '#fff' : p.testo }]}>{testoOrario(o)}</Text>
          </View>
        ))}
      </View>
      {fuori ? (
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>{tr('Non nei giorni o negli orari che preferisci: te la proponiamo lo stesso.', 'Not on the days or at the times you prefer: we’re suggesting it anyway.')}</Text>
      ) : ordinati.some((o) => o.tuo) && !piccolo ? (
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>{tr('In arancio gli orari nei giorni e nelle fasce che preferisci.', 'Times on your preferred days and time slots are in orange.')}</Text>
      ) : null}
    </View>
  )
}

/**
 * Le sedute in sala e in vasca. **Non sono lezioni e non si prenotano da qui come una lezione**: dicono cosa fare e quando, in
 * due parole, e portano a comporre il piano di allenamento («Componi il tuo piano», gia' in sala o in vasca), dove il socio
 * sceglie il suo obiettivo; e, per prenotare il turno, al calendario sul primo giorno utile.
 */
function BloccoSedute({ sedute }: { sedute: SedutaConsigliata[] }) {
  return (
    <Sezione titolo={tr('In sala e in vasca, con il tuo piano', 'On the gym floor and in the pool, with your plan')}>
      <View style={{ gap: spazio.quattro }}>
        {sedute.map((s, i) => (
          <Entra key={`${s.ambiente}-${i}`} indice={i}>
            <CartaSeduta s={s} />
          </Entra>
        ))}
      </View>
    </Sezione>
  )
}

function CartaSeduta({ s }: { s: SedutaConsigliata }) {
  const p = usePalette()
  const inVasca = s.ambiente === 'vasca'
  const dove = destinazioniSeduta(s)
  const giorni = giorniTesto(s.giorni)
  const titolo = s.cosa ?? (inVasca ? 'Nuoto Libero' : tr('Una seduta in sala', 'A gym floor session'))
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona={inVasca ? 'goccia' : 'peso'} tono="blu" size={42} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{titolo.charAt(0).toUpperCase() + titolo.slice(1)}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {[inVasca ? tr('In vasca · Nuoto Libero', 'In the pool · Nuoto Libero') : tr('In sala · Gym Floor', 'On the floor · Gym Floor'), volteTesto(s.volte), s.fascia === 'con_assistenza' ? tr('meglio nei turni con l’assistente di sala', 'best in slots with the floor assistant') : s.fascia === 'libero' ? tr('anche in allenamento libero', 'free workout works too') : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {s.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{s.perche}</Text> : null}
      {giorni ? <Text style={[stili.nota, { color: p.testo }]}>{tr(`Potresti metterla ${s.giorni.length === 1 ? 'il' : 'fra'} ${giorni}.`, `You could do it on ${giorni}.`)}</Text> : null}
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {inVasca
          ? tr('Cosa fare in vasca te lo dice il tuo piano di nuoto: lo componi tu, con il tuo obiettivo, e lo leggi a bordo vasca.', 'What to do in the pool is in your swim plan: you build it yourself, around your goal, and read it poolside.')
          : tr('Cosa fare in sala te lo dice il tuo piano di allenamento: lo componi tu, con il tuo obiettivo. Con l’assistente di sala c’è chi supervisiona le attività e risponde ai tuoi dubbi.', 'What to do on the gym floor is in your workout plan: you build it yourself, around your goal. With the floor assistant there’s someone supervising the gym floor and answering your questions.')}
      </Text>
      <View style={{ gap: spazio.due }}>
        <Pulsante testo={inVasca ? tr('Componi il tuo piano di nuoto', 'Build your swim plan') : tr('Componi il tuo piano in sala', 'Build your gym floor plan')} icona={inVasca ? 'goccia' : 'peso'} onPress={() => router.push(dove.piano)} />
        {dove.calendario ? (
          <Pulsante testo={inVasca ? tr('Prenota un turno in vasca', 'Book a pool slot') : tr('Prenota un turno in sala', 'Book a gym floor slot')} icona="calendario" variante="fantasma" onPress={() => router.push(dove.calendario!)} />
        ) : null}
      </View>
    </Carta>
  )
}

/**
 * Il personal trainer da affiancare alle lezioni: quante sedute al mese e perche' (dal consiglio), e le formule con i prezzi di
 * PerfectGym (`statoPersonal`, letto qui: e' la stessa lettura della schermata Personal). La consigliata e' in evidenza, le altre
 * sotto, per chi vuole di piu' o di meno. Ognuna porta a `/personal`: a prenotare e pagare la seduta, o al foglio dell'abbonamento PT.
 */
function CartaPersonal({ c, memberId }: { c: ConsiglioPersonal; memberId: number }) {
  const p = usePalette()
  const [stato, setStato] = useState<StatoPersonal | null>(null)
  const [letto, setLetto] = useState(false)
  useEffect(() => {
    let vivo = true
    statoPersonal(memberId).then((r) => {
      if (!vivo) return
      if (r.ok) setStato(r.stato)
      setLetto(true)
    })
    return () => {
      vivo = false
    }
  }, [memberId])
  const f = formulePersonal(c, stato)
  return (
    <Sezione titolo={tr('Con un personal trainer', 'With a personal trainer')}>
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="persona" tono="accento" size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titolo, { color: p.testo }]}>{tr(`Ti consigliamo ${sedutePersonalTesto(c.sedute_mese)}`, `We recommend ${sedutePersonalTesto(c.sedute_mese)}`)}</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Accanto alle lezioni, con un trainer che lavora solo con te', 'Alongside classes, with a trainer who works only with you')}</Text>
          </View>
        </View>
        {c.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{c.perche}</Text> : null}
        {!letto ? (
          <ActivityIndicator color={p.accento} />
        ) : f.attivo ? (
          <>
            <Text style={[stili.nota, { color: p.testo }]}>{tr(`Hai già l’abbonamento PT «${f.attivo}»: prenota le sedute del mese con il trainer che preferisci.`, `You already have the PT membership “${f.attivo}”: book this month’s sessions with the trainer you prefer.`)}</Text>
            <Pulsante testo={tr('Prenota una seduta', 'Book a session')} icona="calendario" onPress={() => router.push('/personal')} />
          </>
        ) : (
          <>
            <RigaFormula f={f.consigliata} principale />
            {f.senzaAbbonamento ? (
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>
                {tr(`L’abbonamento PT da ${sedutePersonalTesto(c.sedute_mese)} si aggiunge a un abbonamento attivo: intanto puoi cominciare con una seduta singola.`, `The PT membership with ${sedutePersonalTesto(c.sedute_mese)} is added to an active membership: meanwhile you can start with a single session.`)}
              </Text>
            ) : null}
            {f.altre.length ? (
              <View style={{ gap: spazio.due }}>
                <Text style={[stili.sottoTitolo, { color: p.testo }]}>{tr('Oppure', 'Or')}</Text>
                {f.altre.map((x) => (
                  <RigaFormula key={x.chiave} f={x} />
                ))}
              </View>
            ) : null}
          </>
        )}
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>{tr('Il personal si paga a parte. Prima di pagare un abbonamento PT leggi le sue regole nel foglio d’acquisto.', 'Personal training is paid separately. Before paying for a PT membership, read its rules in the purchase sheet.')}</Text>
      </Carta>
    </Sezione>
  )
}

function RigaFormula({ f, principale }: { f: FormulaPersonal; principale?: boolean }) {
  const p = usePalette()
  const prezzo = f.prezzo != null ? `${euro(f.prezzo)}${f.alMese ? tr(' al mese', ' a month') : ''}` : null
  const azione = f.destinazione.params ? tr('Attiva l’abbonamento PT', 'Activate the PT membership') : tr('Prenota e paga la seduta', 'Book and pay for the session')
  if (principale) {
    return (
      <View style={[stili.formula, { backgroundColor: p.incavo }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spazio.due }}>
          <Text style={[stili.sottoTitolo, { color: p.testo, flex: 1 }]}>{f.titolo}</Text>
          {prezzo ? <Text style={[stili.sottoTitolo, { color: p.testo }]}>{prezzo}</Text> : null}
        </View>
        {f.sotto ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{f.sotto}</Text> : null}
        <Pulsante testo={azione} icona={f.destinazione.params ? 'rinnovo' : 'calendario'} onPress={() => router.push(f.destinazione)} />
      </View>
    )
  }
  return (
    <Tocco onPress={() => router.push(f.destinazione)} etichetta={`${f.titolo}${prezzo ? `, ${prezzo}` : ''}`} style={[stili.formulaAltra, { borderColor: p.linea }]}>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{f.titolo}</Text>
        {prezzo ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{prezzo}</Text> : null}
      </View>
      <Icona nome="avanti" size={18} colore={p.testoTerzo} />
    </Tocco>
  )
}

/** Sotto una risposta portata dal profilo comune (`schede/profiloComune.ts`): si vede da dove viene, finche' la persona non la tocca. */
function Riportata({ mostra, daVisite }: { mostra: boolean; daVisite?: boolean }) {
  const p = usePalette()
  if (!mostra) return null
  // Se viene da quello che fa davvero (ingressi e lezioni) non e' una sua risposta, e si dice (`schede/abitudine.ts`).
  return (
    <Text style={[stili.nota, { color: p.accento, fontFamily: F.bold }]}>
      {daVisite ? tr('Dalle tue visite al club: cambialo se serve.', 'From your visits to the club: change it if you like.') : tr('Riportato dalle tue risposte precedenti: cambialo se serve.', 'Carried over from your earlier answers: change it if you like.')}
    </Text>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  perche: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19, fontStyle: 'italic' },
  sottoTitolo: { fontFamily: F.bold, fontSize: 15 },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  facoltativo: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  alternativeTesta: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: 4 },
  alternativa: { gap: spazio.due, borderLeftWidth: 3, paddingLeft: spazio.tre },
  orario: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  formula: { borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  formulaAltra: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderWidth: 1, borderRadius: 14, padding: spazio.tre },
  orarioTesto: { fontFamily: F.bold, fontSize: 13 },
  riga: { borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5 },
  testo: { minHeight: 70, borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5, textAlignVertical: 'top' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  altraStrada: { paddingVertical: spazio.tre },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
