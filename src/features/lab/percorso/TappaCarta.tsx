import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { Lezione, SchedaLezione } from '@/api/lab'
import type { Alternativa, DatiLezione, FasciaSala, SlotSala, TappaSettimana } from '@/api/percorso'
import { ora } from '@/lib/eventi'
import { spazio } from '@/theme'

import { AzioniLezione } from '../Calendario'
import { COSA_FAI_IN_VASCA, inMetri } from '../schede/nuoto'
import { Icona } from '../ui/Icona'
import { Bollino, Carta, Etichetta, Messaggio, Pulsante } from '../ui/kit'
import { coloreTono, F, usePalette, type ToniTutti } from '../ui/tema'
import type { usePrenotazioneLezione } from '../usePrenotazioneLezione'
import { ETICHETTA_TIPO, fasciaOraria, titoloTappa } from './comune'

// Una tappa del Percorso Athlon nella settimana vera (20/10/2026): cosa si fa, quando, e — per una lezione —
// la prenotazione, con gli stessi pulsanti del Calendario (`AzioniLezione`: prenota, lista d'attesa, disdici,
// acquista se non e' compresa, i motivi per cui non si puo'). **Il Percorso non prenota da solo**: ogni
// prenotazione e' un tocco del socio, dalla tappa o da «Prenota la settimana».
//
// Le cose che possono succedere a una lezione sono dette tutte (vedi `risolviSettimana` nella funzione):
// c'e' e si prenota; **c'e' ma e' al completo** (lista d'attesa, e le alternative con posti liberi: lo stesso
// tipo di lezione in un altro orario, poi le simili); questa settimana non c'e' (il palinsesto e' cambiato) e
// si propongono le piu' vicine; c'e' ma il limite della categoria e' pieno per colpa di un'altra lezione dello
// stesso percorso («prenotabile dopo la lezione di martedi'»: non e' un rifiuto, e' un ordine).
//
// La **sala** non e' una lezione sola: la Gym Floor e' un turno ogni mezz'ora, e si mostrano i due piu' vicini
// all'ora della tappa, uno con l'assistente di sala e uno di allenamento libero. Sceglie il socio. L'orario di
// ogni turno e' quello vero: non si scrive mai a mano.
//
// Un turno di **Nuoto Libero** puo' aprire il suo giorno del **piano di nuoto** (`t.piano`, 20/10/2026): «cosa fai in
// vasca oggi», con la seduta e i suoi metri. Il piano si legge e non si registra: c'e' «Apri il piano» e basta, niente «Inizia».

export type AzioniPrenotazione = ReturnType<typeof usePrenotazioneLezione>

const TONO_TIPO: Record<TappaSettimana['tipo'], ToniTutti> = { lezione: 'accento', sala: 'blu', cardio: 'ok' }
const ICONA_TIPO = { lezione: 'calendario', sala: 'peso', cardio: 'cronometro' } as const

const FASCIA_SALA: Record<NonNullable<FasciaSala>, string> = { con_assistenza: 'Con assistente di sala', libero: 'Allenamento libero' }

/** Una lezione nella forma che si aspettano i pulsanti del Calendario. */
function comeLezione(d: DatiLezione, categoria: string, scheda: string | null): Lezione {
  return {
    class_id: d.class_id,
    inizio: d.inizio,
    fine: d.fine,
    nome: d.nome,
    categoria,
    istruttore: d.istruttore,
    posti: d.posti,
    iscritti: Math.max(0, d.posti - d.liberi),
    liberi: d.liberi,
    in_attesa: d.in_attesa,
    iniziata: d.iniziata,
    prenotabile_dal: d.prenotabile_dal,
    prenotazione: d.prenotazione,
    limite: d.limite,
    scheda,
  }
}

const giornoOra = (iso: string) =>
  `${new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })} · ${ora(iso)}`

function postiDi(d: DatiLezione): string {
  if (d.liberi > 0) return `${d.liberi} ${d.liberi === 1 ? 'posto libero' : 'posti liberi'}`
  return d.in_attesa > 0 ? `Completa · ${d.in_attesa} in attesa` : 'Completa · lista d’attesa'
}

/** I pulsanti di una lezione, o il perche' non si prenota ancora. */
function Prenotazione({
  d,
  categoria,
  scheda,
  schedaSito,
  vista,
  azioni,
  onScheda,
  testoPrenota,
}: {
  d: DatiLezione
  categoria: string
  scheda: string | null
  schedaSito: SchedaLezione | null
  vista: boolean
  azioni: AzioniPrenotazione
  onScheda: (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void
  testoPrenota?: string
}) {
  const l = comeLezione(d, categoria, scheda)
  if (vista) return null
  // Il limite si libera con un'altra lezione di questo stesso percorso: e' l'ordine in cui si prenota, non un rifiuto.
  if (!d.prenotazione && !d.iniziata && d.dopo) return <Messaggio tono="attenzione">{d.dopo.messaggio}</Messaggio>
  return (
    <AzioniLezione
      l={l}
      scheda={schedaSito}
      onScheda={() => schedaSito && onScheda({ nome: d.nome, categoria, scheda: schedaSito })}
      occupato={azioni.occupato}
      onPrenota={() => azioni.prenota(d.class_id)}
      onAcquista={(url) => azioni.acquista(d.class_id, url)}
      onPagaCarta={azioni.pagaCarta}
      onDisdici={() => azioni.disdici(d.class_id, !!d.prenotazione?.attesa)}
      testoPrenota={testoPrenota}
    />
  )
}

export function TappaCarta({
  t,
  delGiorno,
  schede,
  vista,
  azioni,
  onScheda,
}: {
  t: TappaSettimana
  /** Le tappe dello stesso giorno, per dire «prima della lezione delle 18:30». */
  delGiorno: TappaSettimana[]
  /** Le schede del sito (barre, descrizione, video) per chiave: della lezione della tappa e delle sue alternative, per il pulsante «Dettagli». */
  schede: Record<string, SchedaLezione>
  /** La vista cliente dello staff: si guarda e basta, non si prenota. */
  vista: boolean
  azioni: AzioniPrenotazione
  onScheda: (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void
}) {
  const p = usePalette()
  const colore = coloreTono(p, TONO_TIPO[t.tipo])
  const ancora = t.ancora != null ? delGiorno.find((x) => x.ordine === t.ancora) : null
  const prima = t.posizione === 'prima' ? 'prima' : t.posizione === 'dopo' ? 'dopo' : null

  return (
    <Carta piatta style={[stili.carta, { borderLeftColor: colore }]}>
      <View style={stili.testa}>
        <Bollino icona={ICONA_TIPO[t.tipo]} tono={TONO_TIPO[t.tipo]} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.quando, { color: p.testoSecondario }]}>{`${fasciaOraria(t.ora, t.minuti)} · ${ETICHETTA_TIPO[t.tipo]}`}</Text>
          <Text style={[stili.titolo, { color: p.testo }]}>{titoloTappa(t)}</Text>
        </View>
        {t.tipo === 'lezione' && t.lezione?.compresa === false ? <Etichetta testo="Da acquistare" tono="attenzione" /> : null}
        {t.lezione_vera?.prenotazione ? <Etichetta testo={t.lezione_vera.prenotazione.attesa ? 'In attesa' : 'Prenotata'} tono="ok" icona="spunta" /> : null}
      </View>

      {t.tipo === 'cardio' && ancora && prima ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${prima === 'prima' ? 'Prima' : 'Dopo'} di ${titoloTappa(ancora)}${ancora.ora ? ` (${ancora.ora})` : ''}.`}</Text>
      ) : null}
      {t.perche ? <Text style={[stili.perche, { color: p.testoSecondario }]}>{t.perche}</Text> : null}

      {t.tipo === 'lezione' && t.piano ? <TappaVasca piano={t.piano} /> : null}
      {t.tipo === 'lezione' ? <TappaLezione t={t} schede={schede} vista={vista} azioni={azioni} onScheda={onScheda} /> : null}
      {t.tipo === 'sala' ? <TappaSala t={t} vista={vista} azioni={azioni} onScheda={onScheda} /> : null}
    </Carta>
  )
}

/** Le alternative a una lezione al completo o assente: ognuna con i suoi posti e i suoi pulsanti. Le stesse lezioni prima, poi le simili. */
function ElencoAlternative({
  elenco,
  categoriaTappa,
  schede,
  vista,
  azioni,
  onScheda,
}: {
  elenco: Alternativa[]
  categoriaTappa: string
  schede: Record<string, SchedaLezione>
  vista: boolean
  azioni: AzioniPrenotazione
  onScheda: (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void
}) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      {elenco.map((a) => (
        <View key={a.class_id} style={[stili.slot, { backgroundColor: p.incavo }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[stili.slotOra, { color: p.testo }]}>{giornoOra(a.inizio)}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{a.tipo === 'simile' ? `${a.nome} · lezione simile` : a.nome}</Text>
            </View>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{postiDi(a)}</Text>
          </View>
          {a.compresa === false || (a.compresa === null && a.categoria !== categoriaTappa) ? (
            <Etichetta testo={a.compresa === false ? 'Da acquistare' : 'Verifica alla prenotazione'} tono="attenzione" />
          ) : null}
          <Prenotazione d={a} categoria={a.categoria} scheda={a.scheda} schedaSito={a.scheda ? (schede[a.scheda] ?? null) : null} vista={vista} azioni={azioni} onScheda={onScheda} />
        </View>
      ))}
    </View>
  )
}

function TappaLezione({ t, schede, vista, azioni, onScheda }: { t: TappaSettimana; schede: Record<string, SchedaLezione>; vista: boolean; azioni: AzioniPrenotazione; onScheda: (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void }) {
  const p = usePalette()
  const categoria = t.lezione?.categoria ?? ''
  const chiave = t.lezione?.scheda ?? null
  const scheda = chiave ? (schede[chiave] ?? null) : null
  const alternative = t.alternative ?? []
  if (t.stato === 'non_c_e') {
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio tono="attenzione" titolo="Questa settimana non c’è">
          Il palinsesto è cambiato: la lezione di questo giorno e di quest’ora non è in programma.{alternative.length ? ' Le più vicine, prima quelle con posti liberi:' : ' Non ce ne sono altre dello stesso tipo questa settimana.'}
        </Messaggio>
        <ElencoAlternative elenco={alternative} categoriaTappa={categoria} schede={schede} vista={vista} azioni={azioni} onScheda={onScheda} />
      </View>
    )
  }
  const v = t.lezione_vera
  if (!v) return null
  // Al completo: senza posti, il socio non c'e' dentro, e non e' gia' cominciata. La lista d'attesa resta (e' il pulsante
  // di `Prenotazione`), e si offrono delle alternative con posti liberi.
  // Se il limite della categoria blocca anche la lista d'attesa (conta come una prenotazione), il motivo e' quello, e viene prima.
  const completa = v.liberi <= 0 && !v.prenotazione && !v.iniziata && !v.dopo && !v.limite && !v.prenotabile_dal
  // Se il socio ha gia' preso un'alternativa, la lezione al completo non gli serve piu': lo si dice, e la lista d'attesa non si offre.
  const presa = completa ? alternative.find((a) => a.prenotazione && !a.prenotazione.attesa) : undefined
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{[v.istruttore, v.iniziata ? 'Già iniziata' : postiDi(v)].filter(Boolean).join(' · ')}</Text>
      {presa ? (
        <Messaggio tono="ok" titolo="Hai prenotato un’alternativa">
          {`${presa.tipo === 'simile' ? `${presa.nome}, ` : ''}${giornoOra(presa.inizio)}: al posto di questa lezione, che è al completo.`}
        </Messaggio>
      ) : null}
      {completa && !vista && !presa ? (
        <Messaggio tono="attenzione" titolo="Questa settimana è al completo">
          {`Non c’è più posto${v.in_attesa > 0 ? ` e ${v.in_attesa} ${v.in_attesa === 1 ? 'persona aspetta' : 'persone aspettano'} già in lista d’attesa` : ''}. Puoi metterti in lista d’attesa, oppure ${alternative.length ? 'scegliere un’alternativa con posti liberi qui sotto.' : 'guardare cosa si apre più avanti: per questa settimana non ci sono alternative con posti liberi.'}`}
        </Messaggio>
      ) : null}
      {presa ? null : <Prenotazione d={v} categoria={categoria} scheda={chiave} schedaSito={scheda} vista={vista} azioni={azioni} onScheda={onScheda} />}
      {completa && alternative.length ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.sottoTitolo, { color: p.testo }]}>{presa ? 'Alternative' : alternative.some((a) => a.tipo === 'stessa') ? 'Con posti liberi' : 'Con posti liberi, lezioni simili'}</Text>
          <ElencoAlternative elenco={alternative} categoriaTappa={categoria} schede={schede} vista={vista} azioni={azioni} onScheda={onScheda} />
        </View>
      ) : null}
    </View>
  )
}

/** Cosa si fa in vasca in questo turno: la seduta del piano di nuoto, coi metri, e il modo di aprirla. */
function TappaVasca({ piano }: { piano: NonNullable<TappaSettimana['piano']> }) {
  const p = usePalette()
  if (piano.disponibile === false || !piano.scheda_id) {
    return <Messaggio tono="attenzione">Il piano di nuoto di questa tappa non c’è più: puoi chiederne uno nuovo dai piani di allenamento.</Messaggio>
  }
  return (
    <View style={[stili.vasca, { backgroundColor: p.incavo }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icona nome="goccia" size={16} colore={p.blu} />
        <Text style={[stili.sottoTitolo, { color: p.testo, flex: 1 }]}>{COSA_FAI_IN_VASCA}</Text>
      </View>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${piano.giorno_nome ?? 'Una seduta'}${piano.metri ? ` · ${inMetri(piano.metri)}` : ''} · ${piano.scheda_titolo}`}</Text>
      <View style={stili.azioni}>
        <Pulsante
          testo="Apri il piano"
          variante="contorno"
          piccolo
          onPress={() => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: piano.scheda_id!, giorno: String(piano.giorno_posizione) } })}
        />
      </View>
    </View>
  )
}

function TappaSala({ t, vista, azioni, onScheda }: { t: TappaSettimana; vista: boolean; azioni: AzioniPrenotazione; onScheda: (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void }) {
  const p = usePalette()
  const s = t.sala
  if (!s) return null
  return (
    <View style={{ gap: spazio.tre }}>
      {s.disponibile === false ? (
        <Messaggio tono="attenzione">Il piano di allenamento di questa tappa non c’è più: scegline un altro dal percorso.</Messaggio>
      ) : (
        <>
          {s.esercizi != null ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${s.esercizi} ${s.esercizi === 1 ? 'esercizio' : 'esercizi'}`}</Text> : null}
          <View style={stili.azioni}>
            <Pulsante
              testo="Apri il piano"
              variante="contorno"
              piccolo
              onPress={() => router.push({ pathname: '/allenamento/[scheda]', params: { scheda: s.scheda_id, giorno: String(s.giorno_posizione) } })}
            />
            {!vista && s.giorno_id ? (
              <Pulsante testo="Inizia" icona="avanti" piccolo onPress={() => router.push({ pathname: '/allenamento/[scheda]/[giorno]', params: { scheda: s.scheda_id, giorno: s.giorno_id! } })} />
            ) : null}
          </View>
        </>
      )}

      <View style={{ gap: spazio.due }}>
        <Text style={[stili.sottoTitolo, { color: p.testo }]}>Prenota la sala</Text>
        {t.sala_slot?.length ? (
          t.sala_slot.map((d: SlotSala) => (
            <View key={d.class_id} style={[stili.slot, { backgroundColor: p.incavo }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[stili.slotOra, { color: p.testo }]}>{`${ora(d.inizio)} · ${d.fascia ? FASCIA_SALA[d.fascia] : 'Turno in sala'}`}</Text>
                <Text style={[stili.nota, { color: p.testoSecondario }]}>{postiDi(d)}</Text>
              </View>
              <Prenotazione d={d} categoria="Gym Floor" scheda={null} schedaSito={null} vista={vista} azioni={azioni} onScheda={onScheda} testoPrenota={ora(d.inizio)} />
            </View>
          ))
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>Per questo giorno non ci sono turni di sala da prenotare.</Text>
        )}
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>
          Con l’assistente di sala c’è chi supervisiona le attività in sala e risponde ai tuoi dubbi; in allenamento libero ti alleni per conto tuo. L’orario è quello del turno.
        </Text>
      </View>
    </View>
  )
}

const stili = StyleSheet.create({
  carta: { gap: spazio.due + 2, borderLeftWidth: 4, padding: spazio.tre + 2 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  quando: { fontFamily: F.semi, fontSize: 12.5 },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  perche: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19, fontStyle: 'italic' },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  sottoTitolo: { fontFamily: F.bold, fontSize: 15 },
  slot: { borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  vasca: { borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  slotOra: { fontFamily: F.bold, fontSize: 14.5 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
