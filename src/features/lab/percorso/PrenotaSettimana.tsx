import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { prenotaLezione } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'
import type { Alternativa, TappaSettimana } from '@/api/percorso'

import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { dividiLaSettimana, giornoOra, listaDaPrenotare, type Completa, type DaPrenotare, type Scelta, type Voce } from './dividi'

// «Prenota la settimana» (20/10/2026): un riepilogo e **una conferma sola**, poi le lezioni si prenotano una
// dopo l'altra in ordine di tempo. Niente parte da solo: il socio vede cosa sta per prenotare, cosa resta fuori
// e perche', e conferma.
//
// **Cosa entra e cosa no** sta in `dividi.ts` (e si prova li'). In breve: entrano le lezioni che si possono
// prenotare adesso e hanno posti. **Una lezione al completo non va in lista d'attesa da sola**: ha la sua
// sezione, «Al completo», dove il socio sceglie fra la lista d'attesa (come prima, ed e' quella che resta
// scelta se non tocca niente), una **alternativa con posti liberi** (lo stesso tipo di lezione in un altro
// orario, o una simile) o lasciar stare. La conferma e' sempre una sola, con tutto quello che si e' scelto.
//
// Ogni prenotazione e' una chiamata a PerfectGym: se una non riesce le altre vanno avanti, e alla fine si dice
// com'e' andata ognuna. La lista d'attesa e' una prenotazione che il socio ha accettato, e si dice.

type Esito = { voce: DaPrenotare; esito: 'prenotata' | 'attesa' | 'no'; errore?: string }

/** Una riga del riepilogo: la lezione, quando, e — dove serve — una nota o l'esito. */
function Riga({ titolo, quando, nota, icona }: { titolo: string; quando: string; nota?: string; icona?: 'ok' | 'no' | 'clessidra' | null }) {
  const p = usePalette()
  return (
    <View style={stili.riga}>
      {icona ? (
        <Icona nome={icona === 'ok' ? 'ok' : icona === 'no' ? 'no' : 'clessidra'} size={18} colore={icona === 'ok' ? p.ok : icona === 'no' ? p.errore : p.attenzione} />
      ) : (
        <View style={[stili.punto, { backgroundColor: p.testoTerzo }]} />
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.rigaTitolo, { color: p.testo }]}>{titolo}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{quando}</Text>
        {nota ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{nota}</Text> : null}
      </View>
    </View>
  )
}

const titoloVoce = (v: Voce) => (v.alternativa ? v.alternativa.nome : (v.t.lezione?.nome ?? v.d.nome))

/** Una scelta di una lezione al completo: un cerchio pieno se e' quella scelta, e a fianco cosa si fa. */
function Opzione({ attiva, spenta, titolo, nota, onPress }: { attiva: boolean; spenta?: boolean; titolo: string; nota?: string; onPress: () => void }) {
  const p = usePalette()
  return (
    <Tocco
      vibra="scelta"
      onPress={onPress}
      spento={spenta}
      stato={{ selected: attiva, disabled: !!spenta }}
      etichetta={nota ? `${titolo}. ${nota}` : titolo}
      style={[stili.opzione, { backgroundColor: attiva ? p.incavo : 'transparent', borderColor: attiva ? p.accento : p.linea, opacity: spenta ? 0.45 : 1 }]}
    >
      <View style={[stili.cerchio, { borderColor: attiva ? p.accento : p.testoTerzo }]}>{attiva ? <View style={[stili.cerchioPieno, { backgroundColor: p.accento }]} /> : null}</View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.rigaTitolo, { color: p.testo }]}>{titolo}</Text>
        {nota ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{nota}</Text> : null}
      </View>
    </Tocco>
  )
}

const postiDi = (n: number) => t(`${n} ${n === 1 ? 'posto libero' : 'posti liberi'}`, `${n} ${n === 1 ? 'spot available' : 'spots available'}`)

/** Cosa dice una alternativa, in una riga: quando, i posti, e se e' un altro tipo di lezione. */
function descrizione(a: Alternativa, comeLa: string): string {
  return `${giornoOra(a.inizio)} · ${postiDi(a.liberi)}${a.nome !== comeLa ? ` · ${a.tipo === 'simile' ? t('lezione simile', 'similar class') : a.nome}` : ''}`
}

function SezioneComplete({ complete, scelte, onScegli }: { complete: Completa[]; scelte: Record<number, Scelta | undefined>; onScegli: (classId: number, s: Scelta) => void }) {
  const p = usePalette()
  // Un'alternativa che un'altra lezione al completo ha gia' scelto non si puo' scegliere due volte.
  const scelteAlt = (escludi: number) => new Set(Object.entries(scelte).flatMap(([id, s]) => (typeof s === 'number' && Number(id) !== escludi ? [s] : [])))
  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.sezione, { color: p.testo }]}>{t(`Al completo (${complete.length})`, `Full (${complete.length})`)}</Text>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Questa settimana non c’è più posto: scegli cosa fare. Se non tocchi niente ti metto in lista d’attesa.', 'There are no spots left this week: choose what to do. If you don’t pick anything, I’ll put you on the waiting list.')}</Text>
      {complete.map((c) => {
        const scelta = scelte[c.d.class_id] ?? 'attesa'
        const prese = scelteAlt(c.d.class_id)
        return (
          <View key={c.d.class_id} style={{ gap: spazio.due }}>
            <Riga titolo={titoloVoce(c)} quando={giornoOra(c.d.inizio)} nota={c.d.in_attesa > 0 ? t(`${c.d.in_attesa} in lista d’attesa`, `${c.d.in_attesa} on the waiting list`) : undefined} />
            <View style={{ gap: spazio.due, paddingLeft: spazio.tre }}>
              <Opzione attiva={scelta === 'attesa'} titolo={t('Lista d’attesa', 'Waiting list')} nota={t('Se si libera un posto puoi subentrare.', 'If a spot opens up, you can take it.')} onPress={() => onScegli(c.d.class_id, 'attesa')} />
              {c.alternative.map((a) => (
                <Opzione
                  key={a.class_id}
                  attiva={scelta === a.class_id}
                  spenta={prese.has(a.class_id)}
                  titolo={`${a.nome}${a.tipo === 'stessa' ? '' : t(' (simile)', ' (similar)')}`}
                  nota={prese.has(a.class_id) ? t('L’hai già scelta per un’altra lezione.', 'You’ve already chosen it for another class.') : descrizione(a, titoloVoce(c))}
                  onPress={() => onScegli(c.d.class_id, a.class_id)}
                />
              ))}
              {!c.alternative.length ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Non ci sono alternative da prenotare adesso: dalla sua tappa vedi quelle che si aprono più avanti.', 'There are no alternatives to book right now: from its step you can see the ones that open later.')}</Text> : null}
              <Opzione attiva={scelta === 'salta'} titolo={t('Lascia stare', 'Skip it')} nota={t('Non prenoto niente per questa lezione.', 'I won’t book anything for this class.')} onPress={() => onScegli(c.d.class_id, 'salta')} />
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function PrenotaSettimana({
  aperto,
  tappe,
  memberId,
  onChiudi,
  onPrenotata,
}: {
  aperto: boolean
  tappe: TappaSettimana[]
  memberId: number
  onChiudi: () => void
  /** Dopo ogni prenotazione riuscita: la settimana si aggiorna subito. */
  onPrenotata: (classId: number, prenotazione: { booking_id: number; attesa: boolean }) => void
}) {
  const p = usePalette()
  const g = useMemo(() => dividiLaSettimana(tappe), [tappe])
  const [scelte, setScelte] = useState<Record<number, Scelta | undefined>>({})
  const [fase, setFase] = useState<'riepilogo' | 'invio' | 'fine'>('riepilogo')
  const [fatte, setFatte] = useState(0)
  const [esiti, setEsiti] = useState<Esito[]>([])
  // Le voci si congelano all'avvio: durante l'invio la settimana cambia sotto (ogni prenotazione la aggiorna).
  const [inviate, setInviate] = useState<DaPrenotare[]>([])

  const daPrenotare = useMemo(() => listaDaPrenotare(g, scelte), [g, scelte])
  const quante = daPrenotare.length

  async function prenota() {
    const lista = daPrenotare
    setInviate(lista)
    setEsiti([])
    setFatte(0)
    setFase('invio')
    const risultati: Esito[] = []
    for (const voce of lista) {
      const r = await prenotaLezione(voce.classId, memberId)
      if (r.ok) {
        const attesa = r.esito === 'attesa'
        onPrenotata(voce.classId, { booking_id: r.booking_id ?? 0, attesa })
        risultati.push({ voce, esito: attesa ? 'attesa' : 'prenotata' })
      } else {
        // Una non compresa che il percorso non sapeva (la stima dei piani e' una stima): si prenota dalla tappa.
        risultati.push({ voce, esito: 'no', errore: r.prodotto ? t('Non è compresa nel tuo abbonamento: prenotala dalla sua tappa, come lezione singola.', 'It’s not included in your membership: book it from its step, as a single class.') : r.errore })
      }
      setFatte((n) => n + 1)
      setEsiti([...risultati])
    }
    colpetto(risultati.every((x) => x.esito !== 'no') ? 'ok' : 'errore')
    setFase('fine')
  }

  function chiudi() {
    setFase('riepilogo')
    setEsiti([])
    setScelte({})
    onChiudi()
  }

  const sala = tappe.filter((t) => t.tipo === 'sala').length
  const senzaNiente = !g.adesso.length && !g.complete.length && !g.piuAvanti.length && !g.daAcquistare.length && !g.nonInProgramma.length && !g.gia.length

  /** La riga di una prenotazione fatta o da fare: per un'alternativa, quale lezione sostituisce. */
  const rigaDi = (d: DaPrenotare) => ({
    titolo: d.alternativa ? d.alternativa.nome : titoloVoce(d.voce),
    quando: giornoOra(d.alternativa?.inizio ?? d.voce.d.inizio),
    nota: d.alternativa ? t(`Al posto di ${titoloVoce(d.voce)} · ${giornoOra(d.voce.d.inizio)}, che è al completo.`, `Instead of ${titoloVoce(d.voce)} · ${giornoOra(d.voce.d.inizio)}, which is full.`) : undefined,
  })

  return (
    <Foglio
      aperto={aperto}
      titolo={t('Prenota la settimana', 'Book the week')}
      sottotitolo={fase === 'riepilogo' ? t('Guarda cosa stai per prenotare: niente parte finché non confermi.', 'Check what you’re about to book: nothing goes ahead until you confirm.') : fase === 'invio' ? t('Sto prenotando, un attimo…', 'Booking, one moment…') : t('Ecco com’è andata.', 'Here’s how it went.')}
      onChiudi={fase === 'invio' ? () => undefined : chiudi}
    >
      {fase === 'riepilogo' ? (
        <View style={{ gap: spazio.quattro - 2 }}>
          {g.adesso.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{t(`Prenoti adesso (${g.adesso.length})`, `Booking now (${g.adesso.length})`)}</Text>
              {g.adesso.map((v) => (
                <Riga key={v.d.class_id} titolo={titoloVoce(v)} quando={giornoOra(v.d.inizio)} />
              ))}
            </View>
          ) : g.complete.length ? null : (
            <Messaggio tono="attenzione">{t('Non c’è niente da prenotare adesso: guarda qui sotto cosa si apre più avanti.', 'There’s nothing to book right now: see below what opens later.')}</Messaggio>
          )}

          {g.complete.length ? <SezioneComplete complete={g.complete} scelte={scelte} onScegli={(id, s) => setScelte((x) => ({ ...x, [id]: s }))} /> : null}

          {g.piuAvanti.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{t(`Più avanti (${g.piuAvanti.length})`, `Later (${g.piuAvanti.length})`)}</Text>
              {g.piuAvanti.map((v) => (
                <Riga key={v.d.class_id} titolo={titoloVoce(v)} quando={giornoOra(v.d.inizio)} nota={v.perche} icona="clessidra" />
              ))}
            </View>
          ) : null}

          {g.daAcquistare.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{t(`Da acquistare (${g.daAcquistare.length})`, `To purchase (${g.daAcquistare.length})`)}</Text>
              {g.daAcquistare.map((v) => (
                <Riga key={v.d.class_id} titolo={titoloVoce(v)} quando={giornoOra(v.d.inizio)} />
              ))}
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Non sono comprese nel tuo abbonamento: si prenotano una per una dalla loro tappa, pagando la lezione singola.', 'They’re not included in your membership: book them one by one from their step, paying for a single class.')}</Text>
            </View>
          ) : null}

          {g.nonInProgramma.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{t(`Non in programma (${g.nonInProgramma.length})`, `Not scheduled (${g.nonInProgramma.length})`)}</Text>
              {g.nonInProgramma.map((tp) => (
                <View key={`${tp.giorno}-${tp.ordine}`} style={stili.riga}>
                  <View style={[stili.punto, { backgroundColor: p.testoTerzo }]} />
                  <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{t(`${tp.lezione?.nome ?? 'Lezione'}: questa settimana non c’è. Dalla sua tappa vedi le più vicine.`, `${tp.lezione?.nome ?? 'Class'}: not on this week. From its step you can see the nearest ones.`)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {g.gia.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{t(`Già prenotate (${g.gia.length})`, `Already booked (${g.gia.length})`)}</Text>
              {g.gia.map((v) => (
                <Riga
                  key={v.d.class_id}
                  titolo={titoloVoce(v)}
                  quando={giornoOra(v.d.inizio)}
                  icona="ok"
                  nota={v.alternativa ? t(`Al posto di ${v.t.lezione?.nome ?? 'una lezione'}, che è al completo.`, `Instead of ${v.t.lezione?.nome ?? 'a class'}, which is full.`) : v.d.prenotazione?.attesa ? t('In lista d’attesa', 'On the waiting list') : undefined}
                />
              ))}
            </View>
          ) : null}

          {sala ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{t(`La sala (${sala} ${sala === 1 ? 'tappa' : 'tappe'}) si prenota dalla sua tappa: scegli tu se con l’assistente di sala o in allenamento libero.`, `The gym floor (${sala} ${sala === 1 ? 'step' : 'steps'}) is booked from its step: you choose whether with the floor assistant or as a free workout.`)}</Text>
          ) : null}
          {senzaNiente ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{t('Questo percorso non ha lezioni da prenotare.', 'This program has no classes to book.')}</Text> : null}

          <Pulsante testo={quante ? t(`Prenota ${quante} ${quante === 1 ? 'lezione' : 'lezioni'}`, `Book ${quante} ${quante === 1 ? 'class' : 'classes'}`) : t('Niente da prenotare', 'Nothing to book')} icona="avanti" onPress={prenota} disabilitato={!quante} />
        </View>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {fase === 'invio' ? <Text style={[stili.sezione, { color: p.testo }]}>{t(`Prenoto ${Math.min(fatte + 1, inviate.length)} di ${inviate.length}…`, `Booking ${Math.min(fatte + 1, inviate.length)} of ${inviate.length}…`)}</Text> : null}
          {esiti.map((e) => (
            <Riga
              key={e.voce.classId}
              {...rigaDi(e.voce)}
              icona={e.esito === 'no' ? 'no' : 'ok'}
              nota={e.esito === 'prenotata' ? [t('Prenotata', 'Booked'), rigaDi(e.voce).nota].filter(Boolean).join(' · ') : e.esito === 'attesa' ? t('In lista d’attesa', 'On the waiting list') : e.errore}
            />
          ))}
          {fase === 'fine' ? (
            <>
              {esiti.some((e) => e.esito === 'no') ? (
                <Messaggio tono="attenzione">{t('Quelle che non sono andate le trovi nella settimana: riprova dalla loro tappa o guarda il motivo.', 'You’ll find the ones that didn’t go through in the week: try again from their step or check the reason.')}</Messaggio>
              ) : (
                <Messaggio tono="ok">{t('Fatto: la tua settimana è prenotata.', 'Done: your week is booked.')}</Messaggio>
              )}
              <Pulsante testo={t('Chiudi', 'Close')} onPress={chiudi} />
            </>
          ) : null}
        </View>
      )}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  sezione: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  riga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2, paddingVertical: 2 },
  rigaTitolo: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  punto: { width: 7, height: 7, borderRadius: 4, marginTop: 7, marginHorizontal: 5.5 },
  opzione: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2, borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: spazio.tre },
  cerchio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  cerchioPieno: { width: 10, height: 10, borderRadius: 5 },
})
