import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { salvaTestMassimale, testMassimali, type EsercizioTest } from '@/api/lab'
import { spazio } from '@/theme'

import { dimentica } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Numero, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { kg as formatoKg, giornoTest, stimaMassimale } from './comune'
import { MediaEsercizio } from './MediaEsercizio'

// Il test dei massimali (16/10/2026): pochi esercizi per la parte superiore,
// il core e la parte inferiore. A carico si scrive il peso e quante
// ripetizioni pulite si sono fatte (fra 4 e 10, al massimo 12), e il
// massimale si stima in modo indiretto; a corpo libero le ripetizioni
// massime. Da quel momento, nelle schede, le percentuali diventano chili.

const GRUPPI: { chiave: EsercizioTest['test_gruppo']; titolo: string }[] = [
  { chiave: 'superiore', titolo: 'Parte superiore del corpo' },
  { chiave: 'core', titolo: 'Core' },
  { chiave: 'inferiore', titolo: 'Parte inferiore del corpo' },
]

function risultato(e: EsercizioTest): string | null {
  if (!e.ultimo) return null
  return e.test === 'carico'
    ? `Massimale ${formatoKg(e.ultimo.massimale)} kg (${e.ultimo.ripetizioni} × ${formatoKg(e.ultimo.kg ?? 0)} kg)`
    : `${e.ultimo.ripetizioni} ripetizioni`
}

function FoglioTest({ e, onChiudi, onSalvato }: { e: EsercizioTest | null; onChiudi: () => void; onSalvato: () => void }) {
  const p = usePalette()
  const [peso, setPeso] = useState('')
  const [rip, setRip] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [fatto, setFatto] = useState<number | null>(null)

  useEffect(() => {
    setPeso(e?.ultimo?.kg ? String(e.ultimo.kg).replace('.', ',') : '')
    setRip('')
    setErrore(null)
    setFatto(null)
  }, [e])

  if (!e) return <Foglio aperto={false} titolo="" onChiudi={onChiudi}>{null}</Foglio>
  const carico = e.test === 'carico'
  const kg = Number(peso.replace(',', '.'))
  const r = Number(rip)
  const anteprima = carico && kg > 0 && r >= 1 && r <= 12 ? stimaMassimale(kg, r) : null

  async function salva() {
    if (!e) return
    setErrore(null)
    setInCorso(true)
    const esito = await salvaTestMassimale(e.id, carico ? kg : null, r)
    setInCorso(false)
    if (!esito.ok) {
      colpetto('errore')
      return setErrore(esito.errore)
    }
    colpetto('ok')
    setFatto(esito.massimale)
    onSalvato()
  }

  return (
    <Foglio aperto={!!e} titolo={e.nome} sottotitolo={carico ? 'Test a carico: peso e ripetizioni' : 'Test a corpo libero: ripetizioni massime'} onChiudi={onChiudi}>
      <View style={{ gap: spazio.tre }}>
        <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.media} />
        <View style={[stili.istruzioni, { backgroundColor: p.incavo }]}>
          {(carico
            ? [
                'Riscaldati con due serie leggere: una da 10 e una da 6 ripetizioni.',
                'Poi scegli un peso con cui riesci a fare fra 4 e 10 ripetizioni pulite, e fanne quante puoi finché la tecnica regge.',
                'Scrivi il peso e le ripetizioni: calcoliamo il tuo massimale.',
              ]
            : ['Fai più ripetizioni che puoi, in modo controllato e senza lunghe pause.', 'Fermati quando la tecnica non regge più, e scrivi quante ne hai fatte.']
          ).map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
              <Text style={[stili.passo, { color: p.accento }]}>{i + 1}</Text>
              <Text style={[stili.nota, { color: p.testo, flex: 1 }]}>{t}</Text>
            </View>
          ))}
        </View>

        {fatto != null ? (
          <Carta style={{ alignItems: 'center', gap: spazio.due }}>
            <Icona nome="ok" size={30} colore={p.ok} />
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{carico ? 'Il tuo massimale stimato' : 'Le tue ripetizioni massime'}</Text>
            <Numero valore={carico ? formatoKg(fatto) : String(fatto)} unita={carico ? 'kg' : 'ripetizioni'} size={40} colore={p.accento} />
            <Pulsante testo="Fatto" variante="secondario" onPress={onChiudi} />
          </Carta>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spazio.due }}>
              {carico ? (
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[stili.etichetta, { color: p.testoSecondario }]}>PESO (KG)</Text>
                  <TextInput
                    value={peso}
                    onChangeText={(t) => setPeso(t.replace(/[^\d.,]/g, '').slice(0, 6))}
                    keyboardType="decimal-pad"
                    placeholder="es. 40"
                    placeholderTextColor={p.testoTerzo}
                    style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
                    accessibilityLabel="Peso usato, in chili"
                  />
                </View>
              ) : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[stili.etichetta, { color: p.testoSecondario }]}>RIPETIZIONI</Text>
                <TextInput
                  value={rip}
                  onChangeText={(t) => setRip(t.replace(/[^\d]/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  placeholder={carico ? 'da 4 a 10' : 'es. 20'}
                  placeholderTextColor={p.testoTerzo}
                  style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
                  accessibilityLabel="Ripetizioni fatte"
                />
              </View>
            </View>
            {carico && r > 12 ? (
              <Messaggio tono="attenzione">Oltre 12 ripetizioni la stima non è affidabile: aumenta il peso, recupera due minuti e rifai la serie.</Messaggio>
            ) : anteprima ? (
              <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
                Massimale stimato: <Text style={{ fontFamily: F.extra, color: p.testo }}>{formatoKg(anteprima)} kg</Text>
              </Text>
            ) : null}
            {errore ? <Messaggio>{errore}</Messaggio> : null}
            <Pulsante testo="Salva il risultato" icona="spunta" onPress={salva} inCorso={inCorso} disabilitato={!r || (carico && (!kg || r > 12))} />
          </>
        )}
      </View>
    </Foglio>
  )
}

export function Test() {
  const p = usePalette()
  const [dati, setDati] = useState<{ esercizi: EsercizioTest[]; ultimo: string | null; giorni: number } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [aperti, setAperti] = useState<Record<string, boolean>>({ superiore: true, core: true, inferiore: true })
  const [scelto, setScelto] = useState<EsercizioTest | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await testMassimali()
    if (r.ok) setDati({ esercizi: r.esercizi, ultimo: r.ultimo, giorni: r.giorni })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  if (!dati) {
    return (
      <Schermata sopratitolo="Allenamento" titolo="Test dei massimali" indietro="/lab/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }

  const fatti = dati.esercizi.filter((e) => e.ultimo).length
  return (
    <Schermata sopratitolo="Allenamento" titolo="Test dei massimali" indietro="/lab/allenamento" barra={false}>
      <View style={{ gap: spazio.tre }}>
        {[
          'Per fare il test completa gli esercizi della parte superiore, del core e della parte inferiore del corpo.',
          'Sugli esercizi a carico usa un peso con cui fai fra 4 e 10 ripetizioni pulite: da peso e ripetizioni calcoliamo il tuo massimale.',
          `Dopo il test, nelle schede le percentuali diventano i tuoi chili. Rifallo ogni ${Math.round(dati.giorni / 7)} settimane.`,
        ].map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spazio.due }}>
            <Icona nome="info" size={20} colore={p.blu} />
            <Text style={[stili.consiglio, { color: p.testo, flex: 1 }]}>{t}</Text>
          </View>
        ))}
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
          {dati.ultimo ? `${fatti} di ${dati.esercizi.length} esercizi fatti · ultimo test ${giornoTest(dati.ultimo)}` : `${dati.esercizi.length} esercizi, una quindicina di minuti`}
        </Text>
      </View>

      {GRUPPI.map((g, gi) => {
        const qui = dati.esercizi.filter((e) => e.test_gruppo === g.chiave)
        if (!qui.length) return null
        const aperto = aperti[g.chiave]
        return (
          <View key={g.chiave} style={{ gap: spazio.due }}>
            <Tocco onPress={() => setAperti((a) => ({ ...a, [g.chiave]: !aperto }))} etichetta={g.titolo} stato={{ selected: aperto }} style={stili.gruppo}>
              <Text style={[stili.gruppoTitolo, { color: p.testo }]}>{g.titolo}</Text>
              <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`${qui.filter((e) => e.ultimo).length}/${qui.length}`}</Text>
              <Icona nome={aperto ? 'meno' : 'piu'} size={18} colore={p.testoSecondario} />
            </Tocco>
            {aperto ? (
              <Carta style={{ paddingVertical: spazio.uno, paddingHorizontal: spazio.tre }}>
                {qui.map((e, i) => (
                  <Entra key={e.id} indice={gi + i}>
                    <Tocco onPress={() => setScelto(e)} etichetta={`Test: ${e.nome}`} scala={0.99} style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
                      <MediaEsercizio immagini={e.immagini} video={e.video} style={stili.miniatura} ferma />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[stili.nome, { color: p.testo }]}>{e.nome}</Text>
                        <Text style={[stili.etichettaTest, { color: e.ultimo ? p.ok : p.attenzione }]}>{e.ultimo ? '✓ Fatto' : 'Consigliato'}</Text>
                        {risultato(e) ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`Risultato precedente: ${risultato(e)}`}</Text> : null}
                      </View>
                      <Icona nome="avanti" size={16} colore={p.testoTerzo} />
                    </Tocco>
                  </Entra>
                ))}
              </Carta>
            ) : null}
          </View>
        )
      })}

      <FoglioTest
        e={scelto}
        onChiudi={() => setScelto(null)}
        onSalvato={() => {
          // Le schede ricalcolano i chili col massimale nuovo.
          dimentica()
          carica()
        }}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  consiglio: { fontFamily: F.medio, fontSize: 15, lineHeight: 22 },
  piccola: { fontFamily: F.semi, fontSize: 12.5 },
  gruppo: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, paddingVertical: spazio.uno },
  gruppoTitolo: { flex: 1, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  miniatura: { width: 76, height: 76, borderRadius: 16 },
  nome: { fontFamily: F.extra, fontSize: 16, lineHeight: 20 },
  etichettaTest: { fontFamily: F.bold, fontSize: 13 },
  media: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20 },
  istruzioni: { borderRadius: 18, padding: spazio.tre, gap: spazio.due },
  passo: { fontFamily: F.extra, fontSize: 15, width: 18 },
  nota: { fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 },
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 0.8 },
  input: { height: 54, borderRadius: 16, paddingHorizontal: spazio.tre, fontFamily: F.extra, fontSize: 22, textAlign: 'center' },
})
