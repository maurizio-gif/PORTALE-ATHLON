import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { chiudiSeduta, iniziaSeduta, leggiSchedaLab, segnaSerie, togliSerie, type EsercizioScheda, type GiornoSchedaLab, type Massimale, type Precedente, type SchedaLab } from '@/api/lab'
import { locale, t } from '@/lib/lingua'
import { useWindowDimensions } from '@/lib/finestra'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { dimentica, inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Barra, Carta, Messaggio, Numero, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette, velo } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { aTempo, chiliProposti, descriviPasso, dettaglioCarico, dopo, gruppo, indicazione, pianoPiuLeggero, recupero, SPIEGA_PIANO_PIU_LEGGERO, SPIEGA_TARATURA, type Passo } from './comune'
import { GuidaEsercizio } from './GuidaEsercizio'
import { MediaEsercizio } from './MediaEsercizio'
import { Nota, serieInRiga } from './Scheda'
import { applicaProgressione } from './progressione'
import { descriviRpe, etichettaRpe, RPE_VALORI } from './rpe'
import { TimerRecupero } from './TimerRecupero'
import { CHIAVE_SCHEDE } from './Schede'

// La seduta: il giorno della scheda da fare adesso. Per ogni esercizio le sue
// serie, con le ripetizioni proposte dalla scheda e i chili dell'ultima volta
// gia' scritti; si correggono e si segna la serie fatta. Segnata la serie,
// parte da solo il timer del recupero (TimerRecupero) e si passa al passo
// successivo: la serie dopo, o nella superserie l'esercizio dopo del giro.
// Ogni serie si salva subito: chiudendo l'app a meta', la seduta si riprende.

// **L'RPE** (11/11/2026, richiesta di Maurizio): accanto a ripetizioni e chili un pulsante «RPE» apre, sotto la riga, lo sforzo percepito da 0 a 10
// con una legenda corta. E' **facoltativo** (pensato per chi si allena gia' da un po'): chi non lo tocca non vede niente di diverso. Si sceglie prima
// di segnare la serie, o anche dopo, sulla serie gia' fatta (si risalva la stessa serie). Il pulsante c'e' solo se il server lo sa salvare
// (`rpe: true` nella risposta di `inizia`): con una funzione di prima non compare, invece di far scegliere un numero che poi si perde.

type Fatta = { ripetizioni: number | null; kg: number | null; secondi: number | null; rpe?: number | null }
type Bozza = { ripetizioni: string; kg: string; rpe?: number | null }

const chiaveSerie = (riga: string, n: number) => `${riga}:${n}`

/** «8-10» → «8»; «30 s» → «30». */
function primoNumero(x: string): string {
  return x.match(/\d+/)?.[0] ?? ''
}

function numero(x: string): number | null {
  const n = Number(x.replace(',', '.'))
  return x.trim() && Number.isFinite(n) && n >= 0 ? n : null
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
  conRpe,
  onRpe,
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
  /** Il server sa salvare l'RPE: senza, il pulsante non c'e'. */
  conRpe: boolean
  /** L'RPE scelto (o tolto, con null): sulla bozza, o sulla serie gia' fatta. */
  onRpe: (rpe: number | null) => void
}) {
  const p = usePalette()
  const tempo = aTempo(e.ripetizioni)
  const [rpeAperto, setRpeAperto] = useState(false)
  const rpe = (fatta ? fatta.rpe : bozza.rpe) ?? null
  // Su un telefono, accanto a due campi il pulsante li schiaccerebbe («37,5» non ci starebbe piu'): sulla serie ancora da fare va su una riga sua,
  // e solo su quella che si sta facendo adesso. Sulla serie fatta lo spazio c'e' sempre, e sta in riga. Da 480 px in su sta sempre in riga.
  const stretto = useWindowDimensions().width < 480
  const rpeInRiga = !!fatta || !stretto
  const rpeSotto = conRpe && !fatta && stretto && (attiva || rpe != null || rpeAperto)
  const pulsanteRpe = (
    <Tocco
      onPress={() => setRpeAperto((a) => !a)}
      etichetta={
        rpe != null
          ? t(`Serie ${n}: sforzo ${etichettaRpe(rpe)}. Tocca per cambiarlo`, `Set ${n}: effort ${etichettaRpe(rpe)}. Tap to change it`)
          : t(`Serie ${n}: indica lo sforzo (RPE), facoltativo`, `Set ${n}: rate the effort (RPE), optional`)
      }
      stato={{ expanded: rpeAperto }}
      style={[stili.rpe, rpe != null ? { backgroundColor: velo(p, 'accento'), borderColor: p.accento } : { backgroundColor: 'transparent', borderColor: rpeAperto ? p.accento : p.linea }]}
    >
      <Text style={[stili.rpeSigla, { color: rpe != null ? p.accento : p.testoSecondario }]}>RPE</Text>
      {rpe != null ? <Text style={[stili.rpeValore, { color: p.accento }]}>{String(rpe).replace('.', t(',', '.'))}</Text> : null}
    </Tocco>
  )
  return (
    <View style={[stili.serieRiquadro, { backgroundColor: fatta ? 'transparent' : attiva ? p.incavo : 'transparent', borderColor: attiva && !fatta ? p.accento : p.linea }]}>
    <View style={stili.serie}>
      <Text style={[stili.serieNumero, { color: fatta ? p.ok : attiva ? p.accento : p.testoSecondario }]}>{n}</Text>
      {fatta ? (
        <Text style={[stili.serieFatta, { color: p.testo }]}>{serieInRiga([fatta])}</Text>
      ) : (
        <>
          <View style={stili.campo}>
            <TextInput
              value={bozza.ripetizioni}
              onChangeText={(v) => onBozza({ ...bozza, ripetizioni: v.replace(/[^\d]/g, '').slice(0, 4) })}
              keyboardType="number-pad"
              placeholder={tempo ? t('sec', 'sec') : t('rip.', 'reps')}
              placeholderTextColor={p.testoTerzo}
              style={[stili.input, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
              accessibilityLabel={t(`Serie ${n}: ${tempo ? 'secondi' : 'ripetizioni'}`, `Set ${n}: ${tempo ? 'seconds' : 'reps'}`)}
              selectTextOnFocus
            />
            <Text style={[stili.unita, { color: p.testoTerzo }]}>{tempo ? 's' : t('rip', 'reps')}</Text>
          </View>
          {!tempo ? (
            <View style={stili.campo}>
              <TextInput
                value={bozza.kg}
                onChangeText={(v) => onBozza({ ...bozza, kg: v.replace(/[^\d.,]/g, '').slice(0, 6) })}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor={p.testoTerzo}
                style={[stili.input, { color: p.testo, backgroundColor: p.carta, borderColor: p.linea }]}
                accessibilityLabel={t(`Serie ${n}: chili`, `Set ${n}: kilos`)}
                selectTextOnFocus
              />
              <Text style={[stili.unita, { color: p.testoTerzo }]}>kg</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </>
      )}
      {conRpe && rpeInRiga ? pulsanteRpe : null}
      <Tocco
        onPress={() => {
          setRpeAperto(false)
          ;(fatta ? onTogli : onSegna)()
        }}
        spento={occupata}
        etichetta={fatta ? t(`Togli la serie ${n}`, `Remove set ${n}`) : t(`Segna la serie ${n} fatta`, `Mark set ${n} as done`)}
        style={[stili.spunta, { backgroundColor: fatta ? p.ok : attiva ? p.accento : p.incavo }]}
      >
        <Icona nome={fatta ? 'spunta' : 'spunta'} size={20} colore={fatta || attiva ? '#fff' : p.testoTerzo} />
      </Tocco>
    </View>
    {rpeSotto ? (
      <View style={stili.rpeSotto}>
        {pulsanteRpe}
        <Text style={[stili.rpeLegenda, { color: p.testoTerzo, flex: 1 }]}>{t('Sforzo percepito · facoltativo', 'Perceived effort · optional')}</Text>
      </View>
    ) : null}
    {conRpe && rpeAperto ? (
      <View style={[stili.rpePannello, { borderTopColor: p.linea }]}>
        <Text style={[stili.rpeTitolo, { color: p.testo }]}>{t('RPE: quanto è stata dura questa serie?', 'RPE: how hard was this set?')}</Text>
        <Text style={[stili.rpeLegenda, { color: p.testoSecondario }]}>
          {t(
            'Da 0 (nessuno sforzo) a 10 (il massimo). Pensa a quante ripetizioni avresti ancora fatto: 10 nessuna, 9 ancora una, 8 ancora due, 7 ancora tre.',
            'From 0 (no effort) to 10 (maximum). Think of how many more reps you had left: 10 none, 9 one more, 8 two more, 7 three more.',
          )}
        </Text>
        <View style={stili.rpeValori}>
          {RPE_VALORI.map((v) => {
            const scelto = rpe === v
            return (
              <Tocco
                key={v}
                onPress={() => onRpe(scelto ? null : v)}
                spento={occupata}
                etichetta={t(`RPE ${v}: ${descriviRpe(v)}`, `RPE ${v}: ${descriviRpe(v)}`)}
                stato={{ selected: scelto }}
                style={[stili.rpeNumero, { backgroundColor: scelto ? p.accento : p.carta, borderColor: scelto ? p.accento : p.linea }]}
              >
                <Text style={[stili.rpeNumeroTesto, { color: scelto ? '#fff' : p.testo }]}>{v}</Text>
              </Tocco>
            )
          })}
        </View>
        <Text style={[stili.rpeLegenda, { color: rpe != null ? p.testo : p.testoTerzo }]}>
          {rpe != null
            ? `${etichettaRpe(rpe)} · ${descriviRpe(rpe)}. ${t('Tocca di nuovo il numero per toglierlo.', 'Tap the number again to remove it.')}`
            : t('Facoltativo: se non lo indichi non cambia niente.', 'Optional: nothing changes if you skip it.')}
        </Text>
      </View>
    ) : null}
    </View>
  )
}

export function Seduta() {
  const p = usePalette()
  const { scheda: schedaId, giorno: giornoId } = useLocalSearchParams<{ scheda: string; giorno: string }>()
  // Il piano di base resta nello stato; quello che si fa e' il piano di questa settimana (31/10/2026, progressione a cicli: carichi e serie del ciclo).
  const [schedaBase, setScheda] = useState<SchedaLab | null>(() => inMemoria<{ scheda: SchedaLab }>(`schede:${schedaId}`)?.scheda ?? null)
  const scheda = useMemo(() => (schedaBase ? applicaProgressione(schedaBase, oggiRoma()).scheda : null), [schedaBase])
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
  // Il server sa salvare l'RPE di una serie (11/11/2026): lo dice quando apre la seduta.
  const [conRpe, setConRpe] = useState(false)

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
    setConRpe(r.rpe)
    const m = new Map<string, Fatta>()
    for (const x of r.serie) m.set(chiaveSerie(x.scheda_esercizio_id, x.numero), { ripetizioni: x.ripetizioni, kg: x.kg, secondi: x.secondi, rpe: x.rpe ?? null })
    setFatte(m)
    // Si riparte dal primo passo non fatto.
    const g = applicaProgressione(s.scheda, oggiRoma()).scheda.giorni.find((x) => x.id === giornoId)
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
    const id = setInterval(() => setOra(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const precedente = useCallback((eid: string) => precedenti.find((x) => x.esercizio_id === eid), [precedenti])

  /**
   * La bozza di una serie: quella scritta, o le ripetizioni della scheda e i
   * chili: quelli della serie prima di oggi, poi quelli calcolati dalla
   * percentuale e dal massimale, poi quelli della stessa serie l'ultima volta
   * (`chiliProposti`, la stessa regola del timer del recupero).
   */
  const bozzaDi = useCallback(
    (e: EsercizioScheda, n: number): Bozza => {
      const b = bozze.get(chiaveSerie(e.id, n))
      if (b) return b
      const ind = indicazione(e, massimali)
      const kg = chiliProposti(ind, fatte.get(chiaveSerie(e.id, n - 1))?.kg, precedente(e.esercizio_id)?.serie, n)
      return { ripetizioni: ind.ripetizioni != null ? String(ind.ripetizioni) : primoNumero(e.ripetizioni), kg: kg != null ? String(kg).replace('.', t(',', '.')) : '' }
    },
    [bozze, fatte, precedente, massimali],
  )

  const totaleSerie = useMemo(() => (giorno ? giorno.esercizi.reduce((n, e) => n + e.serie, 0) : 0), [giorno])

  async function segna(i: number, n: number) {
    if (!giorno || !seduta) return
    const e = giorno.esercizi[i]
    const b = bozzaDi(e, n)
    const tempo = aTempo(e.ripetizioni)
    const rpe = conRpe ? (b.rpe ?? null) : null
    const fatta: Fatta = tempo
      ? { ripetizioni: null, kg: null, secondi: numero(b.ripetizioni), rpe }
      : { ripetizioni: numero(b.ripetizioni), kg: numero(b.kg), secondi: null, rpe }
    const k = chiaveSerie(e.id, n)
    const fatteOra = new Map(fatte).set(k, fatta) // con la serie appena segnata: il timer dice i chili che si riempiranno nel campo
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
        dettaglio: dettaglioCarico(indicazione(pe, massimali), fatteOra.get(chiaveSerie(pe.id, prossimo.serie - 1))?.kg ?? null, ult ? serieInRiga([ult]) : null),
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

  /** L'RPE di una serie: sulla bozza se la serie e' ancora da segnare; su una serie gia' fatta si risalva la stessa serie col nuovo valore. */
  async function scegliRpe(i: number, n: number, rpe: number | null) {
    if (!giorno || !seduta) return
    const e = giorno.esercizi[i]
    const k = chiaveSerie(e.id, n)
    const prima = fatte.get(k)
    if (!prima) {
      const b = bozzaDi(e, n)
      setBozze((m) => new Map(m).set(k, { ...b, rpe }))
      return
    }
    const dopoRpe: Fatta = { ...prima, rpe }
    setFatte((m) => new Map(m).set(k, dopoRpe))
    setErrore(null)
    const r = await segnaSerie({ allenamento_id: seduta.id, scheda_esercizio_id: e.id, esercizio_id: e.esercizio_id, numero: n, ...dopoRpe })
    if (!r.ok) {
      setFatte((m) => (m.has(k) ? new Map(m).set(k, prima) : m))
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
      <Schermata sopratitolo="Train" titolo={t('Seduta', 'Workout')} indietro={`/allenamento/${schedaId}`} barra={false}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
      </Schermata>
    )
  }
  if (!giorno || !seduta || !scheda) {
    return (
      <Schermata sopratitolo="Train" titolo={t('Seduta', 'Workout')} indietro={`/allenamento/${schedaId}`} barra={false}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }

  if (finita) {
    return (
      <Schermata sopratitolo={scheda.titolo} titolo={t('Allenamento finito', 'Workout finished')} indietro={`/allenamento/${schedaId}`} barra={false}>
        <Carta style={{ alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.cinque }}>
          <View style={[stili.coppa, { backgroundColor: FUOCO[1] }]}>
            <Icona nome="bandiera" size={30} colore="#fff" />
          </View>
          <Text style={[stili.complimenti, { color: p.testo }]}>{t('Bel lavoro!', 'Great work!')}</Text>
          <View style={{ flexDirection: 'row', gap: spazio.cinque }}>
            <View style={{ alignItems: 'center' }}>
              <Numero valore={String(finita.serie)} size={34} />
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('serie', 'sets')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Numero valore={finita.durata} size={34} />
              <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('durata', 'duration')}</Text>
            </View>
            {finita.volume ? (
              <View style={{ alignItems: 'center' }}>
                <Numero valore={Math.round(finita.volume).toLocaleString(locale())} size={34} />
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('kg sollevati', 'kg lifted')}</Text>
              </View>
            ) : null}
          </View>
        </Carta>
        <Pulsante testo={t('Vedi i progressi', 'See your progress')} icona="grafico" onPress={() => router.replace('/allenamento/storico')} />
        <Pulsante testo={t('Torna al piano', 'Back to the plan')} variante="secondario" onPress={() => router.replace({ pathname: '/allenamento/[scheda]', params: { scheda: scheda.id } })} />
      </Schermata>
    )
  }

  const fatteN = giorno.esercizi.reduce((n, e) => n + Array.from({ length: e.serie }, (_, k) => fatte.has(chiaveSerie(e.id, k + 1))).filter(Boolean).length, 0)
  return (
    <Schermata sopratitolo={scheda.titolo} titolo={giorno.nome} indietro={`/allenamento/${schedaId}`} barra={false}>
      <Carta style={{ gap: spazio.due }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icona nome="cronometro" size={18} colore={p.accento} />
            <Text style={[stili.tempo, { color: p.testo }]}>{durata(seduta.inizio, ora)}</Text>
          </View>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t(`${fatteN} di ${totaleSerie} serie`, `${fatteN} of ${totaleSerie} sets`)}</Text>
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
                  {e.superserie ? <Text style={[stili.superserie, { color: p.accento }]}>{t(`SUPERSERIE ${e.superserie} · ${gr.indexOf(i) + 1} di ${gr.length}: si recupera alla fine del giro`, `SUPERSET ${e.superserie} · ${gr.indexOf(i) + 1} of ${gr.length}: rest at the end of the round`)}</Text> : null}
                  <Text style={[stili.nomeGrande, { color: p.testo }]}>{e.nome}</Text>
                  <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                    {(({ serieRip, carico }) => `${serieRip}${carico ? ` · ${carico}` : ''} · ${t('recupero', 'rest')} ${recupero(e.recupero_serie)}`)(indicazione(e, massimali))}
                  </Text>
                  {indicazione(e, massimali).manca ? <Nota testo={SPIEGA_TARATURA} /> : null}
                  {e.note ? <Nota testo={e.note} /> : null}
                  {precedente(e.esercizio_id) ? (
                    <Text style={[stili.piccola, { color: p.testoTerzo }]}>{t(`L’ultima volta: ${serieInRiga(precedente(e.esercizio_id)!.serie)}`, `Last time: ${serieInRiga(precedente(e.esercizio_id)!.serie)}`)}</Text>
                  ) : null}
                  {pianoPiuLeggero(indicazione(e, massimali).kg, precedente(e.esercizio_id)?.serie) ? <Nota testo={SPIEGA_PIANO_PIU_LEGGERO} /> : null}
                  <GuidaEsercizio e={e} />
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
                        conRpe={conRpe}
                        onRpe={(v) => scegliRpe(i, n, v)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </Carta>
          )
        })}
      </View>

      <Pulsante testo={t('Fine allenamento', 'Finish workout')} icona="bandiera" variante={fatteN === totaleSerie ? 'primario' : 'scuro'} onPress={chiudi} inCorso={occupato && !timer} />
      {fatteN < totaleSerie ? (
        <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>{t('Puoi chiuderlo anche prima: le serie segnate restano nello storico.', 'You can finish early: the sets you’ve logged stay in your history.')}</Text>
      ) : null}

      <TimerRecupero
        fine={timer?.fine ?? null}
        totale={timer?.totale ?? 0}
        prossimo={timer?.prossimo ?? ''}
        dettaglio={timer?.dettaglio}
        onCambia={(fine, totale) => setTimer((x) => (x ? { ...x, fine, totale } : x))}
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
  mediaGrande: { flex: 1, aspectRatio: 16 / 9, borderRadius: 20 },
  nome: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 19 },
  nomeGrande: { fontFamily: F.extra, fontSize: 21, lineHeight: 25, letterSpacing: -0.5 },
  superserie: { fontFamily: F.extra, fontSize: 10.5, letterSpacing: 0.8 },
  piccola: { fontFamily: F.semi, fontSize: 13 },
  serieRiquadro: { borderRadius: 16, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10 },
  serie: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  rpe: { height: 44, minWidth: 48, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rpeSigla: { fontFamily: F.extra, fontSize: 11, letterSpacing: 0.6 },
  rpeValore: { fontFamily: F.extra, fontSize: 15, lineHeight: 17, fontVariant: ['tabular-nums'] },
  rpeSotto: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, marginTop: 8, paddingLeft: 22 + spazio.due },
  rpePannello: { marginTop: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  rpeTitolo: { fontFamily: F.extra, fontSize: 14.5 },
  rpeLegenda: { fontFamily: F.medio, fontSize: 13, lineHeight: 18.5 },
  rpeValori: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpeNumero: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rpeNumeroTesto: { fontFamily: F.extra, fontSize: 16, fontVariant: ['tabular-nums'] },
  serieNumero: { width: 22, fontFamily: F.extra, fontSize: 17, textAlign: 'center' },
  serieFatta: { flex: 1, fontFamily: F.bold, fontSize: 15 },
  campo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { flex: 1, minWidth: 0, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, fontFamily: F.extra, fontSize: 17, textAlign: 'center' },
  unita: { fontFamily: F.semi, fontSize: 12, width: 22 },
  spunta: { width: 48, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coppa: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  complimenti: { fontFamily: F.extra, fontSize: 24, letterSpacing: -0.6 },
})
