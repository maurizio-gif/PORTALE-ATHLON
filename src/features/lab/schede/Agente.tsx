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
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { CampiNuoto } from './CampiNuoto'
import { MINUTI_VASCA } from './nuoto'

// Il piano scritto dall'agente AI: sei domande (obiettivo, livello, giorni,
// minuti, attrezzatura, limitazioni) e l'agente lo scrive usando solo gli
// esercizi accesi della libreria del club, coi recuperi. **Non e' ancora un
// piano del socio** (19/10/2026): torna una bozza, che l'editor fa rivedere e
// modificare, e solo alla conferma entra fra i suoi (origine «ai»). Ci mette
// fino a un paio di minuti.
//
// **In vasca** (20/10/2026): la prima domanda e' dove ci si allena. Chi sceglie la vasca (il Nuoto Libero) ha altre
// domande — quante volte, quanto dura il turno, gli stili che sa nuotare e quanto nuota di fila — e l'agente gli scrive
// un **piano di nuoto**: gli stessi passi (bozza, editor, conferma), ma si legge a bordo vasca e non si registra. Il
// Nuoto Libero chiede stile libero e dorso: chi non li sa non manda la richiesta e legge dove si comincia.

const OBIETTIVI = ['Tonificazione', 'Ipertrofia', 'Dimagrimento', 'Forza', 'Resistenza', 'Mobilità', 'Benessere generale']
/** In vasca c'e' anche «Tecnica», che in sala non ha senso. */
const OBIETTIVI_VASCA = [...OBIETTIVI, 'Tecnica']
const DOVE: { valore: 'sala' | 'vasca'; testo: string }[] = [
  { valore: 'sala', testo: 'In sala' },
  { valore: 'vasca', testo: 'In vasca · Nuoto Libero' },
]
const LIVELLI: { valore: Questionario['livello']; testo: string; nota: string }[] = [
  { valore: 'principiante', testo: 'Principiante', nota: 'Ho iniziato da poco o riprendo dopo una pausa' },
  { valore: 'intermedio', testo: 'Intermedio', nota: 'Mi alleno con regolarità da almeno sei mesi' },
  { valore: 'esperto', testo: 'Esperto', nota: 'Mi alleno da anni e conosco bene gli esercizi' },
]
const ATTREZZATURE: { valore: Questionario['attrezzatura']; testo: string }[] = [
  { valore: 'sala_completa', testo: 'Tutta la sala' },
  { valore: 'manubri_e_corpo_libero', testo: 'Manubri e corpo libero' },
  { valore: 'corpo_libero', testo: 'Solo corpo libero' },
]
const ATTESA = [
  'L’agente sta leggendo le tue risposte…',
  'Sceglie gli esercizi dalla libreria del club…',
  'Decide serie, ripetizioni e recuperi…',
  'Divide il lavoro fra i giorni…',
  'Ancora qualche secondo…',
]
const ATTESA_VASCA = [
  'L’agente sta leggendo le tue risposte…',
  'Sceglie gli stili che sai nuotare…',
  'Dosa distanze e recuperi sui metri che nuoti di fila…',
  'Controlla che la seduta stia nel tuo tempo…',
  'Ancora qualche secondo…',
]

export function Agente() {
  const p = usePalette()
  const [dove, setDove] = useState<'sala' | 'vasca'>('sala')
  const [obiettivo, setObiettivo] = useState<string | null>(null)
  const [livello, setLivello] = useState<Questionario['livello'] | null>(null)
  const [giorni, setGiorni] = useState<number | null>(3)
  const [minuti, setMinuti] = useState<number | null>(60)
  const [attrezzatura, setAttrezzatura] = useState<Questionario['attrezzatura']>('sala_completa')
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
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 9000)
    return () => clearInterval(t)
  }, [inCorso])

  // «Tecnica» e' un obiettivo di vasca: tornando in sala non resta scelto.
  function scegliDove(v: 'sala' | 'vasca') {
    setDove(v)
    if (v === 'sala' && obiettivo === 'Tecnica') setObiettivo(null)
  }

  const inVasca = dove === 'vasca'
  const nuotoOk = saNuotareAbbastanza(stiliNuoto) && !!continuo && !!volteVasca && !!minutiVasca
  const pronto = !!obiettivo && !!livello && (inVasca ? nuotoOk : !!giorni && !!minuti)

  async function invia() {
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
      <Schermata sopratitolo="Agente AI" titolo={inVasca ? 'Il tuo piano di nuoto' : 'Il tuo piano'} indietro="/allenamento" barra={false}>
        <LinearGradient colors={['#8B5CF6', '#5B21B6']} style={stili.attesa}>
          <Icona nome="stella" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{(inVasca ? ATTESA_VASCA : ATTESA)[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vuole fino a un paio di minuti: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo="Agente AI"
      titolo={inVasca ? 'Un piano di nuoto su misura' : 'Un piano su misura'}
      indietro="/allenamento"
      barra={false}
      sottotitolo={
        inVasca
          ? 'Rispondi a qualche domanda: l’agente ti scrive le sedute da fare in vasca, con le distanze e i recuperi, dentro i metri che nuoti di fila. Poi lo guardi, lo modifichi e lo confermi.'
          : 'Rispondi a qualche domanda: l’agente sceglie gli esercizi dalla libreria del club e ti scrive il piano, coi recuperi. Poi lo guardi, lo modifichi e lo confermi.'
      }
    >
      <Sezione titolo="Dove ti alleni">
        <Scelte valori={DOVE} scelto={dove} onScegli={scegliDove} />
        {inVasca ? (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Un piano di nuoto si legge a bordo vasca: non ci sono chili da segnare, quindi non si registra come gli allenamenti in sala.</Text>
        ) : null}
      </Sezione>

      <Sezione titolo="Il tuo obiettivo">
        <Scelte valori={(inVasca ? OBIETTIVI_VASCA : OBIETTIVI).map((o) => ({ valore: o, testo: o }))} scelto={obiettivo} onScegli={setObiettivo} />
      </Sezione>

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
            <Scelte valori={[30, 45, 60, 75, 90].map((n) => ({ valore: n, testo: `${n} min` }))} scelto={minuti} onScegli={setMinuti} />
          </Sezione>

          <Sezione titolo="Cosa usi">
            <Scelte valori={ATTREZZATURE.map((a) => ({ valore: a.valore, testo: a.testo }))} scelto={attrezzatura} onScegli={setAttrezzatura} />
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
      </Sezione>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {inVasca && !!obiettivo && !!livello && !pronto ? (
        <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
          {!stiliNuoto.length || !continuo ? 'Scegli gli stili che sai e quanto nuoti di fila per continuare.' : 'Per scrivere il piano serve il Nuoto Libero: stile libero e dorso.'}
        </Text>
      ) : null}
      <Pulsante testo={inVasca ? 'Scrivi il mio piano di nuoto' : 'Scrivi il mio piano'} icona="stella" onPress={invia} disabilitato={!pronto} />
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        Il piano lo scrive un’intelligenza artificiale e lo confermi tu: i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o patologie parlane
        prima con {inVasca ? 'il tecnico a bordo vasca' : 'un istruttore in sala'}.
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  livello: { borderRadius: 20, padding: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  testo: { minHeight: 70, borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5, textAlignVertical: 'top' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
