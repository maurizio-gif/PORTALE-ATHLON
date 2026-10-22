import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Animazione } from './ui/Animazione'
import { Icona } from './ui/Icona'
import { Carta, Entra, Etichetta, Pulsante, Sezione, Tag } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, NOTTE, usePalette } from './ui/tema'
import { Tocco } from './ui/Tocco'

// Una prova (14/10/2026): come si vedrebbe un giorno di scheda con le
// animazioni di tre librerie diverse, sugli stessi quattro esercizi, per
// scegliere quale usare. I fotogrammi stanno in public/anteprima-esercizi.
// Non e' ancora la scheda vera: i dati sono scritti qui.

type Fonte = 'flow' | 'workout-guide' | 'foto'

const FONTI: { chiave: Fonte; nome: string; nota: string; credito: string | null }[] = [
  {
    chiave: 'flow',
    nome: 'Flow',
    nota: t('1.257 esercizi animati · SVG · CC0 (anteprima, immagini generate con AI)', '1,257 animated exercises · SVG · CC0 (preview, AI-generated images)'),
    credito: null,
  },
  {
    chiave: 'workout-guide',
    nome: 'Workout Guide',
    nota: t('302 esercizi · 3 fotogrammi SVG · CC BY-SA 4.0', '302 exercises · 3 SVG frames · CC BY-SA 4.0'),
    credito: t('Illustrazioni: Workout Guide di Bryl Lim, da Everkinetic · CC BY-SA 4.0', 'Illustrations: Workout Guide by Bryl Lim, from Everkinetic · CC BY-SA 4.0'),
  },
  {
    chiave: 'foto',
    nome: t('Foto', 'Photos'),
    nota: t('876 esercizi · 2 foto (inizio e fine) · pubblico dominio', '876 exercises · 2 photos (start and end) · public domain'),
    credito: t('Foto: free-exercise-db · Unlicense', 'Photos: free-exercise-db · Unlicense'),
  },
]

type Esercizio = {
  nome: string
  muscoli: string
  serie: number
  ripetizioni: string
  carico: string
  recupero: number
  istruzioni: string[]
  media: Record<Fonte, { fotogrammi: string[]; sequenza?: number[]; durataMs: number }>
}

const flow = (id: string) => ({ fotogrammi: [0, 1, 2].map((n) => `/anteprima-esercizi/flow/${id}/frame-0${n}.svg`), sequenza: [0, 1, 2, 1], durataMs: 260 })
const wg = (slug: string) => ({ fotogrammi: [1, 2, 3].map((n) => `/anteprima-esercizi/workout-guide/${slug}/frame-${n}.svg`), sequenza: [0, 1, 2, 1], durataMs: 420 })
const foto = (id: string) => ({ fotogrammi: [0, 1].map((n) => `/anteprima-esercizi/foto/${id}/${n}.jpg`), durataMs: 1100 })

const GIORNO: Esercizio[] = [
  {
    nome: t('Squat con bilanciere', 'Barbell squat'),
    muscoli: t('Quadricipiti · glutei', 'Quads · glutes'),
    serie: 4,
    ripetizioni: '8',
    carico: '60 kg',
    recupero: 120,
    istruzioni: [
      t('Bilanciere appoggiato sui trapezi, piedi alla larghezza delle spalle.', 'Bar resting on your traps, feet shoulder-width apart.'),
      t('Scendi spingendo indietro le anche, schiena dritta e ginocchia in linea con i piedi.', 'Lower by pushing your hips back, back straight and knees in line with your feet.'),
      t('Arriva con le cosce almeno parallele al pavimento, poi risali spingendo coi talloni.', 'Go down until your thighs are at least parallel to the floor, then drive back up through your heels.'),
    ],
    media: { flow: flow('0043'), 'workout-guide': wg('squat'), foto: foto('Barbell_Squat') },
  },
  {
    nome: 'Chest press',
    muscoli: t('Petto · tricipiti', 'Chest · triceps'),
    serie: 3,
    ripetizioni: '10',
    carico: '40 kg',
    recupero: 90,
    istruzioni: [
      t('Regola il sedile: le maniglie all’altezza del petto.', 'Adjust the seat so the handles are at chest height.'),
      t('Spingi in avanti fino a distendere le braccia, senza bloccare i gomiti.', 'Push forward until your arms are extended, without locking your elbows.'),
      t('Torna indietro piano, fino a sentire il petto che si allunga.', 'Come back slowly, until you feel your chest stretch.'),
    ],
    media: { flow: flow('0577'), 'workout-guide': wg('machine-chest-press'), foto: foto('Leverage_Chest_Press') },
  },
  {
    nome: 'Lat machine',
    muscoli: t('Dorsali · bicipiti', 'Lats · biceps'),
    serie: 3,
    ripetizioni: '10',
    carico: '45 kg',
    recupero: 90,
    istruzioni: [
      t('Seduto, cosce bloccate sotto i rulli, presa larga sulla barra.', 'Seated, thighs locked under the pads, wide grip on the bar.'),
      t('Tira la barra verso la parte alta del petto portando i gomiti in basso e indietro.', 'Pull the bar to your upper chest, bringing your elbows down and back.'),
      t('Risali controllando, fino a distendere le braccia.', 'Return with control until your arms are extended.'),
    ],
    media: { flow: flow('2330'), 'workout-guide': wg('lat-pulldown'), foto: foto('Full_Range-Of-Motion_Lat_Pulldown') },
  },
  {
    nome: t('Curl con manubri', 'Dumbbell curl'),
    muscoli: t('Bicipiti', 'Biceps'),
    serie: 3,
    ripetizioni: '12',
    carico: '10 kg',
    recupero: 60,
    istruzioni: [
      t('In piedi, un manubrio per mano, braccia distese lungo i fianchi.', 'Standing, a dumbbell in each hand, arms extended at your sides.'),
      t('Piega i gomiti e porta i manubri verso le spalle, gomiti fermi accanto al busto.', 'Bend your elbows and bring the dumbbells toward your shoulders, elbows still by your sides.'),
      t('Scendi lentamente fino a distendere di nuovo le braccia.', 'Lower slowly until your arms are extended again.'),
    ],
    media: { flow: flow('0294'), 'workout-guide': wg('bicep-curl'), foto: foto('Dumbbell_Bicep_Curl') },
  },
]

const recupero = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}′${s % 60 ? ` ${s % 60}″` : ''}` : `${s}″`)

/** Il riquadro scuro con l'animazione: le foto restano a colori, a tutta larghezza. */
function Quadro({ e, fonte, grande = false }: { e: Esercizio; fonte: Fonte; grande?: boolean }) {
  const m = e.media[fonte]
  const lato = grande ? undefined : 104
  return (
    <LinearGradient
      colors={NOTTE}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[stili.quadro, grande ? { width: '100%', borderRadius: 28 } : { width: lato, height: lato }]}
    >
      <Animazione
        key={fonte}
        fotogrammi={m.fotogrammi}
        sequenza={m.sequenza}
        durataMs={m.durataMs}
        dissolvenza={fonte === 'foto'}
        riempi={fonte === 'foto'}
        etichetta={t(`${e.nome}, animazione`, `${e.nome}, animation`)}
        style={fonte === 'foto' ? { aspectRatio: grande ? 1.5 : 1 } : { padding: grande ? 18 : 6 }}
      />
    </LinearGradient>
  )
}

function Dettaglio({ e, fonte, onChiudi }: { e: Esercizio | null; fonte: Fonte; onChiudi: () => void }) {
  const p = usePalette()
  const ins = useSafeAreaInsets()
  return (
    <Modal visible={!!e} transparent animationType="slide" onRequestClose={onChiudi}>
      <View style={stili.velo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onChiudi} accessibilityLabel={t('Chiudi', 'Close')} />
        <View style={[stili.foglio, { backgroundColor: p.carta, paddingBottom: ins.bottom + spazio.tre }]} accessibilityViewIsModal>
          <View style={[stili.maniglia, { backgroundColor: p.incavo }]} />
          {e ? (
            <ScrollView contentContainerStyle={{ gap: spazio.tre + 2, padding: spazio.tre + 4, paddingTop: spazio.due }} showsVerticalScrollIndicator={false}>
              <View>
                <Quadro e={e} fonte={fonte} grande />
                <Tocco onPress={onChiudi} etichetta={t('Chiudi', 'Close')} style={stili.chiudi}>
                  <Icona nome="chiudi" size={18} colore="#fff" />
                </Tocco>
              </View>
              <View style={{ gap: 6 }}>
                <Tag testo={e.muscoli} colore={p.accento} />
                <Text style={[stili.titolo, { color: p.testo }]}>{e.nome}</Text>
              </View>
              <View style={[stili.cifre, { backgroundColor: p.incavo }]}>
                {[
                  { v: String(e.serie), l: t('Serie', 'Sets') },
                  { v: e.ripetizioni, l: t('Ripetizioni', 'Reps') },
                  { v: e.carico, l: t('Carico', 'Load') },
                  { v: recupero(e.recupero), l: t('Recupero', 'Rest') },
                ].map((c, i) => (
                  <View key={c.l} style={[stili.cifra, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
                    <Text style={[stili.cifraValore, { color: i === 3 ? p.blu : p.testo }]}>{c.v}</Text>
                    <Text style={[stili.cifraEtichetta, { color: p.testoSecondario }]}>{c.l}</Text>
                  </View>
                ))}
              </View>
              <View style={{ gap: spazio.due + 2 }}>
                {e.istruzioni.map((riga, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: spazio.tre - 4 }}>
                    <View style={[stili.numero, { backgroundColor: p.accento }]}>
                      <Text style={stili.numeroTesto}>{i + 1}</Text>
                    </View>
                    <Text style={[stili.istruzione, { color: p.testo }]}>{riga}</Text>
                  </View>
                ))}
              </View>
              <Pulsante testo={t('Chiudi', 'Close')} variante="secondario" onPress={onChiudi} />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

export function AnteprimaAnimazioni() {
  const p = usePalette()
  const [fonte, setFonte] = useState<Fonte>('flow')
  const [aperto, setAperto] = useState<Esercizio | null>(null)
  const scelta = FONTI.find((f) => f.chiave === fonte)!
  const minuti = Math.round(GIORNO.reduce((tot, e) => tot + e.serie * (45 + e.recupero), 0) / 60)

  return (
    <Schermata sopratitolo={t('Prova · animazioni degli esercizi', 'Test · exercise animations')} titolo={t('Giorno A · Forza', 'Day A · Strength')} indietro="/" barra={false}>
      <Sezione titolo={t('Quale libreria?', 'Which library?')}>
        <View style={[stili.selettore, { backgroundColor: p.incavo }]}>
          {FONTI.map((f) => {
            const qui = f.chiave === fonte
            return (
              <Tocco
                key={f.chiave}
                vibra="scelta"
                stato={{ selected: qui }}
                etichetta={f.nome}
                onPress={() => setFonte(f.chiave)}
                style={[stili.opzione, qui && { backgroundColor: p.testo }]}
              >
                <Text style={{ color: qui ? p.fondo : p.testoSecondario, fontFamily: qui ? F.extra : F.semi, fontSize: 14 }}>{f.nome}</Text>
              </Tocco>
            )
          })}
        </View>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{scelta.nota}</Text>
      </Sezione>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due }}>
        <Etichetta testo={t(`${GIORNO.length} esercizi`, `${GIORNO.length} exercises`)} tono="accento" icona="abbonamento" grande />
        <Etichetta testo={t(`circa ${minuti} min`, `about ${minuti} min`)} tono="blu" icona="orologio" grande />
        <Etichetta testo={t('recupero dopo ogni serie', 'rest after every set')} tono="neutro" icona="clessidra" grande />
      </View>

      <View style={{ gap: spazio.tre }}>
        {GIORNO.map((e, i) => (
          <Entra key={e.nome} indice={i}>
            <Carta onPress={() => setAperto(e)} style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre }}>
              <Quadro e={e} fonte={fonte} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[stili.ordine, { color: p.accento }]}>{t(`ESERCIZIO ${i + 1}`, `EXERCISE ${i + 1}`)}</Text>
                <Text style={[stili.nome, { color: p.testo }]}>{e.nome}</Text>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${e.serie} × ${e.ripetizioni} · ${e.carico}`}</Text>
                <View style={[stili.recupero, { backgroundColor: p.scuro ? 'rgba(91,140,255,0.16)' : 'rgba(47,107,255,0.10)' }]}>
                  <Icona nome="clessidra" size={13} colore={p.blu} />
                  <Text style={{ color: p.blu, fontFamily: F.extra, fontSize: 12 }}>{t(`Recupero ${recupero(e.recupero)}`, `Rest ${recupero(e.recupero)}`)}</Text>
                </View>
              </View>
              <Icona nome="avanti" size={16} colore={p.testoTerzo} />
            </Carta>
          </Entra>
        ))}
      </View>

      {scelta.credito ? <Text style={[stili.nota, { color: p.testoTerzo, textAlign: 'center' }]}>{scelta.credito}</Text> : null}
      <Dettaglio e={aperto} fonte={fonte} onChiudi={() => setAperto(null)} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  selettore: { flexDirection: 'row', borderRadius: 18, padding: 4 },
  opzione: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 14 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  quadro: { borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ordine: { fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1.2 },
  nome: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  recupero: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  foglio: { width: '100%', maxWidth: 560, maxHeight: '94%', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  maniglia: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  chiudi: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  cifre: { flexDirection: 'row', borderRadius: 20, paddingVertical: spazio.tre },
  cifra: { flex: 1, alignItems: 'center', gap: 2 },
  cifraValore: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  cifraEtichetta: { fontFamily: F.semi, fontSize: 11 },
  numero: { width: 24, height: 24, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numeroTesto: { color: '#fff', fontFamily: F.extra, fontSize: 12 },
  istruzione: { flex: 1, fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
})
