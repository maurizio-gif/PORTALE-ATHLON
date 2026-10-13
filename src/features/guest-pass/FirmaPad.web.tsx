import { useEffect, useRef } from 'react'

// Il riquadro della firma sul web, come nella prevendita di Lume: si firma col
// dito o col mouse, e la firma esce come PNG (base64) per il contratto di
// PerfectGym. Nell'app c'e' FirmaPad.tsx.

export const firmaDisponibile = true

export function FirmaPad({ onFirma, cancella }: { onFirma: (png: string | null) => void; cancella: number }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const richiamo = useRef(onFirma)
  richiamo.current = onFirma

  useEffect(() => {
    const c = tela.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const scala = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * scala
    c.height = rect.height * scala
    ctx.scale(scala, scala)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#171514'
    let disegna = false
    let segnata = false
    const punto = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const giu = (e: PointerEvent) => {
      e.preventDefault()
      c.setPointerCapture(e.pointerId)
      disegna = true
      const p = punto(e)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
    }
    const muovi = (e: PointerEvent) => {
      if (!disegna) return
      const p = punto(e)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      segnata = true
    }
    const su = () => {
      if (!disegna) return
      disegna = false
      if (segnata) richiamo.current(c.toDataURL('image/png'))
    }
    c.addEventListener('pointerdown', giu)
    c.addEventListener('pointermove', muovi)
    c.addEventListener('pointerup', su)
    c.addEventListener('pointerleave', su)
    return () => {
      c.removeEventListener('pointerdown', giu)
      c.removeEventListener('pointermove', muovi)
      c.removeEventListener('pointerup', su)
      c.removeEventListener('pointerleave', su)
    }
  }, [])

  // «Cancella»: il numero cambia, la tela si svuota.
  useEffect(() => {
    const c = tela.current
    if (!c || !cancella) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    richiamo.current(null)
  }, [cancella])

  return (
    <canvas
      ref={tela}
      aria-label="Firma qui con il dito o il mouse"
      style={{ display: 'block', width: '100%', height: 170, touchAction: 'none', cursor: 'crosshair', background: '#fbfbfb', border: '2px solid #e2e3e6', borderRadius: 10 }}
    />
  )
}
