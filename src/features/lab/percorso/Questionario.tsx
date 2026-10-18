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
import { spazio } from '@/theme'

import { prendi } from '../memoria'
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

const LIVELLI_TESTO: { valore: Livello; testo: string; nota: string }[] = [
  { valore: 'principiante', testo: 'Principiante', nota: 'Ho iniziato da poco o riprendo dopo una pausa' },
  { valore: 'intermedio', testo: 'Intermedio', nota: 'Mi alleno con regolarità da almeno sei mesi' },
  { valore: 'esperto', testo: 'Esperto', nota: 'Mi alleno da anni e conosco bene gli esercizi' },
]

const MINUTI_SALA = [30, 45, 60, 75, 90]

const ATTESA = [
  'Il tutor sta leggendo le tue risposte…',
  'Guarda il palinsesto vero della settimana…',
  'Sceglie le lezioni adatte a te…',
  'Le incastra con la sala e il cardio…',
  'Controlla che ci sia il giusto riposo…',
  'Ancora qualche secondo…',
]

/** Fino a quante lezioni a settimana si chiede: due al giorno al massimo, e mai piu' di otto (il percorso ha un tetto di tappe). */
const quanteLezioni = (giorni: number) => Math.min(8, giorni * 2)

export function Questionario() {
  const p = usePalette()
  const { stato, errore: erroreStato, vista } = usePercorso()
  const salvato = stato?.percorso ?? null

  const [obiettivo, setObiettivo] = useState<Obiettivo | null>(null)
  const [livello, setLivello] = useState<Livello | null>(null)
  const [giorni, setGiorni] = useState(4)
  const [sala, setSala] = useState(2)
  const [lezioni, setLezioni] = useState(2)
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
  const nomiLezioni = useMemo(() => [...new Set((catalogo?.slot ?? []).map((s) => s.nome))].sort((a, b) => a.localeCompare(b, 'it')), [catalogo])

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
  }

  const pianiPerLaSala = (stato?.piani.suoi ?? 0) + (stato?.piani.del_club ?? 0)
  const maggiorenne = stato?.maggiorenne !== false
  const quotaFinita = !!stato && stato.quota.usate >= stato.quota.massimo
  const giorniLiberiOk = giorniLiberi.length === 0 || giorniLiberi.length >= giorni
  const pronto = !!obiettivo && !!livello && sala + lezioni >= 1 && giorniLiberiOk && (sala === 0 || pianiPerLaSala > 0)

  const nonComprese_noto = stato?.idoneita.categorie != null

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
      <Schermata sopratitolo="Percorso Athlon" titolo="Il tuo percorso" indietro="/allenamento/percorso" barra={false}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.attesa}>
          <Icona nome="stella" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vuole una decina di secondi, a volte un paio di minuti: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  if (vista) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo="Un percorso su misura" indietro="/allenamento/percorso" barra={false}>
        <Messaggio tono="attenzione">In vista cliente il Percorso si guarda e basta: il questionario lo compila solo il socio.</Messaggio>
      </Schermata>
    )
  }

  if (erroreStato?.nonAttivo) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo="Un percorso su misura" indietro="/allenamento/percorso" barra={false}>
        <Messaggio tono="attenzione" titolo="Non è ancora attivo">
          {erroreStato.messaggio}
        </Messaggio>
      </Schermata>
    )
  }

  if (!maggiorenne) {
    return (
      <Schermata sopratitolo="Percorso Athlon" titolo="Un percorso su misura" indietro="/allenamento/percorso" barra={false}>
        <Messaggio tono="attenzione">Il Percorso è riservato ai maggiorenni.</Messaggio>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo="Percorso Athlon"
      titolo="Un percorso su misura"
      indietro="/allenamento/percorso"
      barra={false}
      sottotitolo="Il tutor tecnico mette insieme la tua settimana: sala, cardio, lezioni e acqua, scegliendo nel palinsesto vero. Poi la guardi, la cambi e la confermi."
    >
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testo, fontFamily: F.bold }]}>Non è un piano di allenamento</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          Il piano sono gli esercizi di un allenamento in sala. Il percorso è l’intera settimana: usa i tuoi piani come tappe di sala e li affianca a lezioni, acqua e cardio.
          {pianiPerLaSala === 0 ? ' Per la sala ti serve almeno un piano: puoi crearlo dalla pagina Train.' : ''}
        </Text>
      </Carta>

      <Sezione titolo="Il tuo obiettivo">
        <Scelte valori={OBIETTIVI.map((o) => ({ valore: o, testo: o }))} scelto={obiettivo} onScegli={setObiettivo} />
      </Sezione>

      <Sezione titolo="Il tuo livello">
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

      <Sezione titolo="Quanti giorni a settimana">
        <Scelte valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: String(n) }))} scelto={giorni} onScegli={scegliGiorni} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>Almeno un giorno resta di riposo.</Text>
      </Sezione>

      <Sezione titolo="Quante volte in sala">
        <Scelte valori={Array.from({ length: giorni + 1 }, (_, n) => ({ valore: n, testo: String(n) }))} scelto={sala} onScegli={setSala} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>Usiamo i tuoi piani di allenamento, e quelli del club se non ne hai.</Text>
      </Sezione>

      {sala > 0 ? (
        <Sezione titolo="Quanto dura una seduta in sala">
          <Scelte valori={MINUTI_SALA.map((n) => ({ valore: n, testo: `${n} min` }))} scelto={minutiSala} onScegli={setMinutiSala} />
        </Sezione>
      ) : null}

      <Sezione titolo="Quante lezioni di gruppo">
        <Scelte valori={Array.from({ length: quanteLezioni(giorni) + 1 }, (_, n) => ({ valore: n, testo: String(n) }))} scelto={lezioni} onScegli={setLezioni} />
      </Sezione>

      {lezioni > 0 ? (
        <>
          <Sezione titolo="Che lezioni ti piacciono">
            <SceltePiu valori={GRUPPI.map((g) => ({ valore: g, testo: NOME_GRUPPO[g].titolo }))} scelti={gruppi} onCambia={setGruppi} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {gruppi.length ? gruppi.map((g) => NOME_GRUPPO[g].nota).join(' · ') : 'Se non scegli niente, il tutor guarda tutto il palinsesto.'}
            </Text>
          </Sezione>

          <Sezione titolo="Lezioni che ami o che eviti" destra={<Text style={[stili.facoltativo, { color: p.testoTerzo }]}>FACOLTATIVO</Text>}>
            {lezioniAperte ? (
              !catalogo ? (
                <Carta style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
                  <ActivityIndicator color={p.accento} />
                  <Text style={[stili.nota, { color: p.testo }]}>Leggo il palinsesto…</Text>
                </Carta>
              ) : (
                <View style={{ gap: spazio.tre }}>
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.sottoTitolo, { color: p.testo }]}>Quelle che ami</Text>
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
                    <Text style={[stili.sottoTitolo, { color: p.testo }]}>Quelle che vuoi evitare</Text>
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
                testo={preferite.length + evitate.length ? `Scelte: ${preferite.length} amate, ${evitate.length} da evitare` : 'Scegli le lezioni'}
                variante="secondario"
                icona="avanti"
                onPress={() => setLezioniAperte(true)}
              />
            )}
          </Sezione>
        </>
      ) : null}

      <Sezione titolo="Quando preferisci venire" destra={<Text style={[stili.facoltativo, { color: p.testoTerzo }]}>FACOLTATIVO</Text>}>
        <SceltePiu valori={FASCE.map((f) => ({ valore: f, testo: NOME_FASCIA[f].titolo }))} scelti={fasce} onCambia={setFasce} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {fasce.length ? fasce.map((f) => `${NOME_FASCIA[f].titolo}: ${NOME_FASCIA[f].nota}`).join(' · ') : 'Se indichi un orario, il tutor sceglie nel palinsesto le lezioni che ci stanno.'}
        </Text>
      </Sezione>

      <Sezione titolo="In quali giorni puoi venire" destra={<Text style={[stili.facoltativo, { color: p.testoTerzo }]}>FACOLTATIVO</Text>}>
        <SceltePiu valori={GIORNI.map((g) => ({ valore: g as number, testo: GIORNO_BREVE[g] }))} scelti={giorniLiberi} onCambia={(v) => setGiorniLiberi([...v].sort((a, b) => a - b))} />
        {!giorniLiberiOk ? (
          <Messaggio tono="attenzione">{`Hai scelto ${giorni} giorni di allenamento: indica almeno ${giorni} giorni in cui puoi venire, o nessuno.`}</Messaggio>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Senza scelta, tutti i giorni vanno bene.</Text>
        )}
      </Sezione>

      <Sezione titolo="Un po’ di cardio prima?">
        <Scelte
          valori={[
            { valore: 'no', testo: 'No, grazie' },
            { valore: 'si', testo: 'Sì, prima di sala o lezione' },
          ]}
          scelto={cardio ? 'si' : 'no'}
          onScegli={(v) => setCardio(v === 'si')}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>Per esempio mezz’ora di tapis roulant prima di una lezione di Reformer.</Text>
      </Sezione>

      {nonComprese_noto ? (
        <Sezione titolo="Lezioni non comprese">
          <Scelte
            valori={[
              { valore: 'no', testo: 'Solo quelle comprese' },
              { valore: 'si', testo: 'Includi anche le altre' },
            ]}
            scelto={nonComprese ? 'si' : 'no'}
            onScegli={(v) => setNonComprese(v === 'si')}
          />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            Quelle fuori dal tuo abbonamento compaiono segnate «da acquistare» e si prenotano come lezione singola, a pagamento. Di base le lasciamo fuori.
          </Text>
        </Sezione>
      ) : null}

      <Sezione titolo="Limitazioni o infortuni">
        <Carta style={{ gap: spazio.due }}>
          <TextInput
            value={limitazioni}
            onChangeText={(t) => setLimitazioni(t.slice(0, 500))}
            placeholder="Per esempio: mal di schiena, una spalla da proteggere, il ginocchio operato. Lascia vuoto se non ne hai."
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
          />
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 500))}
            placeholder="Altro da sapere (facoltativo): una lezione che ti piace, una che eviti, uno sport che pratichi."
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
          />
        </Carta>
      </Sezione>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {quotaFinita ? (
        <Messaggio tono="attenzione">{`Hai già chiesto ${stato!.quota.massimo} percorsi al tutor negli ultimi trenta giorni: puoi ancora modificare a mano quello che hai.`}</Messaggio>
      ) : null}
      {!pronto && (!obiettivo || !livello) ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>Scegli obiettivo e livello per continuare.</Text> : null}
      <Pulsante testo="Componi il mio percorso" icona="stella" onPress={invia} disabilitato={!pronto || quotaFinita} />
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        Il percorso lo compone un’intelligenza artificiale e lo confermi tu: il questionario non viene conservato, resta solo il percorso che confermi, e i trainer del club lo possono
        vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.
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
