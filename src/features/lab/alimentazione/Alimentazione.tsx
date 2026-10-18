import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg'

import {
  catalogoAlimenti,
  mostraNumeri,
  PASTI,
  revocaConsenso,
  statoAlimentazione,
  togliDalDiario,
  type Alimento,
  type Pasto,
  type Profilo,
  type VoceDiario,
} from '@/api/alimentazione'
import { presenzeLezioni, storicoAllenamenti, type SedutaStorico } from '@/api/lab'
import { spazio } from '@/theme'

import { inMemoria, prendi, ricorda } from '../memoria'
import { useStatoCorpo } from '../schede/CalorieLezione'
import { CHIAVE_PRESENZE, useProgresso, type Presenze } from '../schede/ContatoreCalorie'
import { contaCalorie, vociCalorie } from '../schede/contatoreCalorie'
import { CHIAVE_STORICO } from '../schede/Storico'
import { Icona } from '../ui/Icona'
import { Barra, Bollino, Carta, Entra, Messaggio, Pulsante, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, NOTTE, ORTO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { AggiungiAlimento } from './Aggiungi'
import { CHIAVE_CATALOGO, CHIAVE_DIARIO, CHIAVE_STATO, GIORNI_DIARIO, leggiDiarioRecente } from './chiavi'
import { consigliPer } from './consigli'
import { consumoDelGiorno, LARN, oggiRoma, perPasto, ripartizione, somma, ZERO, type Totali } from './conti'
import { FotoPiatto } from './FotoPiatto'
import { QuestionarioAlimentazione } from './Questionario'
import { Vetrina } from './Vetrina'

// La sezione Alimentazione (19/10/2026): educazione alimentare, richiesta dal club.
// In quest'ordine, e ogni passo chiude quelli dopo:
//   1. la vetrina col consenso all'informativa (Vetrina.tsx): senza, niente;
//   2. il questionario (Questionario.tsx);
//   3. il diario del giorno: il bilancio con quello che si consuma (le stime del
//      contatore delle calorie), i nutrienti coi riferimenti dei LARN, i pasti, i
//      consigli scelti per il socio (consigli.ts) e le impostazioni, dove si rifa'
//      il questionario, si nascondono i numeri e si revoca il consenso.
// Nella vista cliente dello staff la sezione non si apre: sono dati sulla salute.

const GIORNI = GIORNI_DIARIO

const intero = (n: number) => Math.round(n).toLocaleString('it-IT')
const giornoLungo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

function spostaGiorno(giorno: string, n: number): string {
  const d = new Date(`${giorno}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Il pasto dell'ora di adesso, a Roma: quello a cui va la foto aperta da Fit. */
function pastoDellOra(): Pasto {
  const ora = Number(new Intl.DateTimeFormat('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }).format(new Date()))
  return ora < 11 ? 'colazione' : ora < 16 ? 'pranzo' : ora < 19 ? 'spuntino' : 'cena'
}

function nomeGiorno(g: string, oggi: string): string {
  if (g === oggi) return 'Oggi'
  if (g === spostaGiorno(oggi, -1)) return 'Ieri'
  const s = giornoLungo.format(new Date(`${g}T12:00:00Z`))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ---------------------------------------------------------------------------
// In cima: il bilancio del giorno

function Bilancio({ t, consumo, nascondi, mancaCorpo }: { t: Totali; consumo: { riposo: number; attivita: number; totale: number } | null; nascondi: boolean; mancaCorpo: string | null }) {
  const a = useProgresso(1300)
  const r = 58
  const giro = 2 * Math.PI * r
  // Con i numeri nascosti l'anello non dice quanto: pieno se c'e' qualcosa nel diario.
  const quota = !nascondi && consumo && consumo.totale > 0 ? Math.min(1, t.kcal / consumo.totale) : t.voci ? 1 : 0
  return (
    <LinearGradient colors={NOTTE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.bilancio}>
      <View style={stili.bilancioRiga}>
        <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Defs>
              <SvgGradient id="orto" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={ORTO[0]} />
                <Stop offset="1" stopColor={ORTO[1]} />
              </SvgGradient>
            </Defs>
            <Circle cx={70} cy={70} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={14} fill="none" />
            <Circle
              cx={70}
              cy={70}
              r={r}
              stroke="url(#orto)"
              strokeWidth={14}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${giro} ${giro}`}
              strokeDashoffset={giro * (1 - quota * a)}
              transform="rotate(-90 70 70)"
            />
          </Svg>
          <View style={stili.anelloCentro}>
            {nascondi ? (
              <Icona nome="piatto" size={34} colore="#fff" />
            ) : (
              <>
                <Text style={stili.anelloNumero}>{intero(t.kcal * a)}</Text>
                <Text style={stili.anelloSotto}>kcal mangiate</Text>
              </>
            )}
          </View>
        </View>
        <View style={{ flex: 1, gap: spazio.due }}>
          {nascondi ? (
            <>
              <Text style={stili.bilancioTitolo}>{t.voci ? `${t.voci} ${t.voci === 1 ? 'cosa scritta' : 'cose scritte'}` : 'Ancora niente'}</Text>
              <Text style={stili.bilancioTesto}>I numeri sono nascosti: li riaccendi dalle impostazioni, in fondo.</Text>
            </>
          ) : consumo ? (
            <>
              <View>
                <Text style={stili.bilancioEtichetta}>CONSUMO STIMATO</Text>
                <Text style={stili.bilancioTitolo}>{`${intero(consumo.totale)} kcal`}</Text>
              </View>
              <Text style={stili.bilancioTesto}>{`Riposo e vita di tutti i giorni ${intero(consumo.riposo)}, allenamento ${intero(consumo.attivita)}.`}</Text>
            </>
          ) : (
            <Text style={stili.bilancioTesto}>{mancaCorpo ?? 'Calcoliamo il consumo…'}</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

/** I tre nutrienti, con la quota dell'energia e l'intervallo di riferimento dei LARN. */
function Nutrienti({ t, kg }: { t: Totali; kg: number | null }) {
  const p = usePalette()
  const q = ripartizione(t)
  if (!q) return null
  const righe = [
    { nome: 'Carboidrati', g: t.carboidrati, pct: q.carboidrati, rif: `${LARN.carboidrati[0]}–${LARN.carboidrati[1]}%`, colore: '#F2B84B' },
    { nome: 'Grassi', g: t.grassi, pct: q.grassi, rif: `${LARN.grassi[0]}–${LARN.grassi[1]}%`, colore: '#FF8A5B' },
    { nome: 'Proteine', g: t.proteine, pct: q.proteine, rif: kg ? `${(t.proteine / kg).toFixed(1).replace('.', ',')} g/kg` : null, colore: ORTO[1] },
  ]
  return (
    <Carta style={{ gap: spazio.tre }}>
      {righe.map((r, i) => (
        <View key={r.nome} style={{ gap: 6 }}>
          <View style={stili.nutrienteRiga}>
            <Text style={[stili.nome, { color: p.testo, flex: 1 }]}>{r.nome}</Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${intero(r.g)} g · ${intero(r.pct)}%`}</Text>
          </View>
          <Barra valore={r.pct / 100} colore={r.colore} altezza={8} animata ritardo={200 + i * 120} />
          {r.rif ? <Text style={[stili.piccola, { color: p.testoTerzo }]}>{r.nome === 'Proteine' ? `Oggi ${r.rif} di peso: il riferimento per gli adulti è 0,9, per chi si allena con regolarità 1,2–2.` : `Riferimento per gli adulti: ${r.rif} dell’energia.`}</Text> : null}
        </View>
      ))}
      <Text style={[stili.piccola, { color: p.testoTerzo }]}>{`Fibre ${intero(t.fibre)} g (riferimento: almeno 25 g al giorno). Riferimenti: SINU, LARN 2014; ACSM 2016.`}</Text>
    </Carta>
  )
}

function CartaPasto({ nome, voci, nascondi, onAggiungi, onFoto, onTogli }: { nome: string; voci: VoceDiario[]; nascondi: boolean; onAggiungi: () => void; onFoto: () => void; onTogli: (v: VoceDiario) => void }) {
  const p = usePalette()
  const kcal = voci.reduce((s, v) => s + v.kcal, 0)
  return (
    <Carta style={{ gap: spazio.due }}>
      <View style={stili.pastoTesta}>
        <Text style={[stili.titoletto, { color: p.testo, flex: 1 }]}>{nome}</Text>
        {voci.length && !nascondi ? <Text style={[stili.nome, { color: p.testoSecondario }]}>{`${intero(kcal)} kcal`}</Text> : null}
      </View>
      {voci.map((v) => (
        <View key={v.id} style={[stili.voce, { borderTopColor: p.linea }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[stili.nome, { color: p.testo }]}>{v.nome}</Text>
            {nascondi && v.origine !== 'foto' ? null : (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {[nascondi ? null : `${intero(v.grammi)} g · ${intero(v.kcal)} kcal`, v.origine === 'foto' ? 'dalla foto' : null].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          <Tocco onPress={() => onTogli(v)} etichetta={`Togli ${v.nome}`} style={[stili.tondo, { backgroundColor: p.incavo }]}>
            <Icona nome="cestino" size={16} colore={p.testoSecondario} />
          </Tocco>
        </View>
      ))}
      <View style={stili.azioni}>
        <View style={{ flex: 1 }}>
          <Pulsante testo="Aggiungi" icona="piu" variante="secondario" piccolo onPress={onAggiungi} />
        </View>
        <View style={{ flex: 1 }}>
          <Pulsante testo="Foto" icona="fotocamera" variante="secondario" piccolo onPress={onFoto} />
        </View>
      </View>
    </Carta>
  )
}

// ---------------------------------------------------------------------------
// Il diario, con il consenso e il questionario gia' fatti

function Diario({ profilo, onProfilo, onRevocato }: { profilo: Profilo; onProfilo: (p: Profilo) => void; onRevocato: () => void }) {
  const p = usePalette()
  const corpo = useStatoCorpo()
  const oggi = oggiRoma()
  const [giorno, setGiorno] = useState(oggi)
  const [voci, setVoci] = useState<VoceDiario[] | null>(() => inMemoria<{ voci: VoceDiario[] }>(CHIAVE_DIARIO)?.voci ?? null)
  const [catalogo, setCatalogo] = useState<Alimento[] | null>(() => inMemoria<{ alimenti: Alimento[] }>(CHIAVE_CATALOGO)?.alimenti ?? null)
  const [sedute, setSedute] = useState<SedutaStorico[] | null>(() => inMemoria<{ allenamenti: SedutaStorico[] }>(CHIAVE_STORICO)?.allenamenti ?? null)
  const [presenze, setPresenze] = useState<Presenze | null>(() => inMemoria<Presenze>(CHIAVE_PRESENZE) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [aggiungi, setAggiungi] = useState<Pasto | null>(null)
  // Da Fit, «Fotografa» apre il diario con la foto gia' pronta (`?foto=1`).
  const { foto: fotoSubito } = useLocalSearchParams<{ foto?: string }>()
  const [foto, setFoto] = useState<Pasto | null>(() => (fotoSubito === '1' ? pastoDellOra() : null))
  const [questionario, setQuestionario] = useState(false)
  const [revoca, setRevoca] = useState<'no' | 'chiedi' | 'in-corso'>('no')
  const [inCorsoNumeri, setInCorsoNumeri] = useState(false)
  const nascondi = profilo.nascondi_numeri

  useEffect(() => {
    let vivo = true
    prendi(CHIAVE_DIARIO, leggiDiarioRecente).then((r) => {
      if (!vivo) return
      if (r.ok) setVoci(r.voci)
      else setErrore(r.errore)
    })
    prendi(CHIAVE_CATALOGO, catalogoAlimenti).then((r) => vivo && r.ok && setCatalogo(r.alimenti))
    prendi(CHIAVE_STORICO, storicoAllenamenti).then((r) => vivo && setSedute(r.ok ? r.allenamenti : []))
    prendi(CHIAVE_PRESENZE, presenzeLezioni).then((r) => vivo && setPresenze((prima) => (r.ok ? r : (prima ?? { ok: true, presenze: [], schede: {} }))))
    return () => {
      vivo = false
    }
  }, [oggi])

  function aggiorna(nuove: VoceDiario[]) {
    setVoci((v) => {
      const tutte = [...(v ?? []), ...nuove]
      ricorda(CHIAVE_DIARIO, { ok: true, voci: tutte })
      return tutte
    })
  }

  async function togli(v: VoceDiario) {
    const prima = voci
    const senza = (voci ?? []).filter((x) => x.id !== v.id)
    setVoci(senza)
    const r = await togliDalDiario(v.id)
    if (r.ok) ricorda(CHIAVE_DIARIO, { ok: true, voci: senza })
    else {
      setVoci(prima)
      setErrore(r.errore)
    }
  }

  const delGiorno = useMemo(() => (voci ?? []).filter((v) => v.data === giorno), [voci, giorno])
  const totali = useMemo(() => somma(delGiorno), [delGiorno])
  const pasti = useMemo(() => perPasto(delGiorno), [delGiorno])

  // Il consumo e le attivita' dal contatore delle calorie: le stesse stime.
  const conto = useMemo(() => {
    if (corpo.stato !== 'ok' || !sedute || !presenze) return null
    return contaCalorie(vociCalorie(sedute, presenze.presenze, presenze.schede, corpo.corpo), corpo.corpo)
  }, [corpo, sedute, presenze])
  const consumo = useMemo(() => {
    if (corpo.stato !== 'ok' || !conto) return null
    return consumoDelGiorno(corpo.corpo, conto.voci.filter((v) => v.giorno === giorno))
  }, [corpo, conto, giorno])
  const mancaCorpo =
    corpo.stato === 'mancano-dati'
      ? corpo.motivo === 'misure'
        ? 'Per il consumo stimato servono peso e altezza: li aggiungi in «Il tuo corpo».'
        : corpo.motivo === 'sesso'
          ? 'Per il consumo stimato serve sapere se calcolare come uomo o come donna: lo scegli in una scheda di allenamento.'
          : 'Per il consumo stimato manca la data di nascita nella tua scheda del club.'
      : corpo.stato === 'no'
        ? 'Il consumo stimato usa una formula per gli adulti.'
        : null

  // I consigli: la media dei giorni scritti nell'ultima settimana, e le attivita' delle ultime quattro.
  const consigli = useMemo(() => {
    const dal = spostaGiorno(oggi, -6)
    const giorni = new Map<string, VoceDiario[]>()
    for (const v of voci ?? []) if (v.data >= dal) giorni.set(v.data, [...(giorni.get(v.data) ?? []), v])
    const n = giorni.size
    const tot = somma([...giorni.values()].flat())
    const media: Totali | null = n ? { kcal: tot.kcal / n, proteine: tot.proteine / n, carboidrati: tot.carboidrati / n, grassi: tot.grassi / n, fibre: tot.fibre / n, voci: tot.voci } : null
    return consigliPer({ q: profilo.questionario, kg: corpo.stato === 'ok' ? corpo.corpo.kg : null, media, giorniScritti: n, attivita: (conto?.perTipo ?? []).map((t) => t.tipo) })
  }, [voci, oggi, profilo, corpo, conto])

  async function cambiaNumeri() {
    setInCorsoNumeri(true)
    const r = await mostraNumeri(!nascondi)
    setInCorsoNumeri(false)
    if (r.ok) onProfilo(r.profilo)
    else setErrore(r.errore)
  }

  async function revocaTutto() {
    setRevoca('in-corso')
    const r = await revocaConsenso()
    if (!r.ok) {
      setRevoca('chiedi')
      return setErrore(r.errore)
    }
    ricorda(CHIAVE_DIARIO, { ok: true, voci: [] })
    onRevocato()
  }

  if (questionario) {
    return (
      <QuestionarioAlimentazione
        prima={profilo.questionario}
        onAnnulla={() => setQuestionario(false)}
        onFatto={(nuovo) => {
          onProfilo(nuovo)
          setQuestionario(false)
        }}
      />
    )
  }

  return (
    <>
      <Entra indice={0}>
        <View style={stili.giorni}>
          <Tocco onPress={() => setGiorno(spostaGiorno(giorno, -1))} spento={giorno <= spostaGiorno(oggi, -(GIORNI - 1))} etichetta="Giorno prima" style={[stili.tondo, { backgroundColor: p.carta }]}>
            <Icona nome="indietro" size={18} colore={p.testo} />
          </Tocco>
          <Text style={[stili.titoletto, { color: p.testo }]}>{nomeGiorno(giorno, oggi)}</Text>
          <Tocco onPress={() => setGiorno(spostaGiorno(giorno, 1))} spento={giorno >= oggi} etichetta="Giorno dopo" style={[stili.tondo, { backgroundColor: p.carta, opacity: giorno >= oggi ? 0.3 : 1 }]}>
            <Icona nome="avanti" size={18} colore={p.testo} />
          </Tocco>
        </View>
      </Entra>

      {errore ? <Messaggio>{errore}</Messaggio> : null}

      <Entra indice={1}>
        <Bilancio key={giorno} t={totali} consumo={consumo} nascondi={nascondi} mancaCorpo={mancaCorpo} />
      </Entra>

      {!voci ? (
        <SchedeInArrivo quante={2} />
      ) : (
        <>
          {!nascondi && totali.voci ? (
            <Entra indice={2}>
              <Sezione titolo="I nutrienti">
                <Nutrienti key={giorno} t={totali} kg={corpo.stato === 'ok' ? corpo.corpo.kg : null} />
              </Sezione>
            </Entra>
          ) : null}

          <Entra indice={3}>
            <Sezione titolo="I pasti">
              <View style={{ gap: spazio.tre }}>
                {PASTI.map((x) => (
                  <CartaPasto key={x.id} nome={x.nome} voci={pasti[x.id]} nascondi={nascondi} onAggiungi={() => setAggiungi(x.id)} onFoto={() => setFoto(x.id)} onTogli={togli} />
                ))}
              </View>
            </Sezione>
          </Entra>
        </>
      )}

      {consigli.length ? (
        <Entra indice={4}>
          <Sezione titolo="Per te">
            <View style={{ gap: spazio.tre }}>
              {consigli.map((c) => (
                <Carta key={c.id} style={stili.consiglio}>
                  <Bollino icona={c.icona} tono={c.tono} size={42} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[stili.nome, { color: p.testo }]}>{c.titolo}</Text>
                    <Text style={[stili.nota, { color: p.testoSecondario }]}>{c.testo}</Text>
                    <Text style={[stili.piccola, { color: p.testoTerzo }]}>{c.fonte}</Text>
                  </View>
                </Carta>
              ))}
            </View>
          </Sezione>
        </Entra>
      ) : null}

      <Entra indice={5}>
        <Sezione titolo="Impostazioni">
          <Carta style={{ gap: spazio.due }}>
            <Pulsante testo="Rifai il questionario" variante="secondario" icona="aggiorna" onPress={() => setQuestionario(true)} />
            <Pulsante testo={nascondi ? 'Mostra calorie e grammi' : 'Nascondi calorie e grammi'} variante="secondario" onPress={cambiaNumeri} inCorso={inCorsoNumeri} />
            {revoca === 'no' ? (
              <Pulsante testo="Revoca il consenso e cancella i dati" variante="pericolo" onPress={() => setRevoca('chiedi')} />
            ) : (
              <View style={{ gap: spazio.due }}>
                <Text style={[stili.nota, { color: p.testo }]}>Cancelliamo subito il diario, il questionario e il registro delle foto, e la sezione si richiude. Resta solo la registrazione del consenso e della revoca.</Text>
                <View style={stili.azioni}>
                  <View style={{ flex: 1 }}>
                    <Pulsante testo="Annulla" variante="secondario" piccolo onPress={() => setRevoca('no')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Pulsante testo="Revoca e cancella" variante="pericolo" piccolo inCorso={revoca === 'in-corso'} onPress={revocaTutto} />
                  </View>
                </View>
              </View>
            )}
          </Carta>
        </Sezione>
      </Entra>

      <Text style={[stili.piccola, { color: p.testoTerzo, paddingHorizontal: 2 }]}>
        Sono stime: i valori degli alimenti sono medi, la foto può sbagliare le quantità e il consumo è calcolato con le stesse formule del contatore delle calorie. È educazione alimentare, non una dieta né un parere medico: per un piano su misura serve un professionista.
      </Text>

      <AggiungiAlimento aperto={!!aggiungi} data={giorno} pasto={aggiungi ?? 'pranzo'} catalogo={catalogo} nascondiNumeri={nascondi} onChiudi={() => setAggiungi(null)} onAggiunte={aggiorna} />
      <FotoPiatto aperto={!!foto} data={giorno} pasto={foto ?? 'pranzo'} nascondiNumeri={nascondi} onChiudi={() => setFoto(null)} onAggiunte={aggiorna} />
    </>
  )
}

// ---------------------------------------------------------------------------
// La schermata

type Stato = Awaited<ReturnType<typeof statoAlimentazione>>

export function Alimentazione() {
  const p = usePalette()
  const vista = vistaCorrente()
  const [stato, setStato] = useState<Stato | null>(() => inMemoria<Stato>(CHIAVE_STATO) ?? null)

  useEffect(() => {
    if (vista) return
    let vivo = true
    prendi(CHIAVE_STATO, statoAlimentazione).then((r) => vivo && setStato(r))
    return () => {
      vivo = false
    }
  }, [vista])

  function aggiornaStato(cambia: (s: Extract<Stato, { ok: true }>) => Extract<Stato, { ok: true }>) {
    setStato((s) => {
      if (!s?.ok) return s
      const nuovo = cambia(s)
      ricorda(CHIAVE_STATO, nuovo)
      return nuovo
    })
  }

  const testata = { sopratitolo: 'Food', titolo: 'Il diario', indietro: '/allenamento?area=food' as const, barra: false }

  if (vista) {
    return (
      <Schermata {...testata}>
        <Messaggio tono="attenzione" titolo="Non visibile nella vista cliente">
          L’alimentazione contiene dati sulla salute: la vede solo il socio, dalla sua app.
        </Messaggio>
      </Schermata>
    )
  }
  if (!stato) {
    return (
      <Schermata {...testata}>
        <SchedeInArrivo quante={2} />
      </Schermata>
    )
  }
  if (!stato.ok) {
    return (
      <Schermata {...testata}>
        <Messaggio>{stato.errore}</Messaggio>
        <Pulsante testo="Riprova" variante="secondario" onPress={() => statoAlimentazione().then(setStato)} />
      </Schermata>
    )
  }
  if (!stato.maggiorenne) {
    return (
      <Schermata {...testata}>
        <Carta style={{ gap: spazio.due }}>
          <Text style={[stili.titoletto, { color: p.testo }]}>Una sezione per i maggiorenni</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            L’alimentazione è pensata per gli adulti. Se nella tua scheda del club manca la data di nascita, chiedi al desk di aggiungerla.
          </Text>
        </Carta>
      </Schermata>
    )
  }
  if (!stato.consenso) {
    return (
      <Schermata {...testata}>
        <Vetrina
          onConsenso={() => {
            statoAlimentazione().then((r) => {
              ricorda(CHIAVE_STATO, r)
              setStato(r)
            })
          }}
        />
      </Schermata>
    )
  }
  if (!stato.profilo) {
    return (
      <Schermata {...testata}>
        <Text style={[stili.nota, { color: p.testoSecondario, paddingHorizontal: 2 }]}>Nove domande, un minuto: servono a scegliere i consigli per te.</Text>
        <QuestionarioAlimentazione onFatto={(profilo) => aggiornaStato((s) => ({ ...s, profilo }))} />
      </Schermata>
    )
  }
  return (
    <Schermata {...testata}>
      <Diario
        profilo={stato.profilo}
        onProfilo={(profilo) => aggiornaStato((s) => ({ ...s, profilo }))}
        onRevocato={() => aggiornaStato((s) => ({ ...s, consenso: null, profilo: null }))}
      />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  giorni: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tondo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bilancio: { borderRadius: 28, padding: spazio.tre + 2 },
  bilancioRiga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  anelloCentro: { position: 'absolute', alignItems: 'center' },
  anelloNumero: { color: '#fff', fontFamily: F.extra, fontSize: 30 },
  anelloSotto: { color: 'rgba(255,255,255,0.6)', fontFamily: F.semi, fontSize: 12 },
  bilancioEtichetta: { color: 'rgba(255,255,255,0.55)', fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8 },
  bilancioTitolo: { color: '#fff', fontFamily: F.extra, fontSize: 22 },
  bilancioTesto: { color: 'rgba(255,255,255,0.75)', fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  nutrienteRiga: { flexDirection: 'row', alignItems: 'center' },
  pastoTesta: { flexDirection: 'row', alignItems: 'center' },
  voce: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.due },
  azioni: { flexDirection: 'row', gap: spazio.due },
  consiglio: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre },
  titoletto: { fontFamily: F.extra, fontSize: 18 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
})
