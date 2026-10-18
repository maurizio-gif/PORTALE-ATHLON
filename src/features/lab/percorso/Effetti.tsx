import { useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Svg, { Circle, G, Line, Polygon, Text as TestoSvg } from 'react-native-svg'

import { LARGO } from '@/components/Pagina'
import { spazio } from '@/theme'

import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
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

const intero = (n: number) => Math.round(n).toLocaleString('it-IT')
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
    <View ref={rif} style={stili.barre} accessibilityLabel={`Minuti per giorno: ${e.giorni.perGiorno.map((g) => `${GIORNO_BREVE[g.giorno]} ${g.minuti}`).join(', ')}`}>
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
        { c: p.blu, t: 'In sala' },
        { c: p.accento, t: 'Lezioni' },
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
  const testo = assi.map((a) => `${a.etichetta} ${a.valore ?? 'dato non disponibile'}`).join(', ')
  return (
    <View ref={rif} style={{ alignItems: 'center' }} accessible accessibilityLabel={`Profilo delle lezioni: ${testo}`}>
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
  if (l.minuti === 0) return <Nota>Il percorso non ha lezioni: il profilo riguarda solo le lezioni di gruppo.</Nota>
  const copertura = Math.round((l.copertura ?? 0) * 100)
  return (
    <View style={{ gap: spazio.tre }}>
      <Radar assi={l.assi} />
      <View style={{ gap: spazio.due }}>
        {l.assi.map((a) => (
          <View key={a.id} style={stili.assiRiga}>
            <Text style={[stili.assiNome, { color: p.testo }]}>{a.etichetta}</Text>
            {a.valore == null ? (
              <Text style={[stili.nota, { color: p.testoTerzo, flex: 1 }]}>dato non disponibile</Text>
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
      <Nota>{`L’intensità media delle lezioni, pesata sui minuti. Calcolata sul ${copertura}% dei minuti di lezione.`}</Nota>
      {l.senzaDati.length ? <Nota piccola>{`Per ${l.senzaDati.join(', ')} il club non ha ancora indicato le barre: non contano nel profilo, e non le inventiamo.`}</Nota> : null}
      {l.assi.some((a) => a.valore !== null && a.minutiConDato < l.minuti) ? (
        <Nota piccola>Alcuni assi sono calcolati su meno lezioni degli altri: dove una lezione non ha quella barra (per esempio la flessibilità in acqua), non c’è.</Nota>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 3. La sala

function Sala({ e }: { e: Effetti }) {
  const p = usePalette()
  const s = e.sala
  if (s.sedute === 0) return <Nota>Il percorso non ha tappe di sala.</Nota>
  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.nota, { color: p.testo }]}>{`${s.sedute} ${s.sedute === 1 ? 'seduta' : 'sedute'} in sala, ${ore(s.minuti)} in tutto.`}</Text>
      {!s.conDati ? (
        <Nota>Dei piani di queste tappe non conosciamo ancora i muscoli degli esercizi.</Nota>
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
          {s.scoperti.length ? <Nota>{`In sala non lavori: ${s.scoperti.join(', ').toLowerCase()}.`}</Nota> : <Nota>I gruppi principali sono tutti lavorati almeno una volta.</Nota>}
          <Nota piccola>Contano i muscoli primari degli esercizi dei piani. Le lezioni non sono in questa mappa: le loro barre dicono quanto sono intense, non quali muscoli lavorano.</Nota>
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
        etichetta="Attività aerobica"
        valore={r.equivalenti}
        riferimento={150}
        unita="min"
        nota={`${intero(r.moderati)} min moderati${r.intensi ? ` e ${intero(r.intensi)} intensi (contano il doppio)` : ''}. ${r.cardioContatoModerato ? 'Il cardio lo contiamo come moderato. ' : ''}${r.nonClassificati ? `${intero(r.nonClassificati)} min di lezioni di cui non conosciamo l’intensità non sono contati. ` : ''}${r.leggeri ? `${intero(r.leggeri)} min di attività leggera (come lo yoga) non sono contati.` : ''}`.trim()}
      />
      <Riferimento etichetta="Rinforzo muscolare" valore={r.giorniRinforzo} riferimento={2} unita="giorni" nota="Giorni con la sala o una lezione di forza." />
      <Nota piccola>Sono i riferimenti dell’OMS per gli adulti (150–300 minuti a intensità moderata o la metà se intensa, e almeno due giorni di rinforzo): indicazioni, non traguardi.</Nota>
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
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{g.attivi === 1 ? 'giorno attivo' : 'giorni attivi'}</Text>
        </View>
        <View style={stili.cifra}>
          <Numero valore={String(g.riposo)} size={30} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{g.riposo === 1 ? 'giorno di riposo' : 'giorni di riposo'}</Text>
        </View>
        <View style={stili.cifra}>
          <Numero valore={String(g.difila)} size={30} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>di fila al massimo</Text>
        </View>
      </View>
      <Nota>{`Il giorno più pieno dura ${ore(g.piuLungo)}. La settimana si ripete: la domenica è di fila col lunedì.`}</Nota>
      {e.sala.ravvicinati.length ? (
        <Messaggio tono="attenzione">
          {`${e.sala.ravvicinati.map((x) => x.etichetta).join(', ')}: ${e.sala.ravvicinati.length === 1 ? 'lavorato forte' : 'lavorati forte'} in due giorni di fila. Se puoi, sposta una delle due sedute.`}
        </Messaggio>
      ) : e.sala.conDati ? (
        <Nota>Nessun gruppo muscolare è lavorato forte in due giorni di fila.</Nota>
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
      <Nota piccola>Dice se la settimana ha gli ingredienti che le linee guida indicano per questo tipo di lavoro, non se il risultato arriverà: dipende da come ti alleni, da come mangi e da come recuperi.</Nota>
    </View>
  )
}

// ---------------------------------------------------------------------------
// 7. Le ultime quattro settimane, e le calorie

const PAROLE = { piu: 'più di', pari: 'in linea con', meno: 'meno di' } as const

function Confronto({ e, ultime, corpo }: { e: Effetti; ultime: Ultime | null; corpo: StatoCorpo }) {
  const p = usePalette()
  // Senza i dati del corpo le attivita' non si contano (il contatore le valuta in calorie): non e' che stiamo leggendo, manca altro.
  if (corpo.stato === 'mancano-dati') return <Nota>Per confrontare il percorso con i tuoi ultimi allenamenti ci servono peso, altezza, età e sesso: li aggiungi nelle misure e nel profilo.</Nota>
  if (corpo.stato === 'no') return null
  if (!ultime) return <Nota>Sto leggendo i tuoi ultimi allenamenti…</Nota>
  if (ultime.attivita === 0) {
    return <Nota>Nelle ultime quattro settimane non risultano allenamenti registrati: contiamo le sedute chiuse nell’app e le lezioni con la presenza segnata dalla reception.</Nota>
  }
  // Il cardio non e' nello storico (non si registra): il confronto e' sul resto.
  const nelPercorso = e.minuti.totale - e.minuti.cardio
  const minuti = verso(nelPercorso, ultime.minuti)
  return (
    <View style={{ gap: spazio.due }}>
      <View style={stili.cifre}>
        <View style={stili.cifra}>
          <Numero valore={intero(ultime.minuti)} unita="min" size={26} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>a settimana, di solito</Text>
        </View>
        <View style={stili.cifra}>
          <Numero valore={intero(nelPercorso)} unita="min" size={26} colore={p.accento} />
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>in questo percorso</Text>
        </View>
      </View>
      <Nota>{`In minuti il percorso è ${PAROLE[minuti]} quello che fai di solito (${ultime.attivita.toLocaleString('it-IT')} attività a settimana).`}</Nota>
      <Nota piccola>La media è delle quattro settimane intere prima di questa, solo con quello che sappiamo: le sedute chiuse nell’app e le lezioni con la presenza segnata. Il cardio non è nel confronto: non lo registriamo.</Nota>
    </View>
  )
}

function Calorie({ e, corpo }: { e: Effetti; corpo: StatoCorpo }) {
  const p = usePalette()
  if (corpo.stato === 'no') return null
  if (corpo.stato === 'attesa') return <Nota>Sto leggendo i tuoi dati…</Nota>
  if (corpo.stato === 'mancano-dati') {
    const cosa = corpo.motivo === 'misure' ? 'il peso e l’altezza' : corpo.motivo === 'eta' ? 'la data di nascita' : 'il sesso'
    return <Nota>{`Per stimare le calorie ci servono ${cosa}: li aggiungi nelle misure e nel profilo.`}</Nota>
  }
  const c = e.calorie
  if (!c) return <Nota>Non riusciamo a stimare le calorie di queste tappe.</Nota>
  return (
    <View style={{ gap: spazio.due }}>
      <Numero valore={`circa ${intero(c.circa)}`} unita="kcal a settimana" size={30} />
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Da ${intero(c.da)} a ${intero(c.a)}. Contano anche quelle che consumeresti comunque in quei minuti.`}</Text>
      {c.parziale ? <Nota piccola>Per qualche tappa non abbiamo una stima, quindi il totale è un po’ più basso.</Nota> : null}
      <Nota piccola>È una stima, come nelle schede e nel calendario: può sbagliare anche del 20–30%. Il cardio vale come attività moderata, la sala come nella stima del piano. Non è un’indicazione per la dieta.</Nota>
    </View>
  )
}

// ---------------------------------------------------------------------------

export function PannelloEffetti({ effetti: e, ultime, corpo, titolo = 'Cosa fa questa settimana' }: { effetti: Effetti; ultime: Ultime | null; corpo: StatoCorpo; titolo?: string }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  // Su schermo largo i riquadri stanno su due colonne (come i giorni della settimana): il primo, la settimana, a tutta larghezza.
  const largo = width >= LARGO
  const meta = largo ? ({ flexGrow: 1, flexBasis: '46%' } as const) : undefined
  const riepilogo = useMemo(() => {
    const parti = [
      e.tappe.sala ? `${e.tappe.sala} ${e.tappe.sala === 1 ? 'volta' : 'volte'} in sala` : null,
      e.tappe.lezioni ? `${e.tappe.lezioni} ${e.tappe.lezioni === 1 ? 'lezione' : 'lezioni'}` : null,
      e.tappe.cardio ? `${e.tappe.cardio} di cardio` : null,
    ].filter(Boolean)
    return parti.join(' · ')
  }, [e.tappe])
  return (
    <Sezione titolo={titolo}>
      <View style={largo ? stili.griglia : { gap: spazio.tre }}>
        <Carta style={[{ gap: spazio.tre }, largo ? { width: '100%' } : null]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spazio.tre }}>
            <Numero valore={ore(e.minuti.totale)} size={34} />
            <Text style={[stili.nota, { color: p.testoSecondario, flex: 1, textAlign: 'right' }]}>{riepilogo || 'Nessuna tappa'}</Text>
          </View>
          <GiorniBarre e={e} />
          <Legenda />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>Il profilo delle lezioni</Titolo>
          <ProfiloLezioni e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>Il lavoro in sala</Titolo>
          <Sala e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>Rispetto a quello che indica l’OMS</Titolo>
          <Riferimenti e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>Carico e recupero</Titolo>
          <Carico e={e} />
        </Carta>

        <Carta style={[{ gap: spazio.tre }, meta]}>
          <Titolo>{`L’obiettivo: ${e.obiettivo.obiettivo.toLowerCase()}`}</Titolo>
          <Obiettivo e={e} />
        </Carta>

        {corpo.stato === 'no' ? null : (
          <Carta style={[{ gap: spazio.tre }, meta]}>
            <Titolo>Rispetto alle ultime quattro settimane</Titolo>
            <Confronto e={e} ultime={ultime} corpo={corpo} />
          </Carta>
        )}

        {corpo.stato === 'no' ? null : (
          <Carta style={[{ gap: spazio.tre }, meta]}>
            <Titolo>Le calorie</Titolo>
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
