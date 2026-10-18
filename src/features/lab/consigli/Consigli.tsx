import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import { MESSAGGIO_SCUOLA_NUOTO, type SchedaLezione } from '@/api/lab'
import {
  chiediConsigli,
  FASCE,
  GRUPPI,
  LIVELLI,
  OBIETTIVI,
  statoConsigli,
  type ConsiglioRisolto,
  type NuotoConsigliato,
  type NuotoScelta,
  type RispostaConsigli,
  type SalaConsigliata,
  type StatoConsigli,
} from '@/api/percorso'
import { ora, giornoEsteso } from '@/lib/eventi'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from '../memoria'
import { FASCIA_SALA } from '../percorso/TappaCarta'
import { GIORNI, GIORNO_BREVE, NOME_FASCIA, NOME_GRUPPO } from '../percorso/comune'
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
  conPrenotazione,
  questionarioDa,
  titoloGiorno,
  trovaLezione,
  VOLTE_DI_PARTENZA,
  volteTesto,
  type SceltePerConsigli,
} from './comune'
import { ConAltre, ElencoLezioni, RigaLezione, type ApriScheda, type AzioniPrenotazione } from './Lezioni'

// I consigli di Athlon (20/10/2026). Il Percorso era una settimana composta e controllata, e la prenotazione dentro
// la settimana era troppo stretta: qui il socio riceve dei **consigli**. Dice cosa cerca (obiettivo, livello, quante
// volte a settimana, e — se vuole — la sala pesi o il nuoto) e l'assistente gli propone i tipi di lezione che fanno per
// lui, con le alternative; la funzione trova le prossime lezioni vere, coi posti. Si prenota dal Calendario o da qui,
// una lezione alla volta e con le regole di sempre: nessun limite «dentro il percorso», niente si salva.
//
// **Sala e nuoto sono una scelta del socio**: senza averli chiesti non compaiono. La sala e' la Gym Floor, con i suoi due
// tipi di turno (con l'assistente di sala, o allenamento libero); il nuoto e' il Nuoto Libero, e per chi vuole imparare
// la Scuola Nuoto Adulti, dove si comincia.
//
// Il questionario non si conserva: le limitazioni sono dati sulla salute, arrivano all'AI e basta, e **non stanno nemmeno
// nella memoria dell'app**. Si ricordano (solo in memoria, mai sul disco) le altre scelte e l'ultima risposta, cosi' dopo
// un pagamento o un «Dettagli» si ritrova quello che si stava guardando. Nella vista cliente dello staff non si chiede
// niente: la funzione risponde 403 e qui non compare nessun comando.

const intestazione = { sopratitolo: 'Consigli Athlon', indietro: '/allenamento' as const }

const LIVELLI_TESTO: Record<(typeof LIVELLI)[number], { testo: string; nota: string }> = {
  principiante: { testo: 'Principiante', nota: 'Ho iniziato da poco o riprendo dopo una pausa' },
  intermedio: { testo: 'Intermedio', nota: 'Mi alleno con regolarità da almeno sei mesi' },
  esperto: { testo: 'Esperto', nota: 'Mi alleno da anni e conosco bene gli esercizi' },
}

const ATTESA = [
  'Leggo le tue risposte…',
  'Guardo le lezioni che ci sono…',
  'Scelgo cosa ti conviene…',
  'Cerco le prossime lezioni…',
  'Ancora qualche secondo…',
]

const SCELTE_DI_PARTENZA: SceltePerConsigli = {
  obiettivo: null,
  livello: null,
  volte_settimana: VOLTE_DI_PARTENZA,
  gruppi: [],
  evitate: '',
  fasce: [],
  giorni_liberi: [],
  sala: false,
  nuoto: null,
  includi_non_comprese: false,
}

type Fase = 'domande' | 'attesa' | 'consigli'

export function Consigli() {
  const p = usePalette()
  const vista = !!vistaCorrente()
  const [stato, setStato] = useState<StatoConsigli | null>(() => inMemoria<{ ok: true } & StatoConsigli>(CHIAVE_STATO_CONSIGLI) ?? null)
  const [erroreStato, setErroreStato] = useState<{ messaggio: string; nonAttivo: boolean } | null>(null)
  const [risposta, setRisposta] = useState<RispostaConsigli | null>(() => inMemoria<RispostaConsigli>(CHIAVE_ULTIMI_CONSIGLI) ?? null)
  const [fase, setFase] = useState<Fase>(() => (inMemoria<RispostaConsigli>(CHIAVE_ULTIMI_CONSIGLI) ? 'consigli' : 'domande'))
  const [scelte, setScelte] = useState<SceltePerConsigli>(() => inMemoria<SceltePerConsigli>(CHIAVE_SCELTE_CONSIGLI) ?? SCELTE_DI_PARTENZA)
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

  const nuotoNonCompreso = scelte.nuoto === 'libero' && stato.idoneita.categorie != null && !stato.idoneita.categorie.includes('Nuoto Libero') && !scelte.includi_non_comprese
  return (
    <Schermata
      {...intestazione}
      titolo="Consigli su misura"
      barra={false}
      sottotitolo="Dimmi cosa cerchi: ti consigliamo i tipi di lezione che fanno per te, con le alternative. Se vuoi, anche come affiancarli alla sala pesi o al nuoto."
    >
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>Consigli, non un programma</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          Non c’è una settimana da rispettare: scegli tu quali lezioni fare e quando. Le prenoti dal Calendario o da qui, una alla volta, come sempre.
        </Text>
      </Carta>

      <Sezione titolo="Il tuo obiettivo">
        <Scelte valori={OBIETTIVI.map((o) => ({ valore: o, testo: o }))} scelto={scelte.obiettivo} onScegli={(obiettivo) => cambia({ obiettivo })} />
      </Sezione>

      <Sezione titolo="Il tuo livello">
        <Scelte valori={LIVELLI.map((l) => ({ valore: l, testo: LIVELLI_TESTO[l].testo }))} scelto={scelte.livello} onScegli={(livello) => cambia({ livello })} />
        {scelte.livello ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{LIVELLI_TESTO[scelte.livello].nota}</Text> : null}
      </Sezione>

      <Sezione titolo="Quante volte a settimana vuoi venire">
        <Scelte valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: String(n) }))} scelto={scelte.volte_settimana} onScegli={(volte_settimana) => cambia({ volte_settimana })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Ti consigliamo lezioni e, se le vuoi, sala e nuoto per ${volteTesto(scelte.volte_settimana)}, più o meno.`}</Text>
      </Sezione>

      <Sezione titolo="Vuoi anche la sala pesi?" destra={<Facoltativo />}>
        <Scelte
          valori={[
            { valore: 'no', testo: 'No, grazie' },
            { valore: 'si', testo: 'Sì, la sala' },
          ]}
          scelto={scelte.sala ? 'si' : 'no'}
          onScegli={(v) => cambia({ sala: v === 'si' })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.sala
            ? 'Ti diciamo come inserire la sala fra le lezioni e ti mostriamo i turni di Gym Floor: con l’assistente di sala, o in allenamento libero.'
            : 'È la Gym Floor: ogni mezz’ora un turno, che si prenota come una lezione.'}
        </Text>
      </Sezione>

      <Sezione titolo="E il nuoto?" destra={<Facoltativo />}>
        <Scelte
          valori={[
            { valore: 'no', testo: 'No' },
            { valore: 'libero', testo: 'Nuoto Libero' },
            { valore: 'imparare', testo: 'Voglio imparare' },
          ]}
          scelto={scelte.nuoto ?? 'no'}
          onScegli={(v) => cambia({ nuoto: (v === 'no' ? null : v) as NuotoScelta })}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.nuoto === 'libero'
            ? 'Turni di Nuoto Libero Assistito, come recupero fra le lezioni più impegnative. Scegli questa strada se sai già nuotare stile libero e dorso.'
            : scelte.nuoto === 'imparare'
              ? 'Ti consigliamo la Scuola Nuoto Adulti, dove si comincia: sono gli istruttori a dirti quando passare al nuoto libero.'
              : MESSAGGIO_SCUOLA_NUOTO}
        </Text>
        {nuotoNonCompreso ? (
          <Messaggio tono="attenzione">Il Nuoto Libero non risulta nel tuo abbonamento. Scegli «Includi anche le altre» più sotto: i turni compaiono segnati «da acquistare».</Messaggio>
        ) : null}
      </Sezione>

      <Sezione titolo="Che lezioni ti piacciono" destra={<Facoltativo />}>
        <SceltePiu valori={GRUPPI.map((g) => ({ valore: g, testo: NOME_GRUPPO[g].titolo }))} scelti={scelte.gruppi} onCambia={(gruppi) => cambia({ gruppi })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.gruppi.length ? scelte.gruppi.map((g) => NOME_GRUPPO[g].nota).join(' · ') : 'Se non scegli niente, guardiamo tutte le lezioni.'}
        </Text>
      </Sezione>

      <Sezione titolo="Quando preferisci venire" destra={<Facoltativo />}>
        <SceltePiu valori={FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo }))} scelti={scelte.fasce} onCambia={(fasce) => cambia({ fasce })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {scelte.fasce.length ? scelte.fasce.map((f) => `${NOME_FASCIA[f].titolo}: ${NOME_FASCIA[f].nota}`).join(' · ') : 'Con un orario indicato, ti mostriamo prima le lezioni che ci stanno.'}
        </Text>
      </Sezione>

      <Sezione titolo="In quali giorni puoi venire" destra={<Facoltativo />}>
        <SceltePiu valori={GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] }))} scelti={scelte.giorni_liberi} onCambia={(v) => cambia({ giorni_liberi: [...v].sort((a, b) => a - b) })} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>Senza scelta, tutti i giorni vanno bene.</Text>
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
      {!questionario ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>Scegli obiettivo e livello per continuare.</Text> : null}
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

/** Per chi preferisce la settimana a tappe del tutor (il Percorso Athlon): resta com'era. */
function AltraStrada() {
  const p = usePalette()
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
          <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>Come metterli insieme</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{risposta.integrazione}</Text>
        </Carta>
      ) : null}

      {!risposta.prenotazioni_lette ? (
        <Messaggio tono="attenzione">Non riusciamo a leggere le tue prenotazioni adesso: le lezioni si vedono, ma non sappiamo cosa hai già prenotato.</Messaggio>
      ) : null}

      {risposta.consigli.length ? (
        <Sezione titolo="Le lezioni che ti consigliamo">
          <View style={{ gap: spazio.quattro }}>
            {risposta.consigli.map((c, i) => (
              <Entra key={c.tipo.id} indice={i}>
                <CartaConsiglio c={c} schede={schede} azioni={azioni} onScheda={onScheda} />
              </Entra>
            ))}
          </View>
        </Sezione>
      ) : null}

      {risposta.sala ? <BloccoSala sala={risposta.sala} schede={schede} azioni={azioni} onScheda={onScheda} /> : null}
      {risposta.nuoto ? <BloccoNuoto nuoto={risposta.nuoto} schede={schede} azioni={azioni} onScheda={onScheda} /> : null}

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

function BloccoSala({ sala, schede, azioni, onScheda }: { sala: SalaConsigliata; schede: Record<string, SchedaLezione>; azioni: AzioniPrenotazione; onScheda: ApriScheda }) {
  const p = usePalette()
  return (
    <Sezione titolo="E in sala">
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="peso" tono="blu" size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titolo, { color: p.testo }]}>Sala pesi · Gym Floor</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${volteTesto(sala.volte)}${sala.fascia ? ` · ti consigliamo ${FASCIA_SALA[sala.fascia].toLowerCase()}` : ''}`}</Text>
          </View>
        </View>
        {sala.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{sala.perche}</Text> : null}
        {sala.giorni.length ? (
          <ConAltre
            visibili={2}
            nome={['giornata', 'giornate']}
            voci={sala.giorni.map((g) => (
              <View key={g.data} style={{ gap: spazio.due }}>
                <Text style={[stili.sottoTitolo, { color: p.testo }]}>{titoloGiorno(giornoEsteso(g.data))}</Text>
                {g.turni.map((t) => (
                  <RigaLezione key={t.class_id} l={t} fascia={t.fascia} schede={schede} azioni={azioni} onScheda={onScheda} testoPrenota={ora(t.inizio)} />
                ))}
              </View>
            ))}
          />
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Nei prossimi giorni non ci sono turni da prenotare nei giorni che hai scelto: li trovi nel Calendario quando si aprono.</Text>
        )}
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>
          Con l’assistente di sala c’è chi supervisiona le attività in sala e risponde ai tuoi dubbi; in allenamento libero ti alleni per conto tuo. L’orario è quello del turno.
        </Text>
      </Carta>
    </Sezione>
  )
}

function BloccoNuoto({ nuoto, schede, azioni, onScheda }: { nuoto: NuotoConsigliato; schede: Record<string, SchedaLezione>; azioni: AzioniPrenotazione; onScheda: ApriScheda }) {
  const p = usePalette()
  return (
    <Sezione titolo="E in vasca">
      <Carta style={{ gap: spazio.tre }}>
        <View style={stili.testa}>
          <Bollino icona="goccia" tono="blu" size={42} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titolo, { color: p.testo }]}>Nuoto Libero</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{volteTesto(nuoto.volte)}</Text>
          </View>
        </View>
        {nuoto.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{nuoto.perche}</Text> : null}
        {nuoto.giorni.length ? (
          <ConAltre
            visibili={2}
            nome={['giornata', 'giornate']}
            voci={nuoto.giorni.map((g) => (
              <View key={g.data} style={{ gap: spazio.due }}>
                <Text style={[stili.sottoTitolo, { color: p.testo }]}>{titoloGiorno(giornoEsteso(g.data))}</Text>
                {g.turni.map((t) => (
                  <RigaLezione key={t.class_id} l={t} schede={schede} azioni={azioni} onScheda={onScheda} testoPrenota={ora(t.inizio)} />
                ))}
              </View>
            ))}
          />
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Nei prossimi giorni non ci sono turni da prenotare nei giorni che hai scelto: li trovi nel Calendario quando si aprono.</Text>
        )}
      </Carta>
    </Sezione>
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
  riga: { borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5 },
  testo: { minHeight: 70, borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5, textAlignVertical: 'top' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  altraStrada: { paddingVertical: spazio.tre },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
