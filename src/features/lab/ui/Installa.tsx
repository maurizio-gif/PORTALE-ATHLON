import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona } from './Icona'
import { Carta } from './kit'
import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// «Installa l'app» nella Home del laboratorio (PWA, 15/10/2026). Solo sul web
// e solo se non e' gia' installata: su Chrome, Edge e Android apre la
// richiesta del browser (tenuta da parte in public/index.html); su iPhone e
// iPad, dove la richiesta non c'e', dice i due tocchi da fare in Safari.
// Chiusa, non torna (si ricorda nel browser).

const CHIAVE = 'athlon:installa-chiusa'

type Richiesta = { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type Finestra = Window & { __installa?: Richiesta | null }

function installata(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function ios(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function chiusa(): boolean {
  try {
    return localStorage.getItem(CHIAVE) === '1'
  } catch {
    return false
  }
}

export function Installa() {
  const p = usePalette()
  const [modo, setModo] = useState<'nascosta' | 'pulsante' | 'ios'>('nascosta')

  useEffect(() => {
    if (Platform.OS !== 'web' || installata() || chiusa()) return
    const w = window as Finestra
    const aggiorna = () => setModo(w.__installa ? 'pulsante' : ios() ? 'ios' : 'nascosta')
    aggiorna()
    window.addEventListener('athlon-installabile', aggiorna)
    const fatta = () => setModo('nascosta')
    window.addEventListener('appinstalled', fatta)
    return () => {
      window.removeEventListener('athlon-installabile', aggiorna)
      window.removeEventListener('appinstalled', fatta)
    }
  }, [])

  if (modo === 'nascosta') return null

  const chiudi = () => {
    try {
      localStorage.setItem(CHIAVE, '1')
    } catch {
      // Senza memoria del browser la card torna alla prossima apertura: va bene.
    }
    setModo('nascosta')
  }

  async function installa() {
    const w = window as Finestra
    const r = w.__installa
    if (!r) return
    await r.prompt()
    const scelta = await r.userChoice.catch(() => null)
    w.__installa = null
    if (scelta?.outcome === 'accepted') setModo('nascosta')
  }

  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
        <Image source={{ uri: '/apple-touch-icon.png' }} style={stili.icona} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>Installa Athlon Club 4.0</Text>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {modo === 'ios' ? 'Tocca Condividi in basso, poi «Aggiungi alla schermata Home».' : 'Aprila dalla schermata Home, a tutto schermo, come un’app.'}
          </Text>
        </View>
        <Tocco onPress={chiudi} etichetta="Non mostrare più" style={stili.chiudi}>
          <Icona nome="chiudi" size={16} colore={p.testoTerzo} />
        </Tocco>
      </View>
      {modo === 'pulsante' ? (
        <Tocco onPress={installa} etichetta="Installa l’app" style={[stili.pulsante, { backgroundColor: p.accento }]}>
          <Text style={stili.pulsanteTesto}>Installa</Text>
        </Tocco>
      ) : null}
    </Carta>
  )
}

const stili = StyleSheet.create({
  icona: { width: 48, height: 48, borderRadius: 12 },
  titolo: { fontFamily: F.extra, fontSize: 16, letterSpacing: -0.3 },
  testo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  chiudi: { padding: 6 },
  pulsante: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  pulsanteTesto: { color: '#fff', fontFamily: F.extra, fontSize: 15 },
})
