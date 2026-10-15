import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Pulsante } from './ui/kit'
import { F, usePalette } from './ui/tema'

// Il campo firma, come quello di Adobe o DocuSign: si firma con il dito o col
// mouse, sopra una riga. Sul web e' un <canvas>; la firma esce come PNG su
// fondo bianco, che e' quello della pagina del contratto.
//
// Una firma conta quando c'e' abbastanza inchiostro: pochi punti sono un tocco
// per sbaglio, e non si accettano.

const ALTEZZA = 190
/** Quanti punti servono perché sia una firma e non un tocco. */
const PUNTI_MINIMI = 24

export function FirmaPad({ onCambia }: { onCambia: (png: string | null) => void }) {
  const p = usePalette()
  const tela = useRef<HTMLCanvasElement | null>(null)
  const disegna = useRef(false)
  const punti = useRef(0)
  const [vuota, setVuota] = useState(true)

  const prepara = useCallback(() => {
    const c = tela.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const larghezza = c.clientWidth
    c.width = Math.round(larghezza * dpr)
    c.height = Math.round(ALTEZZA * dpr)
    const x = c.getContext('2d')!
    x.scale(dpr, dpr)
    x.fillStyle = '#ffffff'
    x.fillRect(0, 0, larghezza, ALTEZZA)
    x.strokeStyle = '#1a1a1a'
    x.lineWidth = 2.4
    x.lineCap = 'round'
    x.lineJoin = 'round'
    punti.current = 0
    setVuota(true)
    onCambia(null)
  }, [onCambia])

  useEffect(() => {
    prepara()
  }, [prepara])

  const posizione = (e: PointerEvent | React.PointerEvent) => {
    const r = tela.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function giu(e: React.PointerEvent) {
    const c = tela.current
    if (!c) return
    c.setPointerCapture(e.pointerId)
    disegna.current = true
    const x = c.getContext('2d')!
    const { x: px, y: py } = posizione(e)
    x.beginPath()
    x.moveTo(px, py)
    x.lineTo(px + 0.01, py + 0.01)
    x.stroke()
    punti.current += 1
  }

  function muovi(e: React.PointerEvent) {
    if (!disegna.current) return
    const x = tela.current!.getContext('2d')!
    const { x: px, y: py } = posizione(e)
    x.lineTo(px, py)
    x.stroke()
    x.beginPath()
    x.moveTo(px, py)
    punti.current += 1
  }

  function su() {
    if (!disegna.current) return
    disegna.current = false
    if (punti.current >= PUNTI_MINIMI) {
      setVuota(false)
      onCambia(tela.current!.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''))
    }
  }

  return (
    <View style={{ gap: spazio.due }}>
      <View style={[stili.cornice, { borderColor: p.linea, backgroundColor: '#fff' }]}>
        {createElement('canvas', {
          ref: tela,
          onPointerDown: giu,
          onPointerMove: muovi,
          onPointerUp: su,
          onPointerCancel: su,
          style: { width: '100%', height: ALTEZZA, touchAction: 'none', display: 'block', cursor: 'crosshair' },
          'aria-label': 'Spazio per la firma',
        })}
        <View pointerEvents="none" style={stili.riga}>
          <Text style={{ color: '#9a9a9a', fontFamily: F.medio, fontSize: 12 }}>{vuota ? 'Firma qui con il dito o il mouse' : 'Firma acquisita'}</Text>
        </View>
      </View>
      <Pulsante testo="Cancella e rifai" variante="fantasma" piccolo pieno={false} onPress={prepara} disabilitato={vuota && punti.current === 0} />
    </View>
  )
}

const stili = StyleSheet.create({
  cornice: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden', height: ALTEZZA },
  riga: { position: 'absolute', left: 16, right: 16, bottom: 14, borderTopWidth: 1, borderTopColor: '#cfcfcf', paddingTop: 4 },
})
