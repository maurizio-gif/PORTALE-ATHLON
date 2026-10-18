import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { prenotaLezione } from '@/api/lab'
import type { DatiLezione, TappaSettimana } from '@/api/percorso'
import { ora } from '@/lib/eventi'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto } from '../ui/Tocco'

// «Prenota la settimana» (20/10/2026): un riepilogo e **una conferma sola**, poi le lezioni si prenotano una
// dopo l'altra in ordine di tempo. Niente parte da solo: il socio vede cosa sta per prenotare, cosa resta fuori
// e perche', e conferma.
//
// **Cosa entra e cosa no.** Entrano le lezioni che si possono prenotare adesso: ci sono in programma, comprese
// nell'abbonamento, la prenotazione e' aperta, il limite della categoria non e' pieno e non aspetta un'altra
// lezione dello stesso percorso (`dopo`). Restano fuori, ognuna col suo motivo: quelle che si aprono piu'
// avanti, quelle non comprese (si prenotano una per una, pagando la lezione singola: non si addebita niente
// in blocco), quelle che questa settimana non ci sono, e la **sala**, che ha due turni fra cui scegliere
// (con l'assistente di sala o libero) e si prenota dalla sua tappa.
//
// Ogni prenotazione e' una chiamata a PerfectGym: se una non riesce le altre vanno avanti, e alla fine si dice
// com'e' andata ognuna. La lista d'attesa e' una prenotazione che il socio ha accettato, e si dice.

type Voce = { t: TappaSettimana; d: DatiLezione }

type Esito = { voce: Voce; esito: 'prenotata' | 'attesa' | 'no'; errore?: string }

const giornoOra = (iso: string) =>
  `${new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })} · ${ora(iso)}`

/** Le tappe-lezione della settimana, divise per cosa se ne puo' fare adesso. */
export function dividiLaSettimana(tappe: TappaSettimana[]) {
  const adesso: Voce[] = []
  const piuAvanti: (Voce & { perche: string })[] = []
  const daAcquistare: Voce[] = []
  const nonInProgramma: TappaSettimana[] = []
  const gia: Voce[] = []
  for (const t of tappe) {
    if (t.tipo !== 'lezione') continue
    if (t.stato === 'non_c_e' || !t.lezione_vera) {
      nonInProgramma.push(t)
      continue
    }
    const d = t.lezione_vera
    if (d.prenotazione) gia.push({ t, d })
    else if (d.iniziata) continue
    else if (t.lezione?.compresa === false) daAcquistare.push({ t, d })
    else if (d.dopo) piuAvanti.push({ t, d, perche: d.dopo.messaggio })
    else if (d.limite) piuAvanti.push({ t, d, perche: d.limite.messaggio })
    else if (d.prenotabile_dal) piuAvanti.push({ t, d, perche: `Si apre il ${giornoOra(d.prenotabile_dal)}.` })
    else adesso.push({ t, d })
  }
  const cronologico = (a: Voce, b: Voce) => Date.parse(a.d.inizio) - Date.parse(b.d.inizio)
  return { adesso: adesso.sort(cronologico), piuAvanti: piuAvanti.sort(cronologico), daAcquistare: daAcquistare.sort(cronologico), nonInProgramma, gia: gia.sort(cronologico) }
}

/** Una riga del riepilogo: la lezione, quando, e — dove serve — una nota o l'esito. */
function Riga({ v, nota, icona }: { v: Voce; nota?: string; icona?: 'ok' | 'no' | 'clessidra' | null }) {
  const p = usePalette()
  return (
    <View style={stili.riga}>
      {icona ? (
        <Icona nome={icona === 'ok' ? 'ok' : icona === 'no' ? 'no' : 'clessidra'} size={18} colore={icona === 'ok' ? p.ok : icona === 'no' ? p.errore : p.attenzione} />
      ) : (
        <View style={[stili.punto, { backgroundColor: p.testoTerzo }]} />
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.rigaTitolo, { color: p.testo }]}>{v.t.lezione?.nome ?? v.d.nome}</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {giornoOra(v.d.inizio)}
          {v.d.liberi <= 0 ? ' · lista d’attesa' : ''}
        </Text>
        {nota ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{nota}</Text> : null}
      </View>
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
  const [fase, setFase] = useState<'riepilogo' | 'invio' | 'fine'>('riepilogo')
  const [fatte, setFatte] = useState(0)
  const [esiti, setEsiti] = useState<Esito[]>([])
  // Le voci si congelano all'avvio: durante l'invio la settimana cambia sotto (ogni prenotazione la aggiorna).
  const [inviate, setInviate] = useState<Voce[]>([])

  async function prenota() {
    const lista = g.adesso
    setInviate(lista)
    setEsiti([])
    setFatte(0)
    setFase('invio')
    const risultati: Esito[] = []
    for (const voce of lista) {
      const r = await prenotaLezione(voce.d.class_id, memberId)
      if (r.ok) {
        const attesa = r.esito === 'attesa'
        onPrenotata(voce.d.class_id, { booking_id: r.booking_id ?? 0, attesa })
        risultati.push({ voce, esito: attesa ? 'attesa' : 'prenotata' })
      } else {
        // Una non compresa che il percorso non sapeva (la stima dei piani e' una stima): si prenota dalla tappa.
        risultati.push({ voce, esito: 'no', errore: r.prodotto ? 'Non è compresa nel tuo abbonamento: prenotala dalla sua tappa, come lezione singola.' : r.errore })
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
    onChiudi()
  }

  const sala = tappe.filter((t) => t.tipo === 'sala').length
  const senzaNiente = !g.adesso.length && !g.piuAvanti.length && !g.daAcquistare.length && !g.nonInProgramma.length && !g.gia.length

  return (
    <Foglio
      aperto={aperto}
      titolo="Prenota la settimana"
      sottotitolo={fase === 'riepilogo' ? 'Guarda cosa stai per prenotare: niente parte finché non confermi.' : fase === 'invio' ? 'Sto prenotando, un attimo…' : 'Ecco com’è andata.'}
      onChiudi={fase === 'invio' ? () => undefined : chiudi}
    >
      {fase === 'riepilogo' ? (
        <View style={{ gap: spazio.quattro - 2 }}>
          {g.adesso.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{`Prenoti adesso (${g.adesso.length})`}</Text>
              {g.adesso.map((v) => (
                <Riga key={v.d.class_id} v={v} />
              ))}
              {g.adesso.some((v) => v.d.liberi <= 0) ? <Text style={[stili.nota, { color: p.testoSecondario }]}>Dove la lezione è completa ti metto in lista d’attesa: se si libera un posto puoi subentrare.</Text> : null}
            </View>
          ) : (
            <Messaggio tono="attenzione">Non c’è niente da prenotare adesso: guarda qui sotto cosa si apre più avanti.</Messaggio>
          )}

          {g.piuAvanti.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{`Più avanti (${g.piuAvanti.length})`}</Text>
              {g.piuAvanti.map((v) => (
                <Riga key={v.d.class_id} v={v} nota={v.perche} icona="clessidra" />
              ))}
            </View>
          ) : null}

          {g.daAcquistare.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{`Da acquistare (${g.daAcquistare.length})`}</Text>
              {g.daAcquistare.map((v) => (
                <Riga key={v.d.class_id} v={v} />
              ))}
              <Text style={[stili.nota, { color: p.testoSecondario }]}>Non sono comprese nel tuo abbonamento: si prenotano una per una dalla loro tappa, pagando la lezione singola.</Text>
            </View>
          ) : null}

          {g.nonInProgramma.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{`Non in programma (${g.nonInProgramma.length})`}</Text>
              {g.nonInProgramma.map((t) => (
                <View key={`${t.giorno}-${t.ordine}`} style={stili.riga}>
                  <View style={[stili.punto, { backgroundColor: p.testoTerzo }]} />
                  <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{`${t.lezione?.nome ?? 'Lezione'}: questa settimana non c’è. Dalla sua tappa vedi le più vicine.`}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {g.gia.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sezione, { color: p.testo }]}>{`Già prenotate (${g.gia.length})`}</Text>
              {g.gia.map((v) => (
                <Riga key={v.d.class_id} v={v} icona="ok" nota={v.d.prenotazione?.attesa ? 'In lista d’attesa' : undefined} />
              ))}
            </View>
          ) : null}

          {sala ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{`La sala (${sala} ${sala === 1 ? 'tappa' : 'tappe'}) si prenota dalla sua tappa: scegli tu se con l’assistente di sala o in allenamento libero.`}</Text>
          ) : null}
          {senzaNiente ? <Text style={[stili.nota, { color: p.testoSecondario }]}>Questo percorso non ha lezioni da prenotare.</Text> : null}

          <Pulsante testo={g.adesso.length ? `Prenota ${g.adesso.length} ${g.adesso.length === 1 ? 'lezione' : 'lezioni'}` : 'Niente da prenotare'} icona="avanti" onPress={prenota} disabilitato={!g.adesso.length} />
        </View>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {fase === 'invio' ? <Text style={[stili.sezione, { color: p.testo }]}>{`Prenoto ${Math.min(fatte + 1, inviate.length)} di ${inviate.length}…`}</Text> : null}
          {esiti.map((e) => (
            <Riga
              key={e.voce.d.class_id}
              v={e.voce}
              icona={e.esito === 'no' ? 'no' : 'ok'}
              nota={e.esito === 'prenotata' ? 'Prenotata' : e.esito === 'attesa' ? 'In lista d’attesa' : e.errore}
            />
          ))}
          {fase === 'fine' ? (
            <>
              {esiti.some((e) => e.esito === 'no') ? (
                <Messaggio tono="attenzione">Quelle che non sono andate le trovi nella settimana: riprova dalla loro tappa o guarda il motivo.</Messaggio>
              ) : (
                <Messaggio tono="ok">Fatto: la tua settimana è prenotata.</Messaggio>
              )}
              <Pulsante testo="Chiudi" onPress={chiudi} />
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
})
