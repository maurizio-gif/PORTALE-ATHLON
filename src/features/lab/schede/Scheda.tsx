import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { eliminaSchedaMia, leggiSchedaLab, salvaSchedaMia, type EsercizioScheda, type Massimale, type Precedente, type SchedaLab } from '@/api/lab'
import { t, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dimentica, inMemoria, prendi } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Pulsante, SchedeInArrivo, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CalorieScheda } from './Calorie'
import { comeDaSalvare } from './copia'
import { etichettaPiano, giornoTest, gruppo, indicazione, LIVELLI, muscoli, recupero, SPIEGA_STIMA, SPIEGA_TARATURA, testDaRifare } from './comune'
import { MediaEsercizio } from './MediaEsercizio'
import { condividiPiano, stampaPiano, type EsitoEsporta } from './esportaVasca'
import { COSA_FAI_IN_VASCA, eDiVasca, ETICHETTA_VASCA, inMetri, metriDelGiorno, nomeIntensita, nomeParte, parteDa, SPIEGA_SOLO_LETTURA } from './nuoto'

// Un piano: la descrizione, i giorni come schede, e gli esercizi del giorno
// scelto con serie, ripetizioni, carico, recupero e l'ultima volta che il
// socio l'ha fatto. Toccando un esercizio si apre la sua scheda (il video o
// le foto che si alternano, i muscoli, le istruzioni). In fondo «Inizia».
// Un piano che non e' del socio (consigliato dal club, del suo trainer, scritto
// dall'agente prima del 19/10/2026) si **aggiunge ai suoi piani**, com'e' o dopo
// averlo modificato (`copia.ts`, editor con `?copia=`): ne tiene una copia.
// I carichi in percentuale (16/10/2026) diventano chili coi massimali del
// socio, misurati o stimati dal test del distretto (15/10/2026, con «≈»);
// finche' mancano, un riquadro spiega come averli. In fondo, sopra
// «Inizia», le calorie stimate del giorno scelto (Calorie.tsx, 15/10/2026).
//
// **Un piano di nuoto** (20/10/2026, `ambiente: 'vasca'`) si legge e non si registra: niente «Inizia» (il server rifiuta
// `inizia`), niente calorie (in vasca non c'e' un MET per esercizio che non sia inventato), e al posto di «N esercizi» i
// **metri** della seduta, che sono una somma. Ogni blocco porta la sua parte — riscaldamento, tecnica, serie principale,
// defaticamento — dalla nota. Il Percorso Athlon lo apre sul giorno di una tappa di Nuoto Libero (`?giorno=`).

type Dati = { scheda: SchedaLab; precedenti: Precedente[]; massimali: Massimale[]; ultimoTest: string | null; giorniTest: number }

/** «10 × 40 kg, 10 × 40 kg, 8 × 42,5 kg». */
export function serieInRiga(serie: { ripetizioni: number | null; kg: number | null; secondi: number | null }[]): string {
  return serie
    .map((s) => (s.secondi != null ? `${s.secondi}″` : `${s.ripetizioni ?? '—'}${s.kg != null ? ` × ${String(s.kg).replace('.', t(',', '.'))} kg` : ''}`))
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

function FoglioEsercizio({ e, precedente, massimali, onChiudi, vasca = false }: { e: EsercizioScheda | null; precedente?: Precedente; massimali: Massimale[]; onChiudi: () => void; vasca?: boolean }) {
  const p = usePalette()
  const ind = e ? indicazione(e, massimali) : null
  return (
    <Foglio aperto={!!e} titolo={e?.nome ?? ''} sottotitolo={e ? muscoli(e.muscoli_primari) : undefined} onChiudi={onChiudi}>
      {e ? (
        <View style={{ gap: spazio.tre }}>
          <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.mediaGrande} />
          {e.descrizione ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{e.descrizione}</Text> : null}
          <View style={[stili.cifre, { backgroundColor: p.incavo }]}>
            {(vasca
              ? [
                  { v: `${e.serie} × ${e.ripetizioni}`, l: t('Ripetizioni × distanza', 'Reps × distance') },
                  { v: e.carico ? nomeIntensita(e.carico).charAt(0).toUpperCase() + nomeIntensita(e.carico).slice(1) : '—', l: t('Intensità', 'Intensity') },
                  { v: recupero(e.recupero_serie), l: t('Recupero', 'Rest') },
                ]
              : [
                  { v: ind!.serieRip, l: t('Serie × ripetizioni', 'Sets × reps') },
                  {
                    v: ind!.kg != null ? `${ind!.stimato ? '≈ ' : ''}${String(ind!.kg).replace('.', t(',', '.'))} kg` : ind!.manca ? `${e.percentuale}%` : e.carico || '—',
                    l: ind!.kg != null ? `${ind!.stimato ? t('Stimato', 'Estimated') : t('Carico', 'Load')} · ${e.percentuale}%` : ind!.manca ? t('Del massimale', 'Of 1RM') : t('Carico', 'Load'),
                  },
                  { v: recupero(e.recupero_serie), l: t('Recupero', 'Rest') },
                ]
            ).map((c, i) => (
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
            <Nota
              testo={
                ind.daTest
                  ? t(
                      `Questo esercizio è nel test dei massimali: fai il test e qui vedrai i tuoi chili. Oppure: ${SPIEGA_TARATURA.charAt(0).toLowerCase()}${SPIEGA_TARATURA.slice(1)}`,
                      `This exercise is part of the 1RM test: take the test and you’ll see your weights here. Or: ${SPIEGA_TARATURA.charAt(0).toLowerCase()}${SPIEGA_TARATURA.slice(1)}`,
                    )
                  : SPIEGA_TARATURA
              }
            />
          ) : null}
          {e.note ? <Nota testo={e.note} /> : null}
          {precedente && !vasca ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              <Text style={{ fontFamily: F.bold, color: p.testo }}>{t('L’ultima volta: ', 'Last time: ')}</Text>
              {serieInRiga(precedente.serie)}
            </Text>
          ) : null}
          {e.istruzioni.filter(Boolean).length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.titoletto, { color: p.testo }]}>{t('Come si fa', 'How to do it')}</Text>
              {e.istruzioni.filter(Boolean).map((riga, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
                  <Text style={[stili.passo, { color: p.accento }]}>{i + 1}</Text>
                  <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{riga}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {e.errori_comuni?.filter(Boolean).length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.titoletto, { color: p.testo }]}>{t('Da evitare', 'What to avoid')}</Text>
              {e.errori_comuni.filter(Boolean).map((riga, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
                  <Text style={[stili.passo, { color: p.testoSecondario }]}>×</Text>
                  <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{riga}</Text>
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
  // `?giorno=<posizione>`: il Percorso Athlon apre il piano sul giorno della tappa (la posizione, da 1, non l'id: gli id cambiano a ogni modifica).
  const { scheda: id, giorno: giornoDelPercorso } = useLocalSearchParams<{ scheda: string; giorno?: string }>()
  const chiave = `schede:${id}`
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(chiave) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [giorno, setGiorno] = useState(() => {
    const n = Number(giornoDelPercorso)
    return Number.isInteger(n) && n >= 1 ? n - 1 : 0
  })
  const [aperto, setAperto] = useState<EsercizioScheda | null>(null)
  const [confermo, setConfermo] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [erroreElimina, setErroreElimina] = useState<string | null>(null)
  const [aggiungendo, setAggiungendo] = useState(false)
  const [erroreAggiungi, setErroreAggiungi] = useState<string | null>(null)
  const [esito, setEsito] = useState<EsitoEsporta | null>(null)

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
      <Schermata sopratitolo="Train" titolo={t('Piano', 'Plan')} indietro="/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo quante={2} />
        )}
      </Schermata>
    )
  }

  const s = dati.scheda
  const vasca = eDiVasca(s)

  async function elimina() {
    setErroreElimina(null)
    setEliminando(true)
    const r = await eliminaSchedaMia(s.id)
    setEliminando(false)
    if (!r.ok) return setErroreElimina(r.errore)
    dimentica()
    router.replace('/allenamento')
  }

  /** Il piano di nuoto fuori dall'app: stampa (e PDF dalla finestra di stampa) o testo da condividere. */
  async function esporta(come: 'stampa' | 'condividi') {
    setEsito(null)
    setEsito(await (come === 'stampa' ? stampaPiano(s) : condividiPiano(s)))
  }

  /** «Aggiungi ai tuoi piani»: la copia com'e', senza passare dall'editor. */
  async function aggiungi() {
    setErroreAggiungi(null)
    setAggiungendo(true)
    const r = await salvaSchedaMia(comeDaSalvare(s))
    setAggiungendo(false)
    if (!r.ok) return setErroreAggiungi(r.errore)
    dimentica()
    router.replace({ pathname: '/allenamento/[scheda]', params: { scheda: r.id } })
  }

  const g = s.giorni[Math.min(giorno, s.giorni.length - 1)]
  const precedente = (eid: string) => dati.precedenti.find((x) => x.esercizio_id === eid)
  const massimali = dati.massimali ?? []
  const tutti = s.giorni.flatMap((x) => x.esercizi)
  const inPercentuale = tutti.filter((e) => e.percentuale)
  const mancano = inPercentuale.filter((e) => indicazione(e, massimali).manca)
  const stimati = inPercentuale.filter((e) => indicazione(e, massimali).stimato)
  const rifare = testDaRifare(dati.ultimoTest ?? null, dati.giorniTest ?? 42, s.livello === 'principiante')
  return (
    <Schermata sopratitolo={vasca ? `${ETICHETTA_VASCA} · ${etichettaPiano(s)}` : etichettaPiano(s)} titolo={s.titolo} indietro="/allenamento" barra={false}>
      <View style={{ gap: spazio.due }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {s.obiettivo ? <Tag testo={s.obiettivo} colore={p.accento} /> : null}
          {s.livello ? <Tag testo={LIVELLI[s.livello] ?? s.livello} colore={p.blu} /> : null}
          {s.giorni_settimana ? <Tag
              testo={t(
                `${s.giorni_settimana} ${vasca ? (s.giorni_settimana === 1 ? 'seduta' : 'sedute') : s.giorni_settimana === 1 ? 'giorno' : 'giorni'} a settimana`,
                `${s.giorni_settimana} ${vasca ? (s.giorni_settimana === 1 ? 'session' : 'sessions') : s.giorni_settimana === 1 ? 'day' : 'days'} a week`,
              )}
              colore={p.testoSecondario}
            /> : null}
        </View>
        {s.descrizione ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{s.descrizione}</Text> : null}
        {s.tipo === 'socio' ? (
          <Text style={[stili.piccola, { color: p.testoTerzo }]}>
            {tv(
              <>È un piano tuo, ma i trainer del club lo possono vedere dal pannello, per verificarlo e aiutarti a seguirlo. Non sostituisce il parere di un istruttore: con dolori o infortuni chiedi {vasca ? 'al tecnico a bordo vasca' : 'in sala'}.</>,
              <>It’s your plan, but the club’s trainers can see it from their panel, to check it and help you follow it. It doesn’t replace an instructor’s advice: if you have pain or injuries, ask {vasca ? 'the coach at the poolside' : 'on the gym floor'}.</>,
            )}
          </Text>
        ) : null}
      </View>

      {s.tipo !== 'socio' ? (
        <Carta style={{ gap: spazio.tre }}>
          <View style={{ gap: 3 }}>
            <Text style={[stili.titoletto, { color: p.testo }]}>{s.tipo === 'standard' ? t('Fallo tuo', 'Make it yours') : t('Fanne una copia tua', 'Make your own copy')}</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {s.tipo === 'standard'
                ? t(
                    'Aggiungilo ai tuoi piani così com’è, oppure cambia quello che vuoi prima di confermare. L’originale resta quello del club.',
                    'Add it to your plans as it is, or change what you like before confirming. The original stays the club’s.',
                  )
                : t('Puoi copiarlo fra i tuoi piani e cambiare quello che vuoi: l’originale resta com’è.', 'You can copy it to your plans and change what you like: the original stays as it is.')}
            </Text>
          </View>
          {erroreAggiungi ? <Messaggio>{erroreAggiungi}</Messaggio> : null}
          <View style={stili.azioniTue}>
            {s.tipo === 'standard' ? (
              <View style={{ flex: 1, minWidth: 160 }}>
                <Pulsante testo={t('Aggiungi ai tuoi piani', 'Add to your plans')} icona="piu" piccolo inCorso={aggiungendo} onPress={aggiungi} />
              </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 160 }}>
              <Pulsante
                testo={s.tipo === 'standard' ? t('Modifica e aggiungi', 'Edit and add') : t('Modifica una copia', 'Edit a copy')}
                icona="modifica"
                variante="secondario"
                piccolo
                disabilitato={aggiungendo}
                onPress={() => router.push({ pathname: '/allenamento/nuova', params: { copia: s.id } })}
              />
            </View>
          </View>
        </Carta>
      ) : null}

      {inPercentuale.length ? (
        <Carta style={{ gap: spazio.due }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
            <Icona nome={mancano.length ? 'grafico' : 'ok'} size={20} colore={mancano.length ? p.blu : p.ok} />
            <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>
              {mancano.length === inPercentuale.length
                ? t('I carichi sono in percentuale', 'Loads are in percentages')
                : mancano.length
                  ? t('Quasi tutti i carichi sono in chili', 'Most loads are in kilos')
                  : t('I carichi sono i tuoi chili', 'Loads are your own kilos')}
            </Text>
          </View>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {mancano.length === inPercentuale.length
              ? t(
                  'La percentuale è del tuo massimale, il peso più alto che sollevi per una ripetizione. Fai il test dei massimali (una quindicina di minuti): basta un esercizio per gli arti superiori, uno per il core e uno per gli arti inferiori, e qui al posto di tutte le percentuali vedrai i tuoi chili, arrotondati ai pesi della macchina.',
                  'The percentage is of your one-rep max, the heaviest weight you can lift for one rep. Take the 1RM test (about fifteen minutes): one exercise for the upper body, one for the core and one for the lower body is enough, and here, in place of all the percentages, you’ll see your own weights, rounded to the machine’s steps.',
                )
              : mancano.length
                ? t(
                    `Calcolati sui tuoi massimali${dati.ultimoTest ? ` (test del ${giornoTest(dati.ultimoTest)})` : ''} e arrotondati ai pesi della macchina. Dove vedi ancora la percentuale manca il test di quel distretto (arti superiori, core o arti inferiori): fallo, oppure ${SPIEGA_TARATURA.charAt(0).toLowerCase()}${SPIEGA_TARATURA.slice(1)}`,
                    `Worked out from your 1RMs${dati.ultimoTest ? ` (test on ${giornoTest(dati.ultimoTest)})` : ''} and rounded to the machine’s weights. Where you still see the percentage, the test for that area (upper body, core or lower body) is missing: take it, or ${SPIEGA_TARATURA.charAt(0).toLowerCase()}${SPIEGA_TARATURA.slice(1)}`,
                  )
                : t(
                    `Calcolati sui tuoi massimali${dati.ultimoTest ? ` (test del ${giornoTest(dati.ultimoTest)})` : ''} e arrotondati per difetto ai pesi della macchina.`,
                    `Worked out from your 1RMs${dati.ultimoTest ? ` (test on ${giornoTest(dati.ultimoTest)})` : ''} and rounded down to the machine’s weights.`,
                  )}
            {stimati.length ? ` ${SPIEGA_STIMA}` : ''}
          </Text>
          {rifare ? (
            <Messaggio tono="attenzione" titolo={t('È ora di rifare il test', 'Time to retake the test')}>
              {t(
                `Sono passate più di ${Math.round((s.livello === 'principiante' ? Math.min(28, dati.giorniTest) : dati.giorniTest) / 7)} settimane: rifallo e i chili seguono i tuoi progressi.`,
                `More than ${Math.round((s.livello === 'principiante' ? Math.min(28, dati.giorniTest) : dati.giorniTest) / 7)} weeks have passed: retake it and your weights follow your progress.`,
              )}
            </Messaggio>
          ) : null}
          {!dati.ultimoTest || rifare ? (
            <Pulsante testo={rifare ? t('Rifai il test', 'Retake the test') : t('Fai il test dei massimali', 'Take the 1RM test')} icona="grafico" variante="secondario" onPress={() => router.push('/allenamento/test')} />
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
                <Text style={{ color: attivo ? 'rgba(255,255,255,0.85)' : p.testoTerzo, fontFamily: F.semi, fontSize: 11.5 }}>
                  {vasca && metriDelGiorno(x) > 0
                    ? inMetri(metriDelGiorno(x))
                    : t(
                        `${x.esercizi.length} ${x.esercizi.length === 1 ? (vasca ? 'blocco' : 'esercizio') : vasca ? 'blocchi' : 'esercizi'}`,
                        `${x.esercizi.length} ${x.esercizi.length === 1 ? (vasca ? 'block' : 'exercise') : vasca ? 'blocks' : 'exercises'}`,
                      )}
                </Text>
              </Tocco>
            )
          })}
        </ScrollView>
      ) : null}

      {g.note ? <Nota testo={g.note} /> : null}

      {vasca ? (
        <View style={{ gap: 2 }}>
          {giornoDelPercorso ? <Text style={[stili.titoletto, { color: p.accento }]}>{COSA_FAI_IN_VASCA}</Text> : null}
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${g.nome}${metriDelGiorno(g) > 0 ? ` · ${inMetri(metriDelGiorno(g))}` : ''} · ${g.esercizi.length} ${g.esercizi.length === 1 ? t('blocco', 'block') : t('blocchi', 'blocks')}`}</Text>
        </View>
      ) : null}

      <View style={{ gap: spazio.tre }}>
        {g.esercizi.map((e, i) => {
          const gr = gruppo(g, i)
          const prec = vasca ? undefined : precedente(e.esercizio_id)
          const ind = indicazione(e, massimali)
          const parte = vasca ? parteDa(e.note) : null
          return (
            <Entra key={e.id} indice={i}>
              <Tocco onPress={() => setAperto(e)} etichetta={t(`${e.nome}: come si fa`, `${e.nome}: how to do it`)} scala={0.985}>
                <Carta style={[stili.esercizio, e.superserie ? { borderLeftWidth: 4, borderLeftColor: p.accento } : null]}>
                  <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.media} ferma />
                  <View style={{ flex: 1, gap: 4 }}>
                    {e.superserie ? (
                      <Text style={[stili.superserie, { color: p.accento }]}>{t(`SUPERSERIE ${e.superserie}${gr.length > 1 ? ` · ${gr.indexOf(i) + 1} di ${gr.length}` : ''}`, `SUPERSET ${e.superserie}${gr.length > 1 ? ` · ${gr.indexOf(i) + 1} of ${gr.length}` : ''}`)}</Text>
                    ) : null}
                    {parte?.parte ? <Text style={[stili.parte, { color: p.accento }]}>{nomeParte(parte.parte).toUpperCase()}</Text> : null}
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
                        {t(
                          `Recupero ${recupero(e.recupero_serie)}${e.recupero_dopo !== e.recupero_serie ? ` · poi ${recupero(e.recupero_dopo)}` : ''}`,
                          `Rest ${recupero(e.recupero_serie)}${e.recupero_dopo !== e.recupero_serie ? ` · then ${recupero(e.recupero_dopo)}` : ''}`,
                        )}
                      </Text>
                    </View>
                    {prec ? (
                      <Text style={[stili.piccola, { color: p.testoTerzo }]} numberOfLines={1}>
                        {t(`Ultima volta: ${serieInRiga(prec.serie)}`, `Last time: ${serieInRiga(prec.serie)}`)}
                      </Text>
                    ) : null}
                    {parte?.resto ? (
                      <Text style={[stili.piccola, { color: p.testoSecondario }]} numberOfLines={2}>
                        {parte.resto}
                      </Text>
                    ) : null}
                  </View>
                </Carta>
              </Tocco>
            </Entra>
          )
        })}
      </View>

      {vasca ? (
        <>
          <Nota testo={SPIEGA_SOLO_LETTURA} />
          <View style={stili.azioniTue}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Pulsante testo={t('Stampa o salva in PDF', 'Print or save as PDF')} icona="scarica" variante="secondario" piccolo onPress={() => esporta('stampa')} />
            </View>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Pulsante testo={t('Condividi il piano', 'Share the plan')} icona="condividi" variante="secondario" piccolo onPress={() => esporta('condividi')} />
            </View>
          </View>
          {esito === 'copiato' ? <Nota testo={t('Piano copiato: incollalo dove vuoi.', 'Plan copied: paste it wherever you like.')} /> : null}
          {esito === 'errore' ? <Messaggio>{t('Non siamo riusciti a preparare il piano. Riprova.', 'We couldn’t prepare the plan. Try again.')}</Messaggio> : null}
        </>
      ) : (
        <>
          <CalorieScheda scheda={s} giorno={Math.min(giorno, s.giorni.length - 1)} />

          <Pulsante
            testo={t(`Inizia l’allenamento · ${g.nome}`, `Start workout · ${g.nome}`)}
            icona="play"
            onPress={() => router.push({ pathname: '/allenamento/[scheda]/[giorno]', params: { scheda: s.id, giorno: g.id } })}
          />
        </>
      )}

      {s.tipo === 'socio' ? (
        <View style={stili.azioniTue}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Pulsante testo={t('Modifica il piano', 'Edit the plan')} icona="modifica" variante="secondario" piccolo onPress={() => router.push({ pathname: '/allenamento/nuova', params: { id: s.id } })} />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Pulsante testo={t('Elimina il piano', 'Delete the plan')} icona="cestino" variante="pericolo" piccolo onPress={() => setConfermo(true)} />
          </View>
        </View>
      ) : null}

      {/* La postilla (20/10/2026): che il piano sia stato composto con un'intelligenza artificiale si dice qui, in fondo e in piccolo; non sul titolo né sulla carta. */}
      {s.origine === 'ai' || s.tipo === 'ai' ? (
        <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>
          {tv(
            <>
              Piano composto con il supporto di un’intelligenza artificiale sulle tue risposte
              {s.tipo === 'ai' ? (s.rivista_il ? ' e rivisto da un trainer del club' : ': un trainer del club lo rivede nei prossimi giorni') : ''}. Può contenere imprecisioni e non sostituisce il parere di un istruttore: con
              dolori o infortuni chiedi {vasca ? 'al tecnico a bordo vasca' : 'in sala'}.
            </>,
            <>
              Plan built with the help of artificial intelligence from your answers
              {s.tipo === 'ai' ? (s.rivista_il ? ' and reviewed by a club trainer' : ': a club trainer will review it in the coming days') : ''}. It may contain inaccuracies and doesn’t replace an instructor’s advice: if you
              have pain or injuries, ask {vasca ? 'the coach at the poolside' : 'on the gym floor'}.
            </>,
          )}
        </Text>
      ) : null}

      <Foglio aperto={confermo} titolo={t('Eliminare il piano?', 'Delete the plan?')} onChiudi={() => !eliminando && setConfermo(false)}>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(`«${s.titolo}» sparisce dal tuo elenco. Gli allenamenti che hai già registrato restano nello storico.`, `“${s.titolo}” will disappear from your list. The workouts you’ve already logged stay in your history.`)}
        </Text>
        {erroreElimina ? <Messaggio>{erroreElimina}</Messaggio> : null}
        <Pulsante testo={t('Elimina il piano', 'Delete the plan')} icona="cestino" variante="pericolo" inCorso={eliminando} onPress={elimina} />
        <Pulsante testo={t('Annulla', 'Cancel')} variante="secondario" disabilitato={eliminando} onPress={() => setConfermo(false)} />
      </Foglio>

      <FoglioEsercizio e={aperto} precedente={aperto ? precedente(aperto.esercizio_id) : undefined} massimali={massimali} onChiudi={() => setAperto(null)} vasca={vasca} />
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
  parte: { fontFamily: F.extra, fontSize: 11, letterSpacing: 1 },
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
  azioniTue: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
})
