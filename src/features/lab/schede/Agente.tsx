import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import { chiediPianoNuoto, chiediSchedaAi, saNuotareAbbastanza, type Continuo, type Questionario, type Stile } from '@/api/lab'
import { spazio } from '@/theme'

import { mettiBozza, scartaBozza } from './bozza'
import { Scelte } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { CampiNuoto } from './CampiNuoto'
import { MINUTI_VASCA } from './nuoto'
import { ATTREZZATURE, CONDIZIONI_SALUTE, DURATE_SALA, eSalute, NOTA_SALUTE, OBIETTIVI, OBIETTIVI_VASCA, OBIETTIVO_SALUTE, testoSalute, type CondizioneSalute } from './questionario'

// «Componi il tuo piano» (il file si chiama ancora Agente, e l'indirizzo /allenamento/agente: e' quello dei link gia' dati).
// Sei domande (obiettivo, livello, giorni, minuti, cosa usa, limitazioni) e il piano si compone con gli esercizi accesi della
// libreria del club, coi recuperi. **Non e' ancora un piano del socio** (19/10/2026): torna una bozza, che l'editor fa rivedere
// e modificare, e solo alla conferma entra fra i suoi (origine «ai»). Ci mette qualche decina di secondi.
//
// **L'AI non e' in primo piano** (20/10/2026, richiesta del club): nei testi di questa schermata si parla di «generiamo insieme» e di
// «comporre», niente «agente AI» ne' il viola dell'AI. Che il piano lo scriva un'intelligenza artificiale lo dice la nota in
// fondo, in piccolo, qui e dopo la composizione (editor e piano): e' una cosa che il socio ha diritto di sapere, soprattutto
// perche' le limitazioni che scrive sono dati sulla salute, ma non e' il titolo.
//
// **Salute** (20/10/2026): un obiettivo che l'agente non scrive. Chi lo sceglie vede di cosa si tratta (recupero dopo un trauma,
// malattie metaboliche o cardiovascolari, problemi articolari, alterazioni posturali) e un riquadro che porta alla prenotazione
// del personal trainer (`/personal`); il resto del questionario sparisce, e non parte nessuna richiesta (la funzione la rifiuta
// comunque). Il testo e le sottovoci stanno in `questionario.ts`.
//
// **In vasca** (20/10/2026): la prima domanda e' dove ci si allena. Chi sceglie la vasca (il Nuoto Libero) ha altre
// domande — quante volte, quanto dura il turno, gli stili che sa nuotare e quanto nuota di fila — e gli si compone un
// **piano di nuoto**: gli stessi passi (bozza, editor, conferma), ma si legge a bordo vasca e non si registra. Il
// Nuoto Libero chiede stile libero e dorso: chi non li sa non manda la richiesta e legge dove si comincia.

const DOVE: { valore: 'sala' | 'vasca'; testo: string }[] = [
  { valore: 'sala', testo: 'In sala' },
  { valore: 'vasca', testo: 'In vasca · Nuoto Libero' },
]
const LIVELLI: { valore: Questionario['livello']; testo: string; nota: string }[] = [
  { valore: 'principiante', testo: 'Principiante', nota: 'Ho iniziato da poco o riprendo dopo una pausa' },
  { valore: 'intermedio', testo: 'Intermedio', nota: 'Mi alleno con regolarità da almeno sei mesi' },
  { valore: 'esperto', testo: 'Esperto', nota: 'Mi alleno da anni e conosco bene gli esercizi' },
]
const ATTESA = [
  'Stiamo leggendo le tue risposte…',
  'Scegliamo gli esercizi dalla libreria del club…',
  'Decidiamo serie, ripetizioni e recuperi…',
  'Dividiamo il lavoro fra i giorni…',
  'Ancora qualche secondo…',
]
const ATTESA_VASCA = [
  'Stiamo leggendo le tue risposte…',
  'Scegliamo gli stili che sai nuotare…',
  'Dosiamo distanze e recuperi sui metri che nuoti di fila…',
  'Controlliamo che la seduta stia nel tuo tempo…',
  'Ancora qualche secondo…',
]

export function Agente() {
  const p = usePalette()
  const [dove, setDove] = useState<'sala' | 'vasca'>('sala')
  const [obiettivo, setObiettivo] = useState<string | null>(null)
  // Sotto «Salute»: di cosa si tratta. Serve solo a dirlo al socio: qualunque sia, si va dal personal trainer.
  const [condizione, setCondizione] = useState<CondizioneSalute | null>(null)
  const [livello, setLivello] = useState<Questionario['livello'] | null>(null)
  const [giorni, setGiorni] = useState<number | null>(3)
  const [minuti, setMinuti] = useState<number | null>(60)
  const [attrezzatura, setAttrezzatura] = useState<Questionario['attrezzatura']>('tutto')
  const [limitazioni, setLimitazioni] = useState('')
  const [note, setNote] = useState('')
  // Solo per la vasca: quante sedute (da 1 a 4), quanto dura il turno, gli stili che sa e quanto nuota di fila.
  const [volteVasca, setVolteVasca] = useState<number | null>(2)
  const [minutiVasca, setMinutiVasca] = useState<30 | 45 | 60 | null>(60)
  const [stiliNuoto, setStiliNuoto] = useState<Stile[]>([])
  const [continuo, setContinuo] = useState<Continuo | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!inCorso) return
    setFrase(0)
    // La composizione dura una decina di secondi (a volte una ventina): una frase ogni cinque, l'ultima resta.
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 5000)
    return () => clearInterval(t)
  }, [inCorso])

  // «Tecnica» e' un obiettivo di vasca: tornando in sala non resta scelto.
  function scegliDove(v: 'sala' | 'vasca') {
    setDove(v)
    if (v === 'sala' && obiettivo === 'Tecnica') setObiettivo(null)
  }

  function scegliObiettivo(o: string) {
    setObiettivo(o)
    if (!eSalute(o)) setCondizione(null)
  }

  const inVasca = dove === 'vasca'
  const salute = eSalute(obiettivo)
  const nuotoOk = saNuotareAbbastanza(stiliNuoto) && !!continuo && !!volteVasca && !!minutiVasca
  const pronto = !!obiettivo && !salute && !!livello && (inVasca ? nuotoOk : !!giorni && !!minuti)

  async function invia() {
    // Salute non parte mai: la funzione la rifiuterebbe, e al suo posto c'e' il riquadro del personal trainer.
    if (!pronto) return
    setErrore(null)
    setInCorso(true)
    const r = inVasca
      ? await chiediPianoNuoto({ obiettivo: obiettivo!, livello: livello!, volte: volteVasca!, minuti: minutiVasca!, stili: stiliNuoto, continuo: continuo!, limitazioni: limitazioni.trim(), note: note.trim() })
      : await chiediSchedaAi({ obiettivo: obiettivo!, livello: livello!, giorni: giorni!, minuti: minuti!, attrezzatura, limitazioni: limitazioni.trim(), note: note.trim() })
    setInCorso(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    scartaBozza()
    mettiBozza(r.bozza)
    router.replace({ pathname: '/allenamento/nuova', params: { da: 'bozza' } })
  }

  if (inCorso) {
    return (
      <Schermata sopratitolo="Piani di allenamento" titolo={inVasca ? 'Il tuo piano di nuoto' : 'Il tuo piano'} indietro="/allenamento" barra={false}>
        <LinearGradient colors={FUOCO} style={stili.attesa}>
          <Icona nome={inVasca ? 'goccia' : 'peso'} size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{(inVasca ? ATTESA_VASCA : ATTESA)[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vuole in genere meno di un minuto: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo="Piani di allenamento"
      titolo={inVasca ? 'Componi il tuo piano di nuoto' : 'Componi il tuo piano'}
      indietro="/allenamento"
      barra={false}
      sottotitolo={
        inVasca
          ? 'Generiamo insieme il tuo piano di nuoto: rispondi a qualche domanda e ti scriviamo le sedute da fare in vasca, con le distanze e i recuperi, dentro i metri che nuoti di fila. Poi lo guardi, lo modifichi e lo confermi.'
          : 'Generiamo insieme il tuo piano di allenamento: rispondi a qualche domanda, scegliamo gli esercizi dalla libreria del club e li mettiamo in ordine, coi recuperi. Poi lo guardi, lo modifichi e lo confermi.'
      }
    >
      <Sezione titolo="Dove ti alleni">
        <Scelte valori={DOVE} scelto={dove} onScegli={scegliDove} />
        {inVasca ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Un piano di nuoto si legge a bordo vasca: non ci sono chili da segnare, quindi non si registra come gli allenamenti in sala.</Text>
        ) : null}
      </Sezione>

      <Sezione titolo="Il tuo obiettivo">
        <Scelte valori={[...(inVasca ? OBIETTIVI_VASCA : OBIETTIVI), OBIETTIVO_SALUTE].map((o) => ({ valore: o as string, testo: o }))} scelto={obiettivo} onScegli={scegliObiettivo} />
      </Sezione>

      {salute ? (
        <>
          <Sezione titolo="Di cosa si tratta">
            <View style={{ gap: spazio.due }}>
              {CONDIZIONI_SALUTE.map((c) => {
                const attivo = c.valore === condizione
                return (
                  <Tocco
                    key={c.valore}
                    vibra="scelta"
                    stato={{ selected: attivo }}
                    onPress={() => setCondizione(c.valore)}
                    etichetta={c.dettaglio ? `${c.testo} (${c.dettaglio})` : c.testo}
                    style={[stili.livello, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
                  >
                    <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: F.extra, fontSize: 15.5 }}>{c.testo}</Text>
                    {c.dettaglio ? <Text style={{ color: attivo ? 'rgba(255,255,255,0.85)' : p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>{c.dettaglio}</Text> : null}
                  </Tocco>
                )
              })}
            </View>
          </Sezione>

          <Carta style={{ gap: spazio.tre }}>
            <View style={stili.riga}>
              <LinearGradient colors={NOTTE} style={stili.icona}>
                <Icona nome="persona" size={26} colore="#fff" />
              </LinearGradient>
              <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>Per questo ti serve un personal trainer</Text>
            </View>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{testoSalute(condizione)}</Text>
            <Pulsante testo="Prenota un personal trainer" icona="calendario" onPress={() => router.push('/personal')} />
            <Text style={[stili.nota, { color: p.testoTerzo }]}>{NOTA_SALUTE}</Text>
          </Carta>
        </>
      ) : (
        <>
          <Sezione titolo="Il tuo livello">
            <View style={{ gap: spazio.due }}>
              {LIVELLI.map((l) => {
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

          {inVasca ? (
            <>
              <Sezione titolo="Quante volte a settimana in vasca">
                <Scelte valori={[1, 2, 3, 4].map((n) => ({ valore: n, testo: String(n) }))} scelto={volteVasca} onScegli={setVolteVasca} />
              </Sezione>

              <Sezione titolo="Quanto dura una seduta">
                <Scelte valori={MINUTI_VASCA.map((n) => ({ valore: n, testo: `${n} min` }))} scelto={minutiVasca} onScegli={setMinutiVasca} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>Il turno del Nuoto Libero dura un’ora: la seduta può essere più corta, mai più lunga di quanto indichi.</Text>
              </Sezione>

              <CampiNuoto stili={stiliNuoto} onStili={setStiliNuoto} continuo={continuo} onContinuo={setContinuo} />
            </>
          ) : (
            <>
              <Sezione titolo="Quanti giorni a settimana">
                <Scelte valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: String(n) }))} scelto={giorni} onScegli={setGiorni} />
              </Sezione>

              <Sezione titolo="Quanto dura una seduta">
                <Scelte valori={DURATE_SALA.map((n) => ({ valore: n as number, testo: `${n} min` }))} scelto={minuti} onScegli={setMinuti} />
              </Sezione>

              <Sezione titolo="Cosa usi">
                <Scelte valori={ATTREZZATURE.map((a) => ({ valore: a.valore as Questionario['attrezzatura'], testo: a.testo }))} scelto={attrezzatura} onScegli={setAttrezzatura} />
                <Text style={[stili.nota, { color: p.testoSecondario }]}>È una prevalenza: il piano usa soprattutto quello che scegli, con qualche esercizio a corpo libero per il core e lo stretching.</Text>
              </Sezione>
            </>
          )}

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
                placeholder={inVasca ? 'Altro da sapere (facoltativo): uno stile che ami o che eviti, una gara che prepari.' : 'Altro da sapere (facoltativo): un esercizio che ti piace, uno che eviti, uno sport che pratichi.'}
                placeholderTextColor={p.testoTerzo}
                multiline
                style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
              />
            </Carta>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>Per un recupero o una patologia scegli «Salute» come obiettivo: ti segue un personal trainer.</Text>
          </Sezione>

          {errore ? <Messaggio>{errore}</Messaggio> : null}
          {inVasca && !!obiettivo && !!livello && !pronto ? (
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
              {!stiliNuoto.length || !continuo ? 'Scegli gli stili che sai e quanto nuoti di fila per continuare.' : 'Per comporre il piano serve il Nuoto Libero: stile libero e dorso.'}
            </Text>
          ) : null}
          <Pulsante testo={inVasca ? 'Componi il mio piano di nuoto' : 'Componi il mio piano'} icona={inVasca ? 'goccia' : 'peso'} onPress={invia} disabilitato={!pronto} />
          {/* La postilla: che dietro ci sia un'intelligenza artificiale si dice qui, in piccolo, e di nuovo sul piano composto. */}
          <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
            Il piano è preparato con il supporto di un’intelligenza artificiale e lo confermi tu: i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o
            patologie parlane prima con {inVasca ? 'il tecnico a bordo vasca' : 'un istruttore in sala'}.
          </Text>
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  livello: { borderRadius: 20, padding: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  testo: { minHeight: 70, borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5, textAlignVertical: 'top' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titoletto: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
