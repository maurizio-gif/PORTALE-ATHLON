import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Polyline } from 'react-native-svg'

import { elencoMisure, type Misura } from '@/api/lab'
import { locale, t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { CHIAVE_MISURE } from '../dati/Misure'
import { inMemoria, prendi } from '../memoria'
import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { frase, giorniBilancio, media, mediaConsumo, settimane, type GiornoBilancio } from './bilancio'
import { useFit, type DatiFit } from './useFit'

// Balance (19/10/2026): le calorie consumate e quelle mangiate, una accanto
// all'altra. Il riquadro sta in cima a Fit (gli ultimi sette giorni); la sua
// schermata aggiunge le ultime due settimane, le quattro settimane e il peso.
// Il conto sta in bilancio.ts. Il riquadro non dice mai quanto mangiare: il club
// non ha un nutrizionista, e il confronto descrive, non fissa traguardi.

const intero = (n: number) => Math.round(n).toLocaleString(locale())
const SIGLE = tv(['D', 'L', 'M', 'M', 'G', 'V', 'S'], ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
const sigla = (g: string) => SIGLE[new Date(`${g}T12:00:00Z`).getUTCDay()]
const dataCorta = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })
const breve = (g: string) => dataCorta.format(new Date(`${g}T12:00:00Z`))

// ---------------------------------------------------------------------------
// Il grafico: per ogni giorno, la barra arancio del consumo e quella verde di quello che si e' mangiato

function Grafico({ giorni, conMangiate, chiaro = false, alto = 120 }: { giorni: GiornoBilancio[]; conMangiate: boolean; chiaro?: boolean; alto?: number }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const prog = useProgresso(1200, 100, visibile)
  const massimo = Math.max(1, ...giorni.map((g) => Math.max(g.consumate, g.mangiate ?? 0)))
  const fondo = chiaro ? 'rgba(255,255,255,0.08)' : p.incavo
  const testo = chiaro ? 'rgba(255,255,255,0.6)' : p.testoSecondario
  // Su due settimane la colonna e' stretta: sotto c'e' solo il numero del giorno.
  const stretto = giorni.length > 7
  return (
    <View ref={ref} collapsable={false} style={[stili.grafico, { height: alto + 26 }]}>
      {giorni.map((g) => {
        const hC = (g.consumate / massimo) * alto * prog
        const hM = ((g.mangiate ?? 0) / massimo) * alto * prog
        return (
          <View
            key={g.giorno}
            style={stili.colonna}
            accessibilityLabel={t(
              `${breve(g.giorno)}: consumate ${intero(g.consumate)} kcal${conMangiate ? (g.mangiate != null ? `, mangiate ${intero(g.mangiate)} kcal` : ', niente nel diario') : ''}${g.inCorso ? ', oggi, giorno in corso' : ''}`,
              `${breve(g.giorno)}: burned ${intero(g.consumate)} kcal${conMangiate ? (g.mangiate != null ? `, eaten ${intero(g.mangiate)} kcal` : ', nothing in the diary') : ''}${g.inCorso ? ', today, day in progress' : ''}`,
            )}
          >
            <View style={[stili.coppia, { height: alto, backgroundColor: fondo }]}>
              <LinearGradient colors={FUOCO} style={[stili.barra, { height: hC }]} />
              {conMangiate ? (
                g.mangiate != null ? (
                  <LinearGradient colors={ORTO} style={[stili.barra, { height: hM, opacity: g.inCorso ? 0.5 : 1 }]} />
                ) : (
                  <View style={[stili.barra, stili.vuota, { borderColor: chiaro ? 'rgba(255,255,255,0.25)' : p.linea }]} />
                )
              ) : null}
            </View>
            <Text style={[stili.sigla, stretto && { fontSize: 10 }, { color: g.inCorso ? (chiaro ? '#fff' : p.accento) : testo }]} numberOfLines={1}>
              {stretto ? new Date(`${g.giorno}T12:00:00Z`).getUTCDate() : sigla(g.giorno)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function Legenda({ conMangiate, chiaro = false }: { conMangiate: boolean; chiaro?: boolean }) {
  const p = usePalette()
  const colore = chiaro ? 'rgba(255,255,255,0.7)' : p.testoSecondario
  return (
    <View style={stili.legenda}>
      <View style={[stili.puntino, { backgroundColor: FUOCO[1] }]} />
      <Text style={[stili.piccola, { color: colore }]}>{t('Consumate', 'Burned')}</Text>
      {conMangiate ? (
        <>
          <View style={[stili.puntino, { backgroundColor: ORTO[1], marginLeft: spazio.due }]} />
          <Text style={[stili.piccola, { color: colore }]}>{t('Mangiate', 'Eaten')}</Text>
          <View style={[stili.puntino, stili.vuota, { borderColor: chiaro ? 'rgba(255,255,255,0.4)' : p.testoTerzo, marginLeft: spazio.due }]} />
          <Text style={[stili.piccola, { color: colore }]}>{t('Diario vuoto', 'Empty diary')}</Text>
        </>
      ) : null}
    </View>
  )
}

/** Il numero grande con la sua etichetta. */
function Cifra({ etichetta, valore, colore }: { etichetta: string; valore: string; colore: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={stili.legenda}>
        <View style={[stili.puntino, { backgroundColor: colore }]} />
        <Text style={stili.etichetta}>{etichetta}</Text>
      </View>
      <Text style={stili.cifra}>{valore}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Quando il confronto non si puo' fare

/** Il motivo per cui il consumo non si calcola; null se si calcola. */
function senzaCorpo(d: DatiFit): string | null {
  if (d.corpo.stato === 'no') return t('Il Balance usa una formula pensata per gli adulti.', 'Balance uses a formula designed for adults.')
  if (d.corpo.stato !== 'mancano-dati') return null
  if (d.corpo.motivo === 'misure') return t('Per stimare quanto consumi servono peso e altezza: li segni in «Il tuo corpo», in cima all’Athlon Health System.', 'To estimate how much you burn we need your weight and height: log them in “Your body”, at the top of Athlon Health System.')
  if (d.corpo.motivo === 'sesso') return t('Per stimare quanto consumi serve sapere se calcolare come uomo o come donna: lo scegli una volta, in un piano di allenamento.', 'To estimate how much you burn we need to know whether to calculate as a man or a woman: you choose it once, in a workout plan.')
  return t('Nella tua scheda del club manca la data di nascita, e senza l’età il consumo non si stima. Chiedi al desk di aggiungerla.', 'Your date of birth is missing from your club profile, and without your age we can’t estimate what you burn. Ask the front desk to add it.')
}

// ---------------------------------------------------------------------------
// Il riquadro in cima a Fit

/**
 * La cornice del Balance. Sulla schermata di Fit (`comprimibile`) **si presenta chiusa** (20/10/2026, richiesta del club):
 * il titolo e due righe che dicono cos'e', e i dati (il grafico, le cifre, i messaggi) compaiono solo toccando. Sulla sua
 * schermata e' sempre aperta, senza tasto.
 */
function Cornice({ children, comprimibile }: { children: ReactNode; comprimibile?: { aperto: boolean; onToggle: () => void } }) {
  const aperto = !comprimibile || comprimibile.aperto
  const testa = (
    <View style={stili.testa}>
      <LinearGradient colors={[ORTO[1], FUOCO[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
        <Icona nome="grafico" size={20} colore="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={stili.titolo}>Balance</Text>
        <Text style={stili.sotto}>{aperto ? t('Consumate e mangiate · ultimi 7 giorni', 'Burned and eaten · last 7 days') : t('Consumate e mangiate', 'Burned and eaten')}</Text>
      </View>
      {comprimibile ? (
        <View style={{ transform: [{ rotate: comprimibile.aperto ? '-90deg' : '90deg' }] }}>
          <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.7)" />
        </View>
      ) : null}
    </View>
  )
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cornice}>
      {comprimibile ? (
        <Tocco onPress={comprimibile.onToggle} etichetta={comprimibile.aperto ? t('Balance: nascondi i dati', 'Balance: hide the data') : t('Balance: mostra i dati degli ultimi 7 giorni', 'Balance: show the last 7 days')} scala={0.985}>
          {testa}
        </Tocco>
      ) : (
        testa
      )}
      {comprimibile && !comprimibile.aperto ? (
        <Text style={stili.testo}>{t('Il Balance mette accanto quanto consumi con l’allenamento e quanto mangi nel diario, giorno per giorno. Tocca per vedere i tuoi ultimi 7 giorni.', 'Balance puts what you burn through training next to what you eat in the diary, day by day. Tap to see your last 7 days.')}</Text>
      ) : (
        children
      )}
    </LinearGradient>
  )
}

/**
 * Il riquadro dei sette giorni. `apri`: e' quello di Fit, che si presenta chiuso (i dati compaiono toccando) e,
 * aperto, ha il tasto per la schermata di Balance; senza, e' quello della schermata, sempre aperto.
 */
export function CartaBalance({ dati, apri = true, onAttivaFood }: { dati: DatiFit; apri?: boolean; onAttivaFood?: () => void }) {
  const [aperto, setAperto] = useState(false)
  const comprimibile = apri ? { aperto, onToggle: () => setAperto((a) => !a) } : undefined
  const oggi = oggiRoma()
  const manca = senzaCorpo(dati)
  const giorni = useMemo(() => {
    if (dati.corpo.stato !== 'ok' || !dati.attivita) return null
    return giorniBilancio(oggi, 7, dati.corpo.corpo, dati.attivita, dati.conDiario ? dati.diario : null)
  }, [dati, oggi])
  const nascosti = !!dati.food?.profilo?.nascondi_numeri

  if (nascosti) {
    return (
      <Cornice comprimibile={comprimibile}>
        <Text style={stili.testo}>{t('Il Balance è fatto di calorie, e in Food hai scelto di nascondere i numeri: resta spento. Lo riaccendi dalle impostazioni del diario, quando vuoi.', 'Balance is all about calories, and in Food you chose to hide the numbers: so it stays off. You can turn it back on from the diary settings whenever you like.')}</Text>
      </Cornice>
    )
  }
  if (manca) {
    return (
      <Cornice comprimibile={comprimibile}>
        <Text style={stili.testo}>{manca}</Text>
        {dati.corpo.stato === 'mancano-dati' && dati.corpo.motivo === 'misure' ? (
          <Pulsante testo={t('Aggiungi i tuoi dati', 'Add your details')} icona="piu" variante="secondario" piccolo onPress={() => router.push('/allenamento/misure')} />
        ) : null}
      </Cornice>
    )
  }
  if (!giorni) {
    return (
      <Cornice comprimibile={comprimibile}>
        <View style={{ height: 150, justifyContent: 'center' }}>
          <Text style={stili.testo}>{t('Calcoliamo il tuo Balance…', 'Calculating your Balance…')}</Text>
        </View>
      </Cornice>
    )
  }

  const m = dati.conDiario ? media(giorni) : null
  const consumo = mediaConsumo(giorni)
  return (
    <Cornice comprimibile={comprimibile}>
      {m ? (
        <View style={stili.cifre}>
          <Cifra etichetta={t('CONSUMATE', 'BURNED')} valore={`${intero(m.consumate)}`} colore={FUOCO[1]} />
          <Cifra etichetta={t('MANGIATE', 'EATEN')} valore={`${intero(m.mangiate)}`} colore={ORTO[1]} />
        </View>
      ) : consumo != null ? (
        <View style={stili.cifre}>
          <Cifra etichetta={t('CONSUMATE', 'BURNED')} valore={`${intero(consumo)}`} colore={FUOCO[1]} />
        </View>
      ) : null}
      {m || consumo != null ? <Text style={stili.unita}>{t('kcal al giorno, in media', 'kcal a day, on average')}</Text> : null}

      <Grafico giorni={giorni} conMangiate={dati.conDiario} chiaro />
      <Legenda conMangiate={dati.conDiario} chiaro />

      {m ? (
        <Text style={stili.testo}>{frase(m)}</Text>
      ) : dati.conDiario ? (
        <Text style={stili.testo}>{t('Questa settimana il diario è vuoto: scrivi i pasti in Food e qui compare quello che mangi accanto a quello che consumi.', 'Your diary is empty this week: log your meals in Food and what you eat will show up here next to what you burn.')}</Text>
      ) : dati.vista ? (
        <Text style={stili.testo}>{t('Nella vista cliente si vede solo il consumo: quello che il socio mangia lo vede solo lui.', 'In client view only calories burned are shown: what the member eats is visible only to them.')}</Text>
      ) : dati.food && !dati.food.maggiorenne ? null : (
        <View style={{ gap: spazio.due }}>
          <Text style={stili.testo}>{t('Per ora vedi solo quanto consumi. Attiva Food e scrivi i pasti: qui compare anche quello che mangi, accanto.', 'For now you only see what you burn. Turn on Food and log your meals: what you eat will show up here too, alongside.')}</Text>
          {onAttivaFood ? <Pulsante testo={t('Vai a Food', 'Go to Food')} icona="piatto" variante="secondario" piccolo onPress={onAttivaFood} /> : null}
        </View>
      )}
      {apri ? <Pulsante testo={t('Apri il dettaglio', 'Open details')} icona="avanti" variante="secondario" piccolo onPress={() => router.push('/allenamento/balance')} /> : null}
    </Cornice>
  )
}

// ---------------------------------------------------------------------------
// La schermata di Balance

function Peso() {
  const p = usePalette()
  const [misure, setMisure] = useState<Misura[] | null>(() => inMemoria<{ misure: Misura[] }>(CHIAVE_MISURE)?.misure ?? null)
  useEffect(() => {
    prendi(CHIAVE_MISURE, elencoMisure).then((r) => r.ok && setMisure(r.misure))
  }, [])
  const dal = spostaGiorno(oggiRoma(), -83)
  const punti = (misure ?? []).filter((m) => m.peso_kg != null && m.data >= dal).sort((a, b) => a.data.localeCompare(b.data))
  if (punti.length < 2) {
    return (
      <Carta style={{ gap: spazio.due }}>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t('Segna il peso ogni due settimane in «Il tuo corpo»: qui compare la sua linea, ed è la verifica più onesta del Balance.', 'Log your weight every two weeks in “Your body”: its line shows up here, and it’s the most honest check on Balance.')}
        </Text>
        <Pulsante testo={t('Il tuo corpo', 'Your body')} icona="persona" variante="secondario" piccolo onPress={() => router.push('/allenamento/misure')} />
      </Carta>
    )
  }
  const L = 300
  const H = 90
  const kg = punti.map((m) => m.peso_kg!)
  const min = Math.min(...kg) - 0.5
  const max = Math.max(...kg) + 0.5
  const t0 = Date.parse(punti[0].data)
  const durata = Math.max(1, Date.parse(punti[punti.length - 1].data) - t0)
  const xy = punti.map((m) => [8 + ((Date.parse(m.data) - t0) / durata) * (L - 16), 8 + (1 - (m.peso_kg! - min) / (max - min)) * (H - 16)] as const)
  const primo = kg[0]
  const ultimo = kg[kg.length - 1]
  const delta = ultimo - primo
  return (
    <Carta style={{ gap: spazio.due }}>
      <Text style={[stili.nome, { color: p.testo }]}>
        {t(
          `Dal ${breve(punti[0].data)} al ${breve(punti[punti.length - 1].data)}: da ${primo.toLocaleString(locale())} a ${ultimo.toLocaleString(locale())} kg`,
          `From ${breve(punti[0].data)} to ${breve(punti[punti.length - 1].data)}: from ${primo.toLocaleString(locale())} to ${ultimo.toLocaleString(locale())} kg`,
        )}
      </Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none">
        <Polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={p.blu} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={4} fill={p.blu} />
        ))}
      </Svg>
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>
        {Math.abs(delta) < 0.5
          ? t('Il peso è stabile.', 'Your weight is steady.')
          : t(
              `${delta < 0 ? 'Il peso è sceso' : 'Il peso è salito'} di ${Math.abs(delta).toLocaleString(locale(), { maximumFractionDigits: 1 })} kg.`,
              `Your weight went ${delta < 0 ? 'down' : 'up'} by ${Math.abs(delta).toLocaleString(locale(), { maximumFractionDigits: 1 })} kg.`,
            )}{' '}
        {t(
          'Se il Balance dice che mangi meno di quanto consumi e il peso scende, le due stime tornano. Se il peso fa il contrario, di solito nel diario manca qualcosa (un condimento, uno spuntino) o le porzioni sono più grandi di come le scriviamo.',
          'If Balance says you eat less than you burn and your weight goes down, the two estimates add up. If your weight does the opposite, usually something is missing from the diary (a dressing, a snack) or the portions are bigger than we write them.',
        )}
      </Text>
    </Carta>
  )
}

export function SchermataBalance() {
  const p = usePalette()
  const dati = useFit()
  const oggi = oggiRoma()
  const manca = senzaCorpo(dati)
  const nascosti = !!dati.food?.profilo?.nascondi_numeri
  const giorni = useMemo(() => {
    if (dati.corpo.stato !== 'ok' || !dati.attivita) return null
    return giorniBilancio(oggi, 28, dati.corpo.corpo, dati.attivita, dati.conDiario ? dati.diario : null)
  }, [dati, oggi])
  const testata = { sopratitolo: 'Athlon Health System', titolo: 'Balance', indietro: '/allenamento' as const, barra: false }

  return (
    <Schermata {...testata}>
      <Entra indice={0}>
        <CartaBalance dati={dati} apri={false} onAttivaFood={() => router.navigate({ pathname: '/allenamento', params: { area: 'food' } })} />
      </Entra>

      {!nascosti && !manca && !giorni ? <SchedeInArrivo quante={2} /> : null}

      {!nascosti && giorni ? (
        <>
          <Entra indice={1}>
            <Sezione titolo={t('Le ultime due settimane', 'The last two weeks')}>
              <Carta style={{ gap: spazio.tre }}>
                <Grafico giorni={giorni.slice(-14)} conMangiate={dati.conDiario} alto={140} />
                <Legenda conMangiate={dati.conDiario} />
              </Carta>
            </Sezione>
          </Entra>

          {dati.conDiario ? (
            <Entra indice={2}>
              <Sezione titolo={t('Settimana per settimana', 'Week by week')}>
                <Carta style={{ paddingVertical: spazio.due }}>
                  {settimane(giorni, oggi, 4)
                    .reverse()
                    .map((s, i) => (
                      <View key={s.lunedi} style={[stili.settimana, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
                        <Text style={[stili.nome, { color: p.testo }]}>{i === 0 ? t('Questa settimana', 'This week') : t(`Dal ${breve(s.lunedi)}`, `From ${breve(s.lunedi)}`)}</Text>
                        {s.media ? (
                          <>
                            <Text style={[stili.nota, { color: p.testoSecondario }]}>
                              <Text style={{ color: FUOCO[1], fontFamily: F.extra }}>{intero(s.media.consumate)}</Text>
                              {t(' consumate · ', ' burned · ')}
                              <Text style={{ color: ORTO[1], fontFamily: F.extra }}>{intero(s.media.mangiate)}</Text>
                              {t(' mangiate, kcal al giorno', ' eaten, kcal a day')}
                            </Text>
                            <Text style={[stili.piccola, { color: p.testoTerzo }]}>{frase(s.media)}</Text>
                          </>
                        ) : (
                          <Text style={[stili.nota, { color: p.testoTerzo }]}>{t('Nessun giorno scritto nel diario.', 'No days logged in the diary.')}</Text>
                        )}
                      </View>
                    ))}
                </Carta>
              </Sezione>
            </Entra>
          ) : null}
        </>
      ) : null}

      {!nascosti ? (
        <Entra indice={3}>
          <Sezione titolo={t('Il peso', 'Weight')}>
            <Peso />
          </Sezione>
        </Entra>
      ) : null}

      <Entra indice={4}>
        <Sezione titolo={t('Come leggerlo', 'How to read it')}>
          <Carta style={{ gap: spazio.due }}>
            <ComeLeggere />
          </Carta>
        </Sezione>
      </Entra>
      <Text style={[stili.piccola, { color: p.testoTerzo, paddingHorizontal: 2 }]}>
        {t('È educazione alimentare, non una dieta né un parere medico. Il club non ha un nutrizionista: per un piano su misura serve un professionista.', 'This is nutrition education, not a diet or medical advice. The club doesn’t have a nutritionist: for a tailored plan, see a professional.')}
      </Text>
    </Schermata>
  )
}

/** Il senso dei numeri, in parole semplici: lo stesso testo nell'introduzione di Fit e in fondo a Balance. */
export function ComeLeggere() {
  const p = usePalette()
  const punti: [string, string][] = tv<[string, string][]>(
    [
      ['Consumate', 'una stima. Parte da peso, altezza, età e sesso (quanto consuma il corpo a riposo e nella giornata), e aggiunge le sedute che chiudi nell’app e le lezioni in cui la reception segna la tua presenza.'],
      ['Mangiate', 'quello che scrivi nel diario di Food: valori medi degli alimenti per i grammi che indichi, o stimati dalla foto del piatto.'],
      ['Perché la media', 'tutte e due le cifre possono sbagliare di un 10–20%. Un giorno solo dice poco; la media di una settimana dice la tendenza. Sotto le 150 kcal di differenza al giorno, le due cifre si considerano pari.'],
      ['I giorni vuoti', 'un giorno senza niente nel diario non vale zero: resta fuori dalle medie. Anche oggi resta fuori, perché non è finito.'],
      ['Non sono obiettivi', 'qui non ti diciamo quanto mangiare. Il peso, se lo segni, è la verifica: dice se le stime tornano.'],
    ],
    [
      ['Burned', 'an estimate. It starts from weight, height, age and sex (what your body burns at rest and through the day), and adds the sessions you finish in the app and the classes where reception marks your attendance.'],
      ['Eaten', 'what you log in the Food diary: average values of the foods for the grams you enter, or estimated from the photo of your plate.'],
      ['Why the average', 'both figures can be off by 10–20%. A single day says little; a week’s average shows the trend. With less than 150 kcal of difference a day, the two figures count as even.'],
      ['Empty days', 'a day with nothing in the diary doesn’t count as zero: it stays out of the averages. Today stays out too, because it isn’t over.'],
      ['They’re not goals', 'we don’t tell you how much to eat here. Your weight, if you log it, is the check: it tells you whether the estimates add up.'],
    ],
  )
  return (
    <View style={{ gap: spazio.due }}>
      {punti.map(([titolo, d]) => (
        <Text key={titolo} style={[stili.nota, { color: p.testoSecondario }]}>
          <Text style={{ fontFamily: F.extra, color: p.testo }}>{`${titolo}: `}</Text>
          {d}
        </Text>
      ))}
    </View>
  )
}

const stili = StyleSheet.create({
  cornice: { borderRadius: 28, padding: spazio.tre + 2, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
  sotto: { color: 'rgba(255,255,255,0.6)', fontFamily: F.semi, fontSize: 12.5 },
  cifre: { flexDirection: 'row', gap: spazio.tre },
  cifra: { color: '#fff', fontFamily: F.extra, fontSize: 30, letterSpacing: -0.8 },
  etichetta: { color: 'rgba(255,255,255,0.6)', fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8 },
  unita: { color: 'rgba(255,255,255,0.55)', fontFamily: F.semi, fontSize: 12, marginTop: -spazio.due },
  testo: { color: 'rgba(255,255,255,0.8)', fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  grafico: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  colonna: { flex: 1, alignItems: 'center', gap: 6 },
  coppia: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 2 },
  barra: { flex: 1, maxWidth: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  vuota: { height: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 5, backgroundColor: 'transparent' },
  sigla: { fontFamily: F.extra, fontSize: 11 },
  legenda: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  puntino: { width: 9, height: 9, borderRadius: 5 },
  settimana: { paddingVertical: spazio.due + 2, gap: 3 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
})
