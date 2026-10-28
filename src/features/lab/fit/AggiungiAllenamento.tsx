import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { aggiungiAllenamento, eliminaAllenamento, type IntensitaManuale, type SportManuale } from '@/api/dispositivi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { nomeSport, stimaAllenamento } from '../dispositivi/allenamentiDispositivo'
import { durata, giornoBreve, minutiDelGiorno } from '../dispositivi/comune'
import { relaxAperto, type Dispositivi } from '../dispositivi/useDispositivi'
import { useStatoCorpo } from '../schede/CalorieLezione'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { Bollino, Carta, Messaggio, Pulsante } from '../ui/kit'
import { Foglio } from '../ui/Foglio'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { ora, SceltaOra } from './CheckInSonno'

// «Aggiungi un allenamento» (28/10/2026, richiesta di Maurizio: «se mi alleno all'esterno tre ore in bici, come lo inserisco?»).
// Per quello che non passa dall'app e non ha un orologio che lo registri: sport, quando, quanto e quanto e' stato intenso;
// il battito medio, se lo si conosce, e' facoltativo e rende la stima piu' vera. Le calorie le stima l'app (formule in
// dispositivi/allenamentiDispositivo.ts: dal battito, se c'e', altrimenti un valore standard per sport e intensita') e la funzione le
// controlla. Conta nei giorni attivi dell'Athlon Health Score e nelle calorie, e si puo' togliere. Stesso consenso dei dispositivi.

const SPORT: SportManuale[] = ['bici', 'corsa', 'camminata', 'escursione', 'nuoto', 'canottaggio', 'yoga', 'danza', 'sci', 'altro']
const INTENSITA: { id: IntensitaManuale; nome: () => string; aiuto: () => string }[] = [
  { id: 'leggera', nome: () => t('Leggera', 'Easy'), aiuto: () => t('Riesci a parlare senza fatica', 'You can talk easily') },
  { id: 'media', nome: () => t('Media', 'Moderate'), aiuto: () => t('Fiato un po’ più corto', 'A bit short of breath') },
  { id: 'intensa', nome: () => t('Intensa', 'Hard'), aiuto: () => t('Parli a fatica', 'Talking is hard') },
]

const giornoNome = (g: string, oggi: string) => (g === oggi ? t('Oggi', 'Today') : g === spostaGiorno(oggi, -1) ? t('Ieri', 'Yesterday') : giornoBreve(g).split(' ').slice(0, 2).join(' '))

function Pillola({ testo, scelta, onPress }: { testo: string; scelta: boolean; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco onPress={onPress} vibra="scelta" ruolo="radio" stato={{ selected: scelta }} etichetta={testo} style={[stili.pillola, { backgroundColor: scelta ? p.accento : p.incavo }]}>
      <Text style={[stili.pillolaTesto, { color: scelta ? '#fff' : p.testo }]}>{testo}</Text>
    </Tocco>
  )
}

export function AggiungiAllenamento({ disp, compatto = false }: { disp: Dispositivi; compatto?: boolean }) {
  const p = usePalette()
  const corpo = useStatoCorpo()
  const oggi = oggiRoma()
  const [aperto, setAperto] = useState(false)
  const [sport, setSport] = useState<SportManuale>('bici')
  const [giorno, setGiorno] = useState(oggi)
  const [inizio, setInizio] = useState('08:00')
  const [minuti, setMinuti] = useState(60)
  const [intensita, setIntensita] = useState<IntensitaManuale>('media')
  const [fc, setFc] = useState<number | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const stima = useMemo(
    () => stimaAllenamento({ sport, durata_minuti: minuti, calorie: null, fc_media: fc, intensita }, corpo.stato === 'ok' ? corpo.corpo : null),
    [sport, minuti, fc, intensita, corpo],
  )

  if (disp.vista || !relaxAperto(disp.stato)) return null
  const consenso = !!(disp.stato?.ok && disp.stato.consenso)
  const sette = Array.from({ length: 7 }, (_, i) => spostaGiorno(oggi, -i))
  const miei = (disp.dati?.allenamenti ?? []).filter((a) => a.fornitore === 'manuale').sort((a, b) => b.inizio.localeCompare(a.inizio)).slice(0, 3)

  // L'ora scritta e' di Roma: l'istante si ricava da giorno e ora come li vede chi si allena (a Roma l'app e' usata cosi').
  const istante = () => {
    const [h, m] = inizio.split(':').map(Number)
    const [a, me, g] = giorno.split('-').map(Number)
    return new Date(a, me - 1, g, h, m).toISOString()
  }

  async function salva() {
    setInCorso(true)
    setErrore(null)
    const r = await aggiungiAllenamento({ inizio: istante(), durata_minuti: minuti, sport, intensita, calorie: stima?.kcal ?? null, fc_media: fc })
    setInCorso(false)
    if (!r.ok) return setErrore(r.errore)
    disp.imposta(r)
    setAperto(false)
  }

  async function togli(id: string) {
    const r = await eliminaAllenamento(id)
    if (r.ok) disp.imposta(r)
  }

  return (
    <>
      <Carta style={{ gap: spazio.due }}>
        <View style={stili.testa}>
          <Bollino icona="aggiungi" tono="accento" size={compatto ? 36 : 46} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.titolo, { color: p.testo }, compatto && { fontSize: 16 }]}>{t('Aggiungi un allenamento', 'Add a workout')}</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }, compatto && { fontSize: 13, lineHeight: 18 }]}>{compatto ? t('Anche senza orologio: conta nel punteggio e nelle calorie.', 'Even without a watch: it counts toward your score and calories.') : t('Una pedalata, una corsa, una camminata… anche senza orologio: conta nel tuo punteggio e nelle calorie.', 'A ride, a run, a walk… even without a watch: it counts toward your score and calories.')}</Text>
          </View>
          {compatto ? <Pulsante testo={t('Aggiungi', 'Add')} icona="aggiungi" piccolo onPress={() => (consenso ? setAperto(true) : router.push('/allenamento/dispositivi'))} /> : null}
        </View>
        {miei.map((a) => (
          <View key={a.id} style={stili.riga}>
            <Text style={[stili.nota, { color: p.testo, flex: 1 }]} numberOfLines={1}>
              {`${nomeSport(a.sport)} · ${durata(a.durata_minuti)} · ${giornoBreve(a.inizio.slice(0, 10))}`}
            </Text>
            <Tocco onPress={() => togli(a.id)} etichetta={t('Togli', 'Remove')} style={stili.togli}>
              <Text style={[stili.piccola, { color: p.testoSecondario, fontFamily: F.bold }]}>{t('Togli', 'Remove')}</Text>
            </Tocco>
          </View>
        ))}
        {compatto ? null : <Pulsante testo={t('Aggiungi', 'Add')} icona="aggiungi" onPress={() => (consenso ? setAperto(true) : router.push('/allenamento/dispositivi'))} />}
        {!consenso ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('Prima serve il consenso ai dati dei dispositivi (il battito e le calorie sono dati sulla salute).', 'First we need your consent to device data (heart rate and calories are health data).')}</Text> : null}
      </Carta>

      <Foglio aperto={aperto} titolo={t('Aggiungi un allenamento', 'Add a workout')} onChiudi={() => setAperto(false)}>
        <View style={{ gap: spazio.tre }}>
          <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('Che sport?', 'Which sport?')}</Text>
          <View style={stili.griglia}>
            {SPORT.map((s) => (
              <Pillola key={s} testo={nomeSport(s)} scelta={s === sport} onPress={() => setSport(s)} />
            ))}
          </View>

          <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('Quando?', 'When?')}</Text>
          <View style={stili.griglia}>
            {sette.map((g) => (
              <Pillola key={g} testo={giornoNome(g, oggi)} scelta={g === giorno} onPress={() => setGiorno(g)} />
            ))}
          </View>
          <SceltaOra titolo={t('Sono partito alle', 'I started at')} valore={inizio} onSposta={(d) => setInizio((v) => ora(minutiDelGiorno(v) + d))} />
          <SceltaOra titolo={t('Per quanto tempo?', 'For how long?')} valore={durata(minuti)} onSposta={(d) => setMinuti((m) => Math.min(720, Math.max(5, m + d)))} />

          <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{t('Quanto è stato intenso?', 'How hard was it?')}</Text>
          <View style={stili.griglia}>
            {INTENSITA.map((i) => (
              <Pillola key={i.id} testo={i.nome()} scelta={i.id === intensita} onPress={() => setIntensita(i.id)} />
            ))}
          </View>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{INTENSITA.find((i) => i.id === intensita)?.aiuto()}</Text>

          <SceltaOra
            titolo={t('Battito medio (facoltativo)', 'Average heart rate (optional)')}
            valore={fc ? `${fc} bpm` : '—'}
            onSposta={(d) => setFc((v) => Math.min(200, Math.max(60, (v ?? 120) + (v === null ? 0 : d / 3))))}
          />
          {fc ? (
            <Tocco onPress={() => setFc(null)} etichetta={t('Togli il battito', 'Clear heart rate')} style={stili.togli}>
              <Text style={[stili.piccola, { color: p.testoSecondario, fontFamily: F.bold }]}>{t('Non lo so', 'I don’t know')}</Text>
            </Tocco>
          ) : null}

          <Text style={[stili.nota, { color: p.testo }]} accessibilityLiveRegion="polite">
            {stima
              ? t(`Circa ${stima.kcal} kcal, ${stima.metodo === 'battito' ? 'stimate dal battito' : 'stimate da sport e intensità'}. È una stima.`, `About ${stima.kcal} kcal, estimated from ${stima.metodo === 'battito' ? 'heart rate' : 'sport and intensity'}. It’s an estimate.`)
              : t('Per stimare le calorie servono peso, altezza, età e sesso: l’allenamento conta lo stesso nel punteggio.', 'To estimate calories we need weight, height, age and sex: the workout still counts toward your score.')}
          </Text>
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={t('Salva l’allenamento', 'Save workout')} icona="spunta" inCorso={inCorso} onPress={salva} />
        </View>
      </Foglio>
    </>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  etichetta: { fontFamily: F.semi, fontSize: 13 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due - 2 },
  pillola: { borderRadius: 999, paddingHorizontal: 14, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  pillolaTesto: { fontFamily: F.bold, fontSize: 13 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  togli: { paddingHorizontal: 8, minHeight: 32, justifyContent: 'center' },
})
