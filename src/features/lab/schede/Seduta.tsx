import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { chiudiSeduta, iniziaSeduta, leggiSchedaLab, segnaSerie, togliSerie, type EsercizioScheda, type GiornoSchedaLab, type Massimale, type Precedente, type SchedaLab } from '@/api/lab'
import { spazio } from '@/theme'

import { dimentica, inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Barra, Carta, Messaggio, Numero, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { aTempo, descriviPasso, dopo, gruppo, indicazione, recupero, SPIEGA_TARATURA, type Passo } from './comune'
import { MediaEsercizio } from './MediaEsercizio'
import { Nota, serieInRiga } from './Scheda'
import { TimerRecupero } from './TimerRecupero'
import { CHIAVE_SCHEDE } from './Schede'

// La seduta: il giorno della scheda da fare adesso. Per ogni esercizio le sue
// serie, con le ripetizioni proposte dalla scheda e i chili dell'ultima volta
// gia' scritti; si correggono e si segna la serie fatta. Segnata la serie,
// parte da solo il timer del recupero (TimerRecupero) e si passa al passo
// successivo: la serie dopo, o nella superserie l'esercizio dopo del giro.
// Ogni serie si salva subito: chiudendo l'app a meta', la seduta si riprende.

type Fatta = { ripetizioni: number | null; kg: number | null; secondi: number | null }
type Bozza = { ripetizioni: string; kg: string }

const chiaveSerie = (riga: string, n: number) => `${riga}:${n}`

/** «8-10» → «8»; «30 s» → «30». */
function primoNumero(t: string): string {
  return t.match(/\d+/)?.[0] ?? ''
}

function numero(t: string): number | null {
  const n = Number(t.replace(',', '.'))
  return t.trim() && Number.isFinite(n) && n >= 0 ? n : null
}

function durata(daIso: string, ora: number): string {
  const s = Math.max(0, Math.floor((ora - new Date(daIso).getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`
}

function RigaSerie({
  e,
  n,
  fatta,
  bozza,
  attiva,
  occupata,
  onBozza,
  onSegna,
  onTogli,
}: {
  e: EsercizioScheda
  n: number
  fatta: Fatta | undefined
  bozza: Bozza
  attiva: boolean
  occupata: boolean
  onBozza: (b: Bozza) => void
  onSegna: () => void
  onTogli: () => void
}) {
  const p = usePalette()
  const tempo = aTempo(e.ripetizioni)
  return (
    <View style={[stili.serie, { backgroundColor: fatta ? 'transparent' : attiva ? p.incavo : 'transparent', borderColor: attiva && !fatta ? p.accento : p.linea }]}>
      <Text style={[stili.serieNumero, { color: fatta ? p.ok : attiva ? p.accento : p.testoSecondario }]}>{n}</Text>
      {fatta ? (
        <Text style={[stili.serieFatta, { color: p.testo }]}>{serieInRiga([fatta])}</Text>
      ) : (
        <>
          <View style={stili.campo}>
            <TextInput
              value={bozza.ripetizioni}
              onChangeText={(t) => onBozza({ ...bozza, ripetizioni: t.replace(/[^\d]/g, '').slice(0, 4) })}
              keyboardType="number-pad"
              placeholder={tempo ? 'sec' : 'rip.'}
              placeholderTextColor={p.testoTerzo}
              style={[stili.input, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
              accessibilityLabel={`Serie ${n}: ${tempo ? 'secondi' : 'ripetizioni'}`}
              selectTextOnFocus
            />
            <Text style={[stili.unita, { color: p.testoTerzo }]}>{tempo ? 's' : 'rip'}</Text>
          </View>
          {!tempo ? (
            <View style={stili.campo}>
              <TextInput
                value={bozza.kg}
                onChangeText={(t) => onBozza({ ...bozza, kg: t.replace(/[^\d.,]/g, '').slice(0, 6) })}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor={p.testoTerzo}
                style={[stili.input, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
                accessibilityLabel={`Serie ${n}: chili`}
                selectTextOnFocus
              />
              <Text style={[stili.unita, { color: p.testoTerzo }]}>kg</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </>
      )}
      <Tocco
        onPress={fatta ? onTogli : onSegna}
        spento={occupata}
        etichetta={fatta ? `Togli la serie ${n}` : `Segna la serie ${n} fatta`}
        style={[stili.spunta, { backgroundColor: fatta ? p.ok : attiva ? p.accento : p.incavo }]}
      >
        <Icona nome={fatta ? 'spunta' : 'spunta'} size={20} colore={fatta || attiva ? '#fff' : p.testoTerzo} />
      </Tocco>
    </View>
  )
}

export function Seduta() {
  const p = usePalette()
  const { scheda: schedaId, giorno: giornoId } = useLocalSearchParams<{ scheda: string; giorno: string }>()
  const [scheda, setScheda] = useState<SchedaLab | null>(() => inMemoria<{ scheda: SchedaLab }>(`schede:${schedaId}`)?.scheda ?? null)
  const [precedenti, setPrecedenti] = useState<Precedente[]>(() => inMemoria<{ precedenti: Precedente[] }>(`schede:${schedaId}`)?.precedenti ?? [])
  const [massimali, setMassimali] = useState<Massimale[]>(() => inMemoria<{ massimali: Massimale[] }>(`schede:${schedaId}`)?.massimali ?? [])
  const [seduta, setSeduta] = useState<{ id: string; inizio: string } | null>(null)
  const [fatte, setFatte] = useState<Map<string, Fatta>>(new Map())
  const [bozze, setBozze] = useState<Map<string, Bozza>>(new Map())
  const [attuale, setAttuale] = useState<Passo>({ indice: 0, serie: 1 })
  const [aperto, setAperto] = useState<number | null>(0)
  const [errore, setErrore] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)
  const [timer, setTimer] = useState<{ fine: number; totale: number; prossimo: string; dettaglio: string | null } | null>(null)
  const [ora, setOra] = useState(Date.now())
  const [finita, setFinita] = useState<{ serie: number; volume: number; durata: string } | null>(null)

  const giorno: GiornoSchedaLab | undefined = scheda?.giorni.find((g) => g.id === giornoId)

  const carica = useCallback(async () => {
    setErrore(null)
    const s = await prendi(`schede:${schedaId}`, () => leggiSchedaLab(String(schedaId)))
    if (!s.ok) return setErrore(s.errore)
    setScheda(s.scheda)
    setPrecedenti(s.precedenti)
    setMassimali(s.massimali ?? [])
    const r = await iniziaSeduta(String(schedaId), String(giornoId))
    if (!r.ok) return setErrore(r.errore)
    setSeduta(r.allenamento)
    const m = new Map<string, Fatta>()
    for (const x of r.serie) m.set(chiaveSerie(x.scheda_esercizio_id, x.numero), { ripetizioni: x.ripetizioni, kg: x.kg, secondi: x.secondi })
    setFatte(m)
    // Si riparte dal primo passo non fatto.
    const g = s.scheda.giorni.find((x) => x.id === giornoId)
    if (g) {
      let passo: Passo | null = { indice: 0, serie: 1 }
      for (let k = 0; passo && k < 500 && m.has(chiaveSerie(g.esercizi[passo.indice].id, passo.serie)); k++) passo = dopo(g, passo.indice, passo.serie).prossimo
      if (passo) {
        setAttuale(passo)
        setAperto(passo.indice)
      } else setAperto(null)
    }
  }, [schedaId, giornoId])

  useEffect(() => {
    carica()
  }, [carica])

  useEffect(() => {
    const t = setInterval(() => setOra(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const precedente = useCallback((eid: string) => precedenti.find((x) => x.esercizio_id === eid), [precedenti])

  /**
   * La bozza di una serie: quella scritta, o le ripetizioni della scheda e i
   * chili: quelli della serie prima di oggi, poi quelli calcolati dalla
   * percentuale e dal massimale, poi quelli della stessa serie l'ultima volta.
   */
  const bozzaDi = useCallback(
    (e: EsercizioScheda, n: number): Bozza => {
      const b = bozze.get(chiaveSerie(e.id, n))
      if (b) return b
      const ind = indicazione(e, massimali)
      const prima = fatte.get(chiaveSerie(e.id, n - 1))
      const ultima = precedente(e.esercizio_id)?.serie
      const kg = prima?.kg ?? ind.kg ?? ultima?.find((x) => x.numero === n)?.kg ?? ultima?.[ultima.length - 1]?.kg ?? null
      return { ripetizioni: ind.ripetizioni != null ? String(ind.ripetizioni) : primoNumero(e.ripetizioni), kg: kg != null ? String(kg).replace('.', ',') : '' }
    },
    [bozze, fatte, precedente, massimali],
  )

  const totaleSerie = useMemo(() => (giorno ? giorno.esercizi.reduce((n, e) => n + e.serie, 0) : 0), [giorno])

  async function segna(i: number, n: number) {
    if (!giorno || !seduta) return
    const e = giorno.esercizi[i]
    const b = bozzaDi(e, n)
    const tempo = aTempo(e.ripetizioni)
    const fatta: Fatta = tempo
      ? { ripetizioni: null, kg: null, secondi: numero(b.ripetizioni) }
      : { ripetizioni: numero(b.ripetizioni), kg: numero(b.kg), secondi: null }
    const k = chiaveSerie(e.id, n)
    setFatte((m) => new Map(m).set(k, fatta))
    colpetto('ok')
    setErrore(null)
    // Il passo dopo e il recupero, subito: il salvataggio va in parallelo.
    const { recupero: rec, prossimo } = dopo(giorno, i, n)
    if (prossimo) {
      setAttuale(prossimo)
      setAperto(prossimo.indice)
    } else setAperto(null)
    if (rec > 0 && prossimo) {
      const pe = giorno.esercizi[prossimo.indice]
      const ult = precedente(pe.esercizio_id)?.serie.find((x) => x.numero === prossimo.serie)
      setTimer({
        fine: Date.now() + rec * 1000,
        totale: rec,
        prossimo: descriviPasso(giorno, prossimo),
        dettaglio: (() => {
          const ind = indicazione(pe, massimali)
          if (ind.kg != null) return `Carico: ${ind.carico}`
          if (ult) return `L’ultima volta: ${serieInRiga([ult])}`
          return ind.carico ? `Carico: ${ind.carico}` : null
        })(),
      })
    }
    setOccupato(true)
    const r = await segnaSerie({ allenamento_id: seduta.id, scheda_esercizio_id: e.id, esercizio_id: e.esercizio_id, numero: n, ...fatta })
    setOccupato(false)
    if (!r.ok) {
      setFatte((m) => {
        const c = new Map(m)
        c.delete(k)
        return c
      })
      setErrore(r.errore)
      colpetto('errore')
    }
  }

  async function togli(i: number, n: number) {
    if (!giorno || !seduta) return
    const e = giorno.esercizi[i]
    const k = chiaveSerie(e.id, n)
    const prima = fatte.get(k)
    setFatte((m) => {
      const c = new Map(m)
      c.delete(k)
      return c
    })
    setAttuale({ indice: i, serie: n })
    setAperto(i)
    const r = await togliSerie(seduta.id, e.id, n)
    if (!r.ok && prima) {
      setFatte((m) => new Map(m).set(k, prima))
      setErrore(r.errore)
    }
  }

  async function chiudi() {
    if (!seduta) return
    setOccupato(true)
    const r = await chiudiSeduta(seduta.id)
    setOccupato(false)
    if (!r.ok) return setErrore(r.errore)
    // Lo storico e l'«ultima volta» cambiano: si rileggono.
    dimentica()
    colpetto('ok')
    if (r.vuota) return router.back()
    let volume = 0
    for (const f of fatte.values()) volume += (f.kg ?? 0) * (f.ripetizioni ?? 0)
    setFinita({ serie: fatte.size, volume, durata: durata(seduta.inizio, Date.now()) })
  }

  if (errore && !seduta) {
    return (
      <Schermata sopratitolo="Workout" titolo="Seduta" indietro={`/lab/allenamento/${schedaId}`} barra={false}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
      </Schermata>
    )
  }
  if (!giorno || !seduta || !scheda) {
    return (
      <Schermata sopratitolo="Workout" titolo="Seduta" indietro={`/lab/allenamento/${schedaId}`} barra={false}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }

  if (finita) {
    return (
      <Schermata sopratitolo={scheda.titolo} titolo="Allenamento finito" indietro={`/lab/allenamento/${schedaId}`} barra={false}>
        <Carta style={{ alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.cinque }}>
          <View style={[stili.coppa, { backgroundColor: FUOCO[1] }]}>
            <Icona nome="bandiera" size={30} colore="#fff" />
          </View>
          <Text style={[stili.complimenti, { color: p.testo }]}>Bel lavoro!</Text>
          <View style={{ flexDirection: 'row', gap: spazio.cinque }}>
            <View style={{ alignItems: 'center' }}>
              <Numero valore={String(finita.serie)} size={34} />
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>serie</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Numero valore={finita.durata} size={34} />
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>durata</Text>
            </View>
            {finita.volume ? (
              <View style={{ alignItems: 'center' }}>
                <Numero valore={Math.round(finita.volume).toLocaleString('it-IT')} size={34} />
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>kg sollevati</Text>
              </View>
            ) : null}
          </View>
        </Carta>
        <Pulsante testo="Vedi i progressi" icona="grafico" onPress={() => router.replace('/lab/allenamento/storico')} />
        <Pulsante testo="Torna alla scheda" variante="secondario" onPress={() => router.replace({ pathname: '/lab/allenamento/[scheda]', params: { scheda: scheda.id } })} />
      </Schermata>
    )
  }

  const fatteN = giorno.esercizi.reduce((n, e) => n + Array.from({ length: e.serie }, (_, k) => fatte.has(chiaveSerie(e.id, k + 1))).filter(Boolean).length, 0)
  return (
    <Schermata sopratitolo={scheda.titolo} titolo={giorno.nome} indietro={`/lab/allenamento/${schedaId}`} barra={false}>
      <Carta style={{ gap: spazio.due }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icona nome="cronometro" size={18} colore={p.accento} />
            <Text style={[stili.tempo, { color: p.testo }]}>{durata(seduta.inizio, ora)}</Text>
          </View>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${fatteN} di ${totaleSerie} serie`}</Text>
        </View>
        <Barra valore={totaleSerie ? fatteN / totaleSerie : 0} colore={p.accento} altezza={8} />
      </Carta>

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {giorno.note ? <Nota testo={giorno.note} /> : null}

      <View style={{ gap: spazio.tre }}>
        {giorno.esercizi.map((e, i) => {
          const tutte = Array.from({ length: e.serie }, (_, k) => fatte.has(chiaveSerie(e.id, k + 1))).every(Boolean)
          const qui = aperto === i
          const gr = gruppo(giorno, i)
          return (
            <Carta key={e.id} style={[stili.esercizio, qui && { borderColor: p.accento, borderWidth: 2 }, e.superserie ? { borderLeftWidth: 4, borderLeftColor: p.accento } : null]}>
              <Tocco onPress={() => setAperto(qui ? null : i)} etichetta={e.nome} scala={0.99}>
                <View style={stili.testa}>
                  <MediaEsercizio immagini={e.immagini} video={e.video} style={qui ? stili.mediaGrande : stili.media} ferma={!qui} />
                  {!qui ? (
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                        {e.nome}
                      </Text>
                      <Text style={[stili.piccola, { color: p.testoSecondario }]}>{(({ serieRip, carico }) => `${serieRip}${carico ? ` · ${carico}` : ''}`)(indicazione(e, massimali))}</Text>
                    </View>
                  ) : null}
                  {!qui && tutte ? <Icona nome="ok" size={24} colore={p.ok} /> : null}
                </View>
              </Tocco>
              {qui ? (
                <View style={{ gap: spazio.due }}>
                  {e.superserie ? <Text style={[stili.superserie, { color: p.accento }]}>{`SUPERSERIE ${e.superserie} · ${gr.indexOf(i) + 1} di ${gr.length}: si recupera alla fine del giro`}</Text> : null}
                  <Text style={[stili.nomeGrande, { color: p.testo }]}>{e.nome}</Text>
                  <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                    {(({ serieRip, carico }) => `${serieRip}${carico ? ` · ${carico}` : ''} · recupero ${recupero(e.recupero_serie)}`)(indicazione(e, massimali))}
                  </Text>
                  {indicazione(e, massimali).manca ? <Nota testo={SPIEGA_TARATURA} /> : null}
                  {e.note ? <Nota testo={e.note} /> : null}
                  {precedente(e.esercizio_id) ? (
                    <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`L’ultima volta: ${serieInRiga(precedente(e.esercizio_id)!.serie)}`}</Text>
                  ) : null}
                  <View style={{ gap: spazio.due, marginTop: spazio.uno }}>
                    {Array.from({ length: e.serie }, (_, k) => k + 1).map((n) => (
                      <RigaSerie
                        key={n}
                        e={e}
                        n={n}
                        fatta={fatte.get(chiaveSerie(e.id, n))}
                        bozza={bozzaDi(e, n)}
                        attiva={attuale.indice === i && attuale.serie === n}
                        occupata={occupato}
                        onBozza={(b) => setBozze((m) => new Map(m).set(chiaveSerie(e.id, n), b))}
                        onSegna={() => segna(i, n)}
                        onTogli={() => togli(i, n)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </Carta>
          )
        })}
      </View>

      <Pulsante testo="Fine allenamento" icona="bandiera" variante={fatteN === totaleSerie ? 'primario' : 'scuro'} onPress={chiudi} inCorso={occupato && !timer} />
      {fatteN < totaleSerie ? (
        <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>Puoi chiuderlo anche prima: le serie segnate restano nello storico.</Text>
      ) : null}

      <TimerRecupero
        fine={timer?.fine ?? null}
        totale={timer?.totale ?? 0}
        prossimo={timer?.prossimo ?? ''}
        dettaglio={timer?.dettaglio}
        onCambia={(fine, totale) => setTimer((t) => (t ? { ...t, fine, totale } : t))}
        onChiudi={() => setTimer(null)}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  tempo: { fontFamily: F.extra, fontSize: 20, fontVariant: ['tabular-nums'] },
  esercizio: { gap: spazio.tre, padding: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  media: { width: 64, height: 64, borderRadius: 16 },
  mediaGrande: { flex: 1, aspectRatio: 4 / 3, borderRadius: 20 },
  nome: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 19 },
  nomeGrande: { fontFamily: F.extra, fontSize: 21, lineHeight: 25, letterSpacing: -0.5 },
  superserie: { fontFamily: F.extra, fontSize: 10.5, letterSpacing: 0.8 },
  piccola: { fontFamily: F.semi, fontSize: 13 },
  serie: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 16, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10 },
  serieNumero: { width: 22, fontFamily: F.extra, fontSize: 17, textAlign: 'center' },
  serieFatta: { flex: 1, fontFamily: F.bold, fontSize: 15 },
  campo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { flex: 1, minWidth: 0, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, fontFamily: F.extra, fontSize: 17, textAlign: 'center' },
  unita: { fontFamily: F.semi, fontSize: 12, width: 22 },
  spunta: { width: 48, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coppa: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  complimenti: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.6 },
})
