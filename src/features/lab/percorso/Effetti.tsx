import { useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Svg, { Circle, G, Line, Polygon, Text as TestoSvg } from 'react-native-svg'

import { LARGO } from '@/components/Pagina'
import { locale, t as tr } from '@/lib/lingua'
import { spazio } from '@/theme'

import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
import { nomeObiettivo } from '../schede/questionario'
import type { StatoCorpo } from '../schede/CalorieLezione'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Barra, Carta, Messaggio, Numero, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { GIORNO_BREVE } from './comune'
import { verso, type Asse, type Effetti, type Riga, type Ultime } from './effetti'

// Il pannello degli effetti del Percorso Athlon (20/10/2026): **cosa fa la settimana**, non solo quante calorie
// costa. Tutto quello che dice e' calcolato da `effetti.ts` — una funzione pura che si ricalcola mentre il socio
// cambia una tappa — e mai scritto dal tutor. Sette riquadri, dal piu' generale al piu' particolare:
//   1. la settimana in minuti, giorno per giorno;
//   2. il profilo delle lezioni (radar a quattro assi, con la quota dei minuti su cui e' calcolato);
//   3. il lavoro in sala (i muscoli degli esercizi dei piani);
//   4. i riferimenti dell'OMS (minuti aerobici e giorni di rinforzo): riferimenti, non traguardi;
//   5. carico e recupero;
//   6. cosa copre l'obiettivo scelto;
//   7. il confronto con le ultime quattro settimane, e le calorie (una riga fra le altre, non il centro).
//
// **Dove manca un dato lo si dice**: un asse senza barre e' «dato non disponibile», mai zero; le lezioni senza barre
// (Nuoto Libero, Scuola Nuoto) sono nominate. **Niente promesse**: nessun chilo, nessun risultato estetico.
// Le animazioni (radar, barre) seguono `useProgresso` e partono quando il riquadro entra nello schermo, come il
// contatore delle calorie; con «riduci movimento» vanno subito al valore finale.

const intero = (n: number) => Math.round(n).toLocaleString(locale())
const ore = (min: number) => (min >= 90 ? `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}`.trim() : `${intero(min)} min`)

function Titolo({ children }: { children: string }) {
  const p = usePalette()
  return <Text style={[stili.titolo, { color: p.testo }]}>{children}</Text>
}

function Nota({ children, piccola = false }: { children: string; piccola?: boolean }) {
  const p = usePalette()
  return <Text style={[piccola ? stili.piccola : stili.nota, { color: piccola ? p.testoTerzo : p.testoSecondario }]}>{children}</Text>
}

// ---------------------------------------------------------------------------
// 1. La settimana, giorno per giorno

function GiorniBarre({ e }: { e: Effetti }) {
  const p = usePalette()
  const [rif, visibile] = useVisibile()
  const t = useProgresso(1100, 100, visibile)
  const massimo = Math.max(60, e.giorni.piuLungo)
  const ALTEZZA = 92
  return (
    <View ref={rif} style={stili.barre} accessibilityLabel={`${tr('Minuti per giorno', 'Minutes per day')}: ${e.giorni.perGiorno.map((g) => `${GIORNO_BREVE[g.giorno]} ${g.minuti}`).join(', ')}`}>
      {e.giorni.perGiorno.map((g) => {
        const h = (m: number) => (m / massimo) * ALTEZZA * t
        return (
          <View key={g.giorno} style={stili.barraColonna}>
            <Text style={[stili.barraValore, { color: g.minuti ? p.testo : p.testoTerzo }]}>{g.minuti ? intero(g.minuti) : '—'}</Text>
            <View style={[stili.barraPila, { height: ALTEZZA }]}>
              <View style={{ height: h(g.cardio), backgroundColor: p.ok, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
              <View style={{ height: h(g.lezioni), backgroundColor: p.accento }} />
              <View style={{ height: h(g.sala), backgroundColor: p.blu, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }} />
            </View>
            <Text style={[stili.barraGiorno, { color: g.minuti ? p.testo : p.testoTerzo }]}>{GIORNO_BREVE[g.giorno]}</Text>
          </View>
        )
      })}
    </View>
  )
}

function Legenda() {
  const p = usePalette()
  return (
    <View style={stili.legenda}>
      {[
        { c: p.blu, t: tr('In sala', 'Gym floor') },
        { c: p.accento, t: tr('Lezioni', 'Classes') },
        { c: p.ok, t: 'Cardio' },
      ].map((x) => (
        <View key={x.t} style={stili.legendaVoce}>
          <View style={[stili.legendaPunto, { backgroundColor: x.c }]} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{x.t}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 2. Il radar delle lezioni

// Il disegno e' piu' largo che alto: le etichette di sinistra e di destra («Flessibilita'», «Cardio») stanno ai lati
// del radar, e in un quadrato venivano tagliate. Scala con la colonna (viewBox), e sul telefono piu' stretto resta leggibile.
const LARGHEZZA = 320
const ALTEZZA = 250
const CX = LARGHEZZA / 2
const CY = ALTEZZA / 2
const RAGGIO = 70

/** L'angolo di un asse: il primo in alto, poi in senso orario. */
const angolo = (i: number) => (-90 + i * 90) * (Math.PI / 180)
const punto = (i: number, r: number) => ({ x: CX + Math.cos(angolo(i)) * r, y: CY + Math.sin(angolo(i)) * r })

function Radar({ assi }: { assi: Asse[] }) {
  const p = usePalette()
  const [rif, visibile] = useVisibile()
  const t = useProgresso(1300, 150, visibile)
  // Un asse senza dato sta al centro e non ha il suo vertice disegnato: non e' zero, e' assente.
  const forma = assi.map((a, i) => punto(i, ((a.valore ?? 0) / 100) * RAGGIO * t))
  const testo = assi.map((a) => `${a.etichetta} ${a.valore ?? tr('dato non disponibile', 'data not available')}`).join(', ')
  return (
    <View ref={rif} style={{ alignItems: 'center' }} accessible accessibilityLabel={`${tr('Profilo delle lezioni', 'Class profile')}: ${testo}`}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`} style={{ width: '100%', maxWidth: 360, aspectRatio: LARGHEZZA / ALTEZZA }}>
        {[25, 50, 75, 100].map((q) => (
          <Polygon
            key={q}
            points={assi.map((_, i) => { const x = punto(i, (q / 100) * RAGGIO); return `${x.x},${x.y}` }).join(' ')}
            fill="none"
            stroke={p.linea}
            strokeWidth={q === 100 ? 1.4 : 1}
          />
        ))}
        {assi.map((_, i) => {
          const x = punto(i, RAGGIO)
          return <Line key={i} x1={CX} y1={CY} x2={x.x} y2={x.y} stroke={p.linea} strokeWidth={1} />
        })}
        <Polygon points={forma.map((x) => `${x.x},${x.y}`).join(' ')} fill={p.accento} fillOpacity={0.2} stroke={p.accento} strokeWidth={2.4} strokeLinejoin="round" />
        {assi.map((a, i) => (a.valore == null ? null : <Circle key={a.id} cx={forma[i].x} cy={forma[i].y} r={4.2} fill={p.accento} />))}
        <G>
          {assi.map((a, i) => {
            const x = punto(i, RAGGIO + (i % 2 === 0 ? 20 : 14))
            return (
              <TestoSvg
                key={a.id}
                x={x.x}
                y={x.y + (i === 0 ? -2 : i === 2 ? 8 : 4)}
                fontSize={12.5}
                fontFamily={F.bold}
                fill={a.valore == null ? p.testoTerzo : p.testo}
                textAnchor={i === 1 ? 'start' : i === 3 ? 'end' : 'middle'}
              >
                {a.etichetta}
              </TestoSvg>
            )
          })}
        </G>
      </Svg>
    </View>
  )
}

function ProfiloLezioni({ e }: { e: Effetti }) {
  const p = usePalette()
  const l = e.lezioni
  if (l.minuti === 0) return <Nota>{tr('Il percorso non ha lezioni: il profilo riguarda solo le lezioni di gruppo.', 'The program has no classes: the profile only covers group classes.')}</Nota>
  const copertura = Math.round((l.copertura ?? 0) * 100)
  return (
    <View style={{ gap: spazio.tre }}>
      <Radar assi={l.assi} />
      <View style={{ gap: spazio.due }}>
        {l.assi.map((a) => (
          <View key={a.id} style={stili.assiRiga}>
            <Text style={[stili.assiNome, { color: p.testo }]}>{a.etichetta}</Text>
            {a.valore == null ? (
              <Text style={[stili.nota, { color: p.testoTerzo, flex: 1 }]}>{tr('dato non disponibile', 'data not available')}</Text>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Barra valore={a.valore / 100} colore={p.accento} animata />
                </View>
                <Text style={[stili.assiValore, { color: p.testo }]}>{a.valore}</Text>
              </>
            )}
          </View>
        ))}
      </View>
      <Nota>{tr(`L’intensità media delle lezioni, pesata sui minuti. Calcolata sul ${copertura}% dei minuti di lezione.`, `The average intensity of the classes, weighted by minutes. Calculated on ${copertura}% of class minutes.`)}</Nota>
      {l.senzaDati.length ? <Nota piccola>{tr(`Per ${l.senzaDati.join(', ')} il club non ha ancora indicato le barre: non contano nel profilo, e non le inventiamo.`, `For ${l.senzaDati.join(', ')} the club hasn’t set the bars yet: they don’t count in the profile, and we don’t make them up.`)}</Nota> : null}
      {l.assi.some((a) => a.valore !== null && a.minutiConDato < l.minuti) ? (
        <Nota piccola>{tr('Alcuni assi sono calcolati su meno lezioni degli altri: dove una lezione non ha quella barra (per esempio la flessibilità in acqua), non c’è.', 'Some axes are calculated on fewer classes than others: where a class doesn’t have that bar (for example flexibility in the water), it’s left out.')}</Nota>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 3. La sala

function Sala({ e }: { e: Effetti }) {
  const p = usePalette()
  const s = e.sala
  if (s.sedute === 0) return <Nota>{tr('Il percorso non ha tappe di sala.', 'The program has no gym floor steps.')}</Nota>
  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.nota, { color: p.testo }]}>{tr(`${s.sedute} ${s.sedute === 1 ? 'seduta' : 'sedute'} in sala, ${ore(s.minuti)} in tutto.`, `${s.sedute} gym floor ${s.sedute === 1 ? 'session' : 'sessions'}, ${ore(s.minuti)} in total.`)}</Text>
      {!s.conDati ? (
        <Nota>{tr('Dei piani di queste tappe non conosciamo ancora i muscoli degli esercizi.', 'We don’t know the exercise muscles of these steps’ plans yet.')}</Nota>
      ) : (
        <>
          <View style={stili.chip}>
            {s.muscoli.map((m) => (
              <View key={m.chiave} style={[stili.chipVoce, { backgroundColor: p.incavo }]}>
                <Text style={[stili.chipTesto, { color: p.testo }]}>{m.etichetta}</Text>
                <Text style={[stili.chipNumero, { color: p.accento }]}>{`${m.sedute}×`}</Text>
              </View>
            ))}
          </View>
          {s.scoperti.length ? <Nota>{tr(`In sala non lavori: ${s.scoperti.join(', ').toLowerCase()}.`, `On the gym floor you don’t work: ${s.scoperti.join(', ').toLowerCase()}.`)}</Nota> : <Nota>{tr('I gruppi principali sono tutti lavorati almeno una volta.', 'All major muscle groups are worked at least once.')}</Nota>}
          <Nota piccola>{tr('Contano i muscoli primari degli esercizi dei piani. Le lezioni non sono in questa mappa: le loro barre dicono quanto sono intense, non quali muscoli lavorano.', 'These are the primary muscles of the plans’ exercises. Classes aren’t on this map: their bars say how intense they are, not which muscles they work.')}</Nota>
        </>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 4. I riferimenti dell'OMS

function Riferimento({ etichetta, valore, riferimento, unita, nota }: { etichetta: string; valore: number; riferimento: number; unita: string; nota?: string }) {
  const p = usePalette()
  const fatto = valore >= riferimento
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spazio.due }}>
        <Text style={[stili.voceTitolo, { color: p.testo }]}>{etichetta}</Text>
        <Text style={[stili.voceValore, { color: fatto ? p.ok : p.testo }]}>{`${intero(valore)} / ${riferimento} ${unita}`}</Text>
      </View>
      <Barra valore={Math.min(1, valore / riferimento)} colore={fatto ? p.ok : p.accento} animata />
      {nota ? <Nota piccola>{nota}</Nota> : null}
    </View>
  )
}

function Riferimenti({ e }: { e: Effetti }) {
  const r = e.riferimenti
  return (
    <View style={{ gap: spazio.tre }}>
      <Riferimento
        etichetta={tr('Attività aerobica', 'Aerobic activity')}
        valore={r.equivalenti}
        riferimento={150}
        unita="min"
        nota={tr(
          `${intero(r.moderati)} min moderati${r.intensi ? ` e ${intero(r.intensi)} intensi (contano il doppio)` : ''}. ${r.cardioContatoModerato ? 'Il cardio lo contiamo come moderato. ' : ''}${r.nonClassificati ? `${intero(r.nonClassificati)} min di lezioni di cui non conosciamo l’intensità non sono contati. ` : ''}${r.leggeri ? `${intero(r.leggeri)} min di attività leggera (come lo yoga) non sono contati.` : ''}`,
          `${intero(r.moderati)} min moderate${r.intensi ? ` and ${intero(r.intensi)} vigorous (they count double)` : ''}. ${r.cardioContatoModerato ? 'We count cardio as moderate. ' : ''}${r.nonClassificati ? `${intero(r.nonClassificati)} min of classes whose intensity we don’t know aren’t counted. ` : ''}${r.leggeri ? `${intero(r.leggeri)} min of light activity (like yoga) aren’t counted.` : ''}`,
        ).trim()}
      />
      <Riferimento etichetta={tr('Rinforzo muscolare', 'Muscle strengthening')} valore={r.giorniRinforzo} riferimento={2} unita={tr('giorni', 'days')} nota={tr('Giorni con la sala o una lezione di forza.', 'Days with the gym floor or a strength class.')} />
      <Nota piccola>{tr('Sono i riferimenti dell’OMS per gli adulti (150–300 minuti a intensità moderata o la metà se intensa, e almeno due giorni di rinforzo): indicazioni, non traguardi.', 'These are the WHO guidelines for adults (150–300 minutes at moderate intensity or half that if vigorous, and at least two strengthening days): guidance, not targets.')}</Nota>
    </View>
  )
}

// ---------------------------------------------------------------------------
// 5. Carico e recupero

function Carico({ e }: { e: Effetti }) {
  const p = usePalette()
  const g = e.giorni
  return (
    <View style={{ gap: spazio.due }}>
      <View style={stili.cifre}>
        <View style={stili.cifra}>
          <Numero valore={String(g.attivi)} size={30} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{g.attivi === 1 ? tr('giorno attivo', 'active day') : tr('giorni attivi', 'active days')}</Text>
        </View>
        <View style={stili.cifra}>
          <Numero valore={String(g.riposo)} size={30} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{g.riposo === 1 ? tr('giorno di riposo', 'rest day') : tr('giorni di riposo', 'rest days')}</Text>
        </View>
        <View style={stili.cifra}>
          <Numero valore={String(g.difila)} size={30} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{tr('di fila al massimo', 'in a row at most')}</Text>
        </View>
      </View>
      <Nota>{tr(`Il giorno più pieno dura ${ore(g.piuLungo)}. La settimana si ripete: la domenica è di fila col lunedì.`, `The busiest day lasts ${ore(g.piuLungo)}. The week repeats: Sunday runs straight into Monday.`)}</Nota>
      {e.sala.ravvicinati.length ? (
        <Messaggio tono="attenzione">
          {tr(
            `${e.sala.ravvicinati.map((x) => x.etichetta).join(', ')}: ${e.sala.ravvicinati.length === 1 ? 'lavorato forte' : 'lavorati forte'} in due giorni di fila. Se puoi, sposta una delle due sedute.`,
            `${e.sala.ravvicinati.map((x) => x.etichetta).join(', ')}: worked hard two days in a row. If you can, move one of the two sessions.`,
          )}
        </Messaggio>
      ) : e.sala.conDati ? (
        <Nota>{tr('Nessun gruppo muscolare è lavorato forte in due giorni di fila.', 'No muscle group is worked hard two days in a row.')}</Nota>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 6. L'obiettivo

const ICONA_RIGA = (r: Riga): { nome: NomeIcona; colore: 'ok' | 'attenzione' | 'neutro' } => (r.ok === true ? { nome: 'ok', colore: 'ok' } : r.ok === false ? { nome: 'attenzione', colore: 'attenzione' } : { nome: 'info', colore: 'neutro' })

function Obiettivo({ e }: { e: Effetti }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.tre }}>
      {e.obiettivo.righe.map((r) => {
        const i = ICONA_RIGA(r)
        return (
          <View key={r.testo} style={stili.obiettivoRiga}>
            <Icona nome={i.nome} size={20} colore={i.colore === 'ok' ? p.ok : i.colore === 'attenzione' ? p.attenzione : p.testoTerzo} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[stili.voceTitolo, { color: p.testo }]}>{r.testo}</Text>
              {r.dettaglio ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{r.dettaglio}</Text> : null}
            </View>
          </View>
        )
      })}
      <Nota piccola>{tr('Dice se la settimana ha gli ingredienti che le linee guida indicano per questo tipo di lavoro, non se il risultato arriverà: dipende da come ti alleni, da come mangi e da come recuperi.', 'It tells you whether the week has the ingredients the guidelines recommend for this kind of work, not whether you’ll get the result: that depends on how you train, eat and recover.')}</Nota>
    </View>
  )
}

// ---------------------------------------------------------------------------
// 7. Le ultime quattro settimane, e le calorie

const PAROLE = { piu: tr('più di', 'more than'), pari: tr('in linea con', 'in line with'), meno: tr('meno di', 'less than') } as const

function Confronto({ e, ultime, corpo }: { e: Effetti; ultime: Ultime | null; corpo: StatoCorpo }) {
  const p = usePalette()
  // Senza i dati del corpo le attivita' non si contano (il contatore le valuta in calorie): non e' che stiamo leggendo, manca altro.
  if (corpo.stato === 'mancano-dati') return <Nota>{tr('Per confrontare il percorso con i tuoi ultimi allenamenti ci servono peso, altezza, età e sesso: li aggiungi nelle misure e nel profilo.', 'To compare the program with your recent workouts we need your weight, height, age and sex: you can add them in your measurements and profile.')}</Nota>
  if (corpo.stato === 'no') return null
  if (!ultime) return <Nota>{tr('Sto leggendo i tuoi ultimi allenamenti…', 'Reading your recent workouts…')}</Nota>
  if (ultime.attivita === 0) {
    return <Nota>{tr('Nelle ultime quattro settimane non risultano allenamenti registrati: contiamo le sedute chiuse nell’app e le lezioni con la presenza segnata dalla reception.', 'No workouts are recorded in the last four weeks: we count sessions completed in the app and classes with attendance marked by reception.')}</Nota>
  }
  // Il cardio non e' nello storico (non si registra): il confronto e' sul resto.
  const nelPercorso = e.minuti.totale - e.minuti.cardio
  const minuti = verso(nelPercorso, ultime.minuti)
  return (
    <View style={{ gap: spazio.due }}>
      <View style={stili.cifre}>
        <View style={stili.cifra}>
          <Numero valore={intero(ultime.minuti)} unita="min" size={26} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{tr('a settimana, di solito', 'a week, usually')}</Text>
        </View>
        <View style={stili.cifra}>
          <Numero valore={intero(nelPercorso)} unita="min" size={26} colore={p.accento} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{tr('in questo percorso', 'in this program')}</Text>
        </View>
      </View>
      <Nota>{tr(`In minuti il percorso è ${PAROLE[minuti]} quello che fai di solito (${ultime.attivita.toLocaleString(locale())} attività a settimana).`, `In minutes the program is ${PAROLE[minuti]} what you usually do (${ultime.attivita.toLocaleString(locale())} activities a week).`)}</Nota>
      <Nota piccola>{tr('La media è delle quattro settimane intere prima di questa, solo con quello che sappiamo: le sedute chiuse nell’app e le lezioni con la presenza segnata. Il cardio non è nel confronto: non lo registriamo.', 'The average covers the four full weeks before this one, using only what we know: sessions completed in the app and classes with attendance marked. Cardio isn’t in the comparison: we don’t record it.')}</Nota>
    </View>
  )
}

function Calorie({ e, corpo }: { e: Effetti; corpo: StatoCorpo }) {
  const p = usePalette()
  if (corpo.stato === 'no') return null
  if (corpo.stato === 'attesa') return <Nota>{tr('Sto leggendo i tuoi dati…', 'Reading your data…')}</Nota>
  if (corpo.stato === 'mancano-dati') {
    const cosa = corpo.motivo === 'misure' ? tr('il peso e l’altezza', 'your weight and height') : corpo.motivo === 'eta' ? tr('la data di nascita', 'your date of birth') : tr('il sesso', 'your sex')
    return <Nota>{tr(`Per stimare le calorie ci servono ${cosa}: li aggiungi nelle misure e nel profilo.`, `To estimate calories we need ${cosa}: you can add them in your measurements and profile.`)}</Nota>
  }
  const c = e.calorie
  if (!c) return <Nota>{tr('Non riusciamo a stimare le calorie di queste tappe.', 'We can’t estimate the calories for these steps.')}</Nota>
  return (
    <View style={{ gap: spazio.due }}>
      <Numero valore={tr(`circa ${intero(c.circa)}`, `about ${intero(c.circa)}`)} unita={tr('kcal a settimana', 'kcal a week')} size={30} />
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{tr(`Da ${intero(c.da)} a ${intero(c.a)}. Contano anche quelle che consumeresti comunque in quei minuti.`, `From ${intero(c.da)} to ${intero(c.a)}. This includes what you’d burn anyway in those minutes.`)}</Text>
      {c.parziale ? <Nota piccola>{tr('Per qualche tappa non abbiamo una stima, quindi il totale è un po’ più basso.', 'For some steps we have no estimate, so the total is a bit lower.')}</Nota> : null}
      <Nota piccola>{tr('È una stima, come nelle schede e nel calendario: può sbagliare anche del 20–30%. Il cardio vale come attività moderata, la sala come nella stima del piano. Non è un’indicazione per la dieta.', 'It’s an estimate, as in the plans and the calendar: it can be off by 20–30%. Cardio counts as moderate activity, the gym floor as in the plan estimate. It’s not dietary advice.')}</Nota>
    </View>
  )
}

// ---------------------------------------------------------------------------

export function PannelloEffetti({ effetti: e, ultime, corpo, titolo = tr('Cosa fa questa settimana', 'What this week does') }: { effetti: Effetti; ultime: Ultime | null; corpo: StatoCorpo; titolo?: string }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  // Su schermo largo i riquadri stanno su due colonne (come i giorni della settimana): il primo, la settimana, a tutta larghezza.
  const largo = width >= LARGO
  const meta = largo ? ({ flexGrow: 1, flexBasis: '46%' } as const) : undefined
  const riepilogo = useMemo(() => {
    const parti = [
      e.tappe.sala ? tr(`${e.tappe.sala} ${e.tappe.sala === 1 ? 'volta' : 'volte'} in sala`, `gym floor ${e.tappe.sala} ${e.tappe.sala === 1 ? 'time' : 'times'}`) : null,
      e.tappe.lezioni ? tr(`${e.tappe.lezioni} ${e.tappe.lezioni === 1 ? 'lezione' : 'lezioni'}`, `${e.tappe.lezioni} ${e.tappe.lezioni === 1 ? 'class' : 'classes'}`) : null,
      e.tappe.cardio ? tr(`${e.tappe.cardio} di cardio`, `${e.tappe.cardio} cardio`) : null,
    ].filter(Boolean)
    return parti.join(' · ')
  }, [e.tappe])
  return (
    <Sezione titolo={titolo}>
      <View style={largo ? stili.griglia : { gap: spazio.tre }}>
        <Carta style={[{ gap: spazio.tre }, largo ? { width: '100%' } : null]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spazio.tre }}>
            <Numero valore={ore(e.minuti.totale)} size={34} />
            <Text style={[stili.nota, { color: p.testoSecondario, flex: 1, textAlign: 'right' }]}>{riepilogo || tr('Nessuna tappa', 'No steps')}</Text>
          </View>
          <GiorniBarre e={e} />
          <Legenda />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>{tr('Il profilo delle lezioni', 'Class profile')}</Titolo>
          <ProfiloLezioni e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>{tr('Il lavoro in sala', 'Gym floor work')}</Titolo>
          <Sala e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>{tr('Rispetto a quello che indica l’OMS', 'Compared with WHO guidelines')}</Titolo>
          <Riferimenti e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>{tr('Carico e recupero', 'Load and recovery')}</Titolo>
          <Carico e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>{tr(`L’obiettivo: ${e.obiettivo.obiettivo.toLowerCase()}`, `Goal: ${nomeObiettivo(e.obiettivo.obiettivo).toLowerCase()}`)}</Titolo>
          <Obiettivo e={e} />
        </Carta>

        {corpo.stato === 'no' ? null : (
          <Carta style={[{ gap: spazio.tre }, meta]}>
            <Titolo>{tr('Rispetto alle ultime quattro settimane', 'Compared with the last four weeks')}</Titolo>
            <Confronto e={e} ultime={ultime} corpo={corpo} />
          </Carta>
        )}

        {corpo.stato === 'no' ? null : (
          <Carta style={[{ gap: spazio.tre }, meta]}>
            <Titolo>{tr('Le calorie', 'Calories')}</Titolo>
            <Calorie e={e} corpo={corpo} />
          </Carta>
        )}
      </View>
    </Sezione>
  )
}

const stili = StyleSheet.create({
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre + 2, alignItems: 'flex-start' },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  barre: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  barraColonna: { flex: 1, alignItems: 'center', gap: 4 },
  barraValore: { fontFamily: F.semi, fontSize: 11, fontVariant: ['tabular-nums'] },
  barraPila: { width: '100%', maxWidth: 34, justifyContent: 'flex-end' },
  barraGiorno: { fontFamily: F.bold, fontSize: 12 },
  legenda: { flexDirection: 'row', gap: spazio.tre, flexWrap: 'wrap' },
  legendaVoce: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaPunto: { width: 10, height: 10, borderRadius: 5 },
  assiRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  assiNome: { fontFamily: F.bold, fontSize: 14, width: 104 },
  voceTitolo: { fontFamily: F.bold, fontSize: 14, flex: 1 },
  voceValore: { fontFamily: F.extra, fontSize: 14, flexShrink: 0, fontVariant: ['tabular-nums'] },
  assiValore: { fontFamily: F.extra, fontSize: 14, width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipVoce: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipTesto: { fontFamily: F.semi, fontSize: 13.5 },
  chipNumero: { fontFamily: F.extra, fontSize: 12.5 },
  cifre: { flexDirection: 'row', gap: spazio.quattro, flexWrap: 'wrap' },
  cifra: { gap: 2 },
  obiettivoRiga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2 },
})
