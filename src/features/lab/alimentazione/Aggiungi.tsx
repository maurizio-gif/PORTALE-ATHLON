import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { aggiungiAlDiario, PASTI, type Alimento, type Pasto, type VoceDiario } from '@/api/alimentazione'
import { spazio } from '@/theme'

import { CampoTesto } from '../ui/Campi'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { cerca, perGrammi } from './conti'

// Aggiungere dal catalogo (19/10/2026): si cerca, si sceglie, si dice quanto. Le
// porzioni di casa sono le prime scelte, i grammi si correggono a mano; con i
// numeri nascosti restano le sole porzioni (i grammi sono numeri anche loro).

const intero = (n: number) => Math.round(n).toLocaleString('it-IT')

/** Le scelte rapide: gli alimenti piu' comuni a quell'ora del giorno. */
const RAPIDI: Record<Pasto, string[]> = {
  colazione: ['latte-ps', 'caffe', 'cappuccino', 'fette-biscottate', 'yogurt', 'biscotti-secchi', 'cornetto', 'marmellata', 'banana', 'fiocchi-avena'],
  pranzo: ['pasta', 'riso', 'pane', 'pollo-petto', 'insalata', 'olio', 'mozzarella', 'tonno-naturale', 'pomodori', 'mela'],
  cena: ['pane', 'merluzzo', 'uovo', 'zucchine', 'patate', 'olio', 'insalata', 'parmigiano', 'minestrone', 'pizza'],
  spuntino: ['mela', 'banana', 'yogurt-greco-0', 'mandorle', 'cracker', 'barretta-proteica', 'arancia', 'cioccolato-fondente'],
}

export function AggiungiAlimento({
  aperto,
  data,
  pasto: inizio,
  catalogo,
  nascondiNumeri,
  onChiudi,
  onAggiunte,
}: {
  aperto: boolean
  data: string
  pasto: Pasto
  catalogo: Alimento[] | null
  nascondiNumeri: boolean
  onChiudi: () => void
  onAggiunte: (voci: VoceDiario[]) => void
}) {
  const p = usePalette()
  const [testo, setTesto] = useState('')
  const [pasto, setPasto] = useState<Pasto>(inizio)
  const [scelto, setScelto] = useState<Alimento | null>(null)
  const [grammi, setGrammi] = useState('')
  const [porzione, setPorzione] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!aperto) return
    setPasto(inizio)
    setTesto('')
    setScelto(null)
    setErrore(null)
  }, [aperto, inizio])

  const trovati = useMemo(() => {
    if (!catalogo) return []
    if (testo.trim()) return cerca(catalogo, testo)
    const per = new Map(catalogo.map((a) => [a.id, a]))
    return RAPIDI[pasto].map((id) => per.get(id)).filter((a): a is Alimento => !!a)
  }, [catalogo, testo, pasto])

  function scegli(a: Alimento) {
    setScelto(a)
    const prima = a.porzioni[0]
    setPorzione(prima?.nome ?? null)
    setGrammi(String(prima?.g ?? 100))
    setErrore(null)
  }

  const g = Number(grammi.replace(',', '.'))
  const valido = Number.isFinite(g) && g > 0 && g <= 3000
  const stima = scelto && valido ? perGrammi(scelto, g) : null

  async function conferma() {
    if (!scelto || !valido) return
    setInCorso(true)
    setErrore(null)
    const r = await aggiungiAlDiario(data, pasto, [{ alimento_id: scelto.id, nome: scelto.nome, grammi: g }], 'catalogo')
    setInCorso(false)
    if (!r.ok) return setErrore(r.errore)
    onAggiunte(r.voci)
    setScelto(null)
    setTesto('')
  }

  return (
    <Foglio aperto={aperto} titolo={scelto ? scelto.nome : 'Aggiungi un alimento'} sottotitolo={scelto ? 'Quanto ne hai mangiato?' : 'Cerca per nome: «pasta», «yogurt», «pollo»…'} onChiudi={onChiudi}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
        {PASTI.map((x) => (
          <Tocco key={x.id} onPress={() => setPasto(x.id)} vibra="scelta" stato={{ selected: pasto === x.id }} etichetta={x.nome}>
            <View style={[stili.chip, { backgroundColor: pasto === x.id ? p.testo : p.incavo }]}>
              <Text style={[stili.chipTesto, { color: pasto === x.id ? p.fondo : p.testo }]}>{x.nome}</Text>
            </View>
          </Tocco>
        ))}
      </ScrollView>

      {!scelto ? (
        <>
          <CampoTesto etichetta="Cerca" icona="cerca" value={testo} onChangeText={setTesto} placeholder="Che cosa hai mangiato?" autoFocus autoCorrect={false} returnKeyType="search" />
          {!catalogo ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>Carichiamo l’elenco…</Text>
          ) : trovati.length ? (
            <View>
              {!testo.trim() ? <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{`I PIÙ SCELTI A ${PASTI.find((x) => x.id === pasto)!.nome.toUpperCase()}`}</Text> : null}
              {trovati.map((a, i) => (
                <Tocco key={a.id} onPress={() => scegli(a)} etichetta={a.nome} scala={0.99}>
                  <View style={[stili.risultato, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[stili.nome, { color: p.testo }]}>{a.nome}</Text>
                      {!nascondiNumeri ? <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${intero(a.kcal)} kcal per 100 g`}</Text> : null}
                    </View>
                    <Icona nome="piu" size={18} colore={ORTO[1]} />
                  </View>
                </Tocco>
              ))}
            </View>
          ) : (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>Non lo troviamo nell’elenco. Prova con un nome più semplice, o fotografa il piatto.</Text>
          )}
        </>
      ) : (
        <>
          {scelto.porzioni.length ? (
            <View style={stili.porzioni}>
              {scelto.porzioni.map((x) => {
                const attiva = porzione === x.nome
                return (
                  <Tocco
                    key={x.nome}
                    onPress={() => {
                      setPorzione(x.nome)
                      setGrammi(String(x.g))
                    }}
                    vibra="scelta"
                    stato={{ selected: attiva }}
                    etichetta={x.nome}
                  >
                    <View style={[stili.chip, { backgroundColor: attiva ? ORTO[1] : p.incavo }]}>
                      <Text style={[stili.chipTesto, { color: attiva ? '#fff' : p.testo }]}>{nascondiNumeri ? x.nome : `${x.nome} · ${x.g} g`}</Text>
                    </View>
                  </Tocco>
                )
              })}
            </View>
          ) : null}
          {!nascondiNumeri ? (
            <CampoTesto
              etichetta="Grammi"
              value={grammi}
              onChangeText={(v) => {
                setGrammi(v.replace(/[^\d,.]/g, ''))
                setPorzione(null)
              }}
              keyboardType="decimal-pad"
              errore={!!grammi && !valido}
            />
          ) : null}
          {stima && !nascondiNumeri ? (
            <View style={[stili.stima, { backgroundColor: p.incavo }]}>
              <Text style={[stili.stimaNumero, { color: p.testo }]}>{`${intero(stima.kcal)} kcal`}</Text>
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Proteine ${intero(stima.proteine)} g · Carboidrati ${intero(stima.carboidrati)} g · Grassi ${intero(stima.grassi)} g`}</Text>
            </View>
          ) : null}
          {errore ? <Messaggio>{errore}</Messaggio> : null}
          <Pulsante testo={`Aggiungi a ${PASTI.find((x) => x.id === pasto)!.nome.toLowerCase()}`} icona="piu" onPress={conferma} inCorso={inCorso} disabilitato={!valido} />
          <Pulsante testo="Scegli un altro alimento" variante="fantasma" onPress={() => setScelto(null)} />
        </>
      )}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center' },
  chipTesto: { fontFamily: F.bold, fontSize: 14 },
  porzioni: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  etichetta: { fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  risultato: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: 12, minHeight: 52 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  stima: { borderRadius: 16, padding: spazio.tre, gap: 4 },
  stimaNumero: { fontFamily: F.extra, fontSize: 22 },
})
