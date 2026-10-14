import { useEffect, useRef, useState } from 'react'
import { Modal, Platform, StyleSheet, Text, Vibration, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'

// Il timer del recupero (14/10/2026): parte da solo quando si segna una serie
// fatta, col recupero scritto nella scheda. Un cerchio che si svuota col conto
// alla rovescia grande, +15 s / -15 s, «Salta»; alla fine vibra e suona, e
// dice cosa viene dopo. Il tempo si calcola dall'ora di fine e non contando i
// secondi: se il telefono va in pausa o si cambia schermata, al ritorno e' giusto.

const RAGGIO = 112
const CIRCONFERENZA = 2 * Math.PI * RAGGIO

/** Tre bip brevi. Sul web con l'audio del browser; nell'app basta la vibrazione. */
function suona() {
  if (Platform.OS !== 'web') return
  try {
    const Ctx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[0, 0.22, 0.44].forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i === 2 ? 1320 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.2)
    })
    setTimeout(() => ctx.close?.(), 1200)
  } catch {
    // Senza audio, resta la vibrazione.
  }
}

function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function TimerRecupero({
  fine,
  totale,
  prossimo,
  dettaglio,
  onCambia,
  onChiudi,
}: {
  /** L'ora di fine del recupero (ms); null se non c'e' un recupero in corso. */
  fine: number | null
  /** I secondi del recupero, per il cerchio. */
  totale: number
  /** Cosa viene dopo: «Panca piana · serie 2 di 4». */
  prossimo: string
  /** Sotto, piccolo: «L'ultima volta 10 × 40 kg». */
  dettaglio?: string | null
  onCambia: (fine: number, totale: number) => void
  onChiudi: () => void
}) {
  const p = usePalette()
  const [ora, setOra] = useState(Date.now())
  const suonato = useRef<number | null>(null)

  useEffect(() => {
    if (!fine) return
    const t = setInterval(() => setOra(Date.now()), 200)
    return () => clearInterval(t)
  }, [fine])

  const resta = fine ? Math.max(0, fine - ora) : 0
  const finito = !!fine && resta <= 0

  // Alla fine: vibra e suona una volta, poi si chiude da solo.
  useEffect(() => {
    if (!finito || suonato.current === fine) return
    suonato.current = fine
    colpetto('ok')
    if (Platform.OS !== 'web') Vibration.vibrate([0, 300, 150, 300])
    else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([300, 150, 300])
    suona()
    const t = setTimeout(onChiudi, 2500)
    return () => clearTimeout(t)
  }, [finito, fine, onChiudi])

  const frazione = totale > 0 ? Math.min(1, resta / (totale * 1000)) : 0
  const cambia = (secondi: number) => {
    if (!fine) return
    const nuova = Math.max(Date.now() + 5000, fine + secondi * 1000)
    onCambia(nuova, Math.max(5, totale + secondi))
  }

  return (
    <Modal visible={!!fine} transparent animationType="fade" onRequestClose={onChiudi}>
      <View style={[stili.velo, { backgroundColor: p.scuro ? 'rgba(0,0,0,0.88)' : 'rgba(10,11,13,0.86)' }]}>
        <Text style={stili.titolo}>{finito ? 'Via!' : 'Recupero'}</Text>
        <View style={stili.cerchio}>
          <Svg width={RAGGIO * 2 + 24} height={RAGGIO * 2 + 24} viewBox={`0 0 ${RAGGIO * 2 + 24} ${RAGGIO * 2 + 24}`}>
            <Circle cx={RAGGIO + 12} cy={RAGGIO + 12} r={RAGGIO} stroke="rgba(255,255,255,0.12)" strokeWidth={14} fill="none" />
            <Circle
              cx={RAGGIO + 12}
              cy={RAGGIO + 12}
              r={RAGGIO}
              stroke={finito ? p.ok : p.accento}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCONFERENZA} ${CIRCONFERENZA}`}
              strokeDashoffset={CIRCONFERENZA * (1 - (finito ? 1 : frazione))}
              transform={`rotate(-90 ${RAGGIO + 12} ${RAGGIO + 12})`}
            />
          </Svg>
          <View style={stili.centro} pointerEvents="none">
            <Text style={stili.tempo} accessibilityLiveRegion="polite">
              {finito ? '0:00' : mmss(resta)}
            </Text>
          </View>
        </View>

        <View style={stili.comandi}>
          <Tocco onPress={() => cambia(-15)} etichetta="Togli 15 secondi" style={stili.tondo} spento={finito}>
            <Icona nome="meno" size={18} colore="#fff" />
            <Text style={stili.tondoTesto}>15</Text>
          </Tocco>
          <Tocco onPress={() => cambia(15)} etichetta="Aggiungi 15 secondi" style={stili.tondo} spento={finito}>
            <Icona nome="piu" size={18} colore="#fff" />
            <Text style={stili.tondoTesto}>15</Text>
          </Tocco>
        </View>

        <View style={stili.dopo}>
          <Text style={stili.dopoEtichetta}>{finito ? 'ORA' : 'DOPO'}</Text>
          <Text style={stili.dopoTesto}>{prossimo}</Text>
          {dettaglio ? <Text style={stili.dopoDettaglio}>{dettaglio}</Text> : null}
        </View>

        <View style={{ width: '100%', maxWidth: 360 }}>
          <Pulsante testo={finito ? 'Vai' : 'Salta il recupero'} icona="avanti" variante={finito ? 'primario' : 'secondario'} onPress={onChiudi} />
        </View>
      </View>
    </Modal>
  )
}

const stili = StyleSheet.create({
  velo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spazio.quattro, gap: spazio.quattro },
  titolo: { color: 'rgba(255,255,255,0.8)', fontFamily: F.extra, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase' },
  cerchio: { alignItems: 'center', justifyContent: 'center' },
  centro: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  tempo: { color: '#fff', fontFamily: F.extra, fontSize: 64, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  comandi: { flexDirection: 'row', gap: spazio.quattro },
  tondo: { width: 76, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  tondoTesto: { color: '#fff', fontFamily: F.extra, fontSize: 17 },
  dopo: { alignItems: 'center', gap: 4, paddingHorizontal: spazio.tre },
  dopoEtichetta: { color: 'rgba(255,255,255,0.55)', fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1.4 },
  dopoTesto: { color: '#fff', fontFamily: F.bold, fontSize: 18, textAlign: 'center' },
  dopoDettaglio: { color: 'rgba(255,255,255,0.65)', fontFamily: F.semi, fontSize: 13.5, textAlign: 'center' },
})
