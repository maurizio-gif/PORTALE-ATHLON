import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { spazio } from '@/theme'

import { useProgresso, useVisibile } from '../schede/ContatoreCalorie'
import { Icona } from '../ui/Icona'
import { Barra, Carta } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { BONUS_COSTANZA, BONUS_EQUILIBRIO, LIVELLI, SOGLIA_MANTENIMENTO, type IdLivello, type Livello, type StatoLivelli } from './calcoloLivelli'

// I livelli dell'Athlon Health Score (20/10/2026): la medaglia, l'anello di sei segmenti (uno per livello: si riempiono
// man mano che i punti salgono), la riga compatta per la carta di Fit e la sezione del dettaglio. Il calcolo sta in calcoloLivelli.ts.
// **Non retrocede mai**: un livello in pausa e' un livello che si vede un po' spento, con scritto cosa lo riattiva.

const SCURI: IdLivello[] = ['argento', 'platino'] // le medaglie chiare vogliono la stella scura
const n = (x: number) => x.toLocaleString('it-IT')
const dataCorta = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const breve = (g: string) => dataCorta.format(new Date(`${g}T12:00:00Z`)).replace('.', '')

export function Medaglia({ livello, size = 56, spenta = false }: { livello: Livello; size?: number; spenta?: boolean }) {
  return (
    <View style={{ width: size, height: size, opacity: spenta ? 0.5 : 1 }} accessibilityLabel={`Livello ${livello.nome}${spenta ? ', in pausa' : ''}`} accessibilityRole="image">
      <LinearGradient colors={[...livello.colori]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.medaglia, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size * 0.05) }]}>
        <Icona nome="stella" size={size * 0.46} colore={SCURI.includes(livello.id) ? '#3A4252' : '#fff'} />
      </LinearGradient>
    </View>
  )
}

// ---------------------------------------------------------------------------
// L'anello: un segmento per livello

const R = 52
const GIRO = 2 * Math.PI * R
/** Lo spazio fra un segmento e il successivo, in unita' di lunghezza: i tratti hanno il capo tondo (11 di spessore), quindi per vedere uno stacco di 6 ne servono 17. */
const VUOTO = 17

export function AnelloLivelli({ stato, size = 156, chiaro = false }: { stato: StatoLivelli; size?: number; chiaro?: boolean }) {
  const p = usePalette()
  const [ref, visibile] = useVisibile()
  const t = useProgresso(1400, 150, visibile)
  const lungo = GIRO / LIVELLI.length
  const fondo = chiaro ? 'rgba(255,255,255,0.14)' : p.incavo
  return (
    <View ref={ref} collapsable={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Livello ${stato.livello.nome}, ${stato.punti} punti`} accessibilityRole="image">
      <Svg width={size} height={size} viewBox="0 0 130 130">
        {LIVELLI.map((l, i) => (
          <Circle key={`f-${l.id}`} cx={65} cy={65} r={R} stroke={fondo} strokeWidth={11} fill="none" strokeLinecap="round" strokeDasharray={`${lungo - VUOTO} ${GIRO}`} strokeDashoffset={-i * lungo} transform="rotate(-90 65 65)" />
        ))}
        {LIVELLI.map((l, i) => {
          const fatto = i < stato.indice ? 1 : i === stato.indice ? stato.quota : 0
          const pieno = (lungo - VUOTO) * fatto * t
          if (pieno < 0.5) return null
          return <Circle key={`p-${l.id}`} cx={65} cy={65} r={R} stroke={l.colori[1]} strokeWidth={11} fill="none" strokeLinecap="round" strokeDasharray={`${pieno} ${GIRO}`} strokeDashoffset={-i * lungo} transform="rotate(-90 65 65)" />
        })}
      </Svg>
      <View style={stili.centro} pointerEvents="none">
        <Medaglia livello={stato.livello} size={size * 0.4} spenta={stato.attivo === false} />
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// La riga compatta, per la carta scura di Fit

export function RigaLivello({ stato }: { stato: StatoLivelli }) {
  const pausa = stato.attivo === false
  return (
    <View style={stili.riga} accessibilityLabel={`Livello ${stato.livello.nome}, ${stato.punti} punti${stato.prossimo ? `, mancano ${stato.mancano} a ${stato.prossimo.nome}` : ''}${pausa ? ', in pausa' : ''}`}>
      <Medaglia livello={stato.livello} size={42} spenta={pausa} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={stili.rigaTesta}>
          <Text style={stili.rigaNome}>{stato.livello.nome}</Text>
          <Text style={stili.rigaPunti}>{`${n(stato.punti)} punti`}</Text>
          {pausa ? (
            <View style={stili.pausa}>
              <Text style={stili.pausaTesto}>IN PAUSA</Text>
            </View>
          ) : null}
        </View>
        <Barra valore={stato.quota} colore={stato.livello.colori[1]} fondo="rgba(255,255,255,0.14)" altezza={7} animata />
        <Text style={stili.rigaSotto}>
          {stato.alPrimoGiro
            ? 'Si parte: ogni allenamento ti dà punti.'
            : stato.prossimo
              ? `Mancano ${n(stato.mancano ?? 0)} punti a ${stato.prossimo.nome}${stato.provvisori > 0 ? ` · +${stato.provvisori} questa settimana` : ''}`
              : 'Il livello più alto.'}
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// La sezione del dettaglio

export function SezioneLivelli({ stato }: { stato: StatoLivelli }) {
  const p = usePalette()
  const pausa = stato.attivo === false
  return (
    <View style={{ gap: spazio.tre }}>
      <Carta style={{ gap: spazio.tre, alignItems: 'center' }}>
        <AnelloLivelli stato={stato} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={[stili.nomeGrande, { color: p.testo }]}>{stato.livello.nome}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>{`${n(stato.punti)} punti`}</Text>
        </View>
        {stato.prossimo ? (
          <View style={{ width: '100%', gap: 6 }}>
            <Barra valore={stato.quota} colore={stato.livello.colori[1]} animata />
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>{`Mancano ${n(stato.mancano ?? 0)} punti a ${stato.prossimo.nome}.`}</Text>
          </View>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>È il livello più alto.</Text>
        )}
        {stato.alPrimoGiro ? (
          <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
            Si parte da qui: ogni allenamento ti dà punti, anche uno solo. Le prime settimane si contano appena i dati arrivano.
          </Text>
        ) : stato.attivo !== null ? (
          <View style={[stili.stato, { backgroundColor: pausa ? p.incavo : 'rgba(24,169,87,0.12)' }]}>
            <Text style={[stili.statoTesto, { color: pausa ? p.testoSecondario : '#18A957' }]}>
              {pausa
                ? `Il livello è in pausa: si riattiva da solo quando il punteggio torna almeno al ${Math.round(SOGLIA_MANTENIMENTO * 100)}% di quello possibile. I punti restano tuoi.`
                : 'Il livello è attivo: il tuo equilibrio lo mantiene.'}
            </Text>
          </View>
        ) : null}
        {stato.provvisori > 0 ? <Text style={[stili.piccola, { color: p.testoTerzo, textAlign: 'center' }]}>{`Questa settimana ${n(stato.provvisori)} punti, provvisori: si contano quando la settimana finisce.`}</Text> : null}
      </Carta>

      {stato.settimane.length ? (
        <Carta style={{ paddingVertical: spazio.due }}>
          {stato.settimane.slice(0, 6).map((s, i) => (
            <View key={s.settimana} style={[stili.settimana, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.linea }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[stili.settimanaNome, { color: p.testo }]}>{`Settimana del ${breve(s.settimana)}`}</Text>
                <Text style={[stili.piccola, { color: p.testoSecondario }]}>
                  {[`Train ${s.train}`, s.food ? `Food ${s.food}` : null, s.relax ? `Relax ${s.relax}` : null, s.costanza ? `costanza +${s.costanza}` : null, s.equilibrio ? `equilibrio +${s.equilibrio}` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[stili.settimanaPunti, { color: p.testo }]}>{`+${s.totale}`}</Text>
            </View>
          ))}
        </Carta>
      ) : null}

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>I livelli</Text>
        <View style={{ gap: spazio.due }}>
          {LIVELLI.map((l, i) => {
            const raggiunto = i <= stato.indice
            return (
              <View key={l.id} style={stili.livello} accessibilityLabel={`${l.nome}, da ${l.da} punti${i === stato.indice ? ', il tuo livello' : ''}`}>
                <Medaglia livello={l} size={34} spenta={!raggiunto} />
                <Text style={[stili.livelloNome, { color: raggiunto ? p.testo : p.testoTerzo }]}>{l.nome}</Text>
                {i === stato.indice ? <Text style={[stili.tu, { color: l.colori[1] }]}>TU SEI QUI</Text> : null}
                <Text style={[stili.livelloDa, { color: p.testoTerzo }]}>{l.da === 0 ? 'si parte' : `${n(l.da)} punti`}</Text>
              </View>
            )
          })}
        </View>
      </Carta>

      <Carta style={{ gap: spazio.tre }}>
        <Text style={[stili.titoletto, { color: p.testo }]}>Come si guadagnano i punti</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          Ogni settimana finita (da lunedì a domenica) dà i punti dei tre pilastri: Train fino a 70, Food fino a 15 e Relax fino a 15. Un solo allenamento fa comunque 28 punti, e con 2–4 giorni si prendono tutti i 70.
        </Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {`In più, la costanza: +${BONUS_COSTANZA.passo} per ogni settimana di fila nel ritmo giusto dopo la prima, fino a +${BONUS_COSTANZA.massimo}; e l’equilibrio: +${BONUS_EQUILIBRIO} se in una settimana tutti i pilastri che usi sono almeno al 60%.`}
        </Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          I punti non tornano mai indietro e si conservano anche quando i dati vecchi escono dall’app. Per tenere il livello attivo serve l’equilibrio del punteggio; se cala, il livello va in pausa e si riattiva da solo.
        </Text>
        <Text style={[stili.piccola, { color: p.testoTerzo }]}>
          La prima volta si contano le ultime quattro settimane finite, poi si aggiungono quelle nuove: apri il punteggio ogni tanto e le settimane si registrano da sole.
        </Text>
      </Carta>
    </View>
  )
}

const stili = StyleSheet.create({
  medaglia: { alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.45)' },
  centro: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  rigaTesta: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  rigaNome: { color: '#fff', fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  rigaPunti: { color: 'rgba(255,255,255,0.7)', fontFamily: F.semi, fontSize: 13 },
  rigaSotto: { color: 'rgba(255,255,255,0.65)', fontFamily: F.medio, fontSize: 12, lineHeight: 16 },
  pausa: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center' },
  pausaTesto: { color: 'rgba(255,255,255,0.85)', fontFamily: F.extra, fontSize: 10, letterSpacing: 0.8 },
  nomeGrande: { fontFamily: F.extra, fontSize: 26, letterSpacing: -0.6 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  stato: { borderRadius: 14, padding: spazio.tre, alignSelf: 'stretch' },
  statoTesto: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  settimana: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre - 2 },
  settimanaNome: { fontFamily: F.bold, fontSize: 15 },
  settimanaPunti: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
  titoletto: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  livello: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  livelloNome: { fontFamily: F.bold, fontSize: 16, flex: 1 },
  livelloDa: { fontFamily: F.semi, fontSize: 13 },
  tu: { fontFamily: F.extra, fontSize: 10, letterSpacing: 0.8 },
})
