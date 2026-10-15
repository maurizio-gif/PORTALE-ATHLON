import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { PianoAbbonamento } from '@/api/abbonamento'
import { euro } from '@/lib/eventi'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Etichetta } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { SchedaScelta } from './Passi'

// Il listino dentro il portale (16/10/2026), con le stesse parole del sito:
// per ogni abbonamento cosa comprende — attivita' per attivita' —, cosa non
// comprende, le tre formule con il prezzo e, per quella scelta, le condizioni
// del contratto. Prima di arrivare alla firma si sa gia' tutto.

export const FORMULE: Record<string, { titolo: string; sotto: string }> = {
  'annuale-rate': { titolo: 'Annuale, a rate', sotto: '12 mesi, pagati ogni mese' },
  'annuale-unico': { titolo: 'Annuale, in un’unica soluzione', sotto: '12 mesi, pagati subito' },
  flex: { titolo: 'Mensile Flex', sotto: 'Si rinnova di mese in mese, senza vincoli' },
}

function Attivita({ nome, testo }: { nome: string; testo: string }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  return (
    <View style={{ gap: 4 }}>
      <Tocco
        ruolo="button"
        etichetta={aperta ? `Nascondi il dettaglio di ${nome}` : `Mostra il dettaglio di ${nome}`}
        stato={{ selected: aperta }}
        vibra={null}
        scala={0.99}
        onPress={() => setAperta((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due, minHeight: 36 }}
      >
        <Icona nome="spunta" size={16} colore={p.ok} />
        <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14, flex: 1 }}>{nome}</Text>
        {testo ? <Icona nome={aperta ? 'meno' : 'piu'} size={16} colore={p.testoTerzo} /> : null}
      </Tocco>
      {aperta && testo ? <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingLeft: 24 }}>{testo}</Text> : null}
    </View>
  )
}

function Condizioni({ piano }: { piano: PianoAbbonamento }) {
  const p = usePalette()
  if (!piano.condizioni.length) return null
  return (
    <View style={[stili.condizioni, { borderColor: p.linea, backgroundColor: p.incavo }]}>
      <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 15 }}>{`Condizioni · ${FORMULE[piano.formula]?.titolo ?? piano.etichetta}`}</Text>
      {piano.condizioni.map((c) => (
        <View key={c.titolo} style={{ gap: 1 }}>
          <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 13 }}>{c.titolo}</Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>{c.testo}</Text>
        </View>
      ))}
      <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 12, lineHeight: 17 }}>
        Il contratto completo, con i Termini e Condizioni, lo leggi per intero prima di firmare.
      </Text>
    </View>
  )
}

export function Listino({
  piani,
  pianoId,
  onScegli,
}: {
  piani: PianoAbbonamento[]
  pianoId: number | null
  onScegli: (id: number) => void
}) {
  const p = usePalette()
  const gruppi = useMemo(() => {
    const m = new Map<string, PianoAbbonamento[]>()
    for (const x of piani) m.set(x.abbonamento, [...(m.get(x.abbonamento) ?? []), x])
    return [...m.entries()]
  }, [piani])

  return (
    <View style={{ gap: spazio.quattro }}>
      {gruppi.map(([nome, formule]) => {
        const base = formule[0]
        const scelto = formule.find((x) => x.piano_id === pianoId)
        const dettaglio = base.attivita_dettaglio.length ? base.attivita_dettaglio : base.attivita.map((a) => ({ nome: a, testo: '', pagina: null }))
        return (
          <Carta key={nome} style={{ gap: spazio.tre }}>
            <View style={{ gap: spazio.due }}>
              {base.badge ? <Etichetta testo={base.badge} tono="accento" /> : null}
              <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 30, letterSpacing: -1 }}>{nome}</Text>
              {base.claim ? <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 16 }}>{base.claim}</Text> : null}
              {base.descrizione ? <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14, lineHeight: 21 }}>{base.descrizione}</Text> : null}
            </View>

            <View style={{ gap: 2 }}>
              <Text style={[stili.titoletto, { color: p.testoSecondario }]}>COMPRENDE</Text>
              {dettaglio.map((a) => (
                <Attivita key={a.nome} nome={a.nome} testo={a.testo} />
              ))}
              {base.non_comprende.length ? (
                <View style={{ gap: 4, marginTop: spazio.due }}>
                  <Text style={[stili.titoletto, { color: p.testoSecondario }]}>NON COMPRENDE</Text>
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
                    {`${base.non_comprende.join(', ')}: sono nel Premium.`}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: spazio.due }}>
              <Text style={[stili.titoletto, { color: p.testoSecondario }]}>SCEGLI LA FORMULA</Text>
              {formule.map((x) => {
                const f = FORMULE[x.formula]
                const attiva = x.piano_id === pianoId
                return (
                  <SchedaScelta
                    key={x.piano_id}
                    attiva={attiva}
                    etichetta={`${nome}, ${f.titolo}, ${euro(x.importo)} ${x.periodo.includes('anno') ? 'all’anno' : 'al mese'}`}
                    onPress={() => onScegli(x.piano_id)}
                    titolo={f.titolo}
                    sotto={f.sotto}
                    destra={
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 20, letterSpacing: -0.5 }}>{euro(x.importo)}</Text>
                        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{x.periodo.includes('anno') ? 'all’anno' : 'al mese'}</Text>
                      </View>
                    }
                  >
                    {x.risparmio_vs_flex ? <Etichetta testo={`Risparmi ${euro(x.risparmio_vs_flex)} rispetto al Flex`} tono="ok" /> : null}
                  </SchedaScelta>
                )
              })}
            </View>

            {scelto ? <Condizioni piano={scelto} /> : null}
          </Carta>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  titoletto: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1 },
  condizioni: { gap: spazio.due, borderWidth: 1, borderRadius: 14, padding: spazio.tre },
})
