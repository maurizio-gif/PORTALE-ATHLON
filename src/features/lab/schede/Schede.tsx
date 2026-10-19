import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { elencoMisure, elencoSchede, type Misura, type RigaSchedaLab, type SedutaBreve, type StatoTest } from '@/api/lab'
import { LARGO } from '@/components/Pagina'
import { spazio } from '@/theme'

import { relaxAperto, useDispositivi } from '../dispositivi/useDispositivi'
import { CartaBalance } from '../fit/Balance'
import { CartaCorpo } from '../fit/Corpo'
import { CartaPunteggio } from '../fit/Punteggio'
import { AreaFood } from '../fit/Food'
import { AreaRelax } from '../fit/Relax'
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
import { CHIAVE_ELENCO_PIANI, etichettaPiano, giorniAlTest, giornoTest, LIVELLI, quando, testDaRifare } from './comune'
import { eDiVasca, ETICHETTA_VASCA } from './nuoto'

// Athlon Health System (19/10/2026, era Workout, poi Fit): sotto il titolo la
// ruota Train, Food, Relax (fit/Ruota.tsx), l'Athlon Health Score (fit/Punteggio.tsx: il punteggio da 0 a 100 sui tre
// pilastri, 20/10/2026) e il tuo corpo (fit/Corpo.tsx); poi l'introduzione (cosa si fa e cosa vogliono dire i numeri)
// e il Balance; sotto, le aree da scegliere (tre per i maggiorenni, due per gli altri).
//   - Train: il test dei massimali, il contatore delle calorie, i Consigli Athlon (i tipi di lezione che
//     fanno per te, con le alternative, e se vuoi sala e nuoto: non e' una settimana ne' un piano, vedi
//     `consigli/`; il Percorso a tappe, `percorso/`, e' in standby: `percorso/standby.ts`),
//     le **due origini di un piano** (20/10/2026: «Componi il tuo piano», che si fa insieme con qualche domanda, e «Importa il
//     tuo piano», da una foto o da un file; **i piani consigliati dal club non ci sono piu'**, richiesta del club, e l'AI non
//     e' il titolo di niente: sta nelle postille) e, dopo, farsi seguire da un personal trainer (porta alla prenotazione,
//     /personal); i tuoi piani in fondo, e gli ultimi allenamenti;
//   - Food: la porta del diario dei pasti (fit/Food.tsx);
//   - Relax: il recupero, col sonno che il socio scrive ogni mattina e, dove ci sono, i dati dell'anello
//     Oura o dell'orologio Polar (fit/Relax.tsx). **L'area c'e' per tutti i maggiorenni** (20/10/2026):
//     il sonno a mano non ha bisogno di un dispositivo; i dispositivi sono un modo in piu'.
// L'area scelta sta nell'indirizzo (`?area=food`, `?area=relax`), cosi' tornando indietro dal
// diario o dai dispositivi si ritrova la sua area. L'indirizzo resta /allenamento: e' quello dei link gia' dati.

type Dati = { schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: { usate: number; massimo: number }; test: StatoTest }

/** Il contatore delle calorie: gli allenamenti chiusi e le lezioni con la presenza. */
/**
 * I consigli di Athlon (20/10/2026): il Percorso era una settimana composta e controllata, troppo complessa e con una prenotazione
 * troppo stretta. Adesso la carta porta ai **consigli**: i tipi di lezione che fanno per te, con le alternative, e — se li vuoi —
 * la sala pesi e il nuoto. Non producono un piano da modificare e non sono una settimana: si prenota dal Calendario, una
 * lezione alla volta. Il Percorso a tappe e' in standby (`percorso/standby.ts`): non si vede, e non e' stato tolto niente.
 */
function CartaConsigli() {
  const p = usePalette()
  return (
    <Tocco onPress={() => router.push('/allenamento/consigli')} etichetta="Consigli Athlon: le lezioni che fanno per te, con le alternative" scala={0.985}>
      <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.percorso}>
        <View style={stili.percorsoRiga}>
          <LinearGradient colors={FUOCO} style={stili.agenteIcona}>
            <Icona nome="stella" size={26} colore="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={stili.percorsoTitolo}>Consigli Athlon</Text>
            <Text style={stili.percorsoTesto}>Le lezioni che fanno per te, con le alternative. Se vuoi, anche sala pesi e nuoto.</Text>
          </View>
          <Icona nome="avanti" size={18} colore="rgba(255,255,255,0.6)" />
        </View>
        <Text style={[stili.percorsoNota, { color: p.scuro ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.72)' }]}>
          Non è un programma da rispettare: scegli tu cosa fare e quando, e prenoti dal Calendario come sempre.
        </Text>
      </LinearGradient>
    </Tocco>
  )
}

function CartaCalorie({ riempi = false }: { riempi?: boolean }) {
  const p = usePalette()
  return (
    <Tocco onPress={() => router.push('/allenamento/calorie')} etichetta="Le tue calorie: il contatore di allenamenti e lezioni" scala={0.985} style={riempi ? { flex: 1 } : undefined}>
      <View style={[stili.agente, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }, riempi && { flex: 1 }]}>
        <LinearGradient colors={FUOCO} style={stili.agenteIcona}>
          <Icona nome="fiamma" size={26} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.agenteTitolo, { color: p.testo }]}>Le tue calorie</Text>
          <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>Gli allenamenti che chiudi e le lezioni a cui vieni, giorno per giorno: la settimana, i trend e il confronto.</Text>
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
    ? `L’ultimo è del ${giornoTest(t.ultimo!)}. Rifallo ogni ${Math.round(t.giorni / 7)} settimane: i chili dei piani seguono i tuoi progressi.`
    : fatto
      ? `Fatto il ${giornoTest(t.ultimo!)}: ${t.fatti} di ${t.totale} esercizi. Il prossimo fra ${prossimo} ${prossimo === 1 ? 'giorno' : 'giorni'}.`
      : `${t.totale || 7} esercizi, una quindicina di minuti. Dopo, nei tuoi piani le percentuali diventano i tuoi chili.`
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
export const CHIAVE_SCHEDE = CHIAVE_ELENCO_PIANI

/**
 * «Importa il tuo piano» (20/10/2026): chi ha gia' un piano, del suo trainer o di un'altra palestra, lo fotografa o carica il
 * file e poi lo controlla e lo conferma. Una strada sola: «Scrivilo tu» (partire da zero) sta sotto «Componi il tuo piano».
 */
function CartaImporta({ riempi = false }: { riempi?: boolean }) {
  const p = usePalette()
  return (
    <Carta style={[{ gap: spazio.tre }, riempi && { flex: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <LinearGradient colors={ORTO} style={stili.agenteIcona}>
          <Icona nome="fotocamera" size={26} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.agenteTitolo, { color: p.testo }]}>Importa il tuo piano</Text>
          <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>
            Hai già un piano del tuo trainer o di un’altra palestra? Fotografalo o carica il file, poi controllalo e confermalo.
          </Text>
        </View>
      </View>
      <View style={riempi ? { marginTop: 'auto' } : undefined}>
        <Pulsante testo="Da foto o file" icona="fotocamera" piccolo onPress={() => router.push('/allenamento/importa')} />
      </View>
    </Carta>
  )
}

/**
 * La quarta origine (19/10/2026): farsi seguire da un personal trainer. Non porta a un piano da modificare ma alla
 * prenotazione di una seduta (`/personal`, l'altra faccia di Prenotazioni): e' il trainer a costruire il piano,
 * che poi compare fra i piani «Dal tuo trainer».
 */
function CartaPersonal() {
  const p = usePalette()
  return (
    <Tocco onPress={() => router.push('/personal')} etichetta="Prenota una seduta con un personal trainer" scala={0.985}>
      <View style={[stili.agente, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
        <LinearGradient colors={NOTTE} style={stili.agenteIcona}>
          <Icona nome="persona" size={26} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.agenteTitolo, { color: p.testo }]}>Vuoi essere seguito da un personal trainer?</Text>
          <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>
            Scegli il trainer, il giorno e l’ora e prenota la tua seduta: il piano te lo costruisce lui e lo trovi poi fra i tuoi piani.
          </Text>
        </View>
        <Icona nome="avanti" size={18} colore={p.testoTerzo} />
      </View>
    </Tocco>
  )
}

/**
 * «Componi il tuo piano» (20/10/2026; era «Crealo con l'aiuto dell'AI»): si risponde a qualche domanda e il piano si compone
 * insieme, poi si modifica e si conferma. **L'AI non e' il titolo**: il club vuole che si veda un modo di fare il piano, non
 * uno strumento (il colore e' quello del club, non il viola dell'AI); che dietro ci sia un'intelligenza artificiale lo dice la
 * nota in fondo al questionario e quella sul piano composto. Chi preferisce partire da zero lo scrive a mano (`/allenamento/nuova`).
 */
function CartaComponi({ restano, massimo, riempi = false }: { restano: number; massimo: number; riempi?: boolean }) {
  const p = usePalette()
  return (
    <View style={[stili.agente, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra, flexDirection: 'column', alignItems: 'stretch' }, riempi && { flex: 1 }]}>
      <Tocco onPress={() => router.push('/allenamento/agente')} etichetta="Componi il tuo piano di allenamento" scala={0.985} spento={!restano}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
          <LinearGradient colors={FUOCO} style={stili.agenteIcona}>
            <Icona nome="peso" size={26} colore="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[stili.agenteTitolo, { color: p.testo }]}>Componi il tuo piano</Text>
            <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>
              {restano
                ? `Generiamo insieme il tuo piano, in sala o in vasca: rispondi a qualche domanda e in meno di un minuto hai una prima versione da modificare. Puoi comporne ancora ${restano} questo mese.`
                : `Hai già composto ${massimo} piani negli ultimi trenta giorni: per ora non è possibile comporne altri.`}
            </Text>
          </View>
          {restano ? <Icona nome="avanti" size={18} colore={p.testoTerzo} /> : null}
        </View>
      </Tocco>
      <View style={riempi ? { marginTop: 'auto' } : undefined}>
        <Tocco onPress={() => router.push('/allenamento/nuova')} etichetta="Preferisci partire da zero? Scrivi il piano da solo" scala={0.99}>
          <Text style={[stili.agenteTesto, { color: p.testoSecondario, paddingTop: spazio.due }]}>
            Preferisci partire da zero? <Text style={{ color: p.accento, fontFamily: F.bold }}>Scrivilo tu</Text>
          </Text>
        </Tocco>
      </View>
    </View>
  )
}

function SchedaCarta({ s, indice }: { s: RigaSchedaLab; indice: number }) {
  // Un piano di nuoto (20/10/2026) si legge in vasca: la goccia al posto del peso, «sedute» al posto di «giorni», e niente «non ancora iniziato».
  const vasca = eDiVasca(s)
  // Un piano composto non ha un colore suo (20/10/2026): come ogni piano del socio. Il viola era quello dell'AI.
  const colori = s.tipo === 'personalizzata' ? FUOCO : s.tipo === 'socio' || s.tipo === 'ai' ? ORTO : NOTTE
  return (
    <Entra indice={indice}>
      <Tocco onPress={() => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: s.id } })} etichetta={`Piano ${s.titolo}`} scala={0.985}>
        <LinearGradient colors={colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.scheda}>
          <View style={stili.filigrana} pointerEvents="none">
            <Icona nome={vasca ? 'goccia' : 'peso'} size={120} colore="rgba(255,255,255,0.08)" />
          </View>
          <Tag testo={vasca ? ETICHETTA_VASCA : etichettaPiano(s)} colore="#fff" fondo="rgba(0,0,0,0.18)" />
          <Text style={stili.titolo} numberOfLines={2}>
            {s.titolo}
          </Text>
          <View style={stili.pillole}>
            {s.obiettivo ? <Text style={stili.pillola}>{s.obiettivo}</Text> : null}
            {s.livello ? <Text style={stili.pillola}>{LIVELLI[s.livello] ?? s.livello}</Text> : null}
            <Text style={stili.pillola}>{`${s.giorni} ${vasca ? (s.giorni === 1 ? 'seduta' : 'sedute') : s.giorni === 1 ? 'giorno' : 'giorni'}`}</Text>
          </View>
          <Text style={[stili.ultimo, { color: 'rgba(255,255,255,0.75)' }]}>{vasca ? 'Si legge a bordo vasca' : s.ultimo ? `Ultimo allenamento ${quando(s.ultimo)}` : 'Non ancora iniziato'}</Text>
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
  // La funzione dice che manca il consenso alle misure del corpo (null): la carta invita a darlo.
  const [senzaConsenso, setSenzaConsenso] = useState(() => inMemoria<{ consenso?: unknown }>(CHIAVE_MISURE)?.consenso === null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_SCHEDE, elencoSchede)
    if (r.ok) setDati({ schede: r.schede, ultimi: r.ultimi, ai: r.ai, test: r.test })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
    prendi(CHIAVE_MISURE, elencoMisure).then((r) => {
      if (!r.ok) return
      setMisure(r.misure)
      setSenzaConsenso(r.consenso === null)
    })
  }, [carica])

  const fit = useFit()
  const disp = useDispositivi()
  const conRelax = relaxAperto(disp.stato)
  const { area: parametro } = useLocalSearchParams<{ area?: string }>()
  // Relax solo dove e' aperto; mentre non si sa ancora (stato non arrivato) l'indirizzo vale.
  const area: Area = parametro === 'food' ? 'food' : parametro === 'relax' && (conRelax || (!disp.stato && !disp.vista)) ? 'relax' : 'train'
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
        <CartaPunteggio fit={fit} disp={disp} />
      </Entra>
      <Entra indice={0}>
        <CartaCorpo misure={misure} senzaConsenso={senzaConsenso} />
      </Entra>
      <View style={largo ? stili.fila3 : { gap: spazio.quattro + 4 }}>
        <Entra indice={0} style={largo ? { flex: 1 } : undefined}>
          <IntroFit relax={conRelax} />
        </Entra>
        <Entra indice={1} style={largo ? { flex: 1 } : undefined}>
          <CartaBalance dati={fit} onAttivaFood={area === 'food' ? undefined : () => scegli('food')} />
        </Entra>
      </View>

      <Entra indice={2}>
        <Interruttore area={area} onScegli={scegli} relax={conRelax} />
      </Entra>

      {area === 'food' ? (
        <AreaFood dati={fit} />
      ) : area === 'relax' ? (
        <AreaRelax disp={disp} />
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

/**
 * L'area Train. Sopra, le **due origini** di un piano (20/10/2026, richiesta del club): **comporlo** insieme, con qualche domanda
 * («Generiamo insieme il tuo piano di allenamento»: dietro c'e' l'AI, ma non e' il titolo; si dice nelle postille), oppure
 * **importare** il proprio da una foto o da un file. Poi, a parte, farsi seguire da un personal trainer (va alla prenotazione,
 * non a un piano da modificare). **I piani consigliati dal club non ci sono piu'** in questa schermata (il carosello e' stato
 * tolto): la scheda di un piano del club si apre ancora da un indirizzo gia' dato, ma non si offre.
 * Sotto, **i tuoi piani**: quelli che il socio ha scelto. Qualunque sia l'origine, il piano si modifica e si conferma prima di
 * entrare fra i suoi. Poi gli ultimi allenamenti.
 */
function Train({ dati, largo }: { dati: Dati; largo: boolean }) {
  const p = usePalette()
  const restano = Math.max(0, dati.ai.massimo - dati.ai.usate)
  const mie = dati.schede.filter((s) => s.tipo !== 'standard')
  return (
    <>
      <View style={largo ? stili.fila3 : { gap: spazio.quattro + 4 }}>
        <Entra indice={0} style={largo ? { flex: 1 } : undefined}>
          <CartaTest t={dati.test} riempi={largo} />
        </Entra>
        <Entra indice={1} style={largo ? { flex: 1 } : undefined}>
          <CartaCalorie riempi={largo} />
        </Entra>
      </View>

      <Entra indice={2}>
        <CartaConsigli />
      </Entra>

      <Sezione titolo="Crea il tuo piano di allenamento">
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          Scegli da dove partire: costruiamo il piano insieme, oppure importa quello che hai già. In tutti e due i casi lo guardi, lo modifichi e, quando lo confermi, lo trovi fra i tuoi piani.
        </Text>
        <View style={largo ? stili.fila3 : { gap: spazio.tre }}>
          <Entra indice={1} style={largo ? { flex: 1 } : undefined}>
            <CartaComponi restano={restano} massimo={dati.ai.massimo} riempi={largo} />
          </Entra>
          <Entra indice={2} style={largo ? { flex: 1 } : undefined}>
            <CartaImporta riempi={largo} />
          </Entra>
        </View>

        <Entra indice={3}>
          <CartaPersonal />
        </Entra>
      </Sezione>

      <Sezione titolo="I tuoi piani" conteggio={mie.length || undefined}>
        {mie.length ? (
          <View style={largo ? stili.griglia : { gap: spazio.tre }}>
            {mie.map((s, i) => (
              <View key={s.id} style={largo ? { flexGrow: 1, flexBasis: '45%' } : undefined}>
                <SchedaCarta s={s} indice={i + 2} />
              </View>
            ))}
          </View>
        ) : (
          <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
            <Icona nome="peso" size={32} colore={p.testoTerzo} />
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
              Non hai ancora nessun piano. Parti da una delle strade qui sopra: lo modifichi, lo confermi e lo trovi qui.
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
            <Riga prima icona="cronometro" tono="neutro" titolo="Nessun allenamento registrato" sotto="Apri un piano e premi «Inizia l’allenamento»." />
          )}
        </Carta>
      </Sezione>
    </>
  )
}

type Area = 'train' | 'food' | 'relax'

/** Le aree di Fit, come le schede di una pillola: Train e Food, e Relax dove i dispositivi sono aperti. */
function Interruttore({ area, onScegli, relax }: { area: Area; onScegli: (a: Area) => void; relax: boolean }) {
  const p = usePalette()
  const voci: { id: Area; nome: string; icona: NomeIcona }[] = [
    { id: 'train', nome: 'Train', icona: 'peso' },
    { id: 'food', nome: 'Food', icona: 'piatto' },
    ...(relax ? [{ id: 'relax' as const, nome: 'Relax', icona: 'foglia' as const }] : []),
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
  percorso: { borderRadius: 26, padding: spazio.tre + 2, gap: spazio.tre },
  percorsoRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  percorsoTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 17.5, letterSpacing: -0.3 },
  percorsoTesto: { color: 'rgba(255,255,255,0.88)', fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  percorsoNota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
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
  fila3: { flexDirection: 'row', gap: spazio.tre, alignItems: 'stretch' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.tre },
})
