import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { elencoMisure, elencoSchede, type Misura, type RigaSchedaLab, type SedutaBreve, type StatoTest } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { spazio } from '@/theme'

import { CartaBalance } from '../fit/Balance'
import { CartaCorpo } from '../fit/Corpo'
import { AreaFood } from '../fit/Food'
import { IntroFit } from '../fit/Intro'
import { RuotaBenessere } from '../fit/Ruota'
import { useFit } from '../fit/useFit'
import { CHIAVE_MISURE } from '../dati/Misure'
import { inMemoria, prendi } from '../memoria'
import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta, Entra, LinkSezione, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, MARE, NOTTE, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { giorniAlTest, giornoTest, LIVELLI, quando, testDaRifare, TIPI } from './comune'

// Athlon Health System (19/10/2026, era Workout, poi Fit): sotto il titolo la
// ruota Train, Food, Relax (fit/Ruota.tsx) e il tuo corpo (fit/Corpo.tsx); poi l'introduzione (cosa si fa e cosa
// vogliono dire i numeri) e il Balance; sotto, due aree da scegliere.
//   - Train: il test dei massimali, il contatore delle calorie,
//     la richiesta di una scheda all'agente AI, le schede del socio (del suo
//     trainer, dell'agente) e quelle del club, filtrabili per obiettivo, e gli
//     ultimi allenamenti;
//   - Food: la porta del diario dei pasti (fit/Food.tsx).
// L'area scelta sta nell'indirizzo (`?area=food`), cosi' tornando indietro dal
// diario si ritrova Food. L'indirizzo resta /allenamento: e' quello dei link gia' dati.

type Dati = { schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: { usate: number; massimo: number }; test: StatoTest }

/** Il colore e l'icona di una scheda del club, dall'obiettivo. */
function aspetto(obiettivo: string | null): { colori: readonly [string, string, ...string[]]; icona: NomeIcona } {
  const o = (obiettivo ?? '').toLowerCase()
  if (o.includes('ipertrofia') || o.includes('forza')) return { colori: NOTTE, icona: 'peso' }
  if (o.includes('dimagri') || o.includes('resistenza') || o.includes('cardio')) return { colori: FUOCO, icona: 'fulmine' }
  if (o.includes('tonific')) return { colori: ['#F06292', '#C2185B'], icona: 'stella' }
  if (o.includes('benessere') || o.includes('mobilit') || o.includes('schiena')) return { colori: ['#34C38F', '#178A62'], icona: 'scudo' }
  return { colori: MARE, icona: 'grafico' }
}

/** La scheda del club, compatta: con dieci schede l'elenco deve scorrere veloce. */
function SchedaClub({ s, indice }: { s: RigaSchedaLab; indice: number }) {
  const p = usePalette()
  const a = aspetto(s.obiettivo)
  return (
    <Entra indice={indice}>
      <Tocco onPress={() => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: s.id } })} etichetta={`Scheda ${s.titolo}`} scala={0.985}>
        <View style={[stili.club, { backgroundColor: p.carta, borderColor: p.linea }]}>
          <LinearGradient colors={a.colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.clubIcona}>
            <Icona nome={a.icona} size={26} colore="#fff" />
            {s.giorni_settimana ? <Text style={stili.clubGiorni}>{`${s.giorni_settimana}/sett`}</Text> : null}
          </LinearGradient>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[stili.clubTitolo, { color: p.testo }]} numberOfLines={2}>
              {s.titolo}
            </Text>
            <Text style={[stili.clubSotto, { color: p.testoSecondario }]} numberOfLines={1}>
              {[s.obiettivo, s.livello ? LIVELLI[s.livello] ?? s.livello : null, s.giorni > 1 && !s.titolo.includes('giorni') ? `${s.giorni} giorni` : null].filter(Boolean).join(' · ') || 'Una seduta'}
            </Text>
            {s.ultimo ? <Text style={[stili.clubUltimo, { color: p.accento }]}>{`In corso · ultimo allenamento ${quando(s.ultimo)}`}</Text> : null}
          </View>
          <Icona nome="avanti" size={16} colore={p.testoTerzo} />
        </View>
      </Tocco>
    </Entra>
  )
}

/** Il contatore delle calorie: le schede chiuse e le lezioni con la presenza. */
function CartaCalorie({ riempi = false }: { riempi?: boolean }) {
  const p = usePalette()
  return (
    <Tocco onPress={() => router.push('/allenamento/calorie')} etichetta="Le tue calorie: il contatore di schede e lezioni" scala={0.985} style={riempi ? { flex: 1 } : undefined}>
      <View style={[stili.agente, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }, riempi && { flex: 1 }]}>
        <LinearGradient colors={FUOCO} style={stili.agenteIcona}>
          <Icona nome="fiamma" size={26} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.agenteTitolo, { color: p.testo }]}>Le tue calorie</Text>
          <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>Le schede che chiudi e le lezioni a cui vieni, giorno per giorno: la settimana, i trend e il confronto.</Text>
        </View>
        <Icona nome="avanti" size={18} colore={p.testoTerzo} />
      </View>
    </Tocco>
  )
}

/** Il test dei massimali: da fare, fatto, o da rifare. */
function CartaTest({ t, riempi = false }: { t: StatoTest; riempi?: boolean }) {
  const rifare = testDaRifare(t.ultimo, t.giorni)
  const fatto = !!t.ultimo && !rifare
  const prossimo = giorniAlTest(t.ultimo, t.giorni)
  const titolo = rifare ? 'È ora di rifare il test' : fatto ? 'Il test dei massimali' : 'Fai il test dei massimali'
  const testo = rifare
    ? `L’ultimo è del ${giornoTest(t.ultimo!)}. Rifallo ogni ${Math.round(t.giorni / 7)} settimane: i chili delle schede seguono i tuoi progressi.`
    : fatto
      ? `Fatto il ${giornoTest(t.ultimo!)}: ${t.fatti} di ${t.totale} esercizi. Il prossimo fra ${prossimo} ${prossimo === 1 ? 'giorno' : 'giorni'}.`
      : `${t.totale || 7} esercizi, una quindicina di minuti. Dopo, nelle schede del club le percentuali diventano i tuoi chili.`
  return (
    <Tocco onPress={() => router.push('/allenamento/test')} etichetta={titolo} scala={0.985} style={riempi ? { flex: 1 } : undefined}>
      <LinearGradient colors={rifare ? FUOCO : MARE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.test, riempi && { flex: 1 }]}>
        <View style={stili.testIcona}>
          <Icona nome={rifare ? 'aggiorna' : fatto ? 'ok' : 'grafico'} size={26} colore="#fff" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={stili.testTitolo}>{titolo}</Text>
          <Text style={stili.testTesto}>{testo}</Text>
        </View>
        <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </Tocco>
  )
}
export const CHIAVE_SCHEDE = 'schede:elenco'

/** Hai gia' una scheda tua? Scrivila o importala da una foto o da un PDF (19/10/2026). */
function CartaLeTue() {
  const p = usePalette()
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <LinearGradient colors={ORTO} style={stili.agenteIcona}>
          <Icona nome="modifica" size={26} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.agenteTitolo, { color: p.testo }]}>Hai già una scheda tua?</Text>
          <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>
            Scrivila qui, o importala da una foto o da un PDF: la tieni insieme alle altre e la usi allo stesso modo, col timer del recupero e lo storico.
          </Text>
        </View>
      </View>
      <View style={stili.azioniTue}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Pulsante testo="Importa da foto o file" icona="fotocamera" piccolo onPress={() => router.push('/allenamento/importa')} />
        </View>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Pulsante testo="Scrivila tu" icona="modifica" variante="secondario" piccolo onPress={() => router.push('/allenamento/nuova')} />
        </View>
      </View>
    </Carta>
  )
}

function SchedaCarta({ s, indice }: { s: RigaSchedaLab; indice: number }) {
  const colori = s.tipo === 'ai' ? (['#8B5CF6', '#5B21B6'] as const) : s.tipo === 'personalizzata' ? FUOCO : s.tipo === 'socio' ? ORTO : NOTTE
  return (
    <Entra indice={indice}>
      <Tocco onPress={() => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: s.id } })} etichetta={`Scheda ${s.titolo}`} scala={0.985}>
        <LinearGradient colors={colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.scheda}>
          <View style={stili.filigrana} pointerEvents="none">
            <Icona nome={s.tipo === 'ai' ? 'stella' : 'peso'} size={120} colore="rgba(255,255,255,0.08)" />
          </View>
          <Tag testo={s.tipo === 'socio' ? (s.origine === 'importata' ? 'Importata da te' : 'Scritta da te') : (TIPI[s.tipo] ?? s.tipo)} colore="#fff" fondo="rgba(0,0,0,0.18)" />
          <Text style={stili.titolo} numberOfLines={2}>
            {s.titolo}
          </Text>
          <View style={stili.pillole}>
            {s.obiettivo ? <Text style={stili.pillola}>{s.obiettivo}</Text> : null}
            {s.livello ? <Text style={stili.pillola}>{LIVELLI[s.livello] ?? s.livello}</Text> : null}
            <Text style={stili.pillola}>{`${s.giorni} ${s.giorni === 1 ? 'giorno' : 'giorni'}`}</Text>
          </View>
          <Text style={[stili.ultimo, { color: 'rgba(255,255,255,0.75)' }]}>{s.ultimo ? `Ultimo allenamento ${quando(s.ultimo)}` : 'Non ancora iniziata'}</Text>
        </LinearGradient>
      </Tocco>
    </Entra>
  )
}

export function Schede() {
  const { width: larghezza } = useWindowDimensions()
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(CHIAVE_SCHEDE) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [misure, setMisure] = useState<Misura[] | null>(() => inMemoria<{ misure: Misura[] }>(CHIAVE_MISURE)?.misure ?? null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_SCHEDE, elencoSchede)
    if (r.ok) setDati({ schede: r.schede, ultimi: r.ultimi, ai: r.ai, test: r.test })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
    prendi(CHIAVE_MISURE, elencoMisure).then((r) => r.ok && setMisure(r.misure))
  }, [carica])

  const fit = useFit()
  const { area: parametro } = useLocalSearchParams<{ area?: string }>()
  const area: Area = parametro === 'food' ? 'food' : 'train'
  const scegli = (a: Area) => router.setParams({ area: a })
  // Su schermo largo (15/10/2026), come Prenotazioni: le card in fila e le
  // schede su piu' colonne.
  const largo = larghezza >= LARGO

  return (
    <Schermata titolo="Athlon Health System" sottotitolo="Allenamento, alimentazione e recupero.">
      <Entra indice={0}>
        <RuotaBenessere />
      </Entra>
      <Entra indice={0}>
        <CartaCorpo misure={misure} />
      </Entra>
      <View style={largo ? stili.fila3 : { gap: spazio.quattro + 4 }}>
        <Entra indice={0} style={largo ? { flex: 1 } : undefined}>
          <IntroFit />
        </Entra>
        <Entra indice={1} style={largo ? { flex: 1 } : undefined}>
          <CartaBalance dati={fit} onAttivaFood={area === 'food' ? undefined : () => scegli('food')} />
        </Entra>
      </View>

      <Entra indice={2}>
        <Interruttore area={area} onScegli={scegli} />
      </Entra>

      {area === 'food' ? (
        <AreaFood dati={fit} />
      ) : !dati ? (
        errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )
      ) : (
        <Train dati={dati} largo={largo} />
      )}
    </Schermata>
  )
}

/** L'area Train: quello che prima era tutto Workout, senza l'alimentazione (che sta in Food). */
function Train({ dati, largo }: { dati: Dati; largo: boolean }) {
  const p = usePalette()
  const { width: larghezza } = useWindowDimensions()
  const [obiettivo, setObiettivo] = useState<string | null>(null)
  const restano = Math.max(0, dati.ai.massimo - dati.ai.usate)
  const mie = dati.schede.filter((s) => s.tipo !== 'standard')
  const club = dati.schede.filter((s) => s.tipo === 'standard')
  const obiettivi = [...new Set(club.map((s) => s.obiettivo).filter((o): o is string => !!o))]
  const clubVisibili = obiettivo ? club.filter((s) => s.obiettivo === obiettivo) : club
  const cella = largo ? { flexGrow: 1, flexBasis: larghezza >= 1100 ? '31%' : '45%' } as const : null
  return (
    <>
      <View style={largo ? stili.fila3 : { gap: spazio.quattro + 4 }}>
      <Entra indice={0} style={largo ? { flex: 1 } : undefined}>
        <CartaTest t={dati.test} riempi={largo} />
      </Entra>

      <Entra indice={1} style={largo ? { flex: 1 } : undefined}>
        <CartaCalorie riempi={largo} />
      </Entra>

      <Entra indice={1} style={largo ? { flex: 1 } : undefined}>
        <Tocco onPress={() => router.push('/allenamento/agente')} etichetta="Chiedi una scheda all’agente AI" scala={0.985} spento={!restano} style={largo ? { flex: 1 } : undefined}>
          <View style={[stili.agente, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }, largo && { flex: 1 }]}>
            <LinearGradient colors={['#8B5CF6', '#5B21B6']} style={stili.agenteIcona}>
              <Icona nome="stella" size={26} colore="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.agenteTitolo, { color: p.testo }]}>Chiedi una scheda all’agente AI</Text>
              <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>
                {restano
                  ? `Rispondi a sei domande e te la scrive in un paio di minuti. Ne puoi chiedere ancora ${restano} questo mese.`
                  : `Hai già chiesto ${dati.ai.massimo} schede negli ultimi trenta giorni: non è possibile chiederne altre per ora.`}
              </Text>
            </View>
            {restano ? <Icona nome="avanti" size={18} colore={p.testoTerzo} /> : null}
          </View>
        </Tocco>
      </Entra>
      </View>

      <Sezione titolo="Le tue schede" conteggio={mie.length || undefined}>
        <CartaLeTue />
        {mie.length ? (
          <View style={largo ? stili.griglia : { gap: spazio.tre }}>
            {mie.map((s, i) => (
              <View key={s.id} style={largo ? { flexGrow: 1, flexBasis: '45%' } : undefined}>
                <SchedaCarta s={s} indice={i + 2} />
              </View>
            ))}
          </View>
        ) : null}
      </Sezione>

      <Sezione titolo="Schede del club" conteggio={club.length}>
        {club.length ? (
          <View style={{ gap: spazio.tre }}>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {dati.test.ultimo
                ? 'Preparate dai nostri istruttori. I carichi sono già calcolati sui tuoi massimali.'
                : 'Preparate dai nostri istruttori. I carichi sono in percentuale del massimale: fai il test e diventano i tuoi chili.'}
            </Text>
            {obiettivi.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
                {[null, ...obiettivi].map((o) => {
                  const attivo = o === obiettivo
                  const n = o ? club.filter((s) => s.obiettivo === o).length : club.length
                  return (
                    <Tocco
                      key={o ?? 'tutte'}
                      vibra="scelta"
                      stato={{ selected: attivo }}
                      onPress={() => setObiettivo(o)}
                      etichetta={`${o ?? 'Tutte le schede'}, ${n}`}
                      style={[stili.filtro, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
                    >
                      <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{o ?? 'Tutte'}</Text>
                      <View style={[stili.conta, { backgroundColor: attivo ? p.accento : p.incavo }]}>
                        <Text style={{ color: attivo ? '#fff' : p.testoSecondario, fontFamily: F.extra, fontSize: 11 }}>{n}</Text>
                      </View>
                    </Tocco>
                  )
                })}
              </ScrollView>
            ) : null}
            <View style={largo ? stili.griglia : { gap: spazio.due }}>
              {clubVisibili.map((s, i) => (
                <View key={s.id} style={cella}>
                  <SchedaClub s={s} indice={i + 2} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
            <Icona nome="peso" size={32} colore={p.testoTerzo} />
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
              Non ci sono ancora schede del club per te. Puoi chiederne una all’agente AI qui sopra.
            </Text>
          </Carta>
        )}
      </Sezione>

      <Sezione titolo="Ultimi allenamenti" destra={<LinkSezione testo="Storico e progressi" onPress={() => router.push('/allenamento/storico')} />}>
        <Carta style={{ paddingVertical: spazio.due }}>
          {dati.ultimi.length ? (
            dati.ultimi.map((a, i) => (
              <Riga
                key={a.id}
                prima={i === 0}
                icona={a.fine ? 'bandiera' : 'cronometro'}
                tono={a.fine ? 'ok' : 'attenzione'}
                titolo={[a.titolo, a.giorno_nome].filter(Boolean).join(' · ') || 'Allenamento'}
                sotto={`${quando(a.inizio)} · ${a.serie} ${a.serie === 1 ? 'serie' : 'serie'}${a.fine ? '' : ' · non chiuso'}`}
              />
            ))
          ) : (
            <Riga prima icona="cronometro" tono="neutro" titolo="Nessun allenamento registrato" sotto="Apri una scheda e premi «Inizia l’allenamento»." />
          )}
        </Carta>
      </Sezione>
    </>
  )
}

type Area = 'train' | 'food'

/** Le due aree di Fit, come due schede di una pillola. */
function Interruttore({ area, onScegli }: { area: Area; onScegli: (a: Area) => void }) {
  const p = usePalette()
  const voci: { id: Area; nome: string; icona: NomeIcona }[] = [
    { id: 'train', nome: 'Train', icona: 'peso' },
    { id: 'food', nome: 'Food', icona: 'piatto' },
  ]
  return (
    <View style={[stili.interruttore, { backgroundColor: p.incavo }]} accessibilityRole="tablist">
      {voci.map((v) => {
        const qui = v.id === area
        return (
          <Tocco
            key={v.id}
            ruolo="tab"
            stato={{ selected: qui }}
            vibra="scelta"
            etichetta={v.nome}
            onPress={() => !qui && onScegli(v.id)}
            style={[stili.voce, qui && { backgroundColor: p.carta, boxShadow: p.ombra }]}
          >
            <Icona nome={v.icona} size={18} colore={qui ? p.testo : p.testoSecondario} />
            <Text style={{ color: qui ? p.testo : p.testoSecondario, fontFamily: F.extra, fontSize: 15 }}>{v.nome}</Text>
          </Tocco>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  interruttore: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4 },
  voce: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, minHeight: 44 },
  agente: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre + 2, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth },
  agenteIcona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  agenteTitolo: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
  agenteTesto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  scheda: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.due, overflow: 'hidden', minHeight: 170 },
  filigrana: { position: 'absolute', right: -14, bottom: -18, transform: [{ rotate: '-12deg' }] },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 24, lineHeight: 28, letterSpacing: -0.7, maxWidth: '88%' },
  pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillola: { color: '#fff', fontFamily: F.bold, fontSize: 12, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  ultimo: { fontFamily: F.semi, fontSize: 12.5, marginTop: 'auto' },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  test: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre + 2, borderRadius: 26 },
  testIcona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  testTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  testTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  club: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.due + 2, paddingRight: spazio.tre, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  clubIcona: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 1 },
  clubGiorni: { color: 'rgba(255,255,255,0.9)', fontFamily: F.extra, fontSize: 11 },
  clubTitolo: { fontFamily: F.extra, fontSize: 16, lineHeight: 20, letterSpacing: -0.3 },
  clubSotto: { fontFamily: F.semi, fontSize: 12.5 },
  clubUltimo: { fontFamily: F.bold, fontSize: 12 },
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  filtro: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 999, paddingVertical: 9, paddingLeft: spazio.tre, paddingRight: 9, borderWidth: StyleSheet.hairlineWidth },
  fila3: { flexDirection: 'row', gap: spazio.tre, alignItems: 'stretch' },
  azioniTue: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
  conta: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
})
