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
  type ConsiglioPersonal,
  type ConsiglioRisolto,
  type OrarioLezione,
  type RispostaConsigli,
  type SedutaConsigliata,
  type StatoConsigli,
} from '@/api/percorso'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from '../memoria'
import { PERCORSO_IN_STANDBY } from '../percorso/standby'
import { GIORNI, GIORNO_BREVE, NOME_FASCIA } from '../percorso/comune'
import { giornoRoma } from '../schede/contatoreCalorie'
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
// Il questionario non si conserva: le limitazioni sono dati sulla salute, arrivano all'AI e basta, e **non stanno nemmeno
// nella memoria dell'app**. Si ricordano (solo in memoria, mai sul disco) le altre scelte e l'ultima risposta, cosi' dopo
// un pagamento o un «Dettagli» si ritrova quello che si stava guardando. Nella vista cliente dello staff non si chiede
// niente: la funzione risponde 403 e qui non compare nessun comando.

const intestazione = { sopratitolo: 'Consigli Athlon', indietro: '/allenamento' as const }

const ATTESA = [
  'Leggo quello che mi hai raccontato…',
  'Guardo le lezioni che ci sono…',
  'Scelgo quelle che fanno per te…',
  'Cerco le prossime lezioni…',
  'Ancora qualche secondo…',
]

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
  // Le scelte ricordate si fondono con quelle di partenza: una memoria scritta da una versione di prima non ha i campi nuovi.
  const [scelte, setScelte] = useState<SceltePerConsigli>(() => ({ ...SCELTE_DI_PARTENZA, ...(inMemoria<Partial<SceltePerConsigli>>(CHIAVE_SCELTE_CONSIGLI) ?? {}) }))
  // Le limitazioni sono dati sulla salute: vivono solo qui, nel campo di testo.
  const [limitazioni, setLimitazioni] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [frase, setFrase] = useState(0)
  const [aperta, setAperta] = useState<{ nome: string; categoria: string; scheda: SchedaLezione } | null>(null)

  // Chi esce dalla schermata mentre l'AI lavora non deve ritrovarsi, dopo, con i consigli aperti da sola.
  const qui = useRef(true)
  useEffect(() => {
    qui.current = true
    return () => {
      qui.current = false
    }
  }, [])

  const ricarica = useCallback(async () => {
    if (vista) return
    const r = await prendi(CHIAVE_STATO_CONSIGLI, statoConsigli)
    if (!qui.current) return
    if (r.ok) {
      setStato(r)
      setErroreStato(null)
    } else setErroreStato({ messaggio: r.errore, nonAttivo: r.stato === 404 || r.stato === 503 })
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
  }

  // Dopo un clic la riga si aggiorna subito con quello che ha detto PerfectGym; la memoria del giorno del calendario non vale piu'.
  const rispostaCorrente = useRef(risposta)
  rispostaCorrente.current = risposta
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
  const quotaFinita = !!stato && stato.quota.usate >= stato.quota.massimo

  async function chiedi() {
    if (!questionario || quotaFinita) return
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
      <Schermata {...intestazione} titolo="Consigli su misura" barra={false}>
        <Messaggio tono="attenzione">In vista cliente i consigli non si chiedono: li chiede solo il socio.</Messaggio>
      </Schermata>
    )
  }
  if (erroreStato?.nonAttivo || (stato && !stato.attivo)) {
    return (
      <Schermata {...intestazione} titolo="Consigli su misura" barra={false}>
        <Messaggio tono="attenzione" titolo="Non sono ancora attivi">
          {erroreStato?.messaggio ?? 'I consigli non sono ancora attivi: riprova più avanti.'}
        </Messaggio>
        <AltraStrada />
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...intestazione} titolo="Consigli su misura" barra={false}>
        {erroreStato ? (
          <>
            <Messaggio>{erroreStato.messaggio}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={ricarica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return (
      <Schermata {...intestazione} titolo="Consigli su misura" barra={false}>
        <Messaggio tono="attenzione">I consigli sono riservati ai maggiorenni.</Messaggio>
      </Schermata>
    )
  }

  if (fase === 'attesa') {
    return (
      <Schermata {...intestazione} titolo="I tuoi consigli" barra={false}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.attesa}>
          <Icona nome="stella" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vogliono pochi secondi, a volte mezzo minuto: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  if (fase === 'consigli' && risposta) {
    return (
      <Schermata {...intestazione} titolo="I tuoi consigli" sottotitolo={risposta.sintesi ?? undefined}>
        <Risposta risposta={risposta} azioni={azioni} onScheda={setAperta} onCambia={() => setFase('domande')} quota={stato.quota} />
        {aperta ? <FoglioLezione scheda={aperta.scheda} titolo={aperta.nome} categoria={aperta.categoria} onChiudi={() => setAperta(null)} /> : null}
      </Schermata>
    )
  }

  const nuotoNonCompreso = scelte.nuotare && scelte.saNuotare === true && stato.idoneita.categorie != null && !stato.idoneita.categorie.includes('Nuoto Libero') && !scelte.includi_non_comprese
  const esperienza = scelte.esperienza
  return (
    <Schermata
      {...intestazione}
      titolo="Consigli su misura"
      barra={false}
      sottotitolo="Raccontaci chi sei e cosa ti piace: ti diciamo quali lezioni potrebbero fare per te, perché, e quando le trovi."
    >
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>Consigli, non un programma</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          Non c’è una settimana da rispettare: scegli tu quali lezioni fare e quando. Le prenoti dal Calendario o da qui, una alla volta, come sempre. Per la sala e la vasca ti portiamo a comporre il tuo piano di allenamento.
        </Text>
      </Carta>

      <Sezione titolo="I tuoi obiettivi">
        <SceltePiu
          valori={OBIETTIVI.map((o) => ({ valore: o, testo: o }))}
          scelti={scelte.obiettivi}
          onCambia={(obiettivi) => obiettivi.length <= OBIETTIVI_MAX && cambia({ obiettivi })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.obiettivi.length > 1
            ? `Il primo che hai scelto, ${scelte.obiettivi[0]}, è quello principale.${scelte.obiettivi.length >= OBIETTIVI_MAX ? ' Ne puoi scegliere fino a tre.' : ''}`
            : 'Puoi sceglierne più di uno, fino a tre: il primo è quello principale.'}
        </Text>
      </Sezione>

      <Sezione titolo="Cosa c’è dietro ai tuoi obiettivi" destra={<Facoltativo />}>
        <SceltePiu valori={BISOGNI.map((b) => ({ valore: b, testo: BISOGNO_TESTO[b].testo }))} scelti={scelte.bisogni} onCambia={(bisogni) => cambia({ bisogni })} />
        {scelte.bisogni.length ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{scelte.bisogni.map((b) => `${BISOGNO_TESTO[b].testo}: ${BISOGNO_TESTO[b].nota}`).join(' · ')}</Text>
        ) : null}
      </Sezione>

      <Sezione titolo="La tua esperienza">
        <Scelte valori={ESPERIENZE.map((e) => ({ valore: e, testo: ESPERIENZA_TESTO[e].testo }))} scelto={esperienza} onScegli={(e) => cambia({ esperienza: e })} />
        {esperienza ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{ESPERIENZA_TESTO[esperienza].nota}</Text> : null}
      </Sezione>

      {esperienza === 'ex' ? (
        <Sezione titolo="Quando hai smesso" destra={<Facoltativo />}>
          <Scelte valori={PAUSE.map((v) => ({ valore: v, testo: PAUSA_TESTO[v] }))} scelto={scelte.pausa} onScegli={(pausa) => cambia({ pausa })} />
        </Sezione>
      ) : null}

      {esperienza === 'ex' || esperienza === 'pratico' ? (
        <>
          <Sezione titolo={esperienza === 'ex' ? 'Cosa facevi' : 'Cosa fai'} destra={<Facoltativo />}>
            <SceltePiu valori={DISCIPLINE.map((d) => ({ valore: d, testo: DISCIPLINA_TESTO[d] }))} scelti={scelte.discipline} onCambia={(discipline) => cambia({ discipline })} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {esperienza === 'ex' ? 'Ripartire da quello che conosci rende la ripresa più facile.' : 'Ti proponiamo qualcosa che completi quello che fai già, senza ripeterlo.'}
            </Text>
          </Sezione>
          <Sezione titolo="Com’è la tua forma oggi">
            <Scelte valori={LIVELLI.map((l) => ({ valore: l, testo: LIVELLO_TESTO[l].testo }))} scelto={scelte.livello} onScegli={(livello) => cambia({ livello })} />
            {scelte.livello ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{LIVELLO_TESTO[scelte.livello].nota}</Text> : null}
          </Sezione>
        </>
      ) : null}

      <Sezione titolo="Cosa ti piace fare" destra={<Facoltativo />}>
        <SceltePiu valori={GUSTI.map((g) => ({ valore: g.valore, testo: g.testo }))} scelti={gustiDi(scelte)} onCambia={(gusti) => cambia(conGusti(scelte, gusti))} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {gustiDi(scelte).length
            ? GUSTI.filter((g) => gustiDi(scelte).includes(g.valore))
                .map((g) => `${g.testo}: ${g.nota}`)
                .join(' · ')
            : 'Se non scegli niente, guardiamo tutte le lezioni.'}
        </Text>
      </Sezione>

      {scelte.nuotare ? (
        <Sezione titolo="Sai nuotare stile libero e dorso?">
          <Scelte
            valori={[
              { valore: 'si', testo: 'Sì' },
              { valore: 'no', testo: 'Non ancora' },
            ]}
            scelto={scelte.saNuotare === null ? null : scelte.saNuotare ? 'si' : 'no'}
            onScegli={(v) => cambia({ saNuotare: v === 'si' })}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {scelte.saNuotare === true
              ? 'Ti diciamo come inserire il Nuoto Libero Assistito nella settimana, e ti portiamo a comporre il tuo piano di nuoto.'
              : scelte.saNuotare === false
                ? 'Ti consigliamo la Scuola Nuoto Adulti, dove si comincia: sono gli istruttori a dirti quando passare al nuoto libero.'
                : MESSAGGIO_SCUOLA_NUOTO}
          </Text>
          {nuotoNonCompreso ? (
            <Messaggio tono="attenzione">Il Nuoto Libero non risulta nel tuo abbonamento: i turni si prenotano a pagamento, come lezione singola.</Messaggio>
          ) : null}
        </Sezione>
      ) : null}

      <Sezione titolo="Che intensità preferisci" destra={<Facoltativo />}>
        <Scelte valori={INTENSITA.map((i) => ({ valore: i, testo: INTENSITA_TESTO[i].testo }))} scelto={scelte.intensita} onScegli={(intensita) => cambia({ intensita: intensita === scelte.intensita ? null : intensita })} />
        {scelte.intensita ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{INTENSITA_TESTO[scelte.intensita].nota}</Text> : null}
      </Sezione>

      <Sezione titolo="Quante volte a settimana pensi di venire">
        <Scelte valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: String(n) }))} scelto={scelte.volte_settimana} onScegli={(volte_settimana) => cambia({ volte_settimana })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Ti proponiamo cose per ${volteTesto(scelte.volte_settimana)}, più o meno: poi scegli tu.`}</Text>
      </Sezione>

      <Sezione titolo="Quando ti piacerebbe venire" destra={<Facoltativo />}>
        <SceltePiu valori={GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] }))} scelti={scelte.giorni} onCambia={(v) => cambia({ giorni: [...v].sort((a, b) => a - b) })} />
        <SceltePiu valori={FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo }))} scelti={scelte.fasce} onCambia={(fasce) => cambia({ fasce })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.fasce.length ? `${scelte.fasce.map((f) => `${NOME_FASCIA[f].titolo}: ${NOME_FASCIA[f].nota}`).join(' · ')}. ` : ''}
          Non è un vincolo: ti mostriamo prima le lezioni che ci stanno, ma ti diciamo anche quelle adatte a te in altri momenti.
        </Text>
      </Sezione>

      <Sezione titolo="Ti ha mai seguito un personal trainer?" destra={<Facoltativo />}>
        <Scelte
          valori={PERSONAL_ESPERIENZE.map((v) => ({ valore: v, testo: PERSONAL_ESPERIENZA_TESTO[v] }))}
          scelto={scelte.personal_esperienza}
          onScegli={(v) => cambia({ personal_esperienza: v === scelte.personal_esperienza ? null : v })}
        />
      </Sezione>

      <Sezione titolo="Ti piacerebbe allenarti con un personal trainer?" destra={<Facoltativo />}>
        <Scelte
          valori={PERSONAL_INTERESSI.map((v) => ({ valore: v, testo: PERSONAL_INTERESSE_TESTO[v] }))}
          scelto={scelte.personal_interesse}
          onScegli={(v) => cambia({ personal_interesse: v === scelte.personal_interesse ? null : v })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.personal_interesse === 'no'
            ? 'Va bene: non te lo proponiamo.'
            : 'Un trainer del club che lavora solo con te, accanto alle lezioni: se ti può servire, ti diciamo quante sedute al mese avrebbero senso.'}
        </Text>
      </Sezione>

      <Sezione titolo="Lezioni che vuoi evitare" destra={<Facoltativo />}>
        <Carta style={{ gap: spazio.due }}>
          <TextInput
            value={scelte.evitate}
            onChangeText={(t) => cambia({ evitate: t.slice(0, 200) })}
            placeholder="Per esempio: boxing, step. Separale con una virgola."
            placeholderTextColor={p.testoTerzo}
            style={[stili.riga, { color: p.testo, backgroundColor: p.incavo }]}
            accessibilityLabel="Lezioni da evitare"
          />
        </Carta>
      </Sezione>

      {stato.idoneita.categorie != null ? (
        <Sezione titolo="Lezioni non comprese">
          <Scelte
            valori={[
              { valore: 'no', testo: 'Solo quelle comprese' },
              { valore: 'si', testo: 'Includi anche le altre' },
            ]}
            scelto={scelte.includi_non_comprese ? 'si' : 'no'}
            onScegli={(v) => cambia({ includi_non_comprese: v === 'si' })}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            Quelle fuori dal tuo abbonamento compaiono segnate «da acquistare» e si prenotano come lezione singola, a pagamento. Di base le lasciamo fuori.
          </Text>
        </Sezione>
      ) : null}

      <Sezione titolo="Limitazioni o infortuni" destra={<Facoltativo />}>
        <Carta style={{ gap: spazio.due }}>
          <TextInput
            value={limitazioni}
            onChangeText={(t) => setLimitazioni(t.slice(0, 500))}
            placeholder="Per esempio: mal di schiena, una spalla da proteggere. Lascia vuoto se non ne hai."
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
            accessibilityLabel="Limitazioni o infortuni"
          />
        </Carta>
      </Sezione>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {quotaFinita ? <Messaggio tono="attenzione">{`Hai chiesto i consigli ${stato.quota.massimo} volte oggi: riprova domani. Intanto puoi guardare il Calendario.`}</Messaggio> : null}
      {manca.length ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{`Per continuare manca ${manca.join(', ')}.`}</Text> : null}
      <Pulsante testo="Dammi i consigli" icona="stella" onPress={chiedi} disabilitato={!questionario || quotaFinita} />
      {risposta ? <Pulsante testo="Torna ai consigli di prima" variante="fantasma" onPress={() => setFase('consigli')} /> : null}
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        I consigli li scrive un’intelligenza artificiale: le tue risposte, limitazioni comprese, non vengono conservate. Non sostituiscono il parere di un medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.
      </Text>
      <AltraStrada />
    </Schermata>
  )
}

const Facoltativo = () => {
  const p = usePalette()
  return <Text style={[stili.facoltativo, { color: p.testoTerzo }]}>FACOLTATIVO</Text>
}

/** Per chi preferisce la settimana a tappe del tutor (il Percorso Athlon): in standby non si offre (`percorso/standby.ts`). */
function AltraStrada() {
  const p = usePalette()
  if (PERCORSO_IN_STANDBY) return null
  return (
    <Tocco onPress={() => router.push('/allenamento/percorso')} etichetta="Apri il Percorso Athlon, la settimana a tappe" style={stili.altraStrada}>
      <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
        Preferisci una settimana già a tappe? <Text style={{ color: p.accento, fontFamily: F.bold }}>Apri il Percorso Athlon</Text>
      </Text>
    </Tocco>
  )
}

// ---------------------------------------------------------------------------
// I consigli

function Risposta({ risposta, azioni, onScheda, onCambia, quota }: { risposta: RispostaConsigli; azioni: AzioniPrenotazione; onScheda: ApriScheda; onCambia: () => void; quota: { usate: number; massimo: number } }) {
  const p = usePalette()
  const { schede } = risposta
  return (
    <>
      {risposta.integrazione ? (
        <Carta style={{ gap: spazio.due }}>
          <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>Come metterle insieme</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{risposta.integrazione}</Text>
        </Carta>
      ) : null}

      {!risposta.prenotazioni_lette ? (
        <Messaggio tono="attenzione">Non riusciamo a leggere le tue prenotazioni adesso: le lezioni si vedono, ma non sappiamo cosa hai già prenotato.</Messaggio>
      ) : null}

      {risposta.consigli.length ? (
        <Sezione titolo="Le lezioni che potrebbero interessarti">
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
        I posti cambiano in fretta: l’ultima parola è del Calendario. Prima di una nuova lezione contano le regole di sempre, per esempio quante prenotazioni attive si possono avere per categoria.
      </Text>

      <View style={{ gap: spazio.due }}>
        <Pulsante testo="Cambia le risposte" icona="modifica" variante="scuro" onPress={onCambia} />
        <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>{`Hai chiesto i consigli ${quota.usate} ${quota.usate === 1 ? 'volta' : 'volte'} oggi su ${quota.massimo}.`}</Text>
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
      {c.tipo.compresa === false || c.tipo.spessoCompleta ? (
        <View style={stili.etichette}>
          {c.tipo.compresa === false ? <Etichetta testo="Da acquistare" tono="attenzione" /> : null}
          {c.tipo.spessoCompleta ? <Etichetta testo="Spesso al completo" tono="attenzione" /> : null}
        </View>
      ) : null}
      {c.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{c.perche}</Text> : null}

      <OrariDiSolito orari={c.orari} />

      <View style={{ gap: spazio.due }}>
        <Text style={[stili.sottoTitolo, { color: p.testo }]}>Le prossime</Text>
        <ElencoLezioni lezioni={c.prossime} vuoto="Nei prossimi giorni non ce ne sono: guarda le alternative, o il Calendario più avanti." {...comune} />
        {!c.prossime.length && schedaSito ? (
          <Pulsante testo="Com’è la lezione" variante="fantasma" piccolo onPress={() => onScheda({ nome: c.tipo.nome, categoria: c.tipo.categoria, scheda: schedaSito })} />
        ) : null}
      </View>

      {c.alternative.length ? (
        <View style={{ gap: spazio.due }}>
          <Tocco onPress={() => setAlternative((a) => !a)} vibra="scelta" etichetta={`${alternative ? 'Nascondi' : 'Mostra'} le alternative a ${c.tipo.nome}`} style={stili.alternativeTesta}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[stili.sottoTitolo, { color: p.testo }]}>{`Se questa non va: ${c.alternative.length} ${c.alternative.length === 1 ? 'alternativa' : 'alternative'}`}</Text>
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
                  {a.tipo.compresa === false || a.tipo.spessoCompleta ? (
                    <View style={stili.etichette}>
                      {a.tipo.compresa === false ? <Etichetta testo="Da acquistare" tono="attenzione" /> : null}
                      {a.tipo.spessoCompleta ? <Etichetta testo="Spesso al completo" tono="attenzione" /> : null}
                    </View>
                  ) : null}
                  <ElencoLezioni lezioni={a.prossime} vuoto="Nei prossimi giorni non ce ne sono." {...comune} />
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
      {piccolo ? null : <Text style={[stili.sottoTitolo, { color: p.testo }]}>La trovi di solito</Text>}
      <View style={stili.etichette}>
        {ordinati.map((o) => (
          <View key={`${o.giorno}-${o.ora}`} style={[stili.orario, { backgroundColor: o.tuo ? p.accento : p.incavo }]}>
            <Text style={[stili.orarioTesto, { color: o.tuo ? '#fff' : p.testo }]}>{testoOrario(o)}</Text>
          </View>
        ))}
      </View>
      {fuori ? (
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>Non nei giorni o negli orari che preferisci: te la proponiamo lo stesso.</Text>
      ) : ordinati.some((o) => o.tuo) && !piccolo ? (
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>In arancio gli orari nei giorni e nelle fasce che preferisci.</Text>
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
    <Sezione titolo="In sala e in vasca, con il tuo piano">
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
  const titolo = s.cosa ?? (inVasca ? 'Nuoto Libero' : 'Una seduta in sala')
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona={inVasca ? 'goccia' : 'peso'} tono="blu" size={42} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{titolo.charAt(0).toUpperCase() + titolo.slice(1)}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {[inVasca ? 'In vasca · Nuoto Libero' : 'In sala · Gym Floor', volteTesto(s.volte), s.fascia === 'con_assistenza' ? 'meglio nei turni con l’assistente di sala' : s.fascia === 'libero' ? 'anche in allenamento libero' : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {s.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{s.perche}</Text> : null}
      {giorni ? <Text style={[stili.nota, { color: p.testo }]}>{`Potresti metterla ${s.giorni.length === 1 ? 'il' : 'fra'} ${giorni}.`}</Text> : null}
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {inVasca
          ? 'Cosa fare in vasca te lo dice il tuo piano di nuoto: lo componi tu, con il tuo obiettivo, e lo leggi a bordo vasca.'
          : 'Cosa fare in sala te lo dice il tuo piano di allenamento: lo componi tu, con il tuo obiettivo. Con l’assistente di sala c’è chi supervisiona le attività e risponde ai tuoi dubbi.'}
      </Text>
      <View style={{ gap: spazio.due }}>
        <Pulsante testo={inVasca ? 'Componi il tuo piano di nuoto' : 'Componi il tuo piano in sala'} icona={inVasca ? 'goccia' : 'peso'} onPress={() => router.push(dove.piano)} />
        {dove.calendario ? (
          <Pulsante testo={inVasca ? 'Prenota un turno in vasca' : 'Prenota un turno in sala'} icona="calendario" variante="fantasma" onPress={() => router.push(dove.calendario!)} />
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
    <Sezione titolo="Con un personal trainer">
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="persona" tono="accento" size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titolo, { color: p.testo }]}>{`Ti consigliamo ${sedutePersonalTesto(c.sedute_mese)}`}</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>Accanto alle lezioni, con un trainer che lavora solo con te</Text>
          </View>
        </View>
        {c.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{c.perche}</Text> : null}
        {!letto ? (
          <ActivityIndicator color={p.accento} />
        ) : f.attivo ? (
          <>
            <Text style={[stili.nota, { color: p.testo }]}>{`Hai già l’abbonamento PT «${f.attivo}»: prenota le sedute del mese con il trainer che preferisci.`}</Text>
            <Pulsante testo="Prenota una seduta" icona="calendario" onPress={() => router.push('/personal')} />
          </>
        ) : (
          <>
            <RigaFormula f={f.consigliata} principale />
            {f.senzaAbbonamento ? (
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>
                {`L’abbonamento PT da ${sedutePersonalTesto(c.sedute_mese)} si aggiunge a un abbonamento attivo: intanto puoi cominciare con una seduta singola.`}
              </Text>
            ) : null}
            {f.altre.length ? (
              <View style={{ gap: spazio.due }}>
                <Text style={[stili.sottoTitolo, { color: p.testo }]}>Oppure</Text>
                {f.altre.map((x) => (
                  <RigaFormula key={x.chiave} f={x} />
                ))}
              </View>
            ) : null}
          </>
        )}
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>Il personal si paga a parte. Prima di pagare un abbonamento PT leggi le sue regole nel foglio d’acquisto.</Text>
      </Carta>
    </Sezione>
  )
}

function RigaFormula({ f, principale }: { f: FormulaPersonal; principale?: boolean }) {
  const p = usePalette()
  const prezzo = f.prezzo != null ? `${euro(f.prezzo)}${f.alMese ? ' al mese' : ''}` : null
  const azione = f.destinazione.params ? 'Attiva l’abbonamento PT' : 'Prenota e paga la seduta'
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
