import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
import { Icona } from '../ui/Icona'
import { Barra, Carta, Entra, Messaggio, Pulsante, Scheletro, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, MARE, NOTTE, usePalette } from '../ui/tema'
import { analizzaTraining, SIGLE_GIORNI, NOMI_GIORNI, type AnalisiTraining, type SettimanaAnalisi } from './analisiTraining'
import { useFit } from './useFit'

// «Il tuo allenamento» (20/10/2026): l'analisi del Train in profondita', sotto l'Athlon Health Score. Le quattro settimane
// del punteggio viste da vicino: giorni e sessioni, sala o lezioni (e quali), che giorno e a che ora, la sala (serie e
// chili), il riposo e, se ci sono peso, altezza, eta' e sesso, le calorie. Il calcolo sta in analisiTraining.ts (puro).
// **Descrive, non giudica**: nessuna frase dice cosa fare. Il Balance resta com'e' (le calorie consumate accanto a quelle
// mangiate); qui le calorie sono solo quelle dell'allenamento, e rimandano al contatore e al Balance.

const intero = (x: number) => Math.round(x).toLocaleString(locale())
const dataCorta = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' })
const breve = (g: string) => dataCorta.format(new Date(`${g}T12:00:00Z`)).replace('.', '')
const ore = (minuti: number) => (minuti < 60 ? `${minuti} min` : `${Math.floor(minuti / 60)} h${minuti % 60 ? ` ${String(minuti % 60).padStart(2, '0')}` : ''}`)

function Cifra({ valore, etichetta, sotto }: { valore: string; etichetta: string; sotto?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={stili.cifra}>{valore}</Text>
      <Text style={stili.cifraEtichetta}>{etichetta}</Text>
      {sotto ? <Text style={stili.cifraSotto}>{sotto}</Text> : null}
    </View>
  )
}

function Riepilogo({ a }: { a: AnalisiTraining }) {
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.cornice}>
      <View style={stili.testa}>
        <LinearGradient colors={FUOCO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
          <Icona nome="peso" size={20} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={stili.titolo}>{t('Ultime quattro settimane', 'Last four weeks')}</Text>
          <Text style={stili.sotto}>{t('Com’è fatto il tuo allenamento', 'What your training looks like')}</Text>
        </View>
      </View>
      <View style={stili.cifre}>
        <Cifra valore={String(a.totali.giorniAttivi)} etichetta={t('giorni attivi', 'active days')} sotto={a.ritmo.settimaneContate >= 2 ? t(`${a.medie.giorniAttivi.toLocaleString(locale())} a settimana`, `${a.medie.giorniAttivi.toLocaleString(locale())} a week`) : undefined} />
        <Cifra valore={String(a.totali.sessioni)} etichetta={t('sessioni', 'sessions')} sotto={t(`${a.totali.sala} in sala · ${a.totali.lezioni} lezioni`, `${a.totali.sala} gym floor · ${a.totali.lezioni} ${a.totali.lezioni === 1 ? 'class' : 'classes'}`)} />
      </View>
      <View style={stili.cifre}>
        <Cifra valore={ore(a.totali.minuti)} etichetta={t('di allenamento', 'of training')} sotto={a.medie.durataSessione ? t(`${a.medie.durataSessione} min a sessione`, `${a.medie.durataSessione} min per session`) : undefined} />
        <Cifra valore={a.calorie ? intero(a.calorie.totali) : '—'} etichetta={t('kcal consumate', 'kcal burned')} sotto={a.calorie ? undefined : t('servono i tuoi dati', 'your details are needed')} />
      </View>
    </LinearGradient>
  )
}

/** Le settimane, una riga ciascuna: i giorni attivi come tacche e, a destra, sessioni, tempo e calorie. */
function SettimanaPerSettimana({ settimane }: { settimane: SettimanaAnalisi[] }) {
  const p = usePalette()
  return (
    <Carta style={{ paddingVertical: spazio.due }}>
      {settimane.map((s, i) => (
        <View key={s.a} style={[stili.settimana, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]} accessibilityLabel={t(
            `${i === 0 ? 'Ultimi 7 giorni' : `Dal ${breve(s.da)} al ${breve(s.a)}`}: ${s.giorniAttivi} giorni attivi, ${s.sessioni} sessioni, ${ore(s.minuti)}${s.kcal !== null ? `, ${intero(s.kcal)} kcal` : ''}${s.conta ? '' : ', prima dell’inizio'}`,
            `${i === 0 ? 'Last 7 days' : `From ${breve(s.da)} to ${breve(s.a)}`}: ${s.giorniAttivi} active ${s.giorniAttivi === 1 ? 'day' : 'days'}, ${s.sessioni} ${s.sessioni === 1 ? 'session' : 'sessions'}, ${ore(s.minuti)}${s.kcal !== null ? `, ${intero(s.kcal)} kcal` : ''}${s.conta ? '' : ', before you started'}`,
          )}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[stili.settimanaNome, { color: s.conta ? p.testo : p.testoTerzo }]}>{i === 0 ? t('Ultimi 7 giorni', 'Last 7 days') : `${breve(s.da)} – ${breve(s.a)}`}</Text>
            <View style={stili.tacche}>
              {Array.from({ length: 7 }, (_, k) => (
                <View key={k} style={[stili.tacca, { backgroundColor: !s.conta ? p.incavo : k < s.giorniAttivi ? (s.nelRitmo ? FUOCO[1] : `${FUOCO[1]}88`) : p.incavo }]} />
              ))}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 1 }}>
            <Text style={[stili.settimanaValore, { color: s.conta ? p.testo : p.testoTerzo }]}>{s.conta ? t(`${s.giorniAttivi} ${s.giorniAttivi === 1 ? 'giorno' : 'giorni'}`, `${s.giorniAttivi} ${s.giorniAttivi === 1 ? 'day' : 'days'}`) : '—'}</Text>
            {s.conta ? (
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                {[t(`${s.sessioni} ${s.sessioni === 1 ? 'sessione' : 'sessioni'}`, `${s.sessioni} ${s.sessioni === 1 ? 'session' : 'sessions'}`), ore(s.minuti), s.kcal !== null ? `${intero(s.kcal)} kcal` : null].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      <Text style={[stili.piccola, { color: p.testoTerzo, paddingBottom: spazio.due }]}>{t('Le tacche scure sono le settimane nel ritmo giusto (2–4 giorni); quelle chiare, le altre.', 'Dark marks are weeks at the right pace (2–4 days); light ones are the others.')}</Text>
    </Carta>
  )
}

function Divisione({ a }: { a: AnalisiTraining }) {
  const p = usePalette()
  const tot = a.totali.sala + a.totali.lezioni
  const massimo = Math.max(1, ...a.categorie.map((c) => c.volte))
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ gap: 6 }}>
        <View style={stili.spezzata} accessibilityLabel={t(`${a.totali.sala} in sala, ${a.totali.lezioni} lezioni di gruppo`, `${a.totali.sala} on the gym floor, ${a.totali.lezioni} group ${a.totali.lezioni === 1 ? 'class' : 'classes'}`)}>
          {a.totali.sala > 0 ? <View style={{ flex: a.totali.sala, backgroundColor: FUOCO[1] }} /> : null}
          {a.totali.lezioni > 0 ? <View style={{ flex: a.totali.lezioni, backgroundColor: MARE[1] }} /> : null}
        </View>
        <View style={stili.legenda}>
          <View style={[stili.puntino, { backgroundColor: FUOCO[1] }]} />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Sala ${a.totali.sala}${tot ? ` (${Math.round((a.totali.sala / tot) * 100)}%)` : ''}`, `Gym floor ${a.totali.sala}${tot ? ` (${Math.round((a.totali.sala / tot) * 100)}%)` : ''}`)}</Text>
          <View style={[stili.puntino, { backgroundColor: MARE[1], marginLeft: spazio.tre }]} />
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`Lezioni ${a.totali.lezioni}${tot ? ` (${Math.round((a.totali.lezioni / tot) * 100)}%)` : ''}`, `Classes ${a.totali.lezioni}${tot ? ` (${Math.round((a.totali.lezioni / tot) * 100)}%)` : ''}`)}</Text>
        </View>
      </View>
      {a.categorie.length ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.sottoTitolo, { color: p.testo }]}>{t('Le lezioni, per categoria', 'Classes, by category')}</Text>
          {a.categorie.slice(0, 5).map((c) => (
            <View key={c.nome} style={{ gap: 4 }}>
              <View style={stili.rigaDue}>
                <Text style={[stili.nota, { color: p.testo, flex: 1 }]} numberOfLines={1}>
                  {c.nome}
                </Text>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`${c.volte} ${c.volte === 1 ? 'volta' : 'volte'} · ${ore(c.minuti)}`, `${c.volte === 1 ? 'once' : `${c.volte} times`} · ${ore(c.minuti)}`)}</Text>
              </View>
              <Barra valore={c.volte / massimo} colore={MARE[1]} altezza={6} />
            </View>
          ))}
        </View>
      ) : null}
      {a.lezioni.length ? (
        <View style={{ gap: 4 }}>
          <Text style={[stili.sottoTitolo, { color: p.testo }]}>{t('Le più frequenti', 'Most frequent')}</Text>
          {a.lezioni.slice(0, 3).map((l) => (
            <Text key={l.nome} style={[stili.nota, { color: p.testoSecondario }]}>
              <Text style={{ fontFamily: F.bold, color: p.testo }}>{l.nome}</Text>
              {t(` · ${l.volte} ${l.volte === 1 ? 'volta' : 'volte'}`, ` · ${l.volte === 1 ? 'once' : `${l.volte} times`}`)}
            </Text>
          ))}
        </View>
      ) : null}
    </Carta>
  )
}

function Quando({ a }: { a: AnalisiTraining }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const prog = useProgresso(900, 100, visibile)
  const massimo = Math.max(1, ...a.perGiornoSettimana)
  const fasceMax = Math.max(1, ...a.fasce.map((f) => f.volte))
  const ALTO = 70
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View ref={ref} collapsable={false} style={stili.giorniSett}>
        {a.perGiornoSettimana.map((n, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4, flex: 1 }} accessibilityLabel={t(`${NOMI_GIORNI[i]}: ${n} ${n === 1 ? 'sessione' : 'sessioni'}`, `${NOMI_GIORNI[i]}: ${n} ${n === 1 ? 'session' : 'sessions'}`)}>
            <Text style={[stili.piccola, { color: p.testoSecondario, minHeight: 15 }]}>{n || ''}</Text>
            <View style={{ height: ALTO, justifyContent: 'flex-end' }}>
              <View style={{ width: 24, height: Math.max(4, (n / massimo) * ALTO * prog), borderRadius: 8, backgroundColor: n === 0 ? p.incavo : n === massimo ? FUOCO[1] : `${FUOCO[1]}88` }} />
            </View>
            <Text style={[stili.sigla, { color: n === massimo && n > 0 ? p.testo : p.testoTerzo }]}>{SIGLE_GIORNI[i]}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: spazio.due }}>
        {a.fasce.map((f) => (
          <View key={f.id} style={stili.fascia}>
            <Text style={[stili.nota, { color: p.testo, width: 92 }]}>{f.nome}</Text>
            <View style={{ flex: 1 }}>
              <Barra valore={f.volte / fasceMax} colore={FUOCO[1]} altezza={8} />
            </View>
            <Text style={[stili.nota, { color: p.testoSecondario, width: 24, textAlign: 'right' }]}>{f.volte}</Text>
          </View>
        ))}
      </View>
    </Carta>
  )
}

function Sala({ a }: { a: AnalisiTraining }) {
  const p = usePalette()
  const s = a.sala
  if (!s) return null
  const confronto =
    s.volumeMediaPrecedenti && s.volumeUltima > 0 ? Math.round(((s.volumeUltima - s.volumeMediaPrecedenti) / s.volumeMediaPrecedenti) * 100) : null
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.griglia}>
        <Piccola valore={String(s.sedute)} etichetta={t('sedute', 'sessions')} />
        <Piccola valore={intero(s.serie)} etichetta={t('serie', 'sets')} />
        <Piccola valore={intero(s.volume)} etichetta={t('kg sollevati', 'kg lifted')} />
        <Piccola valore={intero(s.esercizi)} etichetta={t('esercizi', 'exercises')} />
      </View>
      {confronto !== null && Math.abs(confronto) >= 5 ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(
            `Negli ultimi 7 giorni: ${intero(s.volumeUltima)} kg, il ${Math.abs(confronto)}% ${confronto > 0 ? 'in più' : 'in meno'} della media delle tre settimane prima.`,
            `Last 7 days: ${intero(s.volumeUltima)} kg, ${Math.abs(confronto)}% ${confronto > 0 ? 'more' : 'less'} than the average of the three weeks before.`,
          )}</Text>
      ) : null}
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('I chili sono serie × ripetizioni × peso delle sedute chiuse nell’app.', 'The kilos are sets × reps × weight from the sessions finished in the app.')}</Text>
    </Carta>
  )
}

function Piccola({ valore, etichetta }: { valore: string; etichetta: string }) {
  const p = usePalette()
  return (
    <View style={[stili.piccolaCifra, { backgroundColor: p.incavo }]}>
      <Text style={[stili.piccolaValore, { color: p.testo }]}>{valore}</Text>
      <Text style={[stili.piccola, { color: p.testoSecondario }]}>{etichetta}</Text>
    </View>
  )
}

function Riposo({ a }: { a: AnalisiTraining }) {
  const r = a.riposo
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.griglia}>
        <Piccola valore={String(r.giorniDiRiposo)} etichetta={t('giorni di riposo', 'rest days')} />
        <Piccola valore={String(r.intervalloMassimo)} etichetta={t('giorni, la pausa più lunga', 'days, the longest break')} />
        <Piccola valore={r.daQuando === null ? '—' : r.daQuando === 0 ? t('oggi', 'today') : String(r.daQuando)} etichetta={r.daQuando !== null && r.daQuando > 1 ? t('giorni dall’ultimo', 'days since the last one') : t('ultimo allenamento', 'last workout')} />
      </View>
    </Carta>
  )
}

function Calorie({ a, fit }: { a: AnalisiTraining; fit: ReturnType<typeof useFit> }) {
  const p = usePalette()
  const massimo = Math.max(1, ...(a.calorie?.perTipo.map((x) => x.kcal) ?? [1]))
  return (
    <Carta style={{ gap: spazio.tre }}>
      {a.calorie ? (
        <>
          <View style={stili.griglia}>
            <Piccola valore={intero(a.calorie.totali)} etichetta={t('kcal in 4 settimane', 'kcal in 4 weeks')} />
            <Piccola valore={a.calorie.perSeduta !== null ? intero(a.calorie.perSeduta) : '—'} etichetta={t('kcal a sessione', 'kcal per session')} />
          </View>
          {a.calorie.perTipo.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sottoTitolo, { color: p.testo }]}>{t('Da dove vengono', 'Where they come from')}</Text>
              {a.calorie.perTipo.slice(0, 5).map((x) => (
                <View key={x.tipo} style={{ gap: 4 }}>
                  <View style={stili.rigaDue}>
                    <Text style={[stili.nota, { color: p.testo, flex: 1 }]} numberOfLines={1}>
                      {x.tipo}
                    </Text>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${intero(x.kcal)} kcal`}</Text>
                  </View>
                  <Barra valore={x.kcal / massimo} colore={FUOCO[1]} altezza={6} />
                </View>
              ))}
            </View>
          ) : null}
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t('Sono stime, e possono sbagliare del 20–30%: contano le sedute chiuse nell’app e le lezioni con la presenza segnata.', 'These are estimates, and can be off by 20–30%: sessions finished in the app and classes with attendance marked are what count.')}</Text>
        </>
      ) : fit.corpo.stato === 'mancano-dati' ? (
        <>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Per stimare le calorie servono peso, altezza, età e sesso: li segni una volta sola.', 'To estimate calories we need your weight, height, age and sex: you log them just once.')}</Text>
          <Pulsante testo={t('Aggiungi i tuoi dati', 'Add your details')} icona="piu" variante="secondario" piccolo onPress={() => router.push('/allenamento/misure')} />
        </>
      ) : fit.corpo.stato === 'attesa' ? (
        <Scheletro altezza={60} tondo={16} />
      ) : (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Le calorie si stimano per gli adulti.', 'Calories are estimated for adults.')}</Text>
      )}
      <View style={stili.azioni}>
        <View style={{ flex: 1 }}>
          <Pulsante testo={t('Il contatore', 'Calorie counter')} icona="fiamma" variante="contorno" piccolo onPress={() => router.push('/allenamento/calorie')} />
        </View>
        <View style={{ flex: 1 }}>
          <Pulsante testo={t('Il Balance', 'Balance')} icona="grafico" variante="contorno" piccolo onPress={() => router.push('/allenamento/balance')} />
        </View>
      </View>
    </Carta>
  )
}

export function SchermataTraining() {
  const p = usePalette()
  const fit = useFit()
  const oggi = oggiRoma()
  const a = useMemo(() => (fit.sessioni ? analizzaTraining(fit.sessioni, oggi, fit.attivita) : null), [fit.sessioni, fit.attivita, oggi])
  const testata = { sopratitolo: 'Athlon Health Score', titolo: t('Il tuo allenamento', 'Your training'), indietro: '/allenamento/punteggio' as const, barra: false as const }

  return (
    <Schermata {...testata}>
      {!a ? (
        <>
          <Scheletro altezza={190} tondo={28} />
          <Scheletro altezza={150} tondo={24} />
        </>
      ) : !a.haDati ? (
        <Messaggio tono="attenzione" titolo={t('Ancora niente da analizzare', 'Nothing to analyze yet')}>
          {t('Qui compare l’analisi appena ci sono allenamenti: i piani di allenamento chiusi nell’app e le lezioni con la presenza segnata dalla reception.', 'Your analysis shows up here as soon as there are workouts: workout plans finished in the app and classes where reception marks your attendance.')}
        </Messaggio>
      ) : (
        <>
          <Entra indice={0}>
            <Riepilogo a={a} />
          </Entra>

          {a.frasi.length ? (
            <Entra indice={1}>
              <Sezione titolo={t('In breve', 'In short')}>
                <Carta style={{ gap: spazio.due }}>
                  {a.frasi.map((f) => (
                    <View key={f} style={stili.frase}>
                      <View style={[stili.puntino, { backgroundColor: FUOCO[1], marginTop: 7 }]} />
                      <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{f}</Text>
                    </View>
                  ))}
                </Carta>
              </Sezione>
            </Entra>
          ) : null}

          <Entra indice={2}>
            <Sezione titolo={t('Settimana per settimana', 'Week by week')}>
              <SettimanaPerSettimana settimane={a.settimane} />
            </Sezione>
          </Entra>

          <Entra indice={3}>
            <Sezione titolo={t('Cosa fai', 'What you do')}>
              <Divisione a={a} />
            </Sezione>
          </Entra>

          <Entra indice={4}>
            <Sezione titolo={t('Quando ti alleni', 'When you train')}>
              <Quando a={a} />
            </Sezione>
          </Entra>

          {a.sala ? (
            <Entra indice={5}>
              <Sezione titolo={t('La sala', 'Gym floor')}>
                <Sala a={a} />
              </Sezione>
            </Entra>
          ) : null}

          <Entra indice={6}>
            <Sezione titolo={t('Il riposo', 'Rest')}>
              <Riposo a={a} />
            </Sezione>
          </Entra>

          <Entra indice={7}>
            <Sezione titolo={t('Le calorie dell’allenamento', 'Calories from training')}>
              <Calorie a={a} fit={fit} />
            </Sezione>
          </Entra>
        </>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  cornice: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.tre + 2 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  sotto: { color: 'rgba(255,255,255,0.65)', fontFamily: F.medio, fontSize: 12.5 },
  cifre: { flexDirection: 'row', gap: spazio.tre },
  cifra: { color: '#fff', fontFamily: F.extra, fontSize: 30, letterSpacing: -0.8 },
  cifraEtichetta: { color: 'rgba(255,255,255,0.75)', fontFamily: F.semi, fontSize: 13 },
  cifraSotto: { color: 'rgba(255,255,255,0.55)', fontFamily: F.medio, fontSize: 12 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  sottoTitolo: { fontFamily: F.bold, fontSize: 15 },
  settimana: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  settimanaNome: { fontFamily: F.bold, fontSize: 14 },
  settimanaValore: { fontFamily: F.extra, fontSize: 16 },
  tacche: { flexDirection: 'row', gap: 4 },
  tacca: { width: 18, height: 8, borderRadius: 4 },
  spezzata: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  legenda: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  puntino: { width: 8, height: 8, borderRadius: 4 },
  rigaDue: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  giorniSett: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sigla: { fontFamily: F.bold, fontSize: 12 },
  fascia: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  piccolaCifra: { flexGrow: 1, flexBasis: '45%', borderRadius: 16, padding: spazio.tre, gap: 2 },
  piccolaValore: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.5 },
  azioni: { flexDirection: 'row', gap: spazio.due },
  frase: { flexDirection: 'row', gap: spazio.due, alignItems: 'flex-start' },
})
