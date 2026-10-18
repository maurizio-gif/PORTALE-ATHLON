import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import { chiediSchedaAi, type Questionario } from '@/api/lab'
import { spazio } from '@/theme'

import { mettiBozza, scartaBozza } from './bozza'
import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'

// Il piano scritto dall'agente AI: sei domande (obiettivo, livello, giorni,
// minuti, attrezzatura, limitazioni) e l'agente lo scrive usando solo gli
// esercizi accesi della libreria del club, coi recuperi. **Non e' ancora un
// piano del socio** (19/10/2026): torna una bozza, che l'editor fa rivedere e
// modificare, e solo alla conferma entra fra i suoi (origine «ai»). Ci mette
// fino a un paio di minuti.

const OBIETTIVI = ['Tonificazione', 'Ipertrofia', 'Dimagrimento', 'Forza', 'Resistenza', 'Mobilità', 'Benessere generale']
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

function Scelte<T extends string | number>({ valori, scelto, onScegli }: { valori: { valore: T; testo: string }[]; scelto: T | null; onScegli: (v: T) => void }) {
  const p = usePalette()
  return (
    <View style={stili.scelte}>
      {valori.map((v) => {
        const attivo = v.valore === scelto
        return (
          <Tocco
            key={String(v.valore)}
            vibra="scelta"
            stato={{ selected: attivo }}
            onPress={() => onScegli(v.valore)}
            etichetta={v.testo}
            style={[stili.scelta, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
          >
            <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14.5 }}>{v.testo}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

export function Agente() {
  const p = usePalette()
  const [obiettivo, setObiettivo] = useState<string | null>(null)
  const [livello, setLivello] = useState<Questionario['livello'] | null>(null)
  const [giorni, setGiorni] = useState<number | null>(3)
  const [minuti, setMinuti] = useState<number | null>(60)
  const [attrezzatura, setAttrezzatura] = useState<Questionario['attrezzatura']>('sala_completa')
  const [limitazioni, setLimitazioni] = useState('')
  const [note, setNote] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!inCorso) return
    setFrase(0)
    const t = setInterval(() => setFrase((f) => Math.min(ATTESA.length - 1, f + 1)), 9000)
    return () => clearInterval(t)
  }, [inCorso])

  const pronto = !!obiettivo && !!livello && !!giorni && !!minuti

  async function invia() {
    if (!pronto) return
    setErrore(null)
    setInCorso(true)
    const r = await chiediSchedaAi({ obiettivo: obiettivo!, livello: livello!, giorni: giorni!, minuti: minuti!, attrezzatura, limitazioni: limitazioni.trim(), note: note.trim() })
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
      <Schermata sopratitolo="Agente AI" titolo="Il tuo piano" indietro="/allenamento" barra={false}>
        <LinearGradient colors={['#8B5CF6', '#5B21B6']} style={stili.attesa}>
          <Icona nome="stella" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA[frase]}</Text>
          <Text style={stili.attesaNota}>Ci vuole fino a un paio di minuti: resta su questa pagina.</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  return (
    <Schermata sopratitolo="Agente AI" titolo="Un piano su misura" indietro="/allenamento" barra={false} sottotitolo="Rispondi a qualche domanda: l’agente sceglie gli esercizi dalla libreria del club e ti scrive il piano, coi recuperi. Poi lo guardi, lo modifichi e lo confermi.">
      <Sezione titolo="Il tuo obiettivo">
        <Scelte valori={OBIETTIVI.map((o) => ({ valore: o, testo: o }))} scelto={obiettivo} onScegli={setObiettivo} />
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

      <Sezione titolo="Quanti giorni a settimana">
        <Scelte valori={[1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, testo: String(n) }))} scelto={giorni} onScegli={setGiorni} />
      </Sezione>

      <Sezione titolo="Quanto dura una seduta">
        <Scelte valori={[30, 45, 60, 75, 90].map((n) => ({ valore: n, testo: `${n} min` }))} scelto={minuti} onScegli={setMinuti} />
      </Sezione>

      <Sezione titolo="Cosa usi">
        <Scelte valori={ATTREZZATURE.map((a) => ({ valore: a.valore, testo: a.testo }))} scelto={attrezzatura} onScegli={setAttrezzatura} />
      </Sezione>

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
            placeholder="Altro da sapere (facoltativo): un esercizio che ti piace, uno che eviti, uno sport che pratichi."
            placeholderTextColor={p.testoTerzo}
            multiline
            style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
          />
        </Carta>
      </Sezione>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo="Scrivi il mio piano" icona="stella" onPress={invia} disabilitato={!pronto} />
      <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
        Il piano lo scrive un’intelligenza artificiale e lo confermi tu: i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un
        medico: con dolori, infortuni o patologie parlane prima con un istruttore in sala.
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  scelte: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  scelta: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth },
  livello: { borderRadius: 20, padding: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  testo: { minHeight: 70, borderRadius: 14, padding: spazio.tre, fontFamily: F.medio, fontSize: 14.5, textAlignVertical: 'top' },
  avvertenza: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
