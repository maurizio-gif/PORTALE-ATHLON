import { useEvent, useEventListener } from 'expo'
import { Image } from 'expo-image'
import { useIsFocused } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect, useRef, useState } from 'react'
import { AppState, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

import { t } from '@/lib/lingua'

import { Icona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { RuotaBenessere } from './Ruota'

// Il video di Athlon Health System (25/10/2026, richiesta di Maurizio): aprendo la sezione parte da solo, al posto
// della ruota che girava in cima, e **comincia proprio dalla ruota** (Train, Food, Relax) per poi spiegare come
// funziona il punteggio: i massimali, le misure, i giorni attivi, il diario dei pasti, il sonno, fino a 100.
// Lo ha fatto il brag (brag-output-2026-10-25-173714): sottotitoli in italiano **dentro il video**, quindi si
// capisce anche senza audio.
//
// - **Parte muto**, come vuole ogni browser per un avvio automatico (e su iPhone con `playsInline`); l'altoparlante
//   attiva la musica. Il tocco sul video lo mette in pausa e lo riprende; alla fine il pulsante diventa «rivedi».
// - **Si ferma quando si lascia la schermata o l'app** e riprende da dov'era; se era finito, alla prossima apertura
//   riparte da capo (e' il senso di «all'apertura»). Una pausa data a mano resta pausa.
// - **Con «riduci movimento» non parte da solo**: si vede il primo fotogramma, con il pulsante per avviarlo.
// - **Il video e' in italiano**: in inglese (e se il video non si carica) resta la ruota di prima, che e' la stessa
//   con cui il video comincia. `public/video/` e' servito com'e' da Vercel; il service worker non lo tocca.

const ORIGINE = Platform.OS === 'web' ? '' : 'https://app.athlonroma.it'
const VIDEO = `${ORIGINE}/video/athlon-health-system.mp4`
const POSTER = `${ORIGINE}/video/athlon-health-system.jpg`

/** Il fondo del video (lo stesso del suo primo fotogramma): sotto, attorno e ai lati se la scheda e' piu' larga. */
const FONDO = '#050506'
const ALTEZZA_MAX = 560

type Stato = 'carica' | 'gioca' | 'pausa' | 'finito'

function Comando({ nome, etichetta, onPress }: { nome: 'riproduci' | 'pausa' | 'aggiorna' | 'volume' | 'muto'; etichetta: string; onPress: () => void }) {
  return (
    <Tocco onPress={onPress} etichetta={etichetta} vibra="leggero" style={stili.comando}>
      <Icona nome={nome} size={20} colore="#FFFFFF" />
    </Tocco>
  )
}

function Player({ onErrore }: { onErrore: () => void }) {
  const { width: larghezza } = useWindowDimensions()
  const fermo = useReducedMotion()
  const inPrimoPiano = useIsFocused()
  const [pronto, setPronto] = useState(false)
  const [finito, setFinito] = useState(false)
  // L'utente ha messo in pausa a mano: lasciare e riprendere la schermata non lo riavvia.
  const pausaDellUtente = useRef(false)

  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = false
    p.muted = true
    if (!fermo) p.play()
  })
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted })

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      setPronto(true)
      if (!fermo && !pausaDellUtente.current && !player.playing && !finito) player.play()
    }
    if (status === 'error') onErrore()
  })
  useEventListener(player, 'playToEnd', () => setFinito(true))
  // Sul web il play() della preparazione puo' arrivare prima del <video>: si riparte; e se «pronto» non arriva il video si mostra lo stesso.
  useEffect(() => {
    if (!fermo && !pausaDellUtente.current) player.play()
    const tmr = setTimeout(() => setPronto(true), 1500)
    return () => clearTimeout(tmr)
  }, [player, fermo])

  // Fuori dalla schermata (o dall'app) si ferma; tornando riprende, o riparte da capo se era finito.
  useEffect(() => {
    if (!inPrimoPiano) {
      player.pause()
      return
    }
    if (fermo || pausaDellUtente.current) return
    if (finito) {
      setFinito(false)
      player.replay()
    } else {
      player.play()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inPrimoPiano])
  useEffect(() => {
    const s = AppState.addEventListener('change', (stato) => {
      if (stato !== 'active') player.pause()
      else if (inPrimoPiano && !fermo && !pausaDellUtente.current && !finito) player.play()
    })
    return () => s.remove()
  }, [player, inPrimoPiano, fermo, finito])

  const stato: Stato = !pronto ? 'carica' : finito ? 'finito' : isPlaying ? 'gioca' : 'pausa'

  const alTocco = () => {
    if (finito) {
      pausaDellUtente.current = false
      setFinito(false)
      player.replay()
      return
    }
    if (isPlaying) {
      pausaDellUtente.current = true
      player.pause()
    } else {
      pausaDellUtente.current = false
      player.play()
    }
  }

  // Alta come un telefono in piedi (9:16) ma mai piu' di ALTEZZA_MAX: nella colonna stretta il video e' al centro, con il suo fondo ai lati.
  const colonna = Math.min(larghezza, 640) - 36
  // Sul telefono il video riempie tutta la scheda (9:16, senza fasce ai lati); il tetto vale solo sugli schermi larghi.
  const piena = Math.round((colonna * 16) / 9)
  const altezza = larghezza < 640 ? piena : Math.min(ALTEZZA_MAX, piena)

  return (
    <View
      style={[stili.scheda, { height: altezza }]}
      accessibilityLabel={t('Video: come funziona l’Athlon Health System, dal punteggio a 100', 'Video: how Athlon Health System works, from the score to 100')}
    >
      {/* Il poster sta sotto: prima che il video sia pronto si vede il suo primo fotogramma, non un riquadro nero. */}
      <Image source={{ uri: POSTER }} style={StyleSheet.absoluteFill} contentFit="contain" />
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: pronto ? 1 : 0 }]}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture={false}
        playsInline
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={alTocco}
        accessibilityRole="button"
        accessibilityLabel={stato === 'finito' ? t('Rivedi il video', 'Watch again') : stato === 'gioca' ? t('Metti in pausa il video', 'Pause the video') : t('Avvia il video', 'Play the video')}
      />
      <View style={stili.comandi} pointerEvents="box-none">
        <Comando
          nome={muted ? 'muto' : 'volume'}
          etichetta={muted ? t('Attiva l’audio', 'Turn sound on') : t('Spegni l’audio', 'Turn sound off')}
          onPress={() => {
            player.muted = !player.muted
          }}
        />
        <Comando
          nome={stato === 'finito' ? 'aggiorna' : stato === 'gioca' ? 'pausa' : 'riproduci'}
          etichetta={stato === 'finito' ? t('Rivedi il video', 'Watch again') : stato === 'gioca' ? t('Metti in pausa il video', 'Pause the video') : t('Avvia il video', 'Play the video')}
          onPress={alTocco}
        />
      </View>
    </View>
  )
}

/**
 * In cima ad Athlon Health System: il video, che comincia dalla ruota. In inglese, o se il video non si carica,
 * la ruota com'era (il video e' scritto e sottotitolato in italiano).
 */
export function VideoIntro({ lingua }: { lingua: 'it' | 'en' }) {
  const [errore, setErrore] = useState(false)
  if (lingua !== 'it' || errore) return <RuotaBenessere />
  return <Player onErrore={() => setErrore(true)} />
}

const stili = StyleSheet.create({
  scheda: { width: '100%', borderRadius: 32, overflow: 'hidden', backgroundColor: FONDO, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  comandi: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', gap: 10 },
  comando: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.58)' },
})
