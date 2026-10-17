import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { leggiSchedaLab, type EsercizioScheda, type Massimale, type Precedente, type SchedaLab } from '@/api/lab'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CalorieScheda } from './Calorie'
import { giornoTest, gruppo, indicazione, LIVELLI, muscoli, recupero, SPIEGA_STIMA, SPIEGA_TARATURA, testDaRifare, TIPI } from './comune'
import { MediaEsercizio } from './MediaEsercizio'

// Una scheda: la descrizione, i giorni come schede, e gli esercizi del giorno
// scelto con serie, ripetizioni, carico, recupero e l'ultima volta che il
// socio l'ha fatto. Toccando un esercizio si apre la sua scheda (il video o
// le foto che si alternano, i muscoli, le istruzioni). In fondo «Inizia».
// I carichi in percentuale (16/10/2026) diventano chili coi massimali del
// socio, misurati o stimati dal test del distretto (15/10/2026, con «≈»);
// finche' mancano, un riquadro spiega come averli. In fondo, sopra
// «Inizia», le calorie stimate del giorno scelto (Calorie.tsx, 15/10/2026).

type Dati = { scheda: SchedaLab; precedenti: Precedente[]; massimali: Massimale[]; ultimoTest: string | null; giorniTest: number }

/** «10 × 40 kg, 10 × 40 kg, 8 × 42,5 kg». */
export function serieInRiga(serie: { ripetizioni: number | null; kg: number | null; secondi: number | null }[]): string {
  return serie
    .map((s) => (s.secondi != null ? `${s.secondi}″` : `${s.ripetizioni ?? '—'}${s.kg != null ? ` × ${String(s.kg).replace('.', ',')} kg` : ''}`))
    .join(', ')
}

/** Una nota del trainer: il consiglio sull'esercizio, il riscaldamento del giorno. */
export function Nota({ testo }: { testo: string }) {
  const p = usePalette()
  return (
    <View style={[stili.notaRiquadro, { backgroundColor: p.incavo }]}>
      <Icona nome="info" size={17} colore={p.blu} />
      <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{testo}</Text>
    </View>
  )
}

function FoglioEsercizio({ e, precedente, massimali, onChiudi }: { e: EsercizioScheda | null; precedente?: Precedente; massimali: Massimale[]; onChiudi: () => void }) {
  const p = usePalette()
  const ind = e ? indicazione(e, massimali) : null
  return (
    <Foglio aperto={!!e} titolo={e?.nome ?? ''} sottotitolo={e ? muscoli(e.muscoli_primari) : undefined} onChiudi={onChiudi}>
      {e ? (
        <View style={{ gap: spazio.tre }}>
          <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.mediaGrande} />
          {e.descrizione ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{e.descrizione}</Text> : null}
          <View style={[stili.cifre, { backgroundColor: p.incavo }]}>
            {[
              { v: ind!.serieRip, l: 'Serie × ripetizioni' },
              { v: ind!.kg != null ? `${ind!.stimato ? '≈ ' : ''}${String(ind!.kg).replace('.', ',')} kg` : ind!.manca ? `${e.percentuale}%` : e.carico || '—', l: ind!.kg != null ? `${ind!.stimato ? 'Stimato' : 'Carico'} · ${e.percentuale}%` : ind!.manca ? 'Del massimale' : 'Carico' },
              { v: recupero(e.recupero_serie), l: 'Recupero' },
            ].map((c, i) => (
              <View key={c.l} style={[stili.cifra, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: p.linea }]}>
                <Text style={[stili.cifraValore, { color: p.testo }]} numberOfLines={1}>
                  {c.v}
                </Text>
                <Text style={[stili.cifraEtichetta, { color: p.testoSecondario }]}>{c.l}</Text>
              </View>
            ))}
          </View>
          {ind?.stimato ? <Nota testo={SPIEGA_STIMA} /> : null}
          {ind?.manca ? (
            <Nota testo={ind.daTest ? `Questo esercizio è nel test dei massimali: fai il test e qui vedrai i tuoi chili. Oppure: ${SPIEGA_TARATURA.charAt(0).toLowerCase()}${SPIEGA_TARATURA.slice(1)}` : SPIEGA_TARATURA} />
          ) : null}
          {e.note ? <Nota testo={e.note} /> : null}
          {precedente ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              <Text style={{ fontFamily: F.bold, color: p.testo }}>L’ultima volta: </Text>
              {serieInRiga(precedente.serie)}
            </Text>
          ) : null}
          {e.istruzioni.filter(Boolean).length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.titoletto, { color: p.testo }]}>Come si fa</Text>
              {e.istruzioni.filter(Boolean).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
                  <Text style={[stili.passo, { color: p.accento }]}>{i + 1}</Text>
                  <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {e.errori_comuni?.filter(Boolean).length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.titoletto, { color: p.testo }]}>Da evitare</Text>
              {e.errori_comuni.filter(Boolean).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
                  <Text style={[stili.passo, { color: p.testoSecondario }]}>×</Text>
                  <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Foglio>
  )
}

export function Scheda() {
  const p = usePalette()
  const { scheda: id } = useLocalSearchParams<{ scheda: string }>()
  const chiave = `schede:${id}`
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(chiave) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [giorno, setGiorno] = useState(0)
  const [aperto, setAperto] = useState<EsercizioScheda | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(chiave, () => leggiSchedaLab(String(id)))
    if (r.ok) setDati({ scheda: r.scheda, precedenti: r.precedenti, massimali: r.massimali, ultimoTest: r.ultimoTest, giorniTest: r.giorniTest })
    else setErrore(r.errore)
  }, [chiave, id])

  useEffect(() => {
    carica()
  }, [carica])

  if (!dati) {
    return (
      <Schermata sopratitolo="Workout" titolo="Scheda" indietro="/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo quante={2} />
        )}
      </Schermata>
    )
  }

  const s = dati.scheda
  const g = s.giorni[Math.min(giorno, s.giorni.length - 1)]
  const precedente = (eid: string) => dati.precedenti.find((x) => x.esercizio_id === eid)
  const massimali = dati.massimali ?? []
  const tutti = s.giorni.flatMap((x) => x.esercizi)
  const inPercentuale = tutti.filter((e) => e.percentuale)
  const mancano = inPercentuale.filter((e) => indicazione(e, massimali).manca)
  const stimati = inPercentuale.filter((e) => indicazione(e, massimali).stimato)
  const rifare = testDaRifare(dati.ultimoTest ?? null, dati.giorniTest ?? 42, s.livello === 'principiante')
  return (
    <Schermata sopratitolo={TIPI[s.tipo] ?? 'Scheda'} titolo={s.titolo} indietro="/allenamento" barra={false}>
      <View style={{ gap: spazio.due }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {s.obiettivo ? <Tag testo={s.obiettivo} colore={p.accento} /> : null}
          {s.livello ? <Tag testo={LIVELLI[s.livello] ?? s.livello} colore={p.blu} /> : null}
          {s.giorni_settimana ? <Tag testo={`${s.giorni_settimana} giorni a settimana`} colore={p.testoSecondario} /> : null}
        </View>
        {s.descrizione ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{s.descrizione}</Text> : null}
        {s.tipo === 'ai' ? (
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>
            Scritta dall’agente AI sulle tue risposte{s.rivista_il ? ' e rivista da un trainer del club' : ': un trainer del club la rivede nei prossimi giorni'}. Per dolori o
            infortuni chiedi a un istruttore in sala.
          </Text>
        ) : null}
      </View>

      {inPercentuale.length ? (
        <Carta style={{ gap: spazio.due }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
            <Icona nome={mancano.length ? 'grafico' : 'ok'} size={20} colore={mancano.length ? p.blu : p.ok} />
            <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>
              {mancano.length === inPercentuale.length ? 'I carichi sono in percentuale' : mancano.length ? 'Quasi tutti i carichi sono in chili' : 'I carichi sono i tuoi chili'}
            </Text>
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {mancano.length === inPercentuale.length
              ? 'La percentuale è del tuo massimale, il peso più alto che sollevi per una ripetizione. Fai il test dei massimali (una quindicina di minuti): basta un esercizio per gli arti superiori, uno per il core e uno per gli arti inferiori, e qui al posto di tutte le percentuali vedrai i tuoi chili, arrotondati ai pesi della macchina.'
              : mancano.length
                ? `Calcolati sui tuoi massimali${dati.ultimoTest ? ` (test del ${giornoTest(dati.ultimoTest)})` : ''} e arrotondati ai pesi della macchina. Dove vedi ancora la percentuale manca il test di quel distretto (arti superiori, core o arti inferiori): fallo, oppure ${SPIEGA_TARATURA.charAt(0).toLowerCase()}${SPIEGA_TARATURA.slice(1)}`
                : `Calcolati sui tuoi massimali${dati.ultimoTest ? ` (test del ${giornoTest(dati.ultimoTest)})` : ''} e arrotondati per difetto ai pesi della macchina.`}
            {stimati.length ? ` ${SPIEGA_STIMA}` : ''}
          </Text>
          {rifare ? (
            <Messaggio tono="attenzione" titolo="È ora di rifare il test">
              Sono passate più di {Math.round((s.livello === 'principiante' ? Math.min(28, dati.giorniTest) : dati.giorniTest) / 7)} settimane: rifallo e i chili seguono i tuoi progressi.
            </Messaggio>
          ) : null}
          {!dati.ultimoTest || rifare ? (
            <Pulsante testo={rifare ? 'Rifai il test' : 'Fai il test dei massimali'} icona="grafico" variante="secondario" onPress={() => router.push('/allenamento/test')} />
          ) : null}
        </Carta>
      ) : null}

      {s.giorni.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
          {s.giorni.map((x, i) => {
            const attivo = i === giorno
            return (
              <Tocco
                key={x.id}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => setGiorno(i)}
                etichetta={x.nome}
                style={[stili.giorno, { backgroundColor: attivo ? p.accento : p.carta, borderColor: attivo ? p.accento : p.linea }]}
              >
                <Text style={{ color: attivo ? '#fff' : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{x.nome}</Text>
                <Text style={{ color: attivo ? 'rgba(255,255,255,0.85)' : p.testoTerzo, fontFamily: F.semi, fontSize: 11.5 }}>{`${x.esercizi.length} esercizi`}</Text>
              </Tocco>
            )
          })}
        </ScrollView>
      ) : null}

      {g.note ? <Nota testo={g.note} /> : null}

      <View style={{ gap: spazio.tre }}>
        {g.esercizi.map((e, i) => {
          const gr = gruppo(g, i)
          const prec = precedente(e.esercizio_id)
          const ind = indicazione(e, massimali)
          return (
            <Entra key={e.id} indice={i}>
              <Tocco onPress={() => setAperto(e)} etichetta={`${e.nome}: come si fa`} scala={0.985}>
                <Carta style={[stili.esercizio, e.superserie ? { borderLeftWidth: 4, borderLeftColor: p.accento } : null]}>
                  <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.media} ferma />
                  <View style={{ flex: 1, gap: 4 }}>
                    {e.superserie ? (
                      <Text style={[stili.superserie, { color: p.accento }]}>{`SUPERSERIE ${e.superserie}${gr.length > 1 ? ` · ${gr.indexOf(i) + 1} di ${gr.length}` : ''}`}</Text>
                    ) : null}
                    <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                      {e.nome}
                    </Text>
                    <Text style={[stili.dettagli, { color: p.testo }]}>
                      <Text style={{ fontFamily: F.extra }}>{ind.serieRip}</Text>
                      {ind.carico ? <Text style={ind.kg != null ? { fontFamily: F.extra, color: p.accento } : ind.manca ? { color: p.blu } : null}>{` · ${ind.carico}`}</Text> : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icona nome="cronometro" size={13} colore={p.testoSecondario} />
                      <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                        {`Recupero ${recupero(e.recupero_serie)}${e.recupero_dopo !== e.recupero_serie ? ` · poi ${recupero(e.recupero_dopo)}` : ''}`}
                      </Text>
                    </View>
                    {prec ? (
                      <Text style={[stili.piccola, { color: p.testoTerzo }]} numberOfLines={1}>
                        {`Ultima volta: ${serieInRiga(prec.serie)}`}
                      </Text>
                    ) : null}
                  </View>
                </Carta>
              </Tocco>
            </Entra>
          )
        })}
      </View>

      <CalorieScheda scheda={s} giorno={Math.min(giorno, s.giorni.length - 1)} />

      <Pulsante
        testo={`Inizia l’allenamento · ${g.nome}`}
        icona="play"
        onPress={() => router.push({ pathname: '/allenamento/[scheda]/[giorno]', params: { scheda: s.id, giorno: g.id } })}
      />

      <FoglioEsercizio e={aperto} precedente={aperto ? precedente(aperto.esercizio_id) : undefined} massimali={massimali} onChiudi={() => setAperto(null)} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  notaRiquadro: { flexDirection: 'row', gap: spazio.due, borderRadius: 16, padding: spazio.tre, alignItems: 'flex-start' },
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  giorno: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: spazio.tre + 2, borderWidth: StyleSheet.hairlineWidth, gap: 1 },
  esercizio: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center', padding: spazio.tre },
  media: { width: 92, height: 92, borderRadius: 18 },
  mediaGrande: { width: '100%', aspectRatio: 16 / 9, borderRadius: 22 },
  superserie: { fontFamily: F.extra, fontSize: 10.5, letterSpacing: 1 },
  nome: { fontFamily: F.extra, fontSize: 16, lineHeight: 20, letterSpacing: -0.3 },
  dettagli: { fontFamily: F.semi, fontSize: 14 },
  piccola: { fontFamily: F.semi, fontSize: 12.5 },
  nota: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  passo: { fontFamily: F.extra, fontSize: 15, width: 18 },
  cifre: { flexDirection: 'row', borderRadius: 18, paddingVertical: spazio.tre },
  cifra: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  cifraValore: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  cifraEtichetta: { fontFamily: F.semi, fontSize: 11 },
})
