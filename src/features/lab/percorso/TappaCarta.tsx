import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { Lezione, SchedaLezione } from '@/api/lab'
import type { DatiLezione, FasciaSala, SlotSala, TappaSettimana } from '@/api/percorso'
import { ora } from '@/lib/eventi'
import { spazio } from '@/theme'

import { AzioniLezione } from '../Calendario'
import { Bollino, Carta, Etichetta, Messaggio, Pulsante } from '../ui/kit'
import { coloreTono, F, usePalette, type ToniTutti } from '../ui/tema'
import type { usePrenotazioneLezione } from '../usePrenotazioneLezione'
import { ETICHETTA_TIPO, fasciaOraria, titoloTappa } from './comune'

// Una tappa del Percorso Athlon nella settimana vera (20/10/2026): cosa si fa, quando, e — per una lezione —
// la prenotazione, con gli stessi pulsanti del Calendario (`AzioniLezione`: prenota, lista d'attesa, disdici,
// acquista se non e' compresa, i motivi per cui non si puo'). **Il Percorso non prenota da solo**: ogni
// prenotazione e' un tocco del socio, dalla tappa o da «Prenota la settimana».
//
// Le tre cose che puo' succedere a una lezione sono dette tutte e tre (vedi `risolviSettimana` nella funzione):
// c'e' e si prenota; questa settimana non c'e' (il palinsesto e' cambiato) e si propongono le piu' vicine; c'e'
// ma il limite della categoria e' pieno per colpa di un'altra lezione dello stesso percorso («prenotabile dopo
// la lezione di martedi'»: non e' un rifiuto, e' un ordine).
//
// La **sala** non e' una lezione sola: la Gym Floor e' un turno ogni mezz'ora, e si mostrano i due piu' vicini
// all'ora della tappa, uno con l'assistente di sala e uno di allenamento libero. Sceglie il socio. L'orario di
// ogni turno e' quello vero: non si scrive mai a mano.

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
  scheda,
  vista,
  azioni,
  onScheda,
}: {
  t: TappaSettimana
  /** Le tappe dello stesso giorno, per dire «prima della lezione delle 18:30». */
  delGiorno: TappaSettimana[]
  /** La scheda del sito della lezione della tappa (barre, descrizione): per il pulsante «Dettagli». */
  scheda: SchedaLezione | null
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

      {t.tipo === 'lezione' ? <TappaLezione t={t} scheda={scheda} vista={vista} azioni={azioni} onScheda={onScheda} /> : null}
      {t.tipo === 'sala' ? <TappaSala t={t} vista={vista} azioni={azioni} onScheda={onScheda} /> : null}
    </Carta>
  )
}

function TappaLezione({ t, scheda, vista, azioni, onScheda }: { t: TappaSettimana; scheda: SchedaLezione | null; vista: boolean; azioni: AzioniPrenotazione; onScheda: (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void }) {
  const p = usePalette()
  const categoria = t.lezione?.categoria ?? ''
  const chiave = t.lezione?.scheda ?? null
  if (t.stato === 'non_c_e') {
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio tono="attenzione" titolo="Questa settimana non c’è">
          Il palinsesto è cambiato: la lezione di questo giorno e di quest’ora non è in programma.{t.alternative?.length ? ' Le più vicine dello stesso tipo:' : ' Non ce ne sono altre dello stesso tipo questa settimana.'}
        </Messaggio>
        {(t.alternative ?? []).map((a) => (
          <View key={a.class_id} style={[stili.slot, { backgroundColor: p.incavo }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[stili.slotOra, { color: p.testo }]}>{giornoOra(a.inizio)}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{postiDi(a)}</Text>
            </View>
            <Prenotazione d={a} categoria={categoria} scheda={chiave} schedaSito={scheda} vista={vista} azioni={azioni} onScheda={onScheda} />
          </View>
        ))}
      </View>
    )
  }
  const v = t.lezione_vera
  if (!v) return null
  return (
    <View style={{ gap: spazio.due }}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{[v.istruttore, v.iniziata ? 'Già iniziata' : postiDi(v)].filter(Boolean).join(' · ')}</Text>
      <Prenotazione d={v} categoria={categoria} scheda={chiave} schedaSito={scheda} vista={vista} azioni={azioni} onScheda={onScheda} />
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
  slotOra: { fontFamily: F.bold, fontSize: 14.5 },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
