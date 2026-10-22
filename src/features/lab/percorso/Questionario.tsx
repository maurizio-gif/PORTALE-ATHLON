import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import {
  chiediAlTutor,
  FASCE,
  GRUPPI,
  OBIETTIVI,
  leggiCatalogo,
  type Catalogo,
  type Fascia,
  type Gruppo,
  type Livello,
  type Obiettivo,
  type Questionario as DatiQuestionario,
} from '@/api/percorso'
import { saNuotareAbbastanza, type Continuo, type Stile } from '@/api/lab'
import { locale, t as tr, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { prendi } from '../memoria'
import { CampiNuoto } from '../schede/CampiNuoto'
import { nomeObiettivo } from '../schede/questionario'
import { Scelte, SceltePiu } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { mettiBozzaPercorso, scartaBozzaPercorso } from './bozzaPercorso'
import { CHIAVE_CATALOGO_PERCORSO, GIORNI, GIORNO_BREVE, NOME_FASCIA, NOME_GRUPPO } from './comune'
import { usePercorso } from './usePercorso'

// Il questionario del Percorso Athlon (20/10/2026). Sono le domande dell'agente dei piani (obiettivo, livello,
// giorni, minuti, limitazioni) piu' quelle che servono a una **settimana intera**: quante volte in sala e
// quante lezioni, che generi di lezioni gli piacciono, se ce ne sono di amate o da evitare, e — facoltative —
// le fasce orarie e i giorni in cui puo' venire. Poi il tutor compone la settimana dentro il palinsesto vero.
//
// **Non e' un piano di allenamento** e non lo scrive: usa i piani che il socio ha gia' come tappe di sala. Qui
// si dice dove va a finire ogni cosa: il questionario arriva al tutor e non si conserva (le limitazioni sono
// dati sulla salute); del percorso confermato si conservano le scelte che non lo sono.
//
// Il tutor non salva niente: risponde con una **bozza** che l'editor fa rivedere. La richiesta ci mette fino
// a un paio di minuti: chi esce dalla schermata nel frattempo non si ritrova nell'editor (`qui`).
//
// **Il nuoto** (20/10/2026): fra le cose da scegliere c'e' «quante volte in vasca». Chi ne sceglie almeno una ha, nella
// settimana, dei turni di Nuoto Libero **e un piano di nuoto** scritto insieme al percorso (si conferma con lui): per
// scriverlo servono gli stili che sa nuotare e quanto nuota di fila. Il Nuoto Libero chiede stile libero e dorso: chi non
// li sa non puo' mandare la richiesta e il messaggio gli dice dove si comincia (la Scuola Nuoto Adulti).

const LIVELLI_TESTO: { valore: Livello; testo: string; nota: string }[] = [
  { valore: 'principiante', testo: tr('Principiante', 'Beginner'), nota: tr('Ho iniziato da poco o riprendo dopo una pausa', 'I’ve just started or I’m coming back after a break') },
  { valore: 'intermedio', testo: tr('Intermedio', 'Intermediate'), nota: tr('Mi alleno con regolarità da almeno sei mesi', 'I’ve trained regularly for at least six months') },
  { valore: 'esperto', testo: tr('Esperto', 'Advanced'), nota: tr('Mi alleno da anni e conosco bene gli esercizi', 'I’ve trained for years and know the exercises well') },
]

const MINUTI_SALA = [30, 45, 60, 75, 90]

const ATTESA = tv(
  [
    'Il tutor sta leggendo le tue risposte…',
    'Guarda il palinsesto vero della settimana…',
    'Sceglie le lezioni adatte a te…',
    'Le incastra con la sala e il cardio…',
    'Controlla che ci sia il giusto riposo…',
    'Ancora qualche secondo…',
  ],
  [
    'The coach is reading your answers…',
    'Looking at this week’s real timetable…',
    'Picking the classes that suit you…',
    'Fitting them around the gym floor and cardio…',
    'Checking there’s enough rest…',
    'Just a few more seconds…',
  ],
)

/** Fino a quante lezioni a settimana si chiede: due al giorno al massimo, e mai piu' di otto (il percorso ha un tetto di tappe). */
const quanteLezioni = (giorni: number) => Math.min(8, giorni * 2)

/** Fino a quante volte in vasca: tre (e mai piu' dei giorni). Sono turni di Nuoto Libero in piu' delle lezioni di gruppo. */
const NUOTO_MAX = 3
const quanteInVasca = (giorni: number) => Math.min(NUOTO_MAX, giorni)

export function Questionario() {
  const p = usePalette()
  const { stato, errore: erroreStato, vista } = usePercorso()
  const salvato = stato?.percorso ?? null

  const [obiettivo, setObiettivo] = useState<Obiettivo | null>(null)
  const [livello, setLivello] = useState<Livello | null>(null)
  const [giorni, setGiorni] = useState(4)
  const [sala, setSala] = useState(2)
  const [lezioni, setLezioni] = useState(2)
  const [nuoto, setNuoto] = useState(0)
  const [stiliNuoto, setStiliNuoto] = useState<Stile[]>([])
  const [continuo, setContinuo] = useState<Continuo | null>(null)
  const [minutiSala, setMinutiSala] = useState(60)
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [preferite, setPreferite] = useState<string[]>([])
  const [evitate, setEvitate] = useState<string[]>([])
  const [fasce, setFasce] = useState<Fascia[]>([])
  const [giorniLiberi, setGiorniLiberi] = useState<number[]>([])
  const [cardio, setCardio] = useState(false)
  const [nonComprese, setNonComprese] = useState(false)
  const [limitazioni, setLimitazioni] = useState('')
  const [note, setNote] = useState('')
  const [lezioniAperte, setLezioniAperte] = useState(false)
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)

  const [inCorso, setInCorso] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)
  // Chi esce dalla schermata mentre il tutor lavora non deve ritrovarsi, dopo, nell'editor.
  const qui = useRef(true)
  useEffect(() => {
    qui.current = true
    return () => {
      qui.current = false
    }
  }, [])

  // Si riparte dalle scelte del percorso confermato (quelle che si conservano, niente di sanitario): la prima volta, una sola.
  const precompilato = useRef(false)
  useEffect(() => {
    if (!salvato || precompilato.current) return
    precompilato.current = true
    setObiettivo(salvato.obiettivo)
    setLivello(salvato.livello)
    const pr = salvato.preferenze
    setGiorni(Math.min(6, Math.max(1, pr.giorni)))
    setSala(pr.sala_volte)
    setLezioni(pr.lezioni_volte)
    // I percorsi di prima del nuoto non hanno questi campi: restano a «niente vasca».
    setNuoto(Math.min(NUOTO_MAX, pr.nuoto_volte ?? 0))
    setStiliNuoto(pr.nuoto_stili ?? [])
    setContinuo(pr.nuoto_continuo ?? null)
    if ([30, 45, 60, 75, 90].includes(pr.minuti_sala)) setMinutiSala(pr.minuti_sala)
    setGruppi(pr.gruppi)
    setPreferite(pr.preferite)
    setEvitate(pr.evitate)
    setFasce(pr.fasce)
    setGiorniLiberi(pr.giorni_liberi)
    setCardio(pr.cardio)
    setNonComprese(pr.includi_non_comprese)
  }, [salvato])

  // Le lezioni fra cui scegliere quelle amate o da evitare: i nomi del palinsesto vero, una volta sola.
  useEffect(() => {
    if (!lezioniAperte || vista) return
    let vivo = true
    prendi(`${CHIAVE_CATALOGO_PERCORSO}:${nonComprese}`, () => leggiCatalogo(nonComprese)).then((r) => vivo && r.ok && setCatalogo(r.catalogo))
    return () => {
      vivo = false
    }
  }, [lezioniAperte, nonComprese, vista])
  const nomiLezioni = useMemo(() => [...new Set((catalogo?.slot ?? []).map((s) => s.nome))].sort((a, b) => a.localeCompare(b, locale())), [catalogo])

  useEffect(() => {
    if (!inCorso) return
    setFrase(0)
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 12000)
    return () => clearInterval(t)
  }, [inCorso])

  // I tetti seguono i giorni: scegliendo meno giorni le volte si abbassano da sole.
  function scegliGiorni(n: number) {
    setGiorni(n)
    setSala((s) => Math.min(s, n))
    setLezioni((l) => Math.min(l, quanteLezioni(n)))
    setNuoto((v) => Math.min(v, quanteInVasca(n)))
  }

  const pianiPerLaSala = (stato?.piani.suoi ?? 0) + (stato?.piani.del_club ?? 0)
  const maggiorenne = stato?.maggiorenne !== false
  const quotaFinita = !!stato && stato.quota.usate >= stato.quota.massimo
  const giorniLiberiOk = giorniLiberi.length === 0 || giorniLiberi.length >= giorni
  // Con la vasca servono gli stili e i metri di fila, e il Nuoto Libero chiede stile libero e dorso (la stessa regola della funzione).
  const nuotoOk = nuoto === 0 || (saNuotareAbbastanza(stiliNuoto) && !!continuo)
  const pronto = !!obiettivo && !!livello && sala + lezioni + nuoto >= 1 && giorniLiberiOk && (sala === 0 || pianiPerLaSala > 0) && nuotoOk

  const nonComprese_noto = stato?.idoneita.categorie != null
  // Il Nuoto Libero non e' nell'abbonamento e le lezioni non comprese sono escluse: la funzione non troverebbe turni. Lo si dice prima.
  const nuotoNonCompreso = nuoto > 0 && stato?.idoneita.categorie != null && !stato.idoneita.categorie.includes('Nuoto Libero') && !nonComprese

  async function invia() {
    if (!pronto || !obiettivo || !livello) return
    setErrore(null)
    setInCorso(true)
    const q: DatiQuestionario = {
      obiettivo,
      livello,
      giorni,
      sala_volte: sala,
      lezioni_volte: lezioni,
      minuti_sala: minutiSala,
      gruppi,
      preferite,
      evitate,
      fasce,
      giorni_liberi: giorniLiberi,
      cardio,
      includi_non_comprese: nonComprese,
      nuoto_volte: nuoto,
      // Gli stili e i metri di fila servono solo a chi nuota: gli altri non mandano niente.
      nuoto_stili: nuoto > 0 ? stiliNuoto : [],
      nuoto_continuo: nuoto > 0 ? continuo : null,
      limitazioni: limitazioni.trim(),
      note: note.trim(),
    }
    const r = await chiediAlTutor(q)
    if (!qui.current) return
    setInCorso(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    scartaBozzaPercorso()
    mettiBozzaPercorso({ bozza: r.bozza, schede: r.schede, avvisi: r.avvisi, modo: 'tutor' })
    router.replace({ pathname: '/allenamento/percorso-modifica', params: { da: 'bozza' } })
  }

  if (inCorso) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo={tr('Il tuo percorso', 'Your program')} indietro="/allenamento/percorso" barra={false}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.attesa}>
          <Icona nome="stella" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>{tr('Ci vuole una decina di secondi, a volte un paio di minuti: resta su questa pagina.', 'It takes about ten seconds, sometimes a couple of minutes: stay on this page.')}</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  if (vista) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo={tr('Un percorso su misura', 'A tailor-made program')} indietro="/allenamento/percorso" barra={false}>
        <Messaggio tono="attenzione">{tr('In vista cliente il Percorso si guarda e basta: il questionario lo compila solo il socio.', 'In member view the program is view-only: only the member fills in the questionnaire.')}</Messaggio>
      </Schermata>
    )
  }

  if (erroreStato?.nonAttivo) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo={tr('Un percorso su misura', 'A tailor-made program')} indietro="/allenamento/percorso" barra={false}>
        <Messaggio tono="attenzione" titolo={tr('Non è ancora attivo', 'Not active yet')}>
          {erroreStato.messaggio}
        </Messaggio>
      </Schermata>
    )
  }

  if (!maggiorenne) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo={tr('Un percorso su misura', 'A tailor-made program')} indietro="/allenamento/percorso" barra={false}>
        <Messaggio tono="attenzione">{tr('Il Percorso è riservato ai maggiorenni.', 'The program is for adults only.')}</Messaggio>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo="Percorso Athlon"
      titolo={tr('Un percorso su misura', 'A tailor-made program')}
      indietro="/allenamento/percorso"
      barra={false}
      sottotitolo={tr(
        'Il tutor tecnico mette insieme la tua settimana: sala, cardio, lezioni e acqua, scegliendo nel palinsesto vero. Poi la guardi, la cambi e la confermi.',
        'The technical coach puts your week together: gym floor, cardio, classes and water, chosen from the real timetable. Then you look at it, change it and confirm it.',
      )}
    >
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>{tr('Non è un piano di allenamento', 'It’s not a workout plan')}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {tr(
            'Il piano sono gli esercizi di un allenamento in sala, o le sedute da fare in vasca. Il percorso è l’intera settimana: usa i tuoi piani come tappe di sala e di vasca e li affianca a lezioni, acqua e cardio.',
            'The plan is the exercises of a gym floor workout, or the sessions to do in the pool. The program is the whole week: it uses your plans as gym floor and pool steps and pairs them with classes, water and cardio.',
          )}
          {pianiPerLaSala === 0 ? tr(' Per la sala ti serve almeno un piano: puoi crearlo dalla pagina Train.', ' For the gym floor you need at least one plan: you can create it from the Train page.') : ''}
        </Text>
      </Carta>

      <Sezione titolo={tr('Il tuo obiettivo', 'Your goal')}>
        <Scelte valori={OBIETTIVI.map((o) => ({ valore: o, testo: nomeObiettivo(o) }))} scelto={obiettivo} onScegli={setObiettivo} />
      </Sezione>

      <Sezione titolo={tr('Il tuo livello', 'Your level')}>
        <View style={{ gap: spazio.due }}>
          {LIVELLI_TESTO.map((l) => {
            const attivo = l.valore === livello
            return (
              <Tocco
                key={l.valore}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => setLivello(l.valore)}
                etichetta={l.testo}
                style={[stili.livello, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
              >
                <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: F.extra, fontSize: 15.5 }}>{l.testo}</Text>
                <Text style={{ color: attivo ? 'rgba(255,255,255,0.85)' : p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>{l.nota}</Text>
              </Tocco>
            )
          })}
        </View>
      </Sezione>

      <Sezione titolo={tr('Quanti giorni a settimana', 'How many days a week')}>
        <Scelte valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: String(n) }))} scelto={giorni} onScegli={scegliGiorni} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Almeno un giorno resta di riposo.', 'At least one day stays a rest day.')}</Text>
      </Sezione>

      <Sezione titolo={tr('Quante volte in sala', 'How many times on the gym floor')}>
        <Scelte valori={Array.from({ length: giorni + 1 }, (_, n) => ({ valore: n, testo: String(n) }))} scelto={sala} onScegli={setSala} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Usiamo i tuoi piani di allenamento, e quelli del club se non ne hai.', 'We use your workout plans, and the club’s if you don’t have any.')}</Text>
      </Sezione>

      {sala > 0 ? (
        <Sezione titolo={tr('Quanto dura una seduta in sala', 'How long a gym floor session lasts')}>
          <Scelte valori={MINUTI_SALA.map((n) => ({ valore: n, testo: `${n} min` }))} scelto={minutiSala} onScegli={setMinutiSala} />
        </Sezione>
      ) : null}

      <Sezione titolo={tr('Quante lezioni di gruppo', 'How many group classes')}>
        <Scelte valori={Array.from({ length: quanteLezioni(giorni) + 1 }, (_, n) => ({ valore: n, testo: String(n) }))} scelto={lezioni} onScegli={setLezioni} />
      </Sezione>

      {lezioni > 0 ? (
        <>
          <Sezione titolo={tr('Che lezioni ti piacciono', 'What classes you like')}>
            <SceltePiu valori={GRUPPI.map((g) => ({ valore: g, testo: NOME_GRUPPO[g].titolo }))} scelti={gruppi} onCambia={setGruppi} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {gruppi.length ? gruppi.map((g) => NOME_GRUPPO[g].nota).join(' · ') : tr('Se non scegli niente, il tutor guarda tutto il palinsesto.', 'If you don’t choose anything, the coach looks at the whole timetable.')}
            </Text>
          </Sezione>

          <Sezione titolo={tr('Lezioni che ami o che eviti', 'Classes you love or avoid')} destra={<Text style={[stili.facoltativo, { color: p.testoTerzo }]}>{tr('FACOLTATIVO', 'OPTIONAL')}</Text>}>
            {lezioniAperte ? (
              !catalogo ? (
                <Carta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
                  <ActivityIndicator color={p.accento} />
                  <Text style={[stili.nota, { color: p.testo }]}>{tr('Leggo il palinsesto…', 'Reading the timetable…')}</Text>
                </Carta>
              ) : (
                <View style={{ gap: spazio.tre }}>
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.sottoTitolo, { color: p.testo }]}>{tr('Quelle che ami', 'The ones you love')}</Text>
                    <SceltePiu
                      valori={nomiLezioni.map((n) => ({ valore: n, testo: n }))}
                      scelti={preferite}
                      onCambia={(v) => {
                        setPreferite(v)
                        setEvitate((e) => e.filter((x) => !v.includes(x)))
                      }}
                    />
                  </View>
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.sottoTitolo, { color: p.testo }]}>{tr('Quelle che vuoi evitare', 'The ones you want to avoid')}</Text>
                    <SceltePiu
                      valori={nomiLezioni.map((n) => ({ valore: n, testo: n }))}
                      scelti={evitate}
                      onCambia={(v) => {
                        setEvitate(v)
                        setPreferite((e) => e.filter((x) => !v.includes(x)))
                      }}
                    />
                  </View>
                </View>
              )
            ) : (
              <Pulsante
                testo={preferite.length + evitate.length ? tr(`Scelte: ${preferite.length} amate, ${evitate.length} da evitare`, `Chosen: ${preferite.length} loved, ${evitate.length} to avoid`) : tr('Scegli le lezioni', 'Choose classes')}
                variante="secondario"
                icona="avanti"
                onPress={() => setLezioniAperte(true)}
              />
            )}
          </Sezione>
        </>
      ) : null}

      <Sezione titolo={tr('Quante volte in vasca', 'How many times in the pool')}>
        <Scelte valori={Array.from({ length: quanteInVasca(giorni) + 1 }, (_, n) => ({ valore: n, testo: String(n) }))} scelto={nuoto} onScegli={setNuoto} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {nuoto > 0
            ? tr('Turni di Nuoto Libero, in più delle lezioni di gruppo. Il tutor scrive anche un piano di nuoto: ogni turno apre il suo giorno, cosa fai in vasca oggi.', 'Nuoto Libero slots, on top of group classes. The coach also writes a swim plan: each slot opens its own day, what you do in the pool today.')
            : tr('Se ti va di nuotare, scegli quante volte: il tutor mette i turni nella settimana e ti scrive un piano di nuoto.', 'If you’d like to swim, choose how many times: the coach adds the slots to your week and writes you a swim plan.')}
        </Text>
      </Sezione>

      {nuoto > 0 ? (
        <>
          <CampiNuoto stili={stiliNuoto} onStili={setStiliNuoto} continuo={continuo} onContinuo={setContinuo} />
          {nuotoNonCompreso ? (
            <Messaggio tono="attenzione">
              {tr(
                'Il Nuoto Libero non risulta nel tuo abbonamento. Per metterlo nel percorso scegli «Includi anche le altre» più sotto: i turni compaiono segnati «da acquistare».',
                'Nuoto Libero isn’t in your membership. To add it to the program choose “Include the others too” below: the slots will be marked “to purchase”.',
              )}
            </Messaggio>
          ) : null}
        </>
      ) : null}

      <Sezione titolo={tr('Quando preferisci venire', 'When you prefer to come')} destra={<Text style={[stili.facoltativo, { color: p.testoTerzo }]}>{tr('FACOLTATIVO', 'OPTIONAL')}</Text>}>
        <SceltePiu valori={FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo }))} scelti={fasce} onCambia={setFasce} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {fasce.length ? fasce.map((f) => `${NOME_FASCIA[f].titolo}: ${NOME_FASCIA[f].nota}`).join(' · ') : tr('Se indichi un orario, il tutor sceglie nel palinsesto le lezioni che ci stanno.', 'If you give a time, the coach picks the classes that fit from the timetable.')}
        </Text>
      </Sezione>

      <Sezione titolo={tr('In quali giorni puoi venire', 'Which days you can come')} destra={<Text style={[stili.facoltativo, { color: p.testoTerzo }]}>{tr('FACOLTATIVO', 'OPTIONAL')}</Text>}>
        <SceltePiu valori={GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] }))} scelti={giorniLiberi} onCambia={(v) => setGiorniLiberi([...v].sort((a, b) => a - b))} />
        {!giorniLiberiOk ? (
          <Messaggio tono="attenzione">{tr(`Hai scelto ${giorni} giorni di allenamento: indica almeno ${giorni} giorni in cui puoi venire, o nessuno.`, `You chose ${giorni} training ${giorni === 1 ? 'day' : 'days'}: pick at least ${giorni} ${giorni === 1 ? 'day' : 'days'} you can come, or none.`)}</Messaggio>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Senza scelta, tutti i giorni vanno bene.', 'With no choice, any day works.')}</Text>
        )}
      </Sezione>

      <Sezione titolo={tr('Un po’ di cardio prima?', 'A bit of cardio first?')}>
        <Scelte
          valori={[
            { valore: 'no', testo: tr('No, grazie', 'No, thanks') },
            { valore: 'si', testo: tr('Sì, prima di sala o lezione', 'Yes, before the gym floor or a class') },
          ]}
          scelto={cardio ? 'si' : 'no'}
          onScegli={(v) => setCardio(v === 'si')}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr('Per esempio mezz’ora di tapis roulant prima di una lezione di Reformer.', 'For example half an hour on the treadmill before a Reformer class.')}</Text>
      </Sezione>

      {nonComprese_noto ? (
        <Sezione titolo={tr('Lezioni non comprese', 'Classes not included')}>
          <Scelte
            valori={[
              { valore: 'no', testo: tr('Solo quelle comprese', 'Only those included') },
              { valore: 'si', testo: tr('Includi anche le altre', 'Include the others too') },
            ]}
            scelto={nonComprese ? 'si' : 'no'}
            onScegli={(v) => setNonComprese(v === 'si')}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {tr(
              'Quelle fuori dal tuo abbonamento compaiono segnate «da acquistare» e si prenotano come lezione singola, a pagamento. Di base le lasciamo fuori.',
              'Those outside your membership are marked “to purchase” and are booked as a paid single class. By default we leave them out.',
            )}
          </Text>
        </Sezione>
      ) : null}

      <Sezione titolo={tr('Limitazioni o infortuni', 'Limitations or injuries')}>
        <Carta style={{ gap: spazio.due }}>
          <TextInput
            value={limitazioni}
            onChangeText={(t) => setLimitazioni(t.slice(0, 500))}
            placeholder={tr('Per esempio: mal di schiena, una spalla da proteggere, il ginocchio operato. Lascia vuoto se non ne hai.', 'For example: back pain, a shoulder to protect, a knee that had surgery. Leave empty if you have none.')}
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
          />
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 500))}
            placeholder={tr('Altro da sapere (facoltativo): una lezione che ti piace, una che eviti, uno sport che pratichi.', 'Anything else to know (optional): a class you like, one you avoid, a sport you play.')}
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
          />
        </Carta>
      </Sezione>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {quotaFinita ? (
        <Messaggio tono="attenzione">{tr(`Hai già chiesto ${stato!.quota.massimo} percorsi al tutor negli ultimi trenta giorni: puoi ancora modificare a mano quello che hai.`, `You’ve already asked the coach for ${stato!.quota.massimo} programs in the last thirty days: you can still edit the one you have by hand.`)}</Messaggio>
      ) : null}
      {!pronto && (!obiettivo || !livello) ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{tr('Scegli obiettivo e livello per continuare.', 'Choose a goal and a level to continue.')}</Text> : null}
      {!pronto && !!obiettivo && !!livello && nuoto > 0 && !nuotoOk ? (
        <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
          {!stiliNuoto.length || !continuo ? tr('Per il nuoto scegli gli stili che sai e quanto nuoti di fila.', 'For swimming, choose the strokes you know and how far you swim without stopping.') : tr('Per mandare la richiesta serve il Nuoto Libero: stile libero e dorso.', 'To send the request you need Nuoto Libero: freestyle and backstroke.')}
        </Text>
      ) : null}
      <Pulsante testo={tr('Componi il mio percorso', 'Build my program')} icona="stella" onPress={invia} disabilitato={!pronto || quotaFinita} />
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        {tr(
          'Il percorso lo compone un’intelligenza artificiale e lo confermi tu: il questionario non viene conservato, resta solo il percorso che confermi, e i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.',
          'An artificial intelligence builds the program and you confirm it: the questionnaire isn’t kept, only the program you confirm remains, and the club’s trainers can see it from their dashboard. It doesn’t replace a doctor’s advice: if you have pain, injuries or medical conditions, talk to an instructor on the gym floor first.',
        )}
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  sottoTitolo: { fontFamily: F.bold, fontSize: 15 },
  facoltativo: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1.2 },
  livello: { borderRadius: 20, padding: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  testo: { minHeight: 70, borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5, textAlignVertical: 'top' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
