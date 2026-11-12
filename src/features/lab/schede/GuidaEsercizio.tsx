import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { EsercizioScheda } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { F, raggio, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'

// «Come si fa» e «Da evitare» di un esercizio: i passaggi dell'esecuzione e gli errori piu' comuni (libreria MoveKit).
// Stanno in un posto solo e li usano due schermate:
//
// - **la scheda dell'esercizio** (`FoglioEsercizio` in `Scheda.tsx`, dentro il piano): le due sezioni una sotto l'altra (`SezioniGuida`);
// - **la seduta** (`Seduta.tsx`, 12/11/2026, segnalazione di un'utente: «dopo aver avviato l'allenamento non si vedono piu'»): una riga alta 44
//   chiusa di partenza, «Come si fa · Da evitare», che si apre sul posto con due schede (`GuidaEsercizio`). Chiusa non toglie spazio alle serie.
//
// Non chiedono niente al server: i testi sono gia' nell'`EsercizioScheda` che la schermata ha in mano. Se un esercizio non ha ne' l'uno ne' l'altro
// (uno scritto a mano dal trainer) la riga non compare. Le parole sono le stesse in tutti e due i posti.

/** I passaggi e gli errori di un esercizio, senza le righe vuote. */
export function righeGuida(e: Pick<EsercizioScheda, 'istruzioni' | 'errori_comuni'>): { passi: string[]; errori: string[] } {
  return { passi: (e.istruzioni ?? []).filter(Boolean), errori: (e.errori_comuni ?? []).filter(Boolean) }
}

const TITOLO_PASSI = () => t('Come si fa', 'How to do it')
const TITOLO_ERRORI = () => t('Da evitare', 'What to avoid')

function ElencoPassi({ righe }: { righe: string[] }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      {righe.map((riga, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
          <Text style={[stili.passo, { color: p.accento }]}>{i + 1}</Text>
          <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{riga}</Text>
        </View>
      ))}
    </View>
  )
}

function ElencoErrori({ righe }: { righe: string[] }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      {righe.map((riga, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
          <Text style={[stili.passo, { color: p.testoSecondario }]}>×</Text>
          <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{riga}</Text>
        </View>
      ))}
    </View>
  )
}

/** Le due sezioni una sotto l'altra, ognuna col suo titoletto: la scheda dell'esercizio nel piano. */
export function SezioniGuida({ e }: { e: Pick<EsercizioScheda, 'istruzioni' | 'errori_comuni'> }) {
  const p = usePalette()
  const { passi, errori } = righeGuida(e)
  return (
    <>
      {passi.length ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{TITOLO_PASSI()}</Text>
          <ElencoPassi righe={passi} />
        </View>
      ) : null}
      {errori.length ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>{TITOLO_ERRORI()}</Text>
          <ElencoErrori righe={errori} />
        </View>
      ) : null}
    </>
  )
}

/**
 * La riga della seduta: chiusa di partenza (44 di altezza), un tocco la apre sul posto e un altro la richiude. Aperta mostra due schede,
 * «Come si fa (n)» e «Da evitare (n)», con la lista sotto. Se c'e' solo una delle due liste, niente schede: la riga ne porta il titolo e si apre
 * sulla lista. Lo stato aperto/chiuso sta qui: la carta dell'esercizio chiude, il componente si smonta e la riga riparte chiusa.
 */
export function GuidaEsercizio({ e }: { e: Pick<EsercizioScheda, 'istruzioni' | 'errori_comuni'> }) {
  const p = usePalette()
  const { passi, errori } = righeGuida(e)
  const [aperta, setAperta] = useState(false)
  const [scheda, setScheda] = useState<'passi' | 'errori'>(passi.length ? 'passi' : 'errori')
  if (!passi.length && !errori.length) return null
  const entrambe = passi.length > 0 && errori.length > 0
  const titolo = entrambe ? `${TITOLO_PASSI()} · ${TITOLO_ERRORI()}` : passi.length ? TITOLO_PASSI() : TITOLO_ERRORI()
  const schede = [
    { id: 'passi' as const, testo: TITOLO_PASSI(), n: passi.length },
    { id: 'errori' as const, testo: TITOLO_ERRORI(), n: errori.length },
  ]
  return (
    <View style={[stili.guida, { backgroundColor: p.incavo }]}>
      <Tocco
        onPress={() => setAperta((a) => !a)}
        etichetta={titolo}
        stato={{ expanded: aperta }}
        scala={0.99}
        vibra={null}
        sollevaInHover={false}
        style={stili.guidaRiga}
      >
        <Icona nome="info" size={20} colore={p.accento} />
        <Text style={[stili.guidaTitolo, { color: p.testo }]} numberOfLines={1}>
          {titolo}
        </Text>
        <Icona nome={aperta ? 'su' : 'giu'} size={16} colore={p.testoSecondario} />
      </Tocco>
      {aperta ? (
        <View style={stili.guidaCorpo}>
          {entrambe ? (
            <View accessibilityRole="tablist" style={[stili.schede, { backgroundColor: p.carta }]}>
              {schede.map((s) => {
                const scelta = scheda === s.id
                return (
                  <Tocco
                    key={s.id}
                    onPress={() => setScheda(s.id)}
                    ruolo="tab"
                    etichetta={`${s.testo} (${s.n})`}
                    stato={{ selected: scelta }}
                    scala={0.98}
                    vibra="scelta"
                    sollevaInHover={false}
                    style={[stili.scheda, scelta && { backgroundColor: p.testo }]}
                  >
                    <Text style={[stili.schedaTesto, { color: scelta ? p.carta : p.testoSecondario }]} numberOfLines={1}>
                      {s.testo} <Text style={stili.schedaN}>({s.n})</Text>
                    </Text>
                  </Tocco>
                )
              })}
            </View>
          ) : null}
          {scheda === 'passi' && passi.length ? <ElencoPassi righe={passi} /> : <ElencoErrori righe={errori} />}
        </View>
      ) : null}
    </View>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  passo: { fontFamily: F.extra, fontSize: 15, width: 18 },
  guida: { borderRadius: raggio.piccolo, overflow: 'hidden' },
  guidaRiga: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12 },
  guidaTitolo: { flex: 1, fontFamily: F.extra, fontSize: 14 },
  guidaCorpo: { gap: spazio.tre, paddingHorizontal: 12, paddingBottom: 12 },
  schede: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 12 },
  scheda: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 6 },
  schedaTesto: { fontFamily: F.extra, fontSize: 13.5, textAlign: 'center' },
  schedaN: { fontFamily: F.medio, fontSize: 12, opacity: 0.75 },
})
