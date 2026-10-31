import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { registraAbitudine, type DatiAbitudini, type TipoAbitudine } from '@/api/dispositivi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { MediaEsercizio } from '../schede/MediaEsercizio'
import { useVideoCapacita } from '../schede/useVideoCapacita'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { CATALOGO } from './catalogoAbitudini'
import { formatoValore, nomeAbitudine } from './testiAbitudini'

// Il foglio con cui si scrive il risultato di un'abitudine che il telefono non misura (31/10/2026): il **cronometro** del plank e il **contatore** di
// squat e piegamenti, con il video MoveKit che mostra il movimento (gli stessi dei test del questionario di sala: `useVideoCapacita`, link firmati dalla
// funzione; senza, il foglio e' quello senza video). **Niente parte da solo**: il valore si salva solo con «Salva». Plank: conta il migliore del giorno
// (una tenuta piu' breve non toglie quella di prima). Squat e piegamenti: si sommano nel giorno. I valori si riscrivono, e si correggono con «−» e «+».

const chiaveVideo = (tipo: TipoAbitudine): 'plank' | 'squat' | 'flessioni' | null => (tipo === 'plank' || tipo === 'squat' || tipo === 'flessioni' ? tipo : null)

export function FoglioRegistra({
  aperto,
  tipo,
  soglia,
  valoreOggi,
  onChiudi,
  onSalvato,
}: {
  aperto: boolean
  tipo: TipoAbitudine
  /** La soglia di oggi: si dice se e' raggiunta. */
  soglia: number
  /** Quello che e' gia' scritto per oggi. */
  valoreOggi: number | null
  onChiudi: () => void
  onSalvato: (d: DatiAbitudini) => void
}) {
  const p = usePalette()
  const video = useVideoCapacita()
  const k = chiaveVideo(tipo)
  const v = k ? video?.[k] : undefined
  const plank = tipo === 'plank'
  const [valore, setValore] = useState(0)
  const [inCorso, setInCorso] = useState(false)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const inizio = useRef<number | null>(null)
  const prima = useRef(0)

  // Ogni volta che si apre si riparte da zero (quello gia' scritto per oggi si vede a parte).
  useEffect(() => {
    if (aperto) {
      setValore(0)
      setInCorso(false)
      setErrore(null)
      inizio.current = null
      prima.current = 0
    }
  }, [aperto])

  // Il cronometro conta dal tempo vero, non dai giri del timer: una scheda in secondo piano non lo rallenta.
  useEffect(() => {
    if (!inCorso) return
    const id = setInterval(() => {
      if (inizio.current !== null) setValore(prima.current + Math.floor((Date.now() - inizio.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [inCorso])

  const avvia = () => {
    inizio.current = Date.now()
    setInCorso(true)
  }
  const ferma = () => {
    if (inizio.current !== null) prima.current += Math.floor((Date.now() - inizio.current) / 1000)
    inizio.current = null
    setValore(prima.current)
    setInCorso(false)
  }
  const cambia = (d: number) => {
    const nuovo = Math.min(CATALOGO[tipo].max, Math.max(0, valore + d))
    prima.current = nuovo
    inizio.current = inCorso ? Date.now() : null
    setValore(nuovo)
  }

  // Quello che si salva: il migliore del giorno per il plank, la somma per squat e piegamenti.
  const totale = plank ? Math.max(valoreOggi ?? 0, valore) : (valoreOggi ?? 0) + valore
  const passo = plank ? 5 : 1

  async function salva() {
    if (inCorso) ferma()
    if (valore <= 0) return
    setInvio(true)
    setErrore(null)
    const r = await registraAbitudine(tipo, Math.min(totale, 3600))
    setInvio(false)
    if (!r.ok) return setErrore(r.errore)
    onSalvato(r)
    onChiudi()
  }

  return (
    <Foglio
      aperto={aperto}
      onChiudi={onChiudi}
      titolo={nomeAbitudine(tipo)}
      sottotitolo={plank ? t('Tieni la posizione e premi Ferma quando finisci.', 'Hold the position and press Stop when you’re done.') : t('Conta le ripetizioni e salva il totale di oggi.', 'Count your reps and save today’s total.')}
    >
      {v && (v.video || v.immagini.length) ? (
        <View accessible accessibilityLabel={t('Video che mostra il movimento', 'Video showing the movement')}>
          <MediaEsercizio immagini={v.immagini} video={v.video} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14 }} />
        </View>
      ) : null}

      <View style={[stili.display, { backgroundColor: p.incavo }]}>
        <Text style={[stili.numero, { color: p.testo }]} accessibilityLiveRegion="polite">
          {plank ? formatoValore('plank', valore) : String(valore)}
        </Text>
        <Text style={[stili.sotto, { color: p.testoSecondario }]}>
          {plank ? t('Questa tenuta', 'This hold') : t('Ripetizioni da aggiungere', 'Reps to add')}
        </Text>
        {valoreOggi !== null ? (
          <Text style={[stili.sotto, { color: p.testoTerzo }]}>
            {plank ? t(`Già scritto per oggi: ${formatoValore(tipo, valoreOggi)} (vale la migliore)`, `Already saved for today: ${formatoValore(tipo, valoreOggi)} (the best one counts)`) : t(`Già scritte oggi: ${valoreOggi}`, `Already saved today: ${valoreOggi}`)}
          </Text>
        ) : null}
        <Text style={[stili.sotto, { color: totale >= soglia ? p.accento : p.testoTerzo }]}>
          {totale >= soglia ? t(`Con questo arrivi a ${formatoValore(tipo, soglia)}: obiettivo di oggi raggiunto`, `This takes you to ${formatoValore(tipo, soglia)}: today’s goal reached`) : t(`Obiettivo di oggi: ${formatoValore(tipo, soglia)}`, `Today’s goal: ${formatoValore(tipo, soglia)}`)}
        </Text>
      </View>

      {plank ? (
        <View style={stili.comandi}>
          <Tocco onPress={() => cambia(-passo)} etichetta={t('Togli 5 secondi', 'Remove 5 seconds')} style={[stili.tondo, { backgroundColor: p.incavo }]}>
            <Icona nome="meno" size={20} colore={p.testo} />
          </Tocco>
          <View style={{ flex: 1 }}>
            <Pulsante testo={inCorso ? t('Ferma', 'Stop') : valore > 0 ? t('Riprendi', 'Resume') : t('Avvia il cronometro', 'Start the timer')} icona={inCorso ? 'pausa' : 'riproduci'} variante={inCorso ? 'scuro' : 'primario'} onPress={inCorso ? ferma : avvia} />
          </View>
          <Tocco onPress={() => cambia(passo)} etichetta={t('Aggiungi 5 secondi', 'Add 5 seconds')} style={[stili.tondo, { backgroundColor: p.incavo }]}>
            <Icona nome="piu" size={20} colore={p.testo} />
          </Tocco>
        </View>
      ) : (
        <View style={stili.contatore}>
          <Tocco onPress={() => cambia(-1)} etichetta={t('Togli uno', 'Remove one')} style={[stili.tondo, { backgroundColor: p.incavo }]}>
            <Icona nome="meno" size={20} colore={p.testo} />
          </Tocco>
          <View style={{ flex: 1 }}>
            <Pulsante testo="+1" onPress={() => cambia(1)} />
          </View>
          <View style={{ flex: 1 }}>
            <Pulsante testo="+5" variante="secondario" onPress={() => cambia(5)} />
          </View>
          <View style={{ flex: 1 }}>
            <Pulsante testo="+10" variante="secondario" onPress={() => cambia(10)} />
          </View>
        </View>
      )}

      {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
      <Pulsante testo={t('Salva', 'Save')} disabilitato={valore <= 0} inCorso={invio} onPress={salva} />
    </Foglio>
  )
}

const stili = StyleSheet.create({
  display: { borderRadius: 18, padding: spazio.quattro, alignItems: 'center', gap: 4 },
  numero: { fontFamily: F.extra, fontSize: 56, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  sotto: { fontFamily: F.medio, fontSize: 13, textAlign: 'center' },
  comandi: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  contatore: { flexDirection: 'row', alignItems: 'center', gap: spazio.due },
  tondo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
})
