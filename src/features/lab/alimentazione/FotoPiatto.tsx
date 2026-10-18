import { useEffect, useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

import { aggiungiAlDiario, analizzaFoto, PASTI, type Pasto, type Proposta, type VoceDiario } from '@/api/alimentazione'
import { preparaFoto, scegliFoto } from '@/lib/fotoPiatto'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { perGrammi } from './conti'

// La foto del piatto (19/10/2026): si sceglie o si scatta, la funzione la manda al
// modello e torna con gli alimenti riconosciuti e i grammi stimati, con una
// forbice. **Niente finisce nel diario senza conferma**: si toglie quello che non
// c'e', si correggono i grammi, e solo allora si aggiunge. La foto resta solo qui,
// in memoria, il tempo di guardarla.

const intero = (n: number) => Math.round(n).toLocaleString('it-IT')

/** La linea che scorre sulla foto mentre il modello la guarda. */
function Scansione({ altezza }: { altezza: number }) {
  const fermo = useReducedMotion()
  const y = useSharedValue(0)
  useEffect(() => {
    if (!fermo) y.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [fermo, y])
  const stile = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (altezza - 4) }] }))
  return <Animated.View pointerEvents="none" style={[stili.linea, stile]} />
}

type Riga = Proposta & { tieni: boolean }

export function FotoPiatto({
  aperto,
  data,
  pasto: inizio,
  nascondiNumeri,
  onChiudi,
  onAggiunte,
}: {
  aperto: boolean
  data: string
  pasto: Pasto
  nascondiNumeri: boolean
  onChiudi: () => void
  onAggiunte: (voci: VoceDiario[]) => void
}) {
  const p = usePalette()
  const [pasto, setPasto] = useState<Pasto>(inizio)
  const [foto, setFoto] = useState<string | null>(null)
  const [analisi, setAnalisi] = useState(false)
  const [piatto, setPiatto] = useState<string | null>(null)
  const [righe, setRighe] = useState<Riga[] | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!aperto) return
    setPasto(inizio)
    setFoto(null)
    setRighe(null)
    setPiatto(null)
    setErrore(null)
  }, [aperto, inizio])

  async function scegli() {
    setErrore(null)
    const a = await scegliFoto()
    if (!a) return
    const f = await preparaFoto(a)
    if (!f.ok) return setErrore(f.errore)
    setFoto(f.anteprima)
    setRighe(null)
    setAnalisi(true)
    const r = await analizzaFoto(f.dati)
    setAnalisi(false)
    if (!r.ok) return setErrore(r.errore)
    setPiatto(r.piatto)
    setRighe(r.proposte.map((x) => ({ ...x, tieni: true })))
  }

  function cambia(i: number, delta: number) {
    setRighe((rr) => rr && rr.map((x, j) => (j === i ? { ...x, grammi: Math.max(5, Math.min(2000, Math.round((x.grammi + delta) / 5) * 5)) } : x)))
  }

  const tenute = (righe ?? []).filter((x) => x.tieni)
  const totale = tenute.reduce((s, x) => s + perGrammi({ kcal: x.kcal100, proteine: x.proteine100, carboidrati: x.carboidrati100, grassi: x.grassi100 }, x.grammi).kcal, 0)
  const scala = (x: Riga) => x.grammi / Math.max(1, (x.grammi_min + x.grammi_max) / 2)
  const minimo = tenute.reduce((s, x) => s + (x.kcal100 * x.grammi_min * scala(x)) / 100, 0)
  const massimo = tenute.reduce((s, x) => s + (x.kcal100 * x.grammi_max * scala(x)) / 100, 0)

  async function conferma() {
    if (!tenute.length) return
    setInCorso(true)
    setErrore(null)
    const r = await aggiungiAlDiario(
      data,
      pasto,
      tenute.map((x) => ({ alimento_id: x.alimento_id, nome: x.nome, grammi: x.grammi, kcal100: x.kcal100, proteine100: x.proteine100, carboidrati100: x.carboidrati100, grassi100: x.grassi100 })),
      'foto',
    )
    setInCorso(false)
    if (!r.ok) return setErrore(r.errore)
    onAggiunte(r.voci)
    onChiudi()
  }

  return (
    <Foglio aperto={aperto} titolo="Fotografa il piatto" sottotitolo="Riconosciamo gli alimenti e stimiamo i grammi: tu controlli prima di aggiungerli." onChiudi={onChiudi}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }}>
        {PASTI.map((x) => (
          <Tocco key={x.id} onPress={() => setPasto(x.id)} vibra="scelta" stato={{ selected: pasto === x.id }} etichetta={x.nome}>
            <View style={[stili.chip, { backgroundColor: pasto === x.id ? p.testo : p.incavo }]}>
              <Text style={[stili.chipTesto, { color: pasto === x.id ? p.fondo : p.testo }]}>{x.nome}</Text>
            </View>
          </Tocco>
        ))}
      </ScrollView>

      {foto ? (
        <View style={stili.cornice}>
          <Image source={{ uri: foto }} style={stili.foto} resizeMode="cover" accessibilityLabel="La foto del piatto" />
          {analisi ? <Scansione altezza={220} /> : null}
        </View>
      ) : (
        <Tocco onPress={scegli} etichetta="Scegli o scatta una foto" scala={0.985}>
          <View style={[stili.vuoto, { borderColor: ORTO[1], backgroundColor: p.incavo }]}>
            <Icona nome="fotocamera" size={34} colore={ORTO[1]} />
            <Text style={[stili.nome, { color: p.testo }]}>Scegli o scatta una foto</Text>
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>Dall’alto, con tutto il piatto nell’inquadratura. Solo il cibo, senza persone.</Text>
          </View>
        </Tocco>
      )}

      {analisi ? <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>Riconosciamo il piatto…</Text> : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}

      {righe ? (
        righe.length ? (
          <View style={{ gap: spazio.due }}>
            {piatto ? <Text style={[stili.nome, { color: p.testo }]}>{piatto}</Text> : null}
            {righe.map((x, i) => (
              <View key={`${x.nome}-${i}`} style={[stili.riga, { backgroundColor: p.incavo, opacity: x.tieni ? 1 : 0.45 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[stili.nome, { color: p.testo }]}>{x.nome}</Text>
                  {!nascondiNumeri ? (
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>
                      {`${x.grammi} g · ${intero((x.kcal100 * x.grammi) / 100)} kcal${x.dal_catalogo ? '' : ' · stima'}`}
                    </Text>
                  ) : null}
                </View>
                {x.tieni && !nascondiNumeri ? (
                  <View style={stili.passi}>
                    <Tocco onPress={() => cambia(i, -10)} etichetta={`Meno ${x.nome}`} style={[stili.passo, { backgroundColor: p.carta }]}>
                      <Icona nome="meno" size={16} colore={p.testo} />
                    </Tocco>
                    <Tocco onPress={() => cambia(i, 10)} etichetta={`Più ${x.nome}`} style={[stili.passo, { backgroundColor: p.carta }]}>
                      <Icona nome="piu" size={16} colore={p.testo} />
                    </Tocco>
                  </View>
                ) : null}
                <Tocco
                  onPress={() => setRighe((rr) => rr && rr.map((y, j) => (j === i ? { ...y, tieni: !y.tieni } : y)))}
                  etichetta={x.tieni ? `Togli ${x.nome}` : `Rimetti ${x.nome}`}
                  style={[stili.passo, { backgroundColor: p.carta }]}
                >
                  <Icona nome={x.tieni ? 'chiudi' : 'aggiorna'} size={16} colore={p.testoSecondario} />
                </Tocco>
              </View>
            ))}
            {!nascondiNumeri && tenute.length ? (
              <View style={[stili.totale, { backgroundColor: p.carbone }]}>
                <Text style={stili.totaleNumero}>{`${intero(totale)} kcal`}</Text>
                <Text style={stili.totaleSotto}>{`Fra ${intero(minimo)} e ${intero(massimo)} kcal, secondo quanto c’è davvero nel piatto. Olio e condimenti che non si vedono non sono contati.`}</Text>
              </View>
            ) : null}
            <Pulsante testo={`Aggiungi a ${PASTI.find((x) => x.id === pasto)!.nome.toLowerCase()}`} icona="piu" onPress={conferma} inCorso={inCorso} disabilitato={!tenute.length} />
            <Pulsante testo="Prova con un’altra foto" variante="fantasma" onPress={scegli} />
          </View>
        ) : (
          <View style={{ gap: spazio.due }}>
            <Messaggio tono="attenzione">Non abbiamo riconosciuto del cibo in questa foto. Prova con un’altra, dall’alto e con più luce, o cerca gli alimenti nell’elenco.</Messaggio>
            <Pulsante testo="Prova con un’altra foto" variante="secondario" onPress={scegli} />
          </View>
        )
      ) : null}
    </Foglio>
  )
}

const stili = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center' },
  chipTesto: { fontFamily: F.bold, fontSize: 14 },
  vuoto: { borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: spazio.due, padding: spazio.quattro, minHeight: 200 },
  cornice: { height: 220, borderRadius: 22, overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  linea: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: ORTO[0], boxShadow: '0 0 18px rgba(67,224,160,0.9)' },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 16, padding: spazio.tre - 4, paddingLeft: spazio.tre },
  passi: { flexDirection: 'row', gap: 6 },
  passo: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  totale: { borderRadius: 18, padding: spazio.tre, gap: 4 },
  totaleNumero: { color: '#fff', fontFamily: F.extra, fontSize: 24 },
  totaleSotto: { color: 'rgba(255,255,255,0.7)', fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
})
