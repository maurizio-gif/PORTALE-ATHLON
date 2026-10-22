import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'

import { chiediPianoNuoto, saNuotareAbbastanza, type Continuo, type Questionario, type Stile } from '@/api/lab'
import { t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { mettiBozza, scartaBozza } from './bozza'
import { Scelte } from '../ui/Campi'
import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { CampiNuoto } from './CampiNuoto'
import { MINUTI_VASCA } from './nuoto'
import { eSalute, nomeObiettivo, OBIETTIVI_VASCA, OBIETTIVO_SALUTE, type CondizioneSalute } from './questionario'
import { SaluteBlocco } from './SaluteBlocco'

// Il piano di nuoto di «Componi il tuo piano»: il modulo di sempre, in vasca (20/10/2026). **In sala il questionario e' a passi**
// (`PassiSala.tsx`, 22/10/2026); per la vasca restano le domande di prima, e si rifanno dopo con domande sul nuoto.
//
// Chi sceglie la vasca (il Nuoto Libero) risponde a quante volte, quanto dura il turno, gli stili che sa nuotare e quanto nuota di fila,
// e gli si compone un **piano di nuoto**: gli stessi passi (bozza, editor, conferma), ma si legge a bordo vasca e non si registra. Il
// Nuoto Libero chiede stile libero e dorso: chi non li sa non manda la richiesta e legge dove si comincia. «Salute» non e' un obiettivo
// dell'agente, nemmeno in vasca (`SaluteBlocco`).

const LIVELLI: { valore: Questionario['livello']; testo: string; nota: string }[] = [
  { valore: 'principiante', testo: t('Principiante', 'Beginner'), nota: t('Ho iniziato da poco o riprendo dopo una pausa', 'I’ve just started or I’m getting back after a break') },
  { valore: 'intermedio', testo: t('Intermedio', 'Intermediate'), nota: t('Mi alleno con regolarità da almeno sei mesi', 'I’ve been training regularly for at least six months') },
  { valore: 'esperto', testo: t('Esperto', 'Advanced'), nota: t('Mi alleno da anni e conosco bene gli esercizi', 'I’ve been training for years and know the exercises well') },
]
const DOVE: { valore: 'sala' | 'vasca'; testo: string }[] = [
  { valore: 'sala', testo: t('In sala', 'In the gym') },
  { valore: 'vasca', testo: t('In vasca · Nuoto Libero', 'In the pool · Nuoto Libero') },
]
const ATTESA_VASCA = tv(
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

export function FormVasca({ onSala }: { onSala: () => void }) {
  const p = usePalette()
  const [obiettivo, setObiettivo] = useState<string | null>(null)
  // Sotto «Salute»: di cosa si tratta. Serve solo a dirlo al socio: qualunque sia, si va dal personal trainer.
  const [condizione, setCondizione] = useState<CondizioneSalute | null>(null)
  const [livello, setLivello] = useState<Questionario['livello'] | null>(null)
  // Quante sedute (da 1 a 4), quanto dura il turno, gli stili che sa e quanto nuota di fila.
  const [volteVasca, setVolteVasca] = useState<number | null>(2)
  const [minutiVasca, setMinutiVasca] = useState<30 | 45 | 60 | null>(60)
  const [stiliNuoto, setStiliNuoto] = useState<Stile[]>([])
  const [continuo, setContinuo] = useState<Continuo | null>(null)
  const [limitazioni, setLimitazioni] = useState('')
  const [note, setNote] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [frase, setFrase] = useState(0)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!inCorso) return
    setFrase(0)
    // La composizione dura una decina di secondi (a volte una ventina): una frase ogni cinque, l'ultima resta.
    const timer = setInterval(() => setFrase((f) => Math.min(ATTESA_VASCA.length - 1, f + 1)), 5000)
    return () => clearInterval(timer)
  }, [inCorso])

  function scegliObiettivo(o: string) {
    setObiettivo(o)
    if (!eSalute(o)) setCondizione(null)
  }

  const salute = eSalute(obiettivo)
  const nuotoOk = saNuotareAbbastanza(stiliNuoto) && !!continuo && !!volteVasca && !!minutiVasca
  const pronto = !!obiettivo && !salute && !!livello && nuotoOk

  async function invia() {
    // Salute non parte mai: la funzione la rifiuterebbe, e al suo posto c'e' il riquadro del personal trainer.
    if (!pronto) return
    setErrore(null)
    setInCorso(true)
    const r = await chiediPianoNuoto({ obiettivo: obiettivo!, livello: livello!, volte: volteVasca!, minuti: minutiVasca!, stili: stiliNuoto, continuo: continuo!, limitazioni: limitazioni.trim(), note: note.trim() })
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
      <Schermata sopratitolo={t('Piani di allenamento', 'Workout plans')} titolo={t('Il tuo piano di nuoto', 'Your swim plan')} indietro="/allenamento" barra={false}>
        <LinearGradient colors={FUOCO} style={stili.attesa}>
          <Icona nome="goccia" size={44} colore="#fff" />
          <ActivityIndicator color="#fff" />
          <Text style={stili.attesaTesto}>{ATTESA_VASCA[frase]}</Text>
          <Text style={stili.attesaNota}>{t('Ci vuole in genere meno di un minuto: resta su questa pagina.', 'It usually takes less than a minute: stay on this page.')}</Text>
        </LinearGradient>
      </Schermata>
    )
  }

  return (
    <Schermata
      sopratitolo={t('Piani di allenamento', 'Workout plans')}
      titolo={t('Componi il tuo piano di nuoto', 'Build your swim plan')}
      indietro="/allenamento"
      barra={false}
      sottotitolo={t(
        'Generiamo insieme il tuo piano di nuoto: rispondi a qualche domanda e ti scriviamo le sedute da fare in vasca, con le distanze e i recuperi, dentro i metri che nuoti di fila. Poi lo guardi, lo modifichi e lo confermi.',
        'Let’s build your swim plan together: answer a few questions and we’ll write your pool sessions, with distances and rest, within how far you swim without stopping. Then you review it, edit it and confirm it.',
      )}
    >
      <Sezione titolo={t('Dove ti alleni', 'Where you train')}>
        <Scelte valori={DOVE} scelto="vasca" onScegli={(v) => v === 'sala' && onSala()} />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(
            'Un piano di nuoto si legge a bordo vasca: non ci sono chili da segnare, quindi non si registra come gli allenamenti in sala.',
            'A swim plan is read at the poolside: there are no weights to log, so it isn’t recorded like gym workouts.',
          )}
        </Text>
      </Sezione>

      <Sezione titolo={t('Il tuo obiettivo', 'Your goal')}>
        <Scelte valori={[...OBIETTIVI_VASCA, OBIETTIVO_SALUTE].map((o) => ({ valore: o as string, testo: nomeObiettivo(o) }))} scelto={obiettivo} onScegli={scegliObiettivo} />
      </Sezione>

      {salute ? (
        <SaluteBlocco condizione={condizione} onCondizione={setCondizione} />
      ) : (
        <>
          <Sezione titolo={t('Il tuo livello', 'Your level')}>
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

          <Sezione titolo={t('Quante volte a settimana in vasca', 'How many times a week in the pool')}>
            <Scelte valori={[1, 2, 3, 4].map((n) => ({ valore: n, testo: String(n) }))} scelto={volteVasca} onScegli={setVolteVasca} />
          </Sezione>

          <Sezione titolo={t('Quanto dura una seduta', 'How long a session lasts')}>
            <Scelte valori={MINUTI_VASCA.map((n) => ({ valore: n, testo: `${n} min` }))} scelto={minutiVasca} onScegli={setMinutiVasca} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                'Il turno del Nuoto Libero dura un’ora: la seduta può essere più corta, mai più lunga di quanto indichi.',
                'A Nuoto Libero slot lasts an hour: the session can be shorter, but never longer than you say.',
              )}
            </Text>
          </Sezione>

          <CampiNuoto stili={stiliNuoto} onStili={setStiliNuoto} continuo={continuo} onContinuo={setContinuo} />

          <Sezione titolo={t('Limitazioni o infortuni', 'Limitations or injuries')}>
            <Carta style={{ gap: spazio.due }}>
              <TextInput
                value={limitazioni}
                onChangeText={(x) => setLimitazioni(x.slice(0, 500))}
                placeholder={t('Per esempio: mal di schiena, una spalla da proteggere, il ginocchio operato. Lascia vuoto se non ne hai.', 'For example: back pain, a shoulder to protect, a knee that’s had surgery. Leave blank if you have none.')}
                placeholderTextColor={p.testoTerzo}
                multiline
                style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
              />
              <TextInput
                value={note}
                onChangeText={(x) => setNote(x.slice(0, 500))}
                placeholder={t('Altro da sapere (facoltativo): uno stile che ami o che eviti, una gara che prepari.', 'Anything else (optional): a stroke you love or avoid, a race you’re training for.')}
                placeholderTextColor={p.testoTerzo}
                multiline
                style={[stili.testo, { color: p.testo, backgroundColor: p.incavo }]}
              />
            </Carta>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t('Per un recupero o una patologia scegli «Salute» come obiettivo: ti segue un personal trainer.', 'For recovery or a medical condition, choose “Health” as your goal: a personal trainer will work with you.')}
            </Text>
          </Sezione>

          {errore ? <Messaggio>{errore}</Messaggio> : null}
          {!!obiettivo && !!livello && !pronto ? (
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
              {!stiliNuoto.length || !continuo
                ? t('Scegli gli stili che sai e quanto nuoti di fila per continuare.', 'Choose the strokes you know and how far you swim without stopping to continue.')
                : t('Per comporre il piano serve il Nuoto Libero: stile libero e dorso.', 'The plan is for Nuoto Libero, which needs freestyle and backstroke.')}
            </Text>
          ) : null}
          <Pulsante testo={t('Componi il mio piano di nuoto', 'Build my swim plan')} icona="goccia" onPress={invia} disabilitato={!pronto} />
          {/* La postilla: che dietro ci sia un'intelligenza artificiale si dice qui, in piccolo, e di nuovo sul piano composto. */}
          <Text style={[stili.avvertenza, { color: p.testoTerzo }]}>
            {t(
              'Il piano è preparato con il supporto di un’intelligenza artificiale e lo confermi tu: i trainer del club lo possono vedere dal pannello. Non sostituisce il parere di un medico: con dolori, infortuni o patologie parlane prima con il tecnico a bordo vasca.',
              'The plan is prepared with the help of artificial intelligence and you confirm it: the club’s trainers can see it from their panel. It doesn’t replace a doctor’s advice: if you have pain, injuries or medical conditions, talk to the coach at the poolside first.',
            )}
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
  attesa: { borderRadius: 30, padding: spazio.cinque, alignItems: 'center', gap: spazio.tre },
  attesaTesto: { color: '#fff', fontFamily: F.extra, fontSize: 19, textAlign: 'center', letterSpacing: -0.4 },
  attesaNota: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, textAlign: 'center' },
})
