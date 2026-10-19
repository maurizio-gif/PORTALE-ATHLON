import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { eliminaMisura, elencoMisure, salvaMisura, type ConsensoCorpo, type Misura, type NuovaMisura } from '@/api/lab'
import { CampoData } from '@/components/CampoData'
import { spazio } from '@/theme'

import { dimentica, inMemoria, prendi } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Entra, Messaggio, Numero, Pulsante, SchedeInArrivo, Sezione, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { coloreTono, F, usePalette, velo } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { altezzaAl, bmi, dataCorta, differenza, fasciaBmi, METRICHE, numero, oggi, serie, valore, type Metrica } from './calcoli'
import { ConsensoCorpo as PaginaConsenso, ImpostazioniCorpo } from './ConsensoCorpo'
import { Grafico } from './Grafico'

// Athlon Health System -> Il tuo corpo (16/10/2026; in cima dal 19/10): altezza e peso (col BMI), e se il socio
// li ha le circonferenze e la composizione (massa grassa e magra). In cima
// l'ultimo peso e il BMI, poi l'andamento di una metrica a scelta, gli ultimi
// valori e lo storico. Una misurazione per giorno: riscriverla la sostituisce.
//
// L'altezza si scrive una volta sola, la prima: da li' in poi il foglio e' la
// registrazione del peso, e l'altezza compare in sola lettura. Non e' una
// scelta dell'interfaccia soltanto: la funzione che salva ignora un'altezza
// nuova quando il socio ne ha gia' una, quindi non si cambia nemmeno da fuori.
//
// **Il consenso** (20/10/2026): le misure sono dati sulla salute. Senza un consenso vivo la funzione non le
// restituisce (`consenso: null`) e questa schermata mostra la pagina del consenso (ConsensoCorpo.tsx) al posto dei dati;
// con il consenso, in fondo, l'informativa e il pulsante per ritirarlo. `consenso` assente (`undefined`) e' una
// funzione che non lo conosce ancora: la schermata e' quella di sempre, senza blocco e senza comando.

export const CHIAVE_MISURE = 'misure:elenco'

type Campo = keyof Omit<NuovaMisura, 'data' | 'note'>

const CIRCONFERENZE: { chiave: Campo; nome: string }[] = [
  { chiave: 'vita_cm', nome: 'Vita' },
  { chiave: 'fianchi_cm', nome: 'Fianchi' },
  { chiave: 'petto_cm', nome: 'Petto' },
  { chiave: 'braccio_cm', nome: 'Braccio' },
  { chiave: 'coscia_cm', nome: 'Coscia' },
]

type Bozza = { id: string | null; data: string } & Record<Campo, string>

/** L'altezza gia' segnata: la prima misurazione che la porta. */
export type AltezzaNota = { cm: number; data: string }

export function altezzaNota(misure: Misura[]): AltezzaNota | null {
  const m = misure.find((x) => x.altezza_cm != null)
  return m?.altezza_cm != null ? { cm: m.altezza_cm, data: m.data } : null
}

const testo = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))
const daTesto = (t: string) => (t.trim() ? Number(t.replace(',', '.')) : null)

function bozzaDa(m: Misura | null, altezza: number | null): Bozza {
  return {
    id: m?.id ?? null,
    data: m?.data ?? oggi(),
    altezza_cm: testo(m ? m.altezza_cm : altezza),
    peso_kg: testo(m?.peso_kg),
    vita_cm: testo(m?.vita_cm),
    fianchi_cm: testo(m?.fianchi_cm),
    petto_cm: testo(m?.petto_cm),
    braccio_cm: testo(m?.braccio_cm),
    coscia_cm: testo(m?.coscia_cm),
    massa_grassa_pct: testo(m?.massa_grassa_pct),
    massa_magra_kg: testo(m?.massa_magra_kg),
  }
}

function CampoNumero({ etichetta, unita, value, onChange, placeholder }: { etichetta: string; unita: string; value: string; onChange: (t: string) => void; placeholder?: string }) {
  const p = usePalette()
  return (
    <View style={{ flex: 1, minWidth: 130, gap: 4 }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{etichetta.toUpperCase()}</Text>
      <View style={[stili.campo, { backgroundColor: p.incavo }]}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^\d.,]/g, '').slice(0, 5))}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? '—'}
          placeholderTextColor={p.testoTerzo}
          style={[stili.input, { color: p.testo }]}
          accessibilityLabel={`${etichetta} in ${unita}`}
        />
        <Text style={[stili.unita, { color: p.testoTerzo }]}>{unita}</Text>
      </View>
    </View>
  )
}

function FoglioMisura({
  bozza,
  esiste,
  altezza,
  onChiudi,
  onSalvata,
}: {
  bozza: Bozza | null
  esiste: boolean
  /** Se c'e', l'altezza non si chiede piu': si mostra e basta. */
  altezza: AltezzaNota | null
  onChiudi: () => void
  onSalvata: () => void
}) {
  const p = usePalette()
  const [b, setB] = useState<Bozza | null>(bozza)
  const [altri, setAltri] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => {
    setB(bozza)
    setErrore(null)
    setAltri(!!bozza && [...CIRCONFERENZE.map((c) => c.chiave), 'massa_grassa_pct' as const, 'massa_magra_kg' as const].some((k) => bozza[k]))
  }, [bozza])

  if (!b) return <Foglio aperto={false} titolo="" onChiudi={onChiudi}>{null}</Foglio>
  const cambia = (k: keyof Bozza, v: string) => setB((x) => (x ? { ...x, [k]: v } : x))
  const anteprima = bmi(daTesto(b.peso_kg), altezza ? altezza.cm : daTesto(b.altezza_cm))

  async function salva() {
    if (!b) return
    setErrore(null)
    if (!b.data) return setErrore('Scrivi la data della misurazione.')
    if (!altezza && !daTesto(b.altezza_cm)) return setErrore('Scrivi la tua altezza: la segni solo questa volta.')
    if (!daTesto(b.peso_kg)) return setErrore('Scrivi il peso.')
    setInCorso(true)
    const corpo: NuovaMisura = { data: b.data }
    // Con l'altezza gia' segnata non la si manda: resta quella della prima volta.
    const campi = [...(altezza ? [] : ['altezza_cm']), 'peso_kg', ...CIRCONFERENZE.map((c) => c.chiave), 'massa_grassa_pct', 'massa_magra_kg'] as Campo[]
    for (const k of campi) corpo[k] = daTesto(b[k])
    const r = await salvaMisura(corpo)
    setInCorso(false)
    if (!r.ok) {
      colpetto('errore')
      return setErrore(r.errore)
    }
    colpetto('ok')
    onSalvata()
  }

  async function togli() {
    if (!b?.id) return
    setInCorso(true)
    const r = await eliminaMisura(b.id)
    setInCorso(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvata()
  }

  return (
    <Foglio
      aperto
      titolo={esiste ? 'Modifica la misurazione' : altezza ? 'Nuovo peso' : 'Le tue misure'}
      sottotitolo={esiste ? 'Una al giorno: se la riscrivi, sostituisce quella dello stesso giorno.' : altezza ? 'Uno al giorno: se lo riscrivi, sostituisce quello dello stesso giorno.' : 'L’altezza la segni solo adesso, la prima volta. Poi registri il peso.'}
      onChiudi={onChiudi}
    >
      <View style={{ gap: spazio.tre }}>
        {/* In riga: in colonna il flex del campo lo schiaccerebbe sopra i campi sotto. */}
        <View style={{ flexDirection: 'row' }}>
          <CampoData etichetta="Data" value={b.data} onChange={(v) => cambia('data', v)} min="2000-01-01" max={oggi()} annoIniziale={new Date().getFullYear()} sfondo={p.incavo} />
        </View>
        {altezza ? (
          <>
            <View style={stili.griglia}>
              <CampoNumero etichetta="Peso" unita="kg" value={b.peso_kg} onChange={(t) => cambia('peso_kg', t)} placeholder="es. 72,5" />
            </View>
            <View style={[stili.fissa, { borderColor: p.linea }]}>
              <Icona nome="lucchetto" size={15} colore={p.testoTerzo} />
              <Text style={[stili.piccola, { color: p.testoSecondario, flex: 1 }]}>
                {'Altezza '}
                <Text style={{ fontFamily: F.extra, color: p.testo }}>{`${numero(altezza.cm)} cm`}</Text>
                {`, segnata il ${dataCorta(altezza.data)}: non si modifica.`}
              </Text>
            </View>
          </>
        ) : (
          <View style={stili.griglia}>
            <CampoNumero etichetta="Altezza" unita="cm" value={b.altezza_cm} onChange={(t) => cambia('altezza_cm', t)} placeholder="es. 175" />
            <CampoNumero etichetta="Peso" unita="kg" value={b.peso_kg} onChange={(t) => cambia('peso_kg', t)} placeholder="es. 72,5" />
          </View>
        )}
        {anteprima ? (
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
            BMI <Text style={{ fontFamily: F.extra, color: coloreTono(p, fasciaBmi(anteprima).tono) }}>{numero(anteprima)}</Text> · {fasciaBmi(anteprima).nome.toLowerCase()}
          </Text>
        ) : null}

        <Tocco onPress={() => setAltri((x) => !x)} etichetta="Circonferenze e composizione" stato={{ selected: altri }} style={[stili.apri, { borderColor: p.linea }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.apriTitolo, { color: p.testo }]}>Circonferenze e composizione</Text>
            <Text style={[stili.piccola, { color: p.testoSecondario }]}>Facoltative: vita, fianchi, petto, braccio, coscia, massa grassa e magra</Text>
          </View>
          <Icona nome={altri ? 'meno' : 'piu'} size={18} colore={p.testoSecondario} />
        </Tocco>
        {altri ? (
          <View style={{ gap: spazio.tre }}>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>Misura col metro da sarta, sulla pelle, sempre nello stesso punto: la vita all’altezza dell’ombelico, braccio e coscia nel punto più largo.</Text>
            <View style={stili.griglia}>
              {CIRCONFERENZE.map((c) => (
                <CampoNumero key={c.chiave} etichetta={c.nome} unita="cm" value={b[c.chiave]} onChange={(t) => cambia(c.chiave, t)} />
              ))}
            </View>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              La composizione la dà una bilancia impedenziometrica o la plicometria di un istruttore. Basta uno dei due valori: l’altro lo calcoliamo dal peso.
            </Text>
            <View style={stili.griglia}>
              <CampoNumero etichetta="Massa grassa" unita="%" value={b.massa_grassa_pct} onChange={(t) => cambia('massa_grassa_pct', t)} placeholder="es. 18" />
              <CampoNumero etichetta="Massa magra" unita="kg" value={b.massa_magra_kg} onChange={(t) => cambia('massa_magra_kg', t)} placeholder="es. 58" />
            </View>
          </View>
        ) : null}

        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo="Salva" icona="spunta" onPress={salva} inCorso={inCorso} />
        {esiste ? <Pulsante testo="Togli questa misurazione" variante="fantasma" onPress={togli} disabilitato={inCorso} /> : null}
      </View>
    </Foglio>
  )
}

/** La barra del BMI, da 15 a 35, coi quattro colori delle fasce e il segno del valore. */
function BarraBmi({ v }: { v: number }) {
  const p = usePalette()
  const da = 15
  const a = 35
  const pos = Math.max(0, Math.min(1, (v - da) / (a - da)))
  const fasce = [
    { fino: 18.5, colore: p.blu },
    { fino: 25, colore: p.ok },
    { fino: 30, colore: p.attenzione },
    { fino: a, colore: p.errore },
  ]
  let prima = da
  const tacche = [18.5, 25, 30]
  return (
    <View style={{ gap: 4 }}>
      <View style={{ height: 20, justifyContent: 'center' }}>
        <View style={stili.barra}>
          {fasce.map((f) => {
            const larg = (f.fino - prima) / (a - da)
            prima = f.fino
            return <View key={f.fino} style={{ flex: larg, backgroundColor: f.colore, opacity: 0.85 }} />
          })}
        </View>
        <View style={[stili.segno, { left: `${pos * 100}%`, borderColor: p.carta, backgroundColor: p.testo }]} />
      </View>
      <View style={{ height: 16 }}>
        {tacche.map((t) => (
          <Text key={t} style={[stili.piccola, { color: p.testoTerzo, position: 'absolute', width: 40, marginLeft: -20, textAlign: 'center', left: `${((t - da) / (a - da)) * 100}%` }]}>
            {numero(t)}
          </Text>
        ))}
      </View>
    </View>
  )
}

export function Misure() {
  const p = usePalette()
  const [misure, setMisure] = useState<Misura[] | null>(() => inMemoria<{ misure: Misura[] }>(CHIAVE_MISURE)?.misure ?? null)
  // null: la funzione dice che manca il consenso; undefined: non si sa (o una funzione che non lo conosce).
  const [consenso, setConsenso] = useState<ConsensoCorpo | null | undefined>(() => inMemoria<{ consenso?: ConsensoCorpo | null }>(CHIAVE_MISURE)?.consenso)
  const [errore, setErrore] = useState<string | null>(null)
  const [metrica, setMetrica] = useState<Metrica>('peso')
  const [bozza, setBozza] = useState<{ b: Bozza; esiste: boolean } | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_MISURE, elencoMisure)
    if (r.ok) {
      setMisure(r.misure)
      setConsenso(r.consenso)
    } else setErrore(r.errore)
  }, [])

  // Dopo il consenso o la revoca cambia tutto quello che dipende dalle misure (Fit, Balance, calorie): si butta la memoria.
  const rileggi = () => {
    dimentica()
    setMisure(null)
    setConsenso(undefined)
    carica()
  }

  useEffect(() => {
    carica()
  }, [carica])

  const disponibili = useMemo(() => (misure ? METRICHE.filter((m) => serie(misure, m.chiave).length) : []), [misure])

  if (!misure) {
    return (
      <Schermata sopratitolo="Athlon Health System" titolo="Il tuo corpo" indietro="/allenamento" barra={false}>
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo quante={2} />
        )}
      </Schermata>
    )
  }

  if (consenso === null) {
    return (
      <Schermata sopratitolo="Athlon Health System" titolo="Il tuo corpo" indietro="/allenamento" barra={false}>
        <PaginaConsenso onConsenso={rileggi} />
      </Schermata>
    )
  }

  const impostazioni = consenso ? <ImpostazioniCorpo consenso={consenso} onRevocato={rileggi} /> : null
  const n = misure.length
  const altezza = n ? altezzaAl(misure, n - 1) : null
  const fissa = altezzaNota(misure)
  const nuova = () => setBozza({ b: bozzaDa(misure.find((m) => m.data === oggi()) ?? null, altezza), esiste: misure.some((m) => m.data === oggi()) })
  const salvata = () => {
    setBozza(null)
    // Anche «Il tuo corpo», in cima all'Athlon Health System, mostra peso e BMI.
    dimentica()
    setMisure(null)
    carica()
  }
  const foglio = <FoglioMisura bozza={bozza?.b ?? null} esiste={!!bozza?.esiste} altezza={fissa} onChiudi={() => setBozza(null)} onSalvata={salvata} />

  if (!n) {
    return (
      <Schermata sopratitolo="Athlon Health System" titolo="Il tuo corpo" indietro="/allenamento" barra={false}>
        <Carta style={{ alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.cinque }}>
          <View style={[stili.bollo, { backgroundColor: velo(p, 'accento') }]}>
            <Icona nome="grafico" size={30} colore={p.accento} />
          </View>
          <Text style={[stili.titolo, { color: p.testo, textAlign: 'center' }]}>Segui come cambi</Text>
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
            Segna altezza e peso: calcoliamo il tuo BMI e ti mostriamo l’andamento nel tempo. Se li hai, aggiungi circonferenze, massa grassa e massa magra.
          </Text>
          <Pulsante testo="Aggiungi i tuoi dati" icona="piu" onPress={nuova} />
        </Carta>
        {impostazioni}
        {foglio}
      </Schermata>
    )
  }

  const ultimaPeso = [...misure].reverse().find((m) => m.peso_kg != null)
  const iPeso = serie(misure, 'peso')
  const iBmi = serie(misure, 'bmi')
  const bmiOra = iBmi.length ? iBmi[iBmi.length - 1].valore : null
  const fascia = bmiOra != null ? fasciaBmi(bmiOra) : null
  const scelta = disponibili.find((m) => m.chiave === metrica) ?? disponibili[0]
  const punti = scelta ? serie(misure, scelta.chiave) : []

  // Gli ultimi valori di circonferenze e composizione, con la differenza dal precedente.
  const riquadri = METRICHE.filter((m) => !['peso', 'bmi'].includes(m.chiave))
    .map((m) => {
      const s = serie(misure, m.chiave)
      if (!s.length) return null
      const ora = s[s.length - 1].valore
      return { ...m, ora, diff: s.length > 1 ? ora - s[s.length - 2].valore : null }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)

  return (
    <Schermata sopratitolo="Athlon Health System" titolo="Il tuo corpo" indietro="/allenamento" barra={false}>
      <Entra indice={0}>
        <Carta style={{ gap: spazio.tre }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spazio.tre }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.etichetta, { color: p.testoSecondario }]}>PESO</Text>
              {ultimaPeso?.peso_kg != null ? <Numero valore={numero(ultimaPeso.peso_kg)} unita="kg" size={40} /> : <Text style={[stili.nota, { color: p.testoTerzo }]}>Non ancora segnato</Text>}
              {iPeso.length > 1 ? (
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                  {`${differenza(iPeso[iPeso.length - 1].valore - iPeso[iPeso.length - 2].valore)} kg dall’ultima volta · ${differenza(iPeso[iPeso.length - 1].valore - iPeso[0].valore)} kg dal ${dataCorta(iPeso[0].data)}`}
                </Text>
              ) : ultimaPeso ? (
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`Il ${dataCorta(ultimaPeso.data)}`}</Text>
              ) : null}
            </View>
            {bmiOra != null && fascia ? (
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[stili.etichetta, { color: p.testoSecondario }]}>BMI</Text>
                <Text style={[stili.bmi, { color: coloreTono(p, fascia.tono) }]}>{numero(bmiOra)}</Text>
                <Tag testo={fascia.nome} colore={coloreTono(p, fascia.tono)} />
              </View>
            ) : null}
          </View>
          {bmiOra != null ? <BarraBmi v={bmiOra} /> : <Text style={[stili.piccola, { color: p.testoSecondario }]}>Aggiungi l’altezza per calcolare il BMI.</Text>}
          {bmiOra != null ? (
            <Text style={[stili.piccola, { color: p.testoTerzo, marginTop: spazio.due }]}>
              {`Altezza ${numero(altezza ?? 0)} cm. Il BMI è un’indicazione generale: non distingue i muscoli dal grasso, per questo conta anche la composizione.`}
            </Text>
          ) : null}
        </Carta>
      </Entra>

      <Sezione titolo="Andamento">
        <View style={{ gap: spazio.tre }}>
          {disponibili.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila} style={stili.fuori}>
              {disponibili.map((m) => {
                const attivo = m.chiave === scelta?.chiave
                return (
                  <Tocco
                    key={m.chiave}
                    vibra="scelta"
                    stato={{ selected: attivo }}
                    onPress={() => setMetrica(m.chiave)}
                    etichetta={m.nome}
                    style={[stili.filtro, { backgroundColor: attivo ? p.testo : p.carta, borderColor: attivo ? p.testo : p.linea }]}
                  >
                    <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 14 }}>{m.nome}</Text>
                  </Tocco>
                )
              })}
            </ScrollView>
          ) : null}
          {scelta ? (
            <Carta style={{ gap: spazio.due }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spazio.due }}>
                <Text style={[stili.titolo, { color: p.testo, flex: 1 }]}>{scelta.nome}</Text>
                {punti.length > 1 ? (
                  <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${differenza(punti[punti.length - 1].valore - punti[0].valore)}${scelta.unita ? ` ${scelta.unita}` : ''} in ${punti.length} misurazioni`}</Text>
                ) : null}
              </View>
              <Grafico punti={punti} unita={scelta.unita} colore={scelta.chiave === 'bmi' && fascia ? coloreTono(p, fascia.tono) : undefined} />
              {punti.length < 2 ? <Text style={[stili.piccola, { color: p.testoSecondario, textAlign: 'center' }]}>Con la prossima misurazione vedi la linea dell’andamento.</Text> : null}
            </Carta>
          ) : null}
        </View>
      </Sezione>

      {riquadri.length ? (
        <Sezione titolo="Circonferenze e composizione">
          <View style={stili.griglia}>
            {riquadri.map((r) => (
              <Tocco key={r.chiave} onPress={() => setMetrica(r.chiave)} etichetta={`Andamento: ${r.nome}`} style={[stili.riquadro, { backgroundColor: p.carta, borderColor: r.chiave === scelta?.chiave ? p.accento : p.linea }]}>
                <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{r.nome.toUpperCase()}</Text>
                <Text style={[stili.riquadroValore, { color: p.testo }]}>
                  {numero(r.ora)}
                  <Text style={[stili.unita, { color: p.testoTerzo }]}>{` ${r.unita}`}</Text>
                </Text>
                {r.diff != null ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{`${differenza(r.diff)} ${r.unita}`}</Text> : null}
              </Tocco>
            ))}
          </View>
        </Sezione>
      ) : null}

      <Pulsante testo={fissa ? 'Registra il peso' : 'Aggiungi una misurazione'} icona="piu" onPress={nuova} />

      <Sezione titolo="Storico" conteggio={n}>
        <Carta style={{ paddingVertical: spazio.uno, paddingHorizontal: spazio.tre }}>
          {[...misure].reverse().map((m, i) => {
            const idx = n - 1 - i
            const b = valore(misure, idx, 'bmi')
            const parti = [
              m.peso_kg != null ? `${numero(m.peso_kg)} kg` : null,
              b != null ? `BMI ${numero(b)}` : null,
              m.vita_cm != null ? `vita ${numero(m.vita_cm)} cm` : null,
              m.massa_grassa_pct != null ? `grassa ${numero(m.massa_grassa_pct)}%` : null,
            ].filter(Boolean)
            return (
              <Tocco
                key={m.id}
                onPress={() => setBozza({ b: bozzaDa(m, altezza), esiste: true })}
                etichetta={`Misurazione del ${dataCorta(m.data)}`}
                scala={0.99}
                style={[stili.riga, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[stili.rigaData, { color: p.testo }]}>{dataCorta(m.data)}</Text>
                  <Text style={[stili.piccola, { color: p.testoSecondario }]} numberOfLines={1}>
                    {parti.join(' · ') || 'Circonferenze'}
                  </Text>
                </View>
                <Icona nome="modifica" size={16} colore={p.testoTerzo} />
              </Tocco>
            )
          })}
        </Carta>
      </Sezione>

      {impostazioni}
      {foglio}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  etichetta: { fontFamily: F.extra, fontSize: 11, letterSpacing: 0.8 },
  campo: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: spazio.tre, height: 54 },
  input: { flex: 1, fontFamily: F.extra, fontSize: 20, minWidth: 0, height: 54 },
  unita: { fontFamily: F.bold, fontSize: 13 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17 },
  titolo: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 },
  apri: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: spazio.tre },
  apriTitolo: { fontFamily: F.extra, fontSize: 15 },
  bollo: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bmi: { fontFamily: F.extra, fontSize: 32, letterSpacing: -1 },
  barra: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  segno: { position: 'absolute', top: 0, width: 20, height: 20, marginLeft: -10, borderRadius: 10, borderWidth: 3 },
  fila: { gap: spazio.due, paddingHorizontal: spazio.tre + 2, paddingVertical: 4 },
  fuori: { marginHorizontal: -(spazio.tre + 2), flexGrow: 0 },
  filtro: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: spazio.tre, borderWidth: StyleSheet.hairlineWidth },
  riquadro: { flexGrow: 1, flexBasis: '30%', minWidth: 100, borderRadius: 20, padding: spazio.tre, gap: 3, borderWidth: 1 },
  riquadroValore: { fontFamily: F.extra, fontSize: 22, letterSpacing: -0.5 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  rigaData: { fontFamily: F.extra, fontSize: 15.5 },
  fissa: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: spazio.tre, paddingVertical: spazio.due + 2 },
})
