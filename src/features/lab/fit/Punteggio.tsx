import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { locale, t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { RigaClassificaNellaCarta } from '../classifica/RigaNellaCarta'
import { useClassifica } from '../classifica/useClassifica'
import { useDispositivi, type Dispositivi } from '../dispositivi/useDispositivi'
import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Barra, Carta, Entra, Messaggio, Pulsante, Scheletro, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, ORTO, RELAX, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CURVA_TRAIN, GIORNI_FOOD, MINUTI_GIORNO_ATTIVO, NOTTI_RELAX, PESI, PUNTI, type Banda, type IdPilastro, type Pilastro, type Punteggio, type Settimana } from './calcoloPunteggio'
import { useFit, type DatiFit } from './useFit'
import { RigaLivello, SezioneLivelli } from './Livelli'
import { useLivelli, type Livelli } from './useLivelli'
import { usePunteggio } from './usePunteggio'

// L'Athlon Health Score (20/10/2026): il punteggio da 0 a 100 di Athlon Health System. La carta
// sta in cima a Fit (l'anello a tre settori, i tre pilastri, gli ultimi sette giorni), e la sua
// schermata (/allenamento/punteggio) spiega com'e' fatto: ogni pilastro con la sua riga, le ultime
// quattro settimane di allenamento e le regole. Il calcolo sta in calcoloPunteggio.ts (puro).
// **Descrive, non giudica**: le bande sono parole morbide («Si comincia», «Buon ritmo»), niente
// traguardi che dicano cosa fare. **L'unico confronto con altri soci e' la classifica del mese** (29/10/2026,
// `classifica/`), e solo per chi sceglie di entrarci: il punteggio in se' non confronta niente.

const COLORI: Record<IdPilastro, string> = { train: FUOCO[1], food: ORTO[1], relax: RELAX[1] }
const ICONE: Record<IdPilastro, NomeIcona> = { train: 'peso', food: 'piatto', relax: 'foglia' }

const AREE: Record<IdPilastro, string> = { train: 'train', food: 'food', relax: 'relax' }
const apriArea = (id: IdPilastro) => router.navigate({ pathname: '/allenamento', params: { area: AREE[id] } })
const apriPunteggio = () => router.push('/allenamento/punteggio')

const SIGLE = tv(['D', 'L', 'M', 'M', 'G', 'V', 'S'], ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
const sigla = (g: string) => SIGLE[new Date(`${g}T12:00:00Z`).getUTCDay()]
const dataCorta = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })
const breve = (g: string) => dataCorta.format(new Date(`${g}T12:00:00Z`))
/** La banda come si legge: il valore resta quello del calcolo. */
const BANDE_EN: Record<Banda, string> = { 'Si comincia': 'Getting started', 'Sulla strada': 'On your way', 'Buon ritmo': 'Good pace', 'Ottimo ritmo': 'Great pace', 'In equilibrio': 'In balance' }
const nomeBanda = (b: Banda) => t(b, BANDE_EN[b])
/** «points» in inglese, al singolare per uno. */
const pt = (x: number) => (x === 1 ? 'point' : 'points')

// ---------------------------------------------------------------------------
// L'anello: un settore per pilastro, grande quanto i suoi punti; si riempie quanto i punti presi

const R = 50
const GIRO = 2 * Math.PI * R
/** Lo spazio fra un settore e il successivo, in unita' di lunghezza del cerchio. */
const VUOTO = 4

export function Anello({ p, size = 132, chiaro = true }: { p: Punteggio; size?: number; chiaro?: boolean }) {
  const pal = usePalette()
  const [ref, visibile] = useVisibile()
  const prog = useProgresso(1300, 150, visibile)
  const pilastri = [p.train, p.food, p.relax].filter((x) => x.stato === 'attivo' || x.stato === 'spento')
  const riferimento = pilastri.reduce((s, x) => s + x.max, 0)
  const vuoto = pilastri.length > 1 ? VUOTO : 0
  let inizio = 0
  const settori = pilastri.map((x) => {
    const lungo = (x.max / riferimento) * GIRO
    const s = { x, inizio, lunghezza: Math.max(1, lungo - vuoto) }
    inizio += lungo
    return s
  })
  const fondo = chiaro ? 'rgba(255,255,255,0.14)' : pal.incavo
  return (
    <View ref={ref} collapsable={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}  aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {settori.map(({ x, inizio: da, lunghezza }) => (
          <Circle key={`f-${x.id}`} cx={60} cy={60} r={R} stroke={fondo} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${lunghezza} ${GIRO}`} strokeDashoffset={-da} transform="rotate(-90 60 60)" />
        ))}
        {settori.map(({ x, inizio: da, lunghezza }) => {
          const pieno = lunghezza * Math.max(0, Math.min(1, x.punti / x.max)) * prog
          if (pieno < 0.5) return null
          return <Circle key={`p-${x.id}`} cx={60} cy={60} r={R} stroke={COLORI[x.id]} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${pieno} ${GIRO}`} strokeDashoffset={-da} transform="rotate(-90 60 60)" />
        })}
      </Svg>
      <View style={stili.anelloCentro} pointerEvents="none">
        <Text style={[stili.anelloNumero, { color: chiaro ? '#fff' : pal.testo, fontSize: size * 0.3 }]} numberOfLines={1} adjustsFontSizeToFit>
          {Math.round(p.totale * prog)}
        </Text>
        <Text style={[stili.anelloSu, { color: chiaro ? 'rgba(255,255,255,0.65)' : pal.testoSecondario }]}>{t(`su ${p.su}`, `out of ${p.su}`)}</Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// I pallini degli ultimi sette giorni di allenamento

function Pallini({ giorni, chiaro = true }: { giorni: Punteggio['train7']; chiaro?: boolean }) {
  const pal = usePalette()
  const spento = chiaro ? 'rgba(255,255,255,0.16)' : pal.incavo
  const testo = chiaro ? 'rgba(255,255,255,0.65)' : pal.testoSecondario
  return (
    <View style={stili.pallini} accessibilityLabel={t(`Ultimi 7 giorni: ${giorni.filter((g) => g.attivo).length} con un allenamento`, `Last 7 days: ${giorni.filter((g) => g.attivo).length} with a workout`)}>
      {giorni.map((g, i) => (
        <View key={g.giorno} style={{ alignItems: 'center', gap: 4 }}>
          <View style={[stili.pallino, { backgroundColor: g.attivo ? FUOCO[1] : spento }]}>{g.attivo ? <Icona nome="spunta" size={12} colore="#fff" /> : null}</View>
          <Text style={[stili.pallinoSigla, { color: i === giorni.length - 1 ? (chiaro ? '#fff' : pal.testo) : testo }]}>{sigla(g.giorno)}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// La carta in cima a Fit

function RigaPilastro({ x }: { x: Pilastro }) {
  const attivo = x.stato === 'attivo'
  const parola = attivo ? `${x.punti}` : '—'
  return (
    <View style={stili.pilastro} accessibilityLabel={attivo ? t(`${x.nome}: ${x.punti} punti su ${x.max}`, `${x.nome}: ${x.punti} ${pt(x.punti)} out of ${x.max}`) : t(`${x.nome}: da attivare, fino a ${x.max} punti`, `${x.nome}: not turned on yet, up to ${x.max} points`)}>
      <View style={[stili.pilastroPuntino, { backgroundColor: attivo ? COLORI[x.id] : 'rgba(255,255,255,0.25)' }]} />
      <Text style={stili.pilastroNome}>{x.nome}</Text>
      <Text style={stili.pilastroPunti}>
        <Text style={{ color: attivo ? '#fff' : 'rgba(255,255,255,0.55)', fontFamily: F.extra }}>{parola}</Text>
        {` / ${x.max}`}
      </Text>
    </View>
  )
}

/** La carta di Fit: legge il punteggio e i livelli e li disegna. */
export function CartaPunteggio({ fit, disp, apri = true }: { fit: DatiFit; disp: Dispositivi; apri?: boolean }) {
  const p = usePunteggio(fit, disp)
  const livelli = useLivelli(fit, disp, p)
  // La classifica del mese (29/10/2026): una riga sotto il livello, che c'e' solo dove la funzione c'e' e la persona e' maggiorenne.
  const classifica = useClassifica(fit.vista)
  // Le lezioni con la presenza segnata dalla reception nelle stesse quattro settimane del punteggio: e' quello che c'e'
  // anche per chi non ha mai scritto un dato (il «da dove arriva» le nomina e dice quante sono).
  const lezioni = (() => {
    const da = p?.dettaglio.train.settimane.at(-1)?.da
    const fino = p?.dettaglio.train.settimane[0]?.a
    if (!da || !fino || !fit.sessioni) return undefined
    return fit.sessioni.filter((x) => x.fonte === 'lezione' && x.giorno >= da && x.giorno <= fino).length
  })()
  return <CartaPunteggioVista p={p} livelli={livelli} apri={apri} lezioni={lezioni} classifica={<RigaClassificaNellaCarta c={classifica} />} />
}

/** «Da dove arriva» (24/10/2026): una riga, subito sotto il titolo, che dice cosa conta e che non c'e' niente da inserire. */
function DaDoveArriva({ p, lezioni }: { p: Punteggio | null; lezioni?: number }) {
  const conAltri = !p || [p.food, p.relax].some((x) => x.stato !== 'nonDisponibile')
  const registrate = lezioni
    ? t(
        lezioni === 1 ? 'ne risulta 1 registrata nelle ultime 4 settimane' : `ne risultano ${lezioni} registrate nelle ultime 4 settimane`,
        lezioni === 1 ? 'there is 1 registered in the last 4 weeks' : `there are ${lezioni} registered in the last 4 weeks`,
      )
    : null
  return (
    <Text style={stili.origine}>
      <Text style={stili.origineForte}>{t('Da dove arriva: ', 'Where it comes from: ')}</Text>
      {t('dalle lezioni che hai fatto', 'from the classes you’ve done')}
      {registrate ? ` (${registrate})` : ''}
      {t(', dagli allenamenti registrati', ', from your logged workouts')}
      {conAltri ? t(' e poi da Food e Recover, se li usi.', ' and then from Food and Recover, if you use them.') : '.'}
    </Text>
  )
}

/** Quello che si vede: separato dai dati perche' la schermata del dettaglio li legge una volta sola e li passa anche alla sezione dei livelli. */
export function CartaPunteggioVista({ p, livelli, apri = true, lezioni, classifica }: { p: Punteggio | null; livelli: Livelli; apri?: boolean; /** La riga della classifica del mese (29/10/2026), sotto il livello: manca dove la classifica non c'e'. */ classifica?: ReactNode; /** Le lezioni con la presenza segnata nelle ultime quattro settimane: se c'e', la riga «da dove arriva» le conta. */ lezioni?: number }) {
  const contenuto = (
    <View style={{ gap: spazio.tre }}>
      {apri ? (
        <View style={stili.testa}>
          <LinearGradient colors={[FUOCO[1], ORTO[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
            <Icona nome="stella" size={20} colore="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={stili.titolo}>Athlon Health Score</Text>
            <Text style={stili.sotto}>{t('Allenamento, alimentazione e recupero · ultime 4 settimane', 'Training, nutrition and recovery · last 4 weeks')}</Text>
          </View>
          {p ? <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.7)" /> : null}
        </View>
      ) : (
        <Text style={stili.sotto}>{t('Allenamento, alimentazione e recupero. La media delle ultime quattro settimane, la più recente pesa di più.', 'Training, nutrition and recovery. The average of the last four weeks, with the most recent counting more.')}</Text>
      )}

      {apri ? <DaDoveArriva p={p} lezioni={lezioni} /> : null}

      {!p ? (
        <View style={{ gap: spazio.tre }}>
          <Scheletro altezza={132} larghezza={132} tondo={66} style={{ alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={stili.testo}>{t('Calcoliamo il tuo punteggio…', 'Calculating your score…')}</Text>
        </View>
      ) : (
        <>
          <View style={stili.corpo}>
            <Anello p={p} />
            <View style={{ flex: 1, gap: spazio.due }}>
              <Text style={stili.banda}>{nomeBanda(p.banda)}</Text>
              <View style={{ gap: 6 }}>
                {[p.train, p.food, p.relax]
                  .filter((x) => x.stato !== 'nonDisponibile' && x.stato !== 'escluso')
                  .map((x) => (
                    <RigaPilastro key={x.id} x={x} />
                  ))}
              </View>
            </View>
          </View>
          <Pallini giorni={p.train7} />
          <Text style={stili.testo}>{p.train.frase}</Text>
          {livelli.disponibile && livelli.stato ? (
            <>
              <View style={stili.separatore} />
              <RigaLivello stato={livelli.stato} />
            </>
          ) : null}
          {p.rapportato ? <Text style={stili.piccola}>{t('Il punteggio è calcolato sui pilastri che usi.', 'Your score is based on the pillars you use.')}</Text> : null}
          {p.invito.length ? (
            <Text style={stili.piccola}>{t(`Con ${p.invito.map((i) => (i.id === 'food' ? 'Food' : 'Recover')).join(' e ')} puoi arrivare fino a 100.`, `With ${p.invito.map((i) => (i.id === 'food' ? 'Food' : 'Recover')).join(' and ')} you can reach 100.`)}</Text>
          ) : null}
        </>
      )}
    </View>
  )
  // **La riga della classifica sta fuori dal tocco che apre il dettaglio** (29/10/2026): un comando dentro un altro, sul web, e' un `<button>` dentro
  // un `<button>` (non valido: in alcuni browser il tocco interno non parte). Il fondo scuro e' di tutta la carta; il tocco copre tutto tranne la riga.
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cornice}>
      {apri && p ? (
        <Tocco onPress={apriPunteggio} etichetta={t(`Athlon Health Score: ${p.totale} su ${p.su}. ${p.banda}. Apri il dettaglio`, `Athlon Health Score: ${p.totale} out of ${p.su}. ${nomeBanda(p.banda)}. Open details`)} scala={0.985}>
          {contenuto}
        </Tocco>
      ) : (
        contenuto
      )}
      {apri && p && classifica ? (
        <>
          <View style={stili.separatore} />
          {classifica}
        </>
      ) : null}
    </LinearGradient>
  )
}

// ---------------------------------------------------------------------------
// La schermata del dettaglio

/**
 * Cosa c'e' dietro ogni pilastro (01/11/2026, richiesta di Maurizio): e' la sostanza della vecchia carta introduttiva di Fit («Il benessere e' un equilibrio»),
 * che ripeteva il punteggio e ora non c'e' piu'. **Non nomina il Balance**, che sta nell'area Food.
 */
const DI_COSA_SI_TRATTA: Record<IdPilastro, () => string> = {
  train: () => t('Allenarsi il giusto, non troppo: i tuoi piani di allenamento, il registro dei pesi, il test dei massimali e le calorie che consumi.', 'Training the right amount, not too much: your workout plans, the weights log, the max test and the calories you burn.'),
  food: () => t('Mangiare bene: il diario dei pasti, la foto del piatto e i consigli. Si apre dopo aver accettato la sua informativa, e i dati li vedi solo tu.', 'Eating well: the meal diary, the photo of your plate and the tips. It opens after you accept its privacy notice, and only you see the data.'),
  relax: () => t('Recuperare: il sonno, i giorni di riposo, la mobilità e il foam roller fanno parte dell’allenamento, perché è lì che il corpo si rimette in forze.', 'Recovering: sleep, rest days, mobility and foam rolling are part of training, because that’s where your body gets its strength back.'),
}

function CartaPilastro({ x, onAzione }: { x: Pilastro; onAzione: (x: Pilastro) => void }) {
  const pal = usePalette()
  if (x.stato === 'nonDisponibile' || x.stato === 'escluso') return null
  const attivo = x.stato === 'attivo'
  const spiegazione = x.id === 'train' ? t('giorni di allenamento', 'training days') : x.id === 'food' ? t('regolarità dei pasti', 'regular meals') : t('notti di sonno', 'nights of sleep')
  const invito = x.id === 'food' ? t('Scrivi i pasti', 'Log your meals') : t('Scrivi il sonno', 'Log your sleep')
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.riga}>
        <LinearGradient colors={x.id === 'train' ? FUOCO : x.id === 'food' ? ORTO : RELAX} style={stili.pilastroIcona}>
          <Icona nome={ICONE[x.id]} size={20} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[stili.pilastroTitolo, { color: pal.testo }]}>{x.nome}</Text>
          <Text style={[stili.piccola2, { color: pal.testoSecondario }]}>{spiegazione}</Text>
        </View>
        <Text style={[stili.pilastroGrande, { color: attivo ? pal.testo : pal.testoTerzo }]}>
          {attivo ? x.punti : '—'}
          <Text style={[stili.pilastroSu, { color: pal.testoTerzo }]}>{` / ${x.max}`}</Text>
        </Text>
      </View>
      <Barra valore={attivo ? x.punti / x.max : 0} colore={COLORI[x.id]} animata />
      <Text style={[stili.nota, { color: pal.testoSecondario }]}>{DI_COSA_SI_TRATTA[x.id]()}</Text>
      {x.frase ? <Text style={[stili.nota, { color: pal.testoSecondario }]}>{x.frase}</Text> : null}
      {!attivo ? (
        <>
          <Text style={[stili.nota, { color: pal.testoSecondario }]}>
            {x.id === 'food'
              ? t('Food si attiva dall’informativa: poi scrivi i pasti nel diario e compaiono qui, fino a 15 punti.', 'Food turns on from its privacy notice: then log your meals in the diary and they show up here, up to 15 points.')
              : t('Recover si attiva dall’informativa: poi scrivi ogni mattina quanto hai dormito, e compare qui, fino a 15 punti.', 'Recover turns on from its privacy notice: then log how long you slept each morning, and it shows up here, up to 15 points.')}
          </Text>
          <Pulsante testo={invito} icona="avanti" variante="secondario" piccolo onPress={() => onAzione(x)} />
        </>
      ) : x.id !== 'train' ? (
        <Pulsante testo={x.id === 'food' ? t('Il diario', 'Diary') : t('Scrivi il sonno', 'Log your sleep')} icona="avanti" variante="secondario" piccolo onPress={() => onAzione(x)} />
      ) : (
        <Pulsante testo={t('L’analisi del tuo allenamento', 'Your training analysis')} icona="grafico" variante="secondario" piccolo onPress={() => router.push('/allenamento/training')} />
      )}
      {x.stato === 'attivo' && x.settimane > 0 && x.settimane < PESI.length ? (
        <Text style={[stili.piccola2, { color: pal.testoTerzo }]}>{t(
            `Calcolato su ${x.settimane === 1 ? 'una settimana' : `${x.settimane} settimane`}: le precedenti non hanno ancora niente di registrato.`,
            `Based on ${x.settimane === 1 ? 'one week' : `${x.settimane} weeks`}: the earlier ones have nothing recorded yet.`,
          )}</Text>
      ) : null}
    </Carta>
  )
}

/** Le quattro settimane di allenamento: una colonna per settimana, i giorni attivi, e la fascia 2-4 evidenziata. */
function QuattroSettimane({ settimane }: { settimane: Settimana[] }) {
  const pal = usePalette()
  const [ref, visibile] = useVisibile()
  const prog = useProgresso(900, 100, visibile)
  const ALTO = 96
  const in7 = ALTO / 7
  const dal = [...settimane].reverse()
  return (
    <View ref={ref} collapsable={false} style={{ gap: spazio.due }}>
      <View style={[stili.colonne, { height: ALTO + 19 + 4 + 15 }]}>
        <View pointerEvents="none" style={[stili.fascia, { bottom: 19 + 1.5 * in7, height: 3 * in7, backgroundColor: pal.scuro ? 'rgba(255,87,1,0.12)' : 'rgba(255,87,1,0.09)' }]} />
        {dal.map((s, i) => {
          const ultima = i === dal.length - 1
          return (
            <View key={s.a} style={stili.colonnaSett} accessibilityLabel={t(
              `${ultima ? 'Ultimi 7 giorni' : `Settimana al ${breve(s.a)}`}: ${s.giorni} giorni attivi${s.conta ? '' : ', prima dell’inizio'}`,
              `${ultima ? 'Last 7 days' : `Week to ${breve(s.a)}`}: ${s.giorni} active ${s.giorni === 1 ? 'day' : 'days'}${s.conta ? '' : ', before you started'}`,
            )}>
              <View style={{ height: ALTO + 19, justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                <Text style={[stili.colonnaValore, { color: pal.testoSecondario }]}>{s.conta ? s.giorni : ''}</Text>
                <View style={{ width: 30, height: Math.max(4, s.giorni * in7 * prog), borderRadius: 9, backgroundColor: !s.conta ? pal.incavo : ultima ? FUOCO[1] : `${FUOCO[1]}99` }} />
              </View>
              <Text style={[stili.colonnaEtichetta, { color: ultima ? pal.testo : pal.testoTerzo }]} numberOfLines={1}>
                {ultima ? t('Ora', 'Now') : t(`${(dal.length - 1 - i) * 7}g fa`, `${(dal.length - 1 - i) * 7}d ago`)}
              </Text>
            </View>
          )
        })}
      </View>
      <Text style={[stili.piccola2, { color: pal.testoTerzo }]}>{t('Giorni con un allenamento in 7 giorni. La fascia chiara, 2–4 giorni, è il ritmo da punti pieni.', 'Days with a workout out of 7. The light band, 2–4 days, is the full-points pace.')}</Text>
    </View>
  )
}

function RegoleSpiegate() {
  const pal = usePalette()
  const REGOLE: { titolo: string; testo: string }[] = tv([
    { titolo: 'Tre pilastri', testo: `Train vale fino a ${PUNTI.train} punti, Food ${PUNTI.food} e Recover ${PUNTI.relax}: il 100 si raggiunge con tutti e tre. Un pilastro che non usi non toglie niente, semplicemente non aggiunge.` },
    { titolo: 'Regolarità, non quantità', testo: `Train conta i giorni in cui ti sei allenato (almeno ${MINUTI_GIORNO_ATTIVO} minuti fra i piani chiusi nell’app e le lezioni con la presenza segnata): più lezioni nello stesso giorno valgono una volta sola. Da 2 a 4 giorni su 7 è il ritmo da punti pieni, con un solo giorno prendi il ${Math.round(CURVA_TRAIN[1] * 100)}%, e oltre i quattro scende piano (con sette giorni su sette è il ${Math.round(CURVA_TRAIN[7] * 100)}%): un giorno di riposo fa parte dell’allenamento.` },
    { titolo: 'Food guarda i pasti, non le calorie', testo: `Un giorno vale se nel diario ci sono colazione, pranzo e cena (chi non fa colazione, pranzo e cena), e ${GIORNI_FOOD} giorni su 7 danno il massimo. Oggi non conta, non è finito. Se hai scelto di nascondere i numeri Food esce dal punteggio.` },
    { titolo: 'Recover guarda le notti', testo: `Ogni notte scritta (o letta dal tuo dispositivo) vale in base alle ore, e da 7 ore in su è piena; ${NOTTI_RELAX} notti su 7 danno il massimo. Una notte più lunga non costa punti.` },
    { titolo: 'Le ultime quattro settimane', testo: `Ogni pilastro è la media di quattro settimane mobili, la più recente pesa il ${Math.round(PESI[0] * 100)}%, poi ${Math.round(PESI[1] * 100)}, ${Math.round(PESI[2] * 100)} e ${Math.round(PESI[3] * 100)}. Una settimana storta non azzera tutto. Le settimane prima della tua prima attività non contano.` },
  ], [
    { titolo: 'Three pillars', testo: `Train is worth up to ${PUNTI.train} points, Food ${PUNTI.food} and Recover ${PUNTI.relax}: you reach 100 with all three. A pillar you don’t use takes nothing away, it just doesn’t add.` },
    { titolo: 'Consistency, not quantity', testo: `Train counts the days you trained (at least ${MINUTI_GIORNO_ATTIVO} minutes between plans finished in the app and classes with attendance marked): several classes on the same day count once. 2 to 4 days out of 7 is the full-points pace, with a single day you get ${Math.round(CURVA_TRAIN[1] * 100)}%, and past four it goes down slowly (seven days out of seven is ${Math.round(CURVA_TRAIN[7] * 100)}%): a rest day is part of training.` },
    { titolo: 'Food looks at meals, not calories', testo: `A day counts if the diary has breakfast, lunch and dinner (lunch and dinner if you skip breakfast), and ${GIORNI_FOOD} days out of 7 give you the maximum. Today doesn’t count, it isn’t over. If you chose to hide the numbers, Food leaves the score.` },
    { titolo: 'Recover looks at your nights', testo: `Each night you log (or your device reads) counts by the hours, and from 7 hours up it’s full; ${NOTTI_RELAX} nights out of 7 give you the maximum. A longer night doesn’t cost points.` },
    { titolo: 'The last four weeks', testo: `Each pillar is the average of four rolling weeks: the most recent weighs ${Math.round(PESI[0] * 100)}%, then ${Math.round(PESI[1] * 100)}, ${Math.round(PESI[2] * 100)} and ${Math.round(PESI[3] * 100)}. One bad week doesn’t wipe everything out. Weeks before your first activity don’t count.` },
  ])
  return (
    <Carta style={{ gap: spazio.tre }}>
      {REGOLE.map((r) => (
        <View key={r.titolo} style={{ gap: 2 }}>
          <Text style={[stili.regolaTitolo, { color: pal.testo }]}>{r.titolo}</Text>
          <Text style={[stili.nota, { color: pal.testoSecondario }]}>{r.testo}</Text>
        </View>
      ))}
      <Text style={[stili.piccola2, { color: pal.testoTerzo }]}>
        {t('Il punteggio descrive come stai andando: non è un parere medico e non è un traguardo da raggiungere a ogni costo. Le soglie sono indicative.', 'Your score describes how you’re doing: it isn’t medical advice, and it isn’t a goal to hit at all costs. The thresholds are a guide.')}
      </Text>
    </Carta>
  )
}

export function SchermataPunteggio() {
  const pal = usePalette()
  const fit = useFit()
  const disp = useDispositivi()
  const p = usePunteggio(fit, disp)
  const livelli = useLivelli(fit, disp, p)
  const testata = { sopratitolo: 'Athlon Health System', titolo: 'Athlon Health Score', indietro: '/allenamento' as const, barra: false as const }
  // Food attivo porta al diario, il resto all'area (dove Food e Relax si attivano e il sonno si scrive).
  const attiva = (x: Pilastro) => (x.id === 'food' && x.stato === 'attivo' ? router.push('/allenamento/alimentazione') : apriArea(x.id))

  return (
    <Schermata {...testata}>
      <Entra indice={0}>
        <CartaPunteggioVista p={p} livelli={livelli} apri={false} />
      </Entra>

      {p ? (
        <>
          {livelli.disponibile && livelli.stato ? (
            <Entra indice={1}>
              <Sezione titolo={t('Il tuo livello', 'Your level')}>
                <SezioneLivelli stato={livelli.stato} />
              </Sezione>
            </Entra>
          ) : null}

          <Entra indice={1}>
            <Sezione titolo={t('I tre pilastri', 'The three pillars')}>
              <Text style={[stili.nota, { color: pal.testoSecondario, marginTop: -6 }]}>{t('Il benessere è un equilibrio: viene da tre cose insieme, e nessuna basta da sola.', 'Wellbeing is a balance: it comes from three things together, and none is enough on its own.')}</Text>
              <View style={{ gap: spazio.tre }}>
                {[p.train, p.food, p.relax].map((x) => (
                  <CartaPilastro key={x.id} x={x} onAzione={attiva} />
                ))}
              </View>
            </Sezione>
          </Entra>

          <Entra indice={2}>
            <Sezione titolo={t('Le ultime quattro settimane', 'The last four weeks')}>
              <Carta>
                <QuattroSettimane settimane={p.dettaglio.train.settimane} />
              </Carta>
            </Sezione>
          </Entra>

          {fit.vista ? (
            <Messaggio tono="attenzione" titolo={t('Vista cliente', 'Client view')}>
              {t('Si vede solo l’allenamento: alimentazione e recupero li vede soltanto il socio, dalla sua app.', 'Only training is shown: nutrition and recovery are visible only to the member, from their own app.')}
            </Messaggio>
          ) : null}

          <Entra indice={3}>
            <Sezione titolo={t('Come si calcola', 'How it’s calculated')}>
              <RegoleSpiegate />
            </Sezione>
          </Entra>
        </>
      ) : (
        <>
          <Scheletro altezza={120} tondo={24} />
          <Scheletro altezza={120} tondo={24} />
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  cornice: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  sotto: { color: 'rgba(255,255,255,0.65)', fontFamily: F.medio, fontSize: 12.5, lineHeight: 17 },
  origine: { color: 'rgba(255,255,255,0.82)', fontFamily: F.medio, fontSize: 13, lineHeight: 18.5 },
  origineForte: { color: '#fff', fontFamily: F.bold },
  corpo: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  banda: { color: '#fff', fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5, lineHeight: 26 },
  testo: { color: 'rgba(255,255,255,0.85)', fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { color: 'rgba(255,255,255,0.6)', fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  anelloCentro: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '64%' },
  anelloNumero: { fontFamily: F.extra, letterSpacing: -1 },
  anelloSu: { fontFamily: F.semi, fontSize: 12, marginTop: -2 },
  pilastro: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pilastroPuntino: { width: 8, height: 8, borderRadius: 4 },
  pilastroNome: { color: 'rgba(255,255,255,0.85)', fontFamily: F.semi, fontSize: 14, flex: 1 },
  pilastroPunti: { color: 'rgba(255,255,255,0.55)', fontFamily: F.semi, fontSize: 14 },
  separatore: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)' },
  pallini: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  pallino: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pallinoSigla: { fontFamily: F.bold, fontSize: 11 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  pilastroIcona: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pilastroTitolo: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  pilastroGrande: { fontFamily: F.extra, fontSize: 26, letterSpacing: -0.6 },
  pilastroSu: { fontFamily: F.semi, fontSize: 14, letterSpacing: 0 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola2: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  regolaTitolo: { fontFamily: F.bold, fontSize: 15 },
  colonne: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  colonnaSett: { alignItems: 'center', gap: 4, flex: 1 },
  colonnaValore: { fontFamily: F.semi, fontSize: 12, minHeight: 15 },
  colonnaEtichetta: { fontFamily: F.bold, fontSize: 11.5 },
  fascia: { position: 'absolute', left: 0, right: 0, borderRadius: 10 },
})
