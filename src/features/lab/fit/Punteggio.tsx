import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { spazio } from '@/theme'

import { useDispositivi, type Dispositivi } from '../dispositivi/useDispositivi'
import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Barra, Carta, Entra, Messaggio, Pulsante, Scheletro, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, ORTO, RELAX, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CURVA_TRAIN, GIORNI_FOOD, MINUTI_GIORNO_ATTIVO, NOTTI_RELAX, PESI, PUNTI, type IdPilastro, type Pilastro, type Punteggio, type Settimana } from './calcoloPunteggio'
import { useFit, type DatiFit } from './useFit'
import { RigaLivello, SezioneLivelli } from './Livelli'
import { useLivelli, type Livelli } from './useLivelli'
import { usePunteggio } from './usePunteggio'

// L'Athlon Health Score (20/10/2026): il punteggio da 0 a 100 di Athlon Health System. La carta
// sta in cima a Fit (l'anello a tre settori, i tre pilastri, gli ultimi sette giorni), e la sua
// schermata (/allenamento/punteggio) spiega com'e' fatto: ogni pilastro con la sua riga, le ultime
// quattro settimane di allenamento e le regole. Il calcolo sta in calcoloPunteggio.ts (puro).
// **Descrive, non giudica**: le bande sono parole morbide («Si comincia», «Buon ritmo»), niente
// confronti con altri soci, niente traguardi che dicano cosa fare.

const COLORI: Record<IdPilastro, string> = { train: FUOCO[1], food: ORTO[1], relax: RELAX[1] }
const ICONE: Record<IdPilastro, NomeIcona> = { train: 'peso', food: 'piatto', relax: 'foglia' }

const AREE: Record<IdPilastro, string> = { train: 'train', food: 'food', relax: 'relax' }
const apriArea = (id: IdPilastro) => router.navigate({ pathname: '/allenamento', params: { area: AREE[id] } })
const apriPunteggio = () => router.push('/allenamento/punteggio')

const SIGLE = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
const sigla = (g: string) => SIGLE[new Date(`${g}T12:00:00Z`).getUTCDay()]
const dataCorta = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const breve = (g: string) => dataCorta.format(new Date(`${g}T12:00:00Z`))

// ---------------------------------------------------------------------------
// L'anello: un settore per pilastro, grande quanto i suoi punti; si riempie quanto i punti presi

const R = 50
const GIRO = 2 * Math.PI * R
/** Lo spazio fra un settore e il successivo, in unita' di lunghezza del cerchio. */
const VUOTO = 4

export function Anello({ p, size = 132, chiaro = true }: { p: Punteggio; size?: number; chiaro?: boolean }) {
  const pal = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(1300, 150, visibile)
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
    <View ref={ref} collapsable={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {settori.map(({ x, inizio: da, lunghezza }) => (
          <Circle key={`f-${x.id}`} cx={60} cy={60} r={R} stroke={fondo} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${lunghezza} ${GIRO}`} strokeDashoffset={-da} transform="rotate(-90 60 60)" />
        ))}
        {settori.map(({ x, inizio: da, lunghezza }) => {
          const pieno = lunghezza * Math.max(0, Math.min(1, x.punti / x.max)) * t
          if (pieno < 0.5) return null
          return <Circle key={`p-${x.id}`} cx={60} cy={60} r={R} stroke={COLORI[x.id]} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${pieno} ${GIRO}`} strokeDashoffset={-da} transform="rotate(-90 60 60)" />
        })}
      </Svg>
      <View style={stili.anelloCentro} pointerEvents="none">
        <Text style={[stili.anelloNumero, { color: chiaro ? '#fff' : pal.testo, fontSize: size * 0.3 }]} numberOfLines={1} adjustsFontSizeToFit>
          {Math.round(p.totale * t)}
        </Text>
        <Text style={[stili.anelloSu, { color: chiaro ? 'rgba(255,255,255,0.65)' : pal.testoSecondario }]}>{`su ${p.su}`}</Text>
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
    <View style={stili.pallini} accessibilityLabel={`Ultimi 7 giorni: ${giorni.filter((g) => g.attivo).length} con un allenamento`}>
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
    <View style={stili.pilastro} accessibilityLabel={attivo ? `${x.nome}: ${x.punti} punti su ${x.max}` : `${x.nome}: da attivare, fino a ${x.max} punti`}>
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
  return <CartaPunteggioVista p={p} livelli={livelli} apri={apri} />
}

/** Quello che si vede: separato dai dati perche' la schermata del dettaglio li legge una volta sola e li passa anche alla sezione dei livelli. */
export function CartaPunteggioVista({ p, livelli, apri = true }: { p: Punteggio | null; livelli: Livelli; apri?: boolean }) {
  const dentro = (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cornice}>
      {apri ? (
        <View style={stili.testa}>
          <LinearGradient colors={[FUOCO[1], ORTO[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
            <Icona nome="stella" size={20} colore="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={stili.titolo}>Athlon Health Score</Text>
            <Text style={stili.sotto}>Allenamento, alimentazione e recupero · ultime 4 settimane</Text>
          </View>
          {p ? <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.7)" /> : null}
        </View>
      ) : (
        <Text style={stili.sotto}>Allenamento, alimentazione e recupero. La media delle ultime quattro settimane, la più recente pesa di più.</Text>
      )}

      {!p ? (
        <View style={{ gap: spazio.tre }}>
          <Scheletro altezza={132} larghezza={132} tondo={66} style={{ alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={stili.testo}>Calcoliamo il tuo punteggio…</Text>
        </View>
      ) : (
        <>
          <View style={stili.corpo}>
            <Anello p={p} />
            <View style={{ flex: 1, gap: spazio.due }}>
              <Text style={stili.banda}>{p.banda}</Text>
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
          {p.rapportato ? <Text style={stili.piccola}>Il punteggio è calcolato sui pilastri che usi.</Text> : null}
          {p.invito.length ? (
            <Text style={stili.piccola}>{`Con ${p.invito.map((i) => (i.id === 'food' ? 'Food' : 'Relax')).join(' e ')} puoi arrivare fino a 100.`}</Text>
          ) : null}
        </>
      )}
    </LinearGradient>
  )
  return apri && p ? (
    <Tocco onPress={apriPunteggio} etichetta={`Athlon Health Score: ${p.totale} su ${p.su}. ${p.banda}. Apri il dettaglio`} scala={0.985}>
      {dentro}
    </Tocco>
  ) : (
    dentro
  )
}

// ---------------------------------------------------------------------------
// La schermata del dettaglio

function CartaPilastro({ x, onAzione }: { x: Pilastro; onAzione: (x: Pilastro) => void }) {
  const pal = usePalette()
  if (x.stato === 'nonDisponibile' || x.stato === 'escluso') return null
  const attivo = x.stato === 'attivo'
  const spiegazione = x.id === 'train' ? 'giorni di allenamento' : x.id === 'food' ? 'regolarità dei pasti' : 'notti di sonno'
  const invito = x.id === 'food' ? 'Scrivi i pasti' : 'Scrivi il sonno'
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
      {x.frase ? <Text style={[stili.nota, { color: pal.testoSecondario }]}>{x.frase}</Text> : null}
      {!attivo ? (
        <>
          <Text style={[stili.nota, { color: pal.testoSecondario }]}>
            {x.id === 'food'
              ? 'Food si attiva dall’informativa: poi scrivi i pasti nel diario e compaiono qui, fino a 15 punti.'
              : 'Relax si attiva dall’informativa: poi scrivi ogni mattina quanto hai dormito, e compare qui, fino a 15 punti.'}
          </Text>
          <Pulsante testo={invito} icona="avanti" variante="secondario" piccolo onPress={() => onAzione(x)} />
        </>
      ) : x.id !== 'train' ? (
        <Pulsante testo={x.id === 'food' ? 'Il diario' : 'Scrivi il sonno'} icona="avanti" variante="secondario" piccolo onPress={() => onAzione(x)} />
      ) : (
        <Pulsante testo="L’analisi del tuo allenamento" icona="grafico" variante="secondario" piccolo onPress={() => router.push('/allenamento/training')} />
      )}
      {x.stato === 'attivo' && x.settimane > 0 && x.settimane < PESI.length ? (
        <Text style={[stili.piccola2, { color: pal.testoTerzo }]}>{`Calcolato su ${x.settimane === 1 ? 'una settimana' : `${x.settimane} settimane`}: le precedenti non hanno ancora niente di registrato.`}</Text>
      ) : null}
    </Carta>
  )
}

/** Le quattro settimane di allenamento: una colonna per settimana, i giorni attivi, e la fascia 2-4 evidenziata. */
function QuattroSettimane({ settimane }: { settimane: Settimana[] }) {
  const pal = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(900, 100, visibile)
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
            <View key={s.a} style={stili.colonnaSett} accessibilityLabel={`${ultima ? 'Ultimi 7 giorni' : `Settimana al ${breve(s.a)}`}: ${s.giorni} giorni attivi${s.conta ? '' : ', prima dell’inizio'}`}>
              <View style={{ height: ALTO + 19, justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                <Text style={[stili.colonnaValore, { color: pal.testoSecondario }]}>{s.conta ? s.giorni : ''}</Text>
                <View style={{ width: 30, height: Math.max(4, s.giorni * in7 * t), borderRadius: 9, backgroundColor: !s.conta ? pal.incavo : ultima ? FUOCO[1] : `${FUOCO[1]}99` }} />
              </View>
              <Text style={[stili.colonnaEtichetta, { color: ultima ? pal.testo : pal.testoTerzo }]} numberOfLines={1}>
                {ultima ? 'Ora' : `${(dal.length - 1 - i) * 7}g fa`}
              </Text>
            </View>
          )
        })}
      </View>
      <Text style={[stili.piccola2, { color: pal.testoTerzo }]}>Giorni con un allenamento in 7 giorni. La fascia chiara, 2–4 giorni, è il ritmo da punti pieni.</Text>
    </View>
  )
}

function RegoleSpiegate() {
  const pal = usePalette()
  const REGOLE: { titolo: string; testo: string }[] = [
    { titolo: 'Tre pilastri', testo: `Train vale fino a ${PUNTI.train} punti, Food ${PUNTI.food} e Relax ${PUNTI.relax}: il 100 si raggiunge con tutti e tre. Un pilastro che non usi non toglie niente, semplicemente non aggiunge.` },
    { titolo: 'Regolarità, non quantità', testo: `Train conta i giorni in cui ti sei allenato (almeno ${MINUTI_GIORNO_ATTIVO} minuti fra i piani chiusi nell’app e le lezioni con la presenza segnata): più lezioni nello stesso giorno valgono una volta sola. Da 2 a 4 giorni su 7 è il ritmo da punti pieni, con un solo giorno prendi il ${Math.round(CURVA_TRAIN[1] * 100)}%, e oltre i quattro scende piano (con sette giorni su sette è il ${Math.round(CURVA_TRAIN[7] * 100)}%): un giorno di riposo fa parte dell’allenamento.` },
    { titolo: 'Food guarda i pasti, non le calorie', testo: `Un giorno vale se nel diario ci sono colazione, pranzo e cena (chi non fa colazione, pranzo e cena), e ${GIORNI_FOOD} giorni su 7 danno il massimo. Oggi non conta, non è finito. Se hai scelto di nascondere i numeri Food esce dal punteggio.` },
    { titolo: 'Relax guarda le notti', testo: `Ogni notte scritta (o letta dal tuo dispositivo) vale in base alle ore, e da 7 ore in su è piena; ${NOTTI_RELAX} notti su 7 danno il massimo. Una notte più lunga non costa punti.` },
    { titolo: 'Le ultime quattro settimane', testo: `Ogni pilastro è la media di quattro settimane mobili, la più recente pesa il ${Math.round(PESI[0] * 100)}%, poi ${Math.round(PESI[1] * 100)}, ${Math.round(PESI[2] * 100)} e ${Math.round(PESI[3] * 100)}. Una settimana storta non azzera tutto. Le settimane prima della tua prima attività non contano.` },
  ]
  return (
    <Carta style={{ gap: spazio.tre }}>
      {REGOLE.map((r) => (
        <View key={r.titolo} style={{ gap: 2 }}>
          <Text style={[stili.regolaTitolo, { color: pal.testo }]}>{r.titolo}</Text>
          <Text style={[stili.nota, { color: pal.testoSecondario }]}>{r.testo}</Text>
        </View>
      ))}
      <Text style={[stili.piccola2, { color: pal.testoTerzo }]}>
        Il punteggio descrive come stai andando: non è un parere medico e non è un traguardo da raggiungere a ogni costo. Le soglie sono indicative.
      </Text>
    </Carta>
  )
}

export function SchermataPunteggio() {
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
              <Sezione titolo="Il tuo livello">
                <SezioneLivelli stato={livelli.stato} />
              </Sezione>
            </Entra>
          ) : null}

          <Entra indice={1}>
            <Sezione titolo="I tre pilastri">
              <View style={{ gap: spazio.tre }}>
                {[p.train, p.food, p.relax].map((x) => (
                  <CartaPilastro key={x.id} x={x} onAzione={attiva} />
                ))}
              </View>
            </Sezione>
          </Entra>

          <Entra indice={2}>
            <Sezione titolo="Le ultime quattro settimane">
              <Carta>
                <QuattroSettimane settimane={p.dettaglio.train.settimane} />
              </Carta>
            </Sezione>
          </Entra>

          {fit.vista ? (
            <Messaggio tono="attenzione" titolo="Vista cliente">
              Si vede solo l’allenamento: alimentazione e recupero li vede soltanto il socio, dalla sua app.
            </Messaggio>
          ) : null}

          <Entra indice={3}>
            <Sezione titolo="Come si calcola">
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
