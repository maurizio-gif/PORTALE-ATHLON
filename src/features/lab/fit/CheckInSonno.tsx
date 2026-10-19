import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { salvaSonno, type GiornoDispositivo } from '@/api/dispositivi'
import { spazio } from '@/theme'

import { oggiRoma } from '../alimentazione/conti'
import { durata, durataFra, giornoBreve, minutiDelGiorno } from '../dispositivi/comune'
import type { Dispositivi } from '../dispositivi/useDispositivi'
import { spostaGiorno } from '../schede/contatoreCalorie'
import { Icona } from '../ui/Icona'
import { Carta, Messaggio, Pulsante } from '../ui/kit'
import { F, RELAX, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'

// Il check-in del sonno (20/10/2026): «a che ora sei andato a dormire e a che ora ti sei svegliato?»,
// una volta al mattino, in dieci secondi. E' la strada per chi non ha un anello o un orologio (e per le
// notti in cui non lo porta), e conta nel pilastro Relax dell'Athlon Health Score. Si sceglie la notte
// (le ultime sette, di partenza quella che finisce stamattina) e le due ore con due tasti, a un quarto
// d'ora per volta (tenendo premuto scorrono). **La durata non si scrive**: si ricava dalle due ore,
// anche attraverso la mezzanotte (23:30 -> 07:00 = 7 h 30), e la ricalcola anche la funzione.
// **Niente di precompilato che si salvi da solo**: le ore partono da quelle dell'ultima notte scritta
// (o 23:00 e 07:00) solo come punto di partenza, e contano quando si preme «Salva».
// **Non giudica**: nessuna frase dice se e' tanto o poco. Se per quella notte c'e' gia' il dato di un
// dispositivo, vale quello e qui si dice.

const PASSO = 15
const DI_PARTENZA = { letto: '23:00', sveglia: '07:00' }
/** Una notte da 2 a 16 ore, come la funzione. */
const MIN = 120
const MAX = 960

const nomeGiorno = (g: string, oggi: string) => (g === oggi ? 'Oggi' : g === spostaGiorno(oggi, -1) ? 'Ieri' : giornoBreve(g).split(' ').slice(0, 2).join(' '))

const ora = (minuti: number) => {
  const m = ((minuti % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Un tasto che sposta l'ora: un passo subito, e tenendolo premuto, dopo un attimo, scorre. Il passo si
 * fa all'appoggio del dito (non al rilascio) e `onPress` serve solo a chi non usa il puntatore (la tastiera).
 */
function TastoOra({ verso, etichetta, onPasso }: { verso: 1 | -1; etichetta: string; onPasso: (d: number) => void }) {
  const p = usePalette()
  const dalDito = useRef(false)
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null)
  const giro = useRef<ReturnType<typeof setInterval> | null>(null)
  const ferma = () => {
    if (attesa.current) clearTimeout(attesa.current)
    if (giro.current) clearInterval(giro.current)
    attesa.current = giro.current = null
  }
  useEffect(() => ferma, [])
  const passo = () => onPasso(verso * PASSO)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      onPressIn={() => {
        dalDito.current = true
        colpetto('scelta')
        passo()
        ferma()
        attesa.current = setTimeout(() => {
          giro.current = setInterval(passo, 90)
        }, 420)
      }}
      onPressOut={ferma}
      onPress={() => {
        // Con il dito il passo e' gia' stato fatto; la tastiera arriva solo qui.
        if (!dalDito.current) passo()
        dalDito.current = false
      }}
      style={[stili.tasto, { backgroundColor: p.incavo }]}
    >
      <Icona nome={verso === 1 ? 'piu' : 'meno'} size={22} colore={p.testo} />
    </Pressable>
  )
}

/** `onSposta` riceve di quanti minuti spostare l'ora: chi la chiama aggiorna lo stato in forma funzionale (il tasto che scorre non vede il valore di adesso). */
function SceltaOra({ titolo, valore, onSposta }: { titolo: string; valore: string; onSposta: (minuti: number) => void }) {
  const p = usePalette()
  return (
    <View style={{ gap: 6 }}>
      <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{titolo}</Text>
      <View style={stili.stepper}>
        <TastoOra verso={-1} etichetta={`${titolo}: un quarto d’ora prima`} onPasso={onSposta} />
        <View style={{ alignItems: 'center', flex: 1 }} accessibilityLiveRegion="polite" accessibilityLabel={`${titolo} ${valore}`}>
          <Text style={[stili.grande, { color: p.testo }]}>{valore}</Text>
        </View>
        <TastoOra verso={1} etichetta={`${titolo}: un quarto d’ora dopo`} onPasso={onSposta} />
      </View>
    </View>
  )
}

export function CheckInSonno({ disp, giorni }: { disp: Dispositivi; giorni: GiornoDispositivo[] }) {
  const p = usePalette()
  const oggi = oggiRoma()
  const sette = Array.from({ length: 7 }, (_, i) => spostaGiorno(oggi, -i))
  const [giorno, setGiorno] = useState(oggi)
  const [letto, setLetto] = useState(DI_PARTENZA.letto)
  const [sveglia, setSveglia] = useState(DI_PARTENZA.sveglia)
  const [modifica, setModifica] = useState(false)
  const [inCorso, setInCorso] = useState<'salva' | 'togli' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)

  const sue = giorni.filter((g) => g.data === giorno && g.sonno_minuti !== null)
  const dispositivo = sue.find((g) => g.fornitore !== 'manuale') ?? null
  const scritta = sue.find((g) => g.fornitore === 'manuale') ?? null
  // Le ore dell'ultima notte scritta a mano: di partenza per le altre.
  const ultima = giorni.filter((g) => g.fornitore === 'manuale' && g.sonno_a_letto && g.sonno_sveglia).sort((a, b) => b.data.localeCompare(a.data))[0] ?? null

  // Cambiando notte (o dopo un salvataggio) le ore ripartono da quelle scritte, o da quelle dell'ultima notte.
  useEffect(() => {
    const da = scritta?.sonno_a_letto && scritta.sonno_sveglia ? scritta : ultima
    setLetto(da?.sonno_a_letto ?? DI_PARTENZA.letto)
    setSveglia(da?.sonno_sveglia ?? DI_PARTENZA.sveglia)
    setModifica(false)
    setErrore(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giorno, scritta?.sonno_minuti, scritta?.sonno_a_letto, scritta?.sonno_sveglia])

  const minuti = durataFra(letto, sveglia)
  const valida = minuti >= MIN && minuti <= MAX

  async function invia(ore: { letto: string; sveglia: string } | null) {
    setInCorso(ore === null ? 'togli' : 'salva')
    setErrore(null)
    setFatto(null)
    const r = await salvaSonno(giorno, ore)
    setInCorso(null)
    if (!r.ok) return setErrore(r.errore)
    disp.imposta(r)
    setModifica(false)
    setFatto(ore === null ? 'Notte tolta.' : 'Salvato.')
  }

  const domanda = giorno === oggi ? 'Come hai dormito questa notte?' : `Come hai dormito la notte del ${giornoBreve(giorno)}?`
  const vedi = !dispositivo && (!scritta || modifica)

  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <View style={[stili.icona, { backgroundColor: RELAX[1] }]}>
          <Icona nome="foglia" size={20} colore="#fff" />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{domanda}</Text>
          <Text style={[stili.piccola, { color: p.testoSecondario }]}>A che ora sei andato a dormire e a che ora ti sei svegliato. Conta nel tuo Athlon Health Score.</Text>
        </View>
      </View>

      <View style={stili.giorni}>
        {sette.map((g) => {
          const scelto = g === giorno
          const haDato = giorni.some((x) => x.data === g && x.sonno_minuti !== null)
          return (
            <Tocco key={g} onPress={() => setGiorno(g)} vibra="scelta" ruolo="radio" stato={{ selected: scelto }} etichetta={`${nomeGiorno(g, oggi)}${haDato ? ', già scritta' : ''}`} style={[stili.giorno, { backgroundColor: scelto ? RELAX[2] : p.incavo }]}>
              <Text style={[stili.giornoTesto, { color: scelto ? '#fff' : p.testo }]}>{nomeGiorno(g, oggi)}</Text>
              {haDato ? <View style={[stili.punto, { backgroundColor: scelto ? '#fff' : RELAX[1] }]} /> : null}
            </Tocco>
          )
        })}
      </View>

      {dispositivo ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>{`Per questa notte c’è il dato del tuo dispositivo: ${durata(dispositivo.sonno_minuti ?? 0)}.`}</Text>
      ) : scritta && !modifica ? (
        <View style={{ gap: spazio.due }}>
          <Text style={[stili.grande, { color: p.testo }]}>{durata(scritta.sonno_minuti ?? 0)}</Text>
          {scritta.sonno_a_letto && scritta.sonno_sveglia ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>{`A letto alle ${scritta.sonno_a_letto}, sveglio alle ${scritta.sonno_sveglia}.`}</Text>
          ) : null}
          <View style={stili.azioni}>
            <View style={{ flex: 1 }}>
              <Pulsante testo="Cambia" icona="modifica" variante="secondario" piccolo onPress={() => setModifica(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Pulsante testo="Togli" variante="contorno" piccolo inCorso={inCorso === 'togli'} onPress={() => invia(null)} />
            </View>
          </View>
        </View>
      ) : null}

      {vedi ? (
        <View style={{ gap: spazio.tre }}>
          <SceltaOra titolo="Sono andato a dormire alle" valore={letto} onSposta={(d) => setLetto((v) => ora(minutiDelGiorno(v) + d))} />
          <SceltaOra titolo="Mi sono svegliato alle" valore={sveglia} onSposta={(d) => setSveglia((v) => ora(minutiDelGiorno(v) + d))} />
          <Text style={[stili.nota, { color: valida ? RELAX[2] : p.testoSecondario }]} accessibilityLiveRegion="polite">
            {valida ? `Hai dormito ${durata(minuti)}.` : minuti === 0 ? 'Le due ore sono uguali.' : 'Fra le due ore devono passare da 2 a 16 ore.'}
          </Text>
          <View style={stili.azioni}>
            {scritta ? (
              <View style={{ flex: 1 }}>
                <Pulsante testo="Annulla" variante="secondario" onPress={() => setModifica(false)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Pulsante testo="Salva" icona="spunta" disabilitato={!valida} inCorso={inCorso === 'salva'} onPress={() => invia({ letto, sveglia })} />
            </View>
          </View>
        </View>
      ) : null}

      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {fatto && !errore ? (
        <Text style={[stili.piccola, { color: RELAX[2] }]} accessibilityLiveRegion="polite">
          {fatto}
        </Text>
      ) : null}
    </Carta>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3, lineHeight: 22 },
  etichetta: { fontFamily: F.semi, fontSize: 13 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  giorni: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due - 2 },
  giorno: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  giornoTesto: { fontFamily: F.bold, fontSize: 13 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  grande: { fontFamily: F.extra, fontSize: 30, letterSpacing: -0.8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  tasto: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
