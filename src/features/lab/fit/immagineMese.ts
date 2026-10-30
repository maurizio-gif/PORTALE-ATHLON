import { Platform } from 'react-native'

import { FORME } from '../avvio/logo'
import { F, FUOCO, NOTTE } from '../ui/tema'
import type { RiepilogoMese } from './riepilogoMese'
import { oreBrevi } from './riepilogoMese'
import { SIGLE_GIORNI } from './analisiTraining'
import { t } from '../../../lib/lingua'

// La scheda del mese come immagine (30/10/2026), da mandare a un amico o mettere in una storia: un PNG 1080 x 1350 disegnato con un canvas, **solo sul web**.
// Sull'app nativa non c'e' un modo di disegnare una vista in un file senza un modulo nuovo (`react-native-view-shot`) e quindi una build: li' si condivide il
// testo. Niente passa da un server: l'immagine nasce e resta sul dispositivo. Dentro ci sono solo le cifre di Train del mese, nessun nome e nessuna caloria.

const L = 1080
const A = 1350
const MARGINE = 72

export const immagineDisponibile = (): boolean => Platform.OS === 'web' && typeof document !== 'undefined'

const carattere = (famiglia: string, px: number) => `${px}px "${famiglia}", system-ui, -apple-system, sans-serif`

async function carica(font: string[]) {
  try {
    await Promise.all(font.map((f) => document.fonts.load(`40px "${f}"`)))
  } catch {
    // Senza i caratteri del club si usa quello di sistema: l'immagine si fa lo stesso.
  }
}

/** Il PNG della scheda, o null se il browser non sa disegnarlo. */
export async function immagineMese(r: RiepilogoMese): Promise<Blob | null> {
  if (!immagineDisponibile()) return null
  await carica([F.extra, F.bold, F.semi, F.medio])
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = A
  const c = canvas.getContext('2d')
  if (!c) return null

  const fondo = c.createLinearGradient(0, 0, L, A)
  fondo.addColorStop(0, NOTTE[0])
  fondo.addColorStop(0.5, NOTTE[1])
  fondo.addColorStop(1, NOTTE[2])
  c.fillStyle = fondo
  c.fillRect(0, 0, L, A)
  const alone = c.createRadialGradient(L - 70, 90, 0, L - 70, 90, 620)
  alone.addColorStop(0, 'rgba(255,87,1,0.34)')
  alone.addColorStop(1, 'rgba(255,87,1,0)')
  c.fillStyle = alone
  c.fillRect(0, 0, L, A)

  // Il pittogramma, nel fuoco del club.
  const k = 0.34
  c.save()
  c.translate(MARGINE, 64)
  c.scale(k, k)
  c.fillStyle = FUOCO[1]
  for (const f of FORME) {
    c.beginPath()
    f.punti.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.closePath()
    c.fill()
  }
  c.restore()

  c.textBaseline = 'alphabetic'
  c.textAlign = 'right'
  c.fillStyle = 'rgba(255,255,255,0.55)'
  c.font = carattere(F.bold, 28)
  c.fillText('ATHLON ROMA', L - MARGINE, 118)

  c.textAlign = 'left'
  c.fillStyle = '#fff'
  c.font = carattere(F.extra, 84)
  c.fillText(`${r.nome.charAt(0).toUpperCase()}${r.nome.slice(1)} ${r.anno}`, MARGINE, 290)
  c.fillStyle = 'rgba(255,255,255,0.62)'
  c.font = carattere(F.semi, 34)
  c.fillText(t('Il mio mese in Athlon', 'My month at Athlon'), MARGINE, 340)

  c.fillStyle = FUOCO[0]
  c.font = carattere(F.extra, 230)
  const numero = String(r.giorniAttivi)
  c.fillText(numero, MARGINE, 560)
  const larghezza = c.measureText(numero).width
  c.fillStyle = '#fff'
  c.font = carattere(F.bold, 44)
  c.fillText(r.giorniAttivi === 1 ? t('giorno attivo', 'active day') : t('giorni attivi', 'active days'), MARGINE + larghezza + 28, 560)
  if (r.incorso) {
    c.fillStyle = 'rgba(255,255,255,0.5)'
    c.font = carattere(F.medio, 28)
    c.fillText(t(`su ${r.giorniNelMese} giorni, il mese è in corso`, `of ${r.giorniNelMese} days, the month is ongoing`), MARGINE + larghezza + 28, 602)
  }

  // Il calendario del mese: una pallina per giorno, piena dove ci si e' allenati.
  const passo = (L - MARGINE * 2) / 7
  const giri = Math.ceil((r.inizio + r.giorniNelMese) / 7)
  c.textAlign = 'center'
  c.fillStyle = 'rgba(255,255,255,0.4)'
  c.font = carattere(F.bold, 24)
  SIGLE_GIORNI.forEach((s, i) => c.fillText(s, MARGINE + passo * (i + 0.5), 668))
  c.font = carattere(F.bold, 25)
  r.celle.forEach((cella, i) => {
    const pos = r.inizio + i
    const x = MARGINE + passo * ((pos % 7) + 0.5)
    const y = 730 + Math.floor(pos / 7) * 70
    c.beginPath()
    c.arc(x, y, 27, 0, Math.PI * 2)
    if (cella.attivo) {
      c.fillStyle = FUOCO[1]
      c.fill()
      c.fillStyle = '#fff'
    } else {
      c.fillStyle = cella.futuro ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'
      c.fill()
      c.fillStyle = cella.futuro ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)'
    }
    c.fillText(String(cella.giorno), x, y + 9)
  })

  const baseStat = 730 + (giri - 1) * 70 + 27 + 90
  const stat = [
    { v: String(r.sessioni), e: r.sessioni === 1 ? t('allenamento', 'workout') : t('allenamenti', 'workouts') },
    { v: oreBrevi(r.minuti), e: t('di allenamento', 'of training') },
    { v: String(r.serieMax), e: r.serieMax === 1 ? t('giorno di fila', 'day in a row') : t('giorni di fila', 'days in a row') },
  ]
  c.textAlign = 'left'
  stat.forEach((s, i) => {
    const x = MARGINE + i * ((L - MARGINE * 2) / 3)
    c.fillStyle = '#fff'
    c.font = carattere(F.extra, 58)
    c.fillText(s.v, x, baseStat)
    c.fillStyle = 'rgba(255,255,255,0.55)'
    c.font = carattere(F.medio, 27)
    c.fillText(s.e, x, baseStat + 40)
  })
  if (r.preferita) {
    c.fillStyle = 'rgba(255,255,255,0.7)'
    c.font = carattere(F.semi, 29)
    c.fillText(t(`La lezione che ho fatto di più: ${r.preferita.nome} (${r.preferita.volte} volte)`, `The class I did most: ${r.preferita.nome} (${r.preferita.volte} times)`), MARGINE, baseStat + 96)
  }

  c.textAlign = 'left'
  c.fillStyle = 'rgba(255,255,255,0.4)'
  c.font = carattere(F.medio, 25)
  c.fillText('athlonroma.it', MARGINE, A - 44)

  return new Promise((risolvi) => canvas.toBlob((b) => risolvi(b), 'image/png'))
}
