import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { salvaQuestionario, type Profilo, type Questionario } from '@/api/alimentazione'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Barra, Carta, Entra, Messaggio, Pulsante } from '../ui/kit'
import { F, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { completo, DOMANDE, VUOTO } from './questionario'

// Il questionario, una domanda alla volta (19/10/2026). Si riapre dalle
// impostazioni della sezione con le risposte di prima.

export function QuestionarioAlimentazione({ prima, onFatto, onAnnulla }: { prima?: Questionario; onFatto: (p: Profilo) => void; onAnnulla?: () => void }) {
  const p = usePalette()
  const [r, setR] = useState<Partial<Questionario>>(prima ?? VUOTO)
  const [i, setI] = useState(0)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const d = DOMANDE[i]
  const ultima = i === DOMANDE.length - 1

  async function salva(risposte: Partial<Questionario>) {
    if (!completo(risposte)) return
    setInCorso(true)
    setErrore(null)
    const e = await salvaQuestionario(risposte)
    setInCorso(false)
    if (e.ok) onFatto(e.profilo)
    else setErrore(e.errore)
  }

  function rispondi(valore: unknown) {
    const nuove = { ...r, [d.chiave]: valore } as Partial<Questionario>
    setR(nuove)
    if (ultima) salva(nuove)
    else setI(i + 1)
  }

  const scelto = (v: unknown) => r[d.chiave] === v

  return (
    <Entra indice={0} key={d.chiave}>
      <Carta style={{ gap: spazio.tre }}>
        <View style={{ gap: spazio.due }}>
          <View style={stili.testa}>
            <Text style={[stili.passo, { color: p.testoSecondario }]}>{`Domanda ${i + 1} di ${DOMANDE.length}`}</Text>
            {i > 0 ? (
              <Tocco onPress={() => setI(i - 1)} etichetta="Domanda precedente" style={stili.indietro}>
                <Icona nome="indietro" size={14} colore={p.testoSecondario} />
                <Text style={[stili.passo, { color: p.testoSecondario }]}>Indietro</Text>
              </Tocco>
            ) : onAnnulla ? (
              <Tocco onPress={onAnnulla} etichetta="Lascia com’era" style={stili.indietro}>
                <Text style={[stili.passo, { color: p.testoSecondario }]}>Lascia com’era</Text>
              </Tocco>
            ) : null}
          </View>
          <Barra valore={(i + 1) / DOMANDE.length} colore={ORTO[1]} altezza={6} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
            {d.titolo}
          </Text>
          {d.sotto ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>{d.sotto}</Text> : null}
        </View>

        {d.tipo === 'si-no' ? (
          <View style={stili.siNo}>
            {[true, false].map((v) => (
              <Tocco key={String(v)} onPress={() => rispondi(v)} vibra="scelta" stato={{ selected: scelto(v) }} etichetta={v ? 'Sì' : 'No'} style={{ flex: 1 }}>
                <View style={[stili.scelta, stili.sceltaCentro, { backgroundColor: scelto(v) ? ORTO[1] : p.incavo }]}>
                  <Text style={[stili.sceltaTesto, { color: scelto(v) ? '#fff' : p.testo }]}>{v ? 'Sì' : 'No'}</Text>
                </View>
              </Tocco>
            ))}
          </View>
        ) : d.tipo === 'una' ? (
          <View style={{ gap: spazio.due }}>
            {d.scelte.map((s) => (
              <Tocco key={s.valore} onPress={() => rispondi(s.valore)} vibra="scelta" stato={{ selected: scelto(s.valore) }} etichetta={s.testo} scala={0.985}>
                <View style={[stili.scelta, { backgroundColor: scelto(s.valore) ? ORTO[1] : p.incavo }]}>
                  {s.icona ? <Icona nome={s.icona} size={20} colore={scelto(s.valore) ? '#fff' : ORTO[1]} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[stili.sceltaTesto, { color: scelto(s.valore) ? '#fff' : p.testo }]}>{s.testo}</Text>
                    {s.sotto ? <Text style={[stili.sotto, { color: scelto(s.valore) ? 'rgba(255,255,255,0.85)' : p.testoSecondario }]}>{s.sotto}</Text> : null}
                  </View>
                </View>
              </Tocco>
            ))}
          </View>
        ) : (
          <View style={{ gap: spazio.due }}>
            {d.scelte.map((s) => {
              const lista = (r.esclusioni ?? []) as string[]
              const dentro = lista.includes(s.valore)
              return (
                <Tocco
                  key={s.valore}
                  onPress={() => setR({ ...r, esclusioni: (dentro ? lista.filter((x) => x !== s.valore) : [...lista, s.valore]) as Questionario['esclusioni'] })}
                  vibra="scelta"
                  ruolo="checkbox"
                  stato={{ selected: dentro }}
                  etichetta={s.testo}
                  scala={0.985}
                >
                  <View style={[stili.scelta, { backgroundColor: p.incavo }]}>
                    <View style={[stili.casella, { borderColor: dentro ? ORTO[1] : p.testoTerzo, backgroundColor: dentro ? ORTO[1] : 'transparent' }]}>
                      {dentro ? <Icona nome="spunta" size={14} colore="#fff" /> : null}
                    </View>
                    <Text style={[stili.sceltaTesto, { color: p.testo }]}>{s.testo}</Text>
                  </View>
                </Tocco>
              )
            })}
            <Pulsante testo={(r.esclusioni ?? []).length ? 'Avanti' : 'Niente da evitare'} icona="avanti" onPress={() => rispondi(r.esclusioni ?? [])} />
          </View>
        )}
        {inCorso ? <Text style={[stili.sotto, { color: p.testoSecondario }]}>Salviamo le risposte…</Text> : null}
        {errore ? <Messaggio>{errore}</Messaggio> : null}
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passo: { fontFamily: F.semi, fontSize: 13 },
  indietro: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 10 },
  titolo: { fontFamily: F.extra, fontSize: 22, lineHeight: 27 },
  sotto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  siNo: { flexDirection: 'row', gap: spazio.tre },
  scelta: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderRadius: 18, paddingHorizontal: spazio.tre, minHeight: 56, paddingVertical: 12 },
  sceltaCentro: { justifyContent: 'center' },
  sceltaTesto: { fontFamily: F.bold, fontSize: 16 },
  casella: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
