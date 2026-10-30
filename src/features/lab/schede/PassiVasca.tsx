import { LinearGradient } from 'expo-linear-gradient'
import { router, useIsFocused } from 'expo-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { chiediPianoNuoto, MESSAGGIO_SCUOLA_NUOTO } from '@/api/lab'
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
import { STILI_ELENCO } from './nuoto'
import { Griglia, OpzioneCarta } from './PassiUI'
import { accendi, eSalute, NESSUNO } from './questionario'
import {
  DISTANZE_VASCA, DURATE_VASCA, livelloVascaDa, livelloVascaScelto, LIVELLI_VASCA, OBIETTIVI_ACQUA, OBIETTIVO_ACQUA_SALUTE, passoVascaCompleto, PASSI_VASCA, puoComporreVasca, questionarioVascaDa,
  riepilogoVascaDa, vaAllaScuolaNuoto, volteConsigliate, volteScelte, ZONE_VASCA, type PassoVascaTutti, type RisposteVasca,
} from './questionarioVasca'
import { dimenticaRisposteVasca, leggiRisposteVasca, ricordaRisposteVasca } from './rispostePiano'
import { SaluteBlocco } from './SaluteBlocco'

// «Componi il tuo piano» in vasca, a passi (22/10/2026, richiesta di Maurizio: «qualcosa di piu' semplice e focalizzato sull'acqua»):
// una domanda per schermata, con l'anello in alto a destra che si chiude e «Continua» in basso, come in sala (`PassiSala.tsx`), ma
// **sei domande sole e tutte sul nuoto**: cosa vuoi ottenere in vasca, che stili sai nuotare, quanto nuoti di fila (anche in vasche da
// 25 m), quanto tempo hai, quante volte vieni, e se hai fastidi. Le regole (livello da stili e distanza, volte consigliate, cosa serve
// per andare avanti) sono in `questionarioVasca.ts`; la funzione e' quella di prima.
//
// **Il piano non si scrive da solo**: alla fine c'e' un riepilogo («Ecco cosa abbiamo capito») che si puo' correggere riga per riga, e
// solo «Componi il mio piano di nuoto» fa partire la richiesta; torna una bozza, che l'editor fa rivedere e confermare come prima.
// **Le risposte non restano**: solo in memoria (`rispostePiano.ts`), perche' i fastidi sono dati sulla salute. **Salute** non produce
// un piano: porta al personal trainer, come in sala. **Il Nuoto Libero chiede stile libero e dorso**: chi non li sa legge dove si
// comincia (la Scuola Nuoto Adulti) e non va avanti, senza un «non sei pronto».

const ATTESA = tv(
  [
    'Stiamo leggendo le tue risposte…',
    'Scegliamo gli stili che sai nuotare…',
    'Dosiamo distanze e recuperi sui metri che nuoti di fila…',
    'Controlliamo che la seduta stia nel tuo tempo…',
    'Ancora qualche secondo…',
  ],
  [
    'Reading your answers…',
    'Choosing the strokes you can swim…',
    'Setting distances and rest around how far you swim without stopping…',
    'Checking the session fits your time…',
    'Just a few more seconds…',
  ],
)

/** `saltaDove`: si e' arrivati con `?dove=vasca` (dai Consigli), quindi la domanda «Dove ti alleni?» e' gia' risposta e non c'e' un passo prima. */
export function PassiVasca({ saltaDove, onDove }: { saltaDove: boolean; onDove: () => void }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const ordine: readonly PassoVascaTutti[] = PASSI_VASCA

  // Si riparte da dove si era arrivati (solo in memoria): un gesto indietro per sbaglio non fa perdere le risposte. «Il tuo livello» non e' un
  // passo di fila: chi era li' riparte dal riepilogo.
  const ricordate = useRef(leggiRisposteVasca()).current
  const [r, setR] = useState<RisposteVasca>(ricordate.risposte)
  const [passo, setPasso] = useState<PassoVascaTutti>(() => {
    const prima = ricordate.passo === 'livello' ? 'riepilogo' : ricordate.passo
    return prima && ordine.includes(prima) ? prima : ordine[0]
  })
  // Si e' saltati qui dal riepilogo per cambiare una riga: finito il passo si torna al riepilogo, non si rifanno quelli in mezzo.
  const [daRiepilogo, setDaRiepilogo] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)
  const scorri = useRef<ScrollView>(null)
  // L'anello sta in alto a destra, dove di solito sta il pulsante «Assistente virtuale»: gli si dice di farsi da parte (resta la sola icona, accanto).
  // Durante l'attesa l'anello non c'e': il pulsante torna al suo posto.
  useSegnaAzioneInAlto(!inCorso, useIsFocused())

  useEffect(() => {
    ricordaRisposteVasca(r, passo)
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
  function imposta(x: Partial<RisposteVasca>) {
    setR((prima) => {
      const nuovo = { ...prima, ...x }
      if ('stili' in x || 'continuo' in x) nuovo.livello = null
      return nuovo
    })
  }

  // «Il tuo livello» si apre dal riepilogo: l'anello resta dov'era, chiuso.
  const i = Math.max(0, ordine.indexOf(passo === 'livello' ? 'riepilogo' : passo))
  const completo = passoVascaCompleto(passo, r)
  const salute = eSalute(r.obiettivo)

  function vai(a: PassoVascaTutti) {
    setErrore(null)
    setPasso(a)
  }
  function avanti() {
    if (!completo) return
    if (daRiepilogo) {
      setDaRiepilogo(false)
      return vai('riepilogo')
    }
    if (passo !== 'livello' && i < ordine.length - 1) vai(ordine[i + 1])
  }
  function indietro() {
    if (daRiepilogo) {
      setDaRiepilogo(false)
      return vai('riepilogo')
    }
    if (passo === 'livello') return vai('riepilogo')
    if (i > 0) return vai(ordine[i - 1])
    // Dal primo passo si torna a «Dove ti alleni?» (se c'e') o da dove si era arrivati.
    if (!saltaDove) return onDove()
    if (router.canGoBack()) router.back()
    else router.replace('/allenamento')
  }
  function cambia(a: PassoVascaTutti) {
    setDaRiepilogo(true)
    vai(a)
  }

  async function invia() {
    // Salute non parte mai (la funzione la rifiuterebbe), e senza le risposte obbligatorie non c'e' un riepilogo da confermare.
    if (!puoComporreVasca(r)) return
    setErrore(null)
    setInCorso(true)
    const risposta = await chiediPianoNuoto(questionarioVascaDa(r))
    setInCorso(false)
    if (!risposta.ok) {
      colpetto('errore')
      return setErrore(risposta.errore)
    }
    colpetto('ok')
    scartaBozza()
    mettiBozza(risposta.bozza)
    // Il piano e' composto: le risposte (con i fastidi) non servono piu'.
    dimenticaRisposteVasca()
    router.replace({ pathname: '/allenamento/nuova', params: { da: 'bozza' } })
  }

  if (inCorso) {
    return (
      <Schermata sopratitolo={t('Piani di allenamento', 'Workout plans')} titolo={t('Il tuo piano di nuoto', 'Your swim plan')} indietro="/allenamento" barra={false}>
        <LinearGradient colors={FUOCO} style={stili.attesa}>
          <Icona nome="goccia" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>{t('Ci vuole in genere meno di un minuto: resta su questa pagina.', 'It usually takes less than a minute: stay on this page.')}</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  // ---- il contenuto di ogni passo ---------------------------------------------------------------------------------------
  const stimato = livelloVascaDa(r)
  const consigliate = volteConsigliate({ ...r, livello: livelloVascaScelto(r) })
  const zone = r.zone.filter((z) => z !== NESSUNO)

  const una = <T extends string>(opzioni: readonly { valore: T; testo: string; nota?: string }[], scelto: T | null, onScegli: (v: T) => void, etichette?: Partial<Record<T, string>>) => (
    <View style={stili.lista}>
      {opzioni.map((o) => (
        <OpzioneCarta key={o.valore} testo={o.testo} nota={o.nota} etichetta={etichette?.[o.valore]} attivo={scelto === o.valore} onPress={() => onScegli(o.valore)} />
      ))}
    </View>
  )
  const piu = <T extends string>(opzioni: readonly { valore: T; testo: string; nota?: string }[], scelti: readonly (T | typeof NESSUNO)[], onCambia: (v: (T | typeof NESSUNO)[]) => void, nessuno: string) => (
    <View style={stili.lista}>
      {opzioni.map((o) => (
        <OpzioneCarta key={o.valore} multipla testo={o.testo} nota={o.nota} attivo={scelti.includes(o.valore)} onPress={() => onCambia(accendi(scelti, o.valore))} />
      ))}
      <OpzioneCarta multipla testo={nessuno} attivo={scelti.includes(NESSUNO)} onPress={() => onCambia(accendi(scelti, NESSUNO))} />
    </View>
  )

  let titolo = ''
  let nota: string | null = null
  let corpo: ReactNode = null
  switch (passo) {
    case 'obiettivo':
      titolo = t('Cosa vuoi ottenere in vasca?', 'What do you want from the pool?')
      corpo = (
        <>
          {una([...OBIETTIVI_ACQUA, OBIETTIVO_ACQUA_SALUTE], r.obiettivo, (o) => imposta({ obiettivo: o, condizione: eSalute(o) ? r.condizione : null }))}
          {salute ? <SaluteBlocco condizione={r.condizione} onCondizione={(c) => imposta({ condizione: c })} /> : null}
        </>
      )
      break
    case 'stili':
      titolo = t('Che stili sai nuotare?', 'Which strokes can you swim?')
      nota = t('Scegli solo quelli che sai fare davvero: il piano usa solo questi.', 'Only pick the ones you can really do: the plan uses only these.')
      corpo = (
        <>
          {piu(STILI_ELENCO, r.stili, (v) => imposta({ stili: v }), t('Non ne so ancora nessuno', 'None of them yet'))}
          {vaAllaScuolaNuoto(r) ? (
            <Messaggio tono="attenzione" titolo={t('Si parte dalla Scuola Nuoto Adulti', 'Start with Scuola Nuoto Adulti')}>
              {MESSAGGIO_SCUOLA_NUOTO}
            </Messaggio>
          ) : null}
        </>
      )
      break
    case 'distanza':
      titolo = t('Quanto riesci a nuotare di fila?', 'How far can you swim without stopping?')
      nota = t(
        'Senza fermarti e senza appoggiarti al bordo. La vasca è da 25 metri: quattro vasche sono 100 m.',
        'Without stopping or holding the wall. The pool is 25 metres: four lengths make 100 m.',
      )
      corpo = una(DISTANZE_VASCA, r.continuo, (v) => imposta({ continuo: v }))
      break
    case 'durata':
      titolo = t('Quanto tempo hai per ogni seduta?', 'How long is each session?')
      nota = t('Il turno del Nuoto Libero dura un’ora. Il piano sta nel tempo che scegli, riscaldamento e defaticamento compresi.', 'A Nuoto Libero slot lasts an hour. The plan fits the time you choose, warm-up and cool-down included.')
      corpo = una(DURATE_VASCA, r.minuti ? String(r.minuti) : null, (v) => imposta({ minuti: Number(v) as RisposteVasca['minuti'] }))
      break
    case 'volte':
      titolo = t('Quante volte a settimana in vasca?', 'How many times a week in the pool?')
      nota = t(`In base alle tue risposte ti consigliamo ${consigliate} sedute a settimana. Scegli tu.`, `Based on your answers we suggest ${consigliate} sessions a week. It’s up to you.`)
      corpo = (
        <Griglia>
          {[1, 2, 3, 4].map((n) => (
            <OpzioneCarta key={n} compatta testo={String(n)} etichetta={n === consigliate ? t('Consigliato', 'Suggested') : undefined} attivo={volteScelte(r) === n} onPress={() => imposta({ volte: n })} />
          ))}
        </Griglia>
      )
      break
    case 'fastidi':
      titolo = t('Hai fastidi o dolori?', 'Do you have any aches or pains?')
      nota = t('Seleziona le zone che ti danno fastidio quando nuoti.', 'Select the areas that bother you when you swim.')
      corpo = (
        <>
          {piu(ZONE_VASCA, r.zone, (v) => imposta({ zone: v }), t('Nessun fastidio', 'No aches'))}
          {zone.length ? (
            <View style={{ gap: spazio.due }}>
              <TextInput
                value={r.limitazioni}
                onChangeText={(x) => imposta({ limitazioni: x.slice(0, 400) })}
                placeholder={t('Vuoi aggiungere qualcosa? Per esempio: la spalla destra mi fa male quando respiro a destra. (facoltativo)', 'Want to add anything? For example: my right shoulder hurts when I breathe to the right. (optional)')}
                placeholderTextColor={p.testoTerzo}
                multiline
                submitBehavior="blurAndSubmit"
                returnKeyType="done"
                style={[stili.testo, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
              />
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                {t('Per un recupero o una patologia scegli «Salute» come obiettivo: ti segue un personal trainer.', 'For recovery or a medical condition, choose “Health” as your goal: a personal trainer will work with you.')}
              </Text>
            </View>
          ) : null}
        </>
      )
      break
    case 'livello':
      titolo = t('Il tuo livello in acqua', 'Your level in the water')
      nota = t('In base alle tue risposte ti consideriamo così. Se non ti ci riconosci, cambialo.', 'Based on your answers, this is where we place you. If it doesn’t feel right, change it.')
      corpo = una(LIVELLI_VASCA, livelloVascaScelto(r), (v) => imposta({ livello: v }), { [stimato]: t('Stimato dalle tue risposte', 'Estimated from your answers') })
      break
    case 'riepilogo':
      titolo = t('Ecco cosa abbiamo capito', 'Here’s what we understood')
      nota = t('Controlla: tocca una riga per cambiarla.', 'Check it: tap a row to change it.')
      corpo = (
        <>
          <Carta style={{ padding: 0, overflow: 'hidden' }}>
            {riepilogoVascaDa(r).map((riga, k) => (
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
              'Il piano è preparato con il supporto di un’intelligenza artificiale e lo confermi tu: i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o patologie parlane prima con il tecnico a bordo vasca.',
              'The plan is prepared with the help of artificial intelligence and you confirm it: the club’s trainers can see it from their panel. It doesn’t replace a doctor’s advice: if you have pain, injuries or medical conditions, talk to the coach at the poolside first.',
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
      <ScrollView ref={scorri} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ alignItems: 'center', paddingTop: ins.top + spazio.tre, paddingBottom: 130 + ins.bottom }}>
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
              testo={ultimo ? t('Componi il mio piano di nuoto', 'Build my swim plan') : t('Continua', 'Continue')}
              icona={ultimo ? 'goccia' : undefined}
              onPress={ultimo ? invia : avanti}
              disabilitato={ultimo ? !puoComporreVasca(r) : !completo}
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
