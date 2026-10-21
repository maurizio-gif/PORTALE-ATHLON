import { useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { SchedaLezione } from '@/api/lab'
import type { FasciaSala, LezioneConsiglio } from '@/api/percorso'
import { t as tr, tv } from '@/lib/lingua'
import { spazio } from '@/theme'

import { AzioniLezione } from '../Calendario'
import { comeLezione, FASCIA_SALA, giornoOra, postiDi } from '../percorso/TappaCarta'
import { Etichetta, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import type { usePrenotazioneLezione } from '../usePrenotazioneLezione'

// Le lezioni vere dei Consigli di Athlon (20/10/2026): una riga per lezione, con i posti e **gli stessi pulsanti del
// Calendario** (`AzioniLezione`: prenota, lista d'attesa, disdici, acquista se non e' compresa, i motivi per cui non si
// puo'). I consigli non prenotano niente da soli e non hanno limiti propri: vale la regola di sempre della categoria
// (tre Corsi Fitness, un Group Reformer alla volta…), che il Calendario dice con le sue parole. **Nella vista cliente dello
// staff i consigli non si aprono** (la funzione risponde 403): qui non serve nessun caso a parte.

export type AzioniPrenotazione = ReturnType<typeof usePrenotazioneLezione>
export type ApriScheda = (l: { nome: string; categoria: string; scheda: SchedaLezione }) => void

/** Una lezione: quando, i posti, se e' gia' prenotata o da acquistare, e i pulsanti. */
export function RigaLezione({
  l,
  schede,
  azioni,
  onScheda,
  fascia,
  testoPrenota,
}: {
  l: LezioneConsiglio
  schede: Record<string, SchedaLezione>
  azioni: AzioniPrenotazione
  onScheda: ApriScheda
  /** Solo per la Gym Floor: con l'assistente di sala o allenamento libero, dal nome dell'istruttore. */
  fascia?: FasciaSala
  testoPrenota?: string
}) {
  const p = usePalette()
  const schedaSito = l.scheda ? (schede[l.scheda] ?? null) : null
  const lezione = comeLezione(l, l.categoria, l.scheda)
  return (
    <View style={[stili.riga, { backgroundColor: p.incavo }]}>
      <View style={stili.testa}>
        <View style={{ flexShrink: 0, gap: 1 }}>
          <Text style={[stili.quando, { color: p.testo }]}>{giornoOra(l.inizio)}</Text>
          {fascia ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{FASCIA_SALA[fascia]}</Text> : null}
        </View>
        <Text style={[stili.nota, { color: p.testoSecondario, flex: 1, textAlign: 'right' }]}>{l.iniziata ? tr('Già iniziata', 'Already started') : postiDi(l)}</Text>
      </View>
      {l.prenotazione || l.compresa === false ? (
        <View style={stili.etichette}>
          {l.prenotazione ? <Etichetta testo={l.prenotazione.attesa ? tr('In lista d’attesa', 'On the waiting list') : tr('Prenotata', 'Booked')} tono="ok" icona="spunta" /> : null}
          {l.compresa === false && !l.prenotazione ? <Etichetta testo={tr('Da acquistare', 'To purchase')} tono="attenzione" /> : null}
        </View>
      ) : null}
      <AzioniLezione
        l={lezione}
        scheda={schedaSito}
        onScheda={() => schedaSito && onScheda({ nome: l.nome, categoria: l.categoria, scheda: schedaSito })}
        occupato={azioni.occupato}
        onPrenota={() => azioni.prenota(l.class_id)}
        onAcquista={(url) => azioni.acquista(l.class_id, url)}
        onPagaCarta={azioni.pagaCarta}
        onDisdici={() => azioni.disdici(l.class_id, !!l.prenotazione?.attesa)}
        testoPrenota={testoPrenota}
      />
    </View>
  )
}

/**
 * Le prime `visibili` voci e, se ce ne sono altre, un tocco per vederle: un consiglio con quattro lezioni sotto allunga la
 * pagina piu' di quanto serva a scegliere. `nome` e' quel che si mostra (lezioni, giorni).
 */
export function ConAltre({ voci, visibili, nome }: { voci: ReactNode[]; visibili: number; nome: [string, string] }) {
  const [tutte, setTutte] = useState(false)
  const resto = voci.length - visibili
  return (
    <>
      {tutte || resto <= 0 ? voci : voci.slice(0, visibili)}
      {resto > 0 && !tutte ? <Pulsante testo={tr(`Mostra ${resto === 1 ? `un’altra ${nome[0]}` : `altre ${resto} ${nome[1]}`}`, `Show ${resto === 1 ? `one more ${nome[0]}` : `${resto} more ${nome[1]}`}`)} variante="fantasma" piccolo onPress={() => setTutte(true)} /> : null}
    </>
  )
}

/** Un elenco di lezioni, o la frase che dice che per ora non ce ne sono. Dopo le prime due, le altre si aprono con un tocco. */
export function ElencoLezioni({
  lezioni,
  vuoto,
  ...resto
}: {
  lezioni: LezioneConsiglio[]
  vuoto: string
  schede: Record<string, SchedaLezione>
  azioni: AzioniPrenotazione
  onScheda: ApriScheda
}) {
  const p = usePalette()
  if (!lezioni.length) return <Text style={[stili.nota, { color: p.testoSecondario }]}>{vuoto}</Text>
  return (
    <View style={{ gap: spazio.due }}>
      <ConAltre visibili={2} nome={tv<[string, string]>(['lezione', 'lezioni'], ['class', 'classes'])} voci={lezioni.map((l) => <RigaLezione key={l.class_id} l={l} {...resto} />)} />
    </View>
  )
}

const stili = StyleSheet.create({
  riga: { borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  testa: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  quando: { fontFamily: F.bold, fontSize: 14.5 },
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
