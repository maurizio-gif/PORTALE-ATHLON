import { LinearGradient } from 'expo-linear-gradient'
import { router, useIsFocused } from 'expo-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { chiediSchedaAi } from '@/api/lab'
import { t, tv } from '@/lib/lingua'
import { spazio, tinta } from '@/theme'

import { mettiBozza, scartaBozza } from './bozza'
import { useSegnaAzioneInAlto } from '../feedback/posizione'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { AnelloPassi } from './AnelloPassi'
import { Griglia, OpzioneCarta } from './PassiUI'
import {
  accendi, CARDIO, DURATE_SALA, ESPERIENZE, eSalute, EVITA, FASCE, FOCUS, FOCUS_MAX, giorniConsigliati, giorniScelti, GIORNATE, INTENSITA, LIVELLI_PASSI, livelloDa, livelloScelto, nomeObiettivo, NESSUNO, OBIETTIVI, OBIETTIVO_SALUTE,
  PASSI_SALA, passoCompleto, questionarioSalaDa, riepilogoDa, STRUMENTI, TEST, ZONE, type NomeTest, type PassoSala, type Risposte,
} from './questionario'
import { dimenticaRisposte, leggiRisposte, ricordaRisposte } from './rispostePiano'
import { SaluteBlocco } from './SaluteBlocco'

// «Componi il tuo piano» in sala, a passi (22/10/2026, richiesta di Maurizio): una domanda per schermata, con l'anello in alto a destra che
// si chiude e «Continua» in basso. Le sette domande di prima non bastavano a un piano personale: ora l'agente sa su cosa ti vuoi
// concentrare, come ti muovi (tre test), con cosa ti trovi bene, dove senti fastidio, cosa non vuoi fare, quanto cardio, quanto
// impegno, e quando ti alleni. Le regole (livello dai test, giorni consigliati, cosa serve per andare avanti) sono in `questionario.ts`.
//
// **Il piano non si scrive da solo**: alla fine c'e' un riepilogo («Ecco cosa abbiamo capito») che si puo' correggere riga per riga, e solo
// «Componi il mio piano» fa partire la richiesta; torna una bozza, che l'editor fa rivedere e confermare come prima. **Le risposte non
// restano**: solo in memoria (`rispostePiano.ts`), perche' i fastidi sono dati sulla salute, e uscendo dall'app si buttano.
// **Salute** (20/10/2026) resta com'era: non e' un obiettivo per l'agente, porta al personal trainer. La vasca ha il suo, di sei domande sul nuoto (`PassiVasca.tsx`).

const ATTESA = tv(
  [
    'Stiamo leggendo le tue risposte…',
    'Scegliamo gli esercizi dalla libreria del club…',
    'Decidiamo serie, ripetizioni e recuperi…',
    'Dividiamo il lavoro fra i giorni…',
    'Ancora qualche secondo…',
  ],
  [
    'Reading your answers…',
    'Choosing exercises from the club’s library…',
    'Setting sets, reps and rest…',
    'Splitting the work across the days…',
    'Just a few more seconds…',
  ],
)

const DOVE = [
  { valore: 'sala', testo: t('In sala', 'In the gym') },
  { valore: 'vasca', testo: t('In vasca · Nuoto Libero', 'In the pool · Nuoto Libero') },
] as const

type Passo = PassoSala | 'dove'

export function PassiSala({ dove, onDove, saltaDove, onVasca }: { dove: 'sala' | 'vasca' | null; onDove: (v: 'sala' | 'vasca') => void; saltaDove: boolean; onVasca: () => void }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const ordine: Passo[] = saltaDove ? [...PASSI_SALA] : ['dove', ...PASSI_SALA]

  // Si riparte da dove si era arrivati (solo in memoria): un gesto indietro per sbaglio non fa perdere venti risposte.
  const ricordate = useRef(leggiRisposte()).current
  const [r, setR] = useState<Risposte>(ricordate.risposte)
  const [passo, setPasso] = useState<Passo>(() => (ricordate.passo && ordine.includes(ricordate.passo) ? ricordate.passo : ordine[0]))
  // Si e' saltati qui dal riepilogo per cambiare una riga: finito il passo si torna al riepilogo, non si rifanno quelli in mezzo.
  const [daRiepilogo, setDaRiepilogo] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)
  const scorri = useRef<ScrollView>(null)
  // L'anello sta in alto a destra, dove di solito sta il pulsante «Feedback»: gli si dice di farsi da parte (resta la sola icona, accanto).
  // Durante l'attesa l'anello non c'e': il pulsante torna al suo posto.
  useSegnaAzioneInAlto(!inCorso, useIsFocused())

  useEffect(() => {
    ricordaRisposte(r, passo)
  }, [r, passo])
  useEffect(() => {
    scorri.current?.scrollTo({ y: 0, animated: false })
  }, [passo])
  useEffect(() => {
    if (!inCorso) return
    setFrase(0)
    // La composizione dura una decina di secondi (a volte una ventina): una frase ogni cinque, l'ultima resta.
    const timer = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 5000)
    return () => clearInterval(timer)
  }, [inCorso])

  /** Cambiare le risposte da cui si ricava il livello fa decadere un livello scelto a mano: non e' piu' quello di cui si parlava. */
  function imposta(x: Partial<Risposte>) {
    setR((prima) => {
      const nuovo = { ...prima, ...x }
      if ('esperienza' in x || 'squat' in x || 'flessioni' in x || 'plank' in x) nuovo.livello = null
      return nuovo
    })
  }

  const i = Math.max(0, ordine.indexOf(passo))
  const completo = passo === 'dove' ? !!dove : passoCompleto(passo, r)
  const salute = eSalute(r.obiettivo)

  function vai(a: Passo) {
    setErrore(null)
    setPasso(a)
  }
  function avanti() {
    if (!completo) return
    if (passo === 'dove' && dove === 'vasca') return onVasca()
    if (daRiepilogo) {
      setDaRiepilogo(false)
      return vai('riepilogo')
    }
    if (i < ordine.length - 1) vai(ordine[i + 1])
  }
  function indietro() {
    if (daRiepilogo) {
      setDaRiepilogo(false)
      return vai('riepilogo')
    }
    if (i > 0) return vai(ordine[i - 1])
    if (router.canGoBack()) router.back()
    else router.replace('/allenamento')
  }
  function cambia(a: PassoSala) {
    setDaRiepilogo(true)
    vai(a)
  }

  async function invia() {
    // Salute non parte mai (la funzione la rifiuterebbe), e senza le risposte obbligatorie non c'e' un riepilogo da confermare.
    if (!r.obiettivo || salute || !r.minuti || !r.esperienza) return
    setErrore(null)
    setInCorso(true)
    const risposta = await chiediSchedaAi(questionarioSalaDa(r))
    setInCorso(false)
    if (!risposta.ok) {
      colpetto('errore')
      return setErrore(risposta.errore)
    }
    colpetto('ok')
    scartaBozza()
    mettiBozza(risposta.bozza)
    // Il piano e' composto: le risposte (con i fastidi) non servono piu'.
    dimenticaRisposte()
    router.replace({ pathname: '/allenamento/nuova', params: { da: 'bozza' } })
  }

  if (inCorso) {
    return (
      <Schermata sopratitolo={t('Piani di allenamento', 'Workout plans')} titolo={t('Il tuo piano', 'Your plan')} indietro="/allenamento" barra={false}>
        <LinearGradient colors={FUOCO} style={stili.attesa}>
          <Icona nome="peso" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>{t('Ci vuole in genere meno di un minuto: resta su questa pagina.', 'It usually takes less than a minute: stay on this page.')}</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  // ---- il contenuto di ogni passo ---------------------------------------------------------------------------------------
  const stimato = livelloDa(r)
  const consigliati = giorniConsigliati({ ...r, livello: livelloScelto(r) })
  const zone = r.zone.filter((z) => z !== NESSUNO)

  const una = <T extends string>(opzioni: readonly { valore: T; testo: string; nota?: string }[], scelto: T | null, onScegli: (v: T) => void, etichette?: Partial<Record<T, string>>) => (
    <View style={stili.lista}>
      {opzioni.map((o) => (
        <OpzioneCarta key={o.valore} testo={o.testo} nota={o.nota} etichetta={etichette?.[o.valore]} attivo={scelto === o.valore} onPress={() => onScegli(o.valore)} />
      ))}
    </View>
  )
  const piu = <T extends string>(opzioni: readonly { valore: T; testo: string; nota?: string }[], scelti: readonly (T | typeof NESSUNO)[], onCambia: (v: (T | typeof NESSUNO)[]) => void, max = Infinity, nessuno?: string) => (
    <View style={stili.lista}>
      {opzioni.map((o) => (
        <OpzioneCarta key={o.valore} multipla testo={o.testo} nota={o.nota} attivo={scelti.includes(o.valore)} onPress={() => onCambia(accendi(scelti, o.valore, max))} />
      ))}
      {nessuno ? <OpzioneCarta multipla testo={nessuno} attivo={scelti.includes(NESSUNO)} onPress={() => onCambia(accendi(scelti, NESSUNO))} /> : null}
    </View>
  )
  const test = (nome: NomeTest) => (
    <Griglia>
      {TEST[nome].opzioni.map((o) => (
        <OpzioneCarta key={o.valore} compatta testo={o.testo} attivo={r[nome] === o.valore} onPress={() => imposta({ [nome]: o.valore } as Partial<Risposte>)} />
      ))}
    </Griglia>
  )
  const campoTesto = (valore: string, onChange: (x: string) => void, segnaposto: string) => (
    <TextInput
      value={valore}
      onChangeText={(x) => onChange(x.slice(0, 500))}
      placeholder={segnaposto}
      placeholderTextColor={p.testoTerzo}
      multiline
      style={[stili.testo, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
    />
  )

  let titolo = ''
  let nota: string | null = null
  let corpo: ReactNode = null
  switch (passo) {
    case 'dove':
      titolo = t('Dove ti alleni?', 'Where do you train?')
      nota = t('Scegli dove vuoi allenarti con il tuo piano.', 'Choose where you want to train with your plan.')
      corpo = una(DOVE, dove, onDove)
      break
    case 'obiettivo':
      titolo = t('Qual è il tuo obiettivo?', 'What’s your goal?')
      corpo = (
        <>
          {una([...OBIETTIVI, OBIETTIVO_SALUTE].map((o) => ({ valore: o as string, testo: nomeObiettivo(o) })), r.obiettivo, (o) => imposta({ obiettivo: o, condizione: eSalute(o) ? r.condizione : null }))}
          {salute ? <SaluteBlocco condizione={r.condizione} onCondizione={(c) => imposta({ condizione: c })} /> : null}
        </>
      )
      break
    case 'focus':
      titolo = t('Su cosa ti vuoi concentrare?', 'What do you want to focus on?')
      nota = t(`Scegli fino a ${FOCUS_MAX} zone. Puoi anche non sceglierne.`, `Pick up to ${FOCUS_MAX} areas. You can also skip it.`)
      corpo = piu(FOCUS, r.focus, (v) => imposta({ focus: v.filter((x) => x !== NESSUNO) as Risposte['focus'] }), FOCUS_MAX)
      break
    case 'esperienza':
      titolo = t('Hai già esperienza di allenamento?', 'Do you have training experience?')
      corpo = una(ESPERIENZE, r.esperienza, (v) => imposta({ esperienza: v }))
      break
    case 'strumenti':
      titolo = t('Con cosa ti trovi bene in sala?', 'What are you comfortable using in the gym?')
      nota = t('Seleziona tutto quello che sai usare.', 'Select everything you know how to use.')
      corpo = (
        <>
          {piu(STRUMENTI, r.strumenti, (v) => imposta({ strumenti: v.filter((x) => x !== NESSUNO) as Risposte['strumenti'] }))}
          {r.strumenti.length > 0 && r.strumenti.length < STRUMENTI.length - 1 ? (
            <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('Per la forza il piano sceglie fra questi attrezzi; cardio, stretching e mobilità ci sono sempre.', 'For strength work the plan picks from this equipment; cardio, stretching and mobility are always there.')}</Text>
          ) : null}
        </>
      )
      break
    case 'squat':
    case 'flessioni':
    case 'plank':
      titolo = TEST[passo].titolo
      nota = TEST[passo].nota
      corpo = test(passo)
      break
    case 'livello':
      titolo = t('Il tuo livello', 'Your level')
      nota = t('In base alle tue risposte ti consideriamo così. Se non ti ci riconosci, cambialo.', 'Based on your answers, this is where we place you. If it doesn’t feel right, change it.')
      corpo = una(LIVELLI_PASSI, livelloScelto(r), (v) => imposta({ livello: v }), { [stimato]: t('Stimato dalle tue risposte', 'Estimated from your answers') })
      break
    case 'fastidi':
      titolo = t('Hai fastidi o dolori?', 'Do you have any aches or pains?')
      nota = t('Seleziona le zone che ti danno fastidio quando ti alleni.', 'Select the areas that bother you when you train.')
      corpo = (
        <>
          {piu(ZONE, r.zone, (v) => imposta({ zone: v }), Infinity, t('Nessun fastidio', 'No aches'))}
          {zone.length ? (
            <View style={{ gap: spazio.due }}>
              {campoTesto(r.limitazioni, (x) => imposta({ limitazioni: x }), t('Vuoi aggiungere qualcosa? Per esempio: il ginocchio operato, una spalla da proteggere. (facoltativo)', 'Want to add anything? For example: a knee that’s had surgery, a shoulder to protect. (optional)'))}
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                {t('Per un recupero o una patologia scegli «Salute» come obiettivo: ti segue un personal trainer.', 'For recovery or a medical condition, choose “Health” as your goal: a personal trainer will work with you.')}
              </Text>
            </View>
          ) : null}
        </>
      )
      break
    case 'giornata':
      titolo = t('Com’è la tua giornata?', 'What’s your day like?')
      nota = t('Pensa a come passi la maggior parte del tempo.', 'Think about how you spend most of your time.')
      corpo = una(GIORNATE, r.giornata, (v) => imposta({ giornata: v }))
      break
    case 'evita':
      titolo = t('C’è qualcosa che preferisci evitare?', 'Is there anything you’d rather avoid?')
      nota = t('Non finirà nel tuo piano.', 'It won’t end up in your plan.')
      corpo = piu(EVITA, r.evita, (v) => imposta({ evita: v }), Infinity, t('Niente da evitare', 'Nothing to avoid'))
      break
    case 'cardio':
      titolo = t('Ti va di fare un po’ di cardio?', 'Do you want some cardio?')
      corpo = una(CARDIO, r.cardio, (v) => imposta({ cardio: v }))
      break
    case 'intensita':
      titolo = t('Quanto vuoi che sia impegnativo?', 'How demanding should it be?')
      corpo = una(INTENSITA, r.intensita, (v) => imposta({ intensita: v }))
      break
    case 'durata':
      titolo = t('Quanto dura una seduta?', 'How long is a session?')
      nota = t('Il piano sta nel tempo che scegli, recuperi compresi.', 'The plan fits the time you choose, rest included.')
      corpo = una(DURATE_SALA.map((n) => ({ valore: String(n), testo: t(`${n} minuti`, `${n} minutes`) })), r.minuti ? String(r.minuti) : null, (v) => imposta({ minuti: Number(v) }))
      break
    case 'giorni':
      titolo = t('Quanti giorni a settimana?', 'How many days a week?')
      nota = t(`In base alle tue risposte ti consigliamo ${consigliati} allenamenti a settimana. Scegli tu.`, `Based on your answers we suggest ${consigliati} workouts a week. It’s up to you.`)
      corpo = (
        <Griglia>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <OpzioneCarta key={n} compatta testo={String(n)} etichetta={n === consigliati ? t('Consigliato', 'Suggested') : undefined} attivo={giorniScelti(r) === n} onPress={() => imposta({ giorni: n })} />
          ))}
        </Griglia>
      )
      break
    case 'fascia':
      titolo = t('Quando ti alleni di solito?', 'When do you usually train?')
      nota = t('Ci aiuta a tenere conto di quando la sala è più piena.', 'It helps us account for when the gym is busiest.')
      corpo = una(FASCE, r.fascia, (v) => imposta({ fascia: v }))
      break
    case 'note':
      titolo = t('Qualcosa che vuoi dirci?', 'Anything you’d like to tell us?')
      nota = t('Facoltativo: un esercizio che ti piace, uno sport che pratichi.', 'Optional: an exercise you like, a sport you play.')
      corpo = campoTesto(r.note, (x) => imposta({ note: x }), t('Per esempio: adoro il rematore, gioco a calcetto il giovedì.', 'For example: I love rows, I play five-a-side on Thursdays.'))
      break
    case 'riepilogo':
      titolo = t('Ecco cosa abbiamo capito', 'Here’s what we understood')
      nota = t('Controlla: tocca una riga per cambiarla.', 'Check it: tap a row to change it.')
      corpo = (
        <>
          <Carta style={{ padding: 0, overflow: 'hidden' }}>
            {riepilogoDa(r).map((riga, k) => (
              <Tocco
                key={riga.passo}
                vibra="leggero"
                onPress={() => cambia(riga.passo)}
                etichetta={`${riga.titolo}: ${riga.valore}. ${t('Cambia', 'Change')}`}
                style={[stili.rigaRiepilogo, k > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}
              >
                <Text style={[stili.rigaTitolo, { color: p.testoSecondario }]}>{riga.titolo}</Text>
                <Text style={[stili.rigaValore, { color: p.testo }]} numberOfLines={3}>
                  {riga.valore}
                </Text>
                <Icona nome="avanti" size={14} colore={p.testoTerzo} />
              </Tocco>
            ))}
          </Carta>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          {/* La postilla: che dietro ci sia un'intelligenza artificiale si dice qui, in piccolo, e di nuovo sul piano composto. */}
          <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>
            {t(
              'Il piano è preparato con il supporto di un’intelligenza artificiale e lo confermi tu: i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.',
              'The plan is prepared with the help of artificial intelligence and you confirm it: the club’s trainers can see it from their panel. It doesn’t replace a doctor’s advice: if you have pain, injuries or medical conditions, talk to an instructor on the gym floor first.',
            )}
          </Text>
        </>
      )
      break
  }

  const colonna = Math.min(640, width)
  const nascondiPulsante = passo === 'obiettivo' && salute
  const ultimo = passo === 'riepilogo'
  return (
    <View style={[stili.fondo, { backgroundColor: p.fondo }]}>
      <ScrollView ref={scorri} keyboardShouldPersistTaps="handled" contentContainerStyle={{ alignItems: 'center', paddingTop: ins.top + spazio.tre, paddingBottom: 130 + ins.bottom }}>
        <View style={{ width: colonna, paddingHorizontal: spazio.tre + 2, gap: spazio.tre + 2 }}>
          <View style={stili.testata}>
            <Tocco onPress={indietro} etichetta={t('Indietro', 'Back')} style={[stili.tondo, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
              <Icona nome="indietro" size={18} colore={p.testo} />
            </Tocco>
            <AnelloPassi fatti={i + 1} totali={ordine.length} />
          </View>
          <Entra key={passo} style={{ gap: spazio.tre + 2 }}>
            <View style={{ gap: spazio.due }}>
              <Text accessibilityRole="header" style={[stili.titolo, { color: p.testo }]}>
                {titolo}
              </Text>
              {nota ? <Text style={[stili.sottotitolo, { color: p.testoSecondario }]}>{nota}</Text> : null}
            </View>
            {corpo}
          </Entra>
        </View>
      </ScrollView>
      {nascondiPulsante ? null : (
        <View pointerEvents="box-none" style={[stili.piede, { paddingBottom: ins.bottom + spazio.tre }]}>
          <LinearGradient pointerEvents="none" colors={[tinta(p.fondo, 0), tinta(p.fondo, 0.96)]} style={StyleSheet.absoluteFill} />
          <View style={{ width: colonna, paddingHorizontal: spazio.tre + 2 }}>
            <Pulsante
              testo={ultimo ? t('Componi il mio piano', 'Build my plan') : t('Continua', 'Continue')}
              icona={ultimo ? 'peso' : undefined}
              onPress={ultimo ? invia : avanti}
              disabilitato={!completo}
            />
          </View>
        </View>
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  fondo: { flex: 1 },
  testata: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46 },
  tondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  titolo: { fontFamily: F.extra, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  sottotitolo: { fontFamily: F.medio, fontSize: 16, lineHeight: 22 },
  lista: { gap: spazio.due + 2 },
  piccola: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  testo: { minHeight: 90, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: spazio.tre, fontFamily: F.medio, fontSize: 15, textAlignVertical: 'top' },
  piede: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: spazio.quattro },
  rigaRiepilogo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre, paddingHorizontal: spazio.tre + 2 },
  rigaTitolo: { fontFamily: F.semi, fontSize: 13.5, width: 120 },
  rigaValore: { flex: 1, fontFamily: F.extra, fontSize: 15, textAlign: 'right' },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
