import { Platform } from 'react-native'

import { FORME } from '../avvio/logo'
import { F, FUOCO, NOTTE } from '../ui/tema'
import { SIGLE_GIORNI } from './analisiTraining'
import { oreBrevi } from './riepilogoMese'
import type { RiepilogoSettimana } from './riepilogoSettimana'
import { t } from '../../../lib/lingua'

// La scheda della settimana come immagine (31/10/2026), da mettere in un post o in una storia: un PNG disegnato con un canvas, **solo sul web**. Due formati:
// `feed` (1080 x 1350, 4:5, quello dei post) e `storia` (1080 x 1920, 9:16). Nella storia i bordi alto e basso restano liberi (le barre dell'app sociale
// coprono circa 250 punti), quindi il contenuto scende e il logo e l'indirizzo si spostano dentro la parte sicura. Sull'app nativa non c'e' un modo di
// disegnare una vista in un file senza un modulo nuovo (`react-native-view-shot`) e quindi una build: li' si condivide il testo. Niente passa da un
// server: l'immagine nasce e resta sul dispositivo. Dentro ci sono solo le cifre di Train della settimana, nessun nome e nessuna caloria.

export type FormatoImmagine = 'feed' | 'storia'

const L = 1080
const ALTEZZE: Record<FormatoImmagine, number> = { feed: 1350, storia: 1920 }
const MARGINE = 72

export const immagineSettimanaDisponibile = (): boolean => Platform.OS === 'web' && typeof document !== 'undefined'

const carattere = (famiglia: string, px: number) => `${px}px "${famiglia}", system-ui, -apple-system, sans-serif`

async function carica(font: string[]) {
  try {
    await Promise.all(font.map((f) => document.fonts.load(`40px "${f}"`)))
  } catch {
    // Senza i caratteri del club si usa quello di sistema: l'immagine si fa lo stesso.
  }
}

/** Accorcia un testo con «…» finche' sta nella larghezza data. */
function tronca(c: CanvasRenderingContext2D, testo: string, max: number): string {
  if (c.measureText(testo).width <= max) return testo
  let x = testo
  while (x.length > 1 && c.measureText(`${x}…`).width > max) x = x.slice(0, -1)
  return `${x.trimEnd()}…`
}

/** Il PNG della scheda, o null se il browser non sa disegnarlo. */
export async function immagineSettimana(r: RiepilogoSettimana, formato: FormatoImmagine = 'feed'): Promise<Blob | null> {
  if (!immagineSettimanaDisponibile()) return null
  await carica([F.extra, F.bold, F.semi, F.medio])
  const A = ALTEZZE[formato]
  const storia = formato === 'storia'
  // Quanto scendono logo, contenuto e piede nella storia.
  const alLogo = storia ? 190 : 0
  const alContenuto = storia ? 330 : 0
  const alPiede = storia ? 190 : 0

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
  const alone = c.createRadialGradient(L - 70, 90 + alLogo, 0, L - 70, 90 + alLogo, 620)
  alone.addColorStop(0, 'rgba(255,87,1,0.34)')
  alone.addColorStop(1, 'rgba(255,87,1,0)')
  c.fillStyle = alone
  c.fillRect(0, 0, L, A)

  // Il pittogramma in grande, quasi invisibile, in basso a destra: e' la firma del club e riempie lo sfondo senza togliere leggibilita' alle cifre.
  c.save()
  c.translate(L - 560, A - 640 - alPiede)
  c.scale(1.9, 1.9)
  c.fillStyle = 'rgba(255,87,1,0.07)'
  for (const f of FORME) {
    c.beginPath()
    f.punti.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.closePath()
    c.fill()
  }
  c.restore()

  // Il pittogramma piccolo in alto, nel fuoco del club, e il nome.
  c.save()
  c.translate(MARGINE, 64 + alLogo)
  c.scale(0.34, 0.34)
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
  c.fillText('ATHLON ROMA', L - MARGINE, 118 + alLogo)

  const y0 = alContenuto
  c.textAlign = 'left'
  c.fillStyle = '#fff'
  c.font = carattere(F.extra, 84)
  c.fillText(r.titolo, MARGINE, 290 + y0)
  c.fillStyle = 'rgba(255,255,255,0.62)'
  c.font = carattere(F.semi, 34)
  c.fillText(t('La mia settimana in Athlon', 'My week at Athlon'), MARGINE, 340 + y0)

  // Il numero grande: i giorni attivi.
  c.fillStyle = FUOCO[0]
  c.font = carattere(F.extra, 250)
  const numero = String(r.giorniAttivi)
  c.fillText(numero, MARGINE, 600 + y0)
  const larghezza = c.measureText(numero).width
  c.fillStyle = '#fff'
  c.font = carattere(F.bold, 44)
  c.fillText(r.giorniAttivi === 1 ? t('giorno attivo', 'active day') : t('giorni attivi', 'active days'), MARGINE + larghezza + 28, 590 + y0)
  c.fillStyle = 'rgba(255,255,255,0.5)'
  c.font = carattere(F.medio, 28)
  c.fillText(r.incorso ? t('su 7, la settimana è in corso', 'of 7, the week is ongoing') : t('su 7', 'of 7'), MARGINE + larghezza + 28, 632 + y0)

  // La settimana: sette palline, piene dove ci si e' allenati; oggi ha un anello bianco.
  const passo = (L - MARGINE * 2) / 7
  c.textAlign = 'center'
  c.fillStyle = 'rgba(255,255,255,0.4)'
  c.font = carattere(F.bold, 26)
  SIGLE_GIORNI.forEach((s, i) => c.fillText(s, MARGINE + passo * (i + 0.5), 716 + y0))
  r.celle.forEach((cella, i) => {
    const x = MARGINE + passo * (i + 0.5)
    const y = 790 + y0
    c.beginPath()
    c.arc(x, y, 48, 0, Math.PI * 2)
    if (cella.attivo) {
      c.fillStyle = FUOCO[1]
      c.fill()
    } else {
      c.fillStyle = cella.futuro ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'
      c.fill()
    }
    if (cella.oggi) {
      c.lineWidth = 4
      c.strokeStyle = '#fff'
      c.stroke()
    }
    c.fillStyle = cella.attivo ? '#fff' : cella.futuro ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)'
    c.font = carattere(F.bold, 34)
    c.fillText(String(cella.numero), x, y + 12)
  })

  const baseStat = 960 + y0
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

  if (r.lezioniFatte.length) {
    c.fillStyle = 'rgba(255,255,255,0.7)'
    c.font = carattere(F.semi, 29)
    const elenco = r.lezioniFatte.map((l) => (l.volte > 1 ? `${l.nome} ×${l.volte}` : l.nome)).join(' · ')
    c.fillText(tronca(c, `${t('Le mie lezioni', 'My classes')}: ${elenco}`, L - MARGINE * 2), MARGINE, baseStat + 100)
  }

  // Il piede: l'indirizzo del club e il suo nome come tag.
  c.fillStyle = 'rgba(255,255,255,0.4)'
  c.font = carattere(F.medio, 25)
  c.textAlign = 'left'
  c.fillText('athlonroma.it', MARGINE, A - 44 - alPiede)
  c.textAlign = 'right'
  c.fillText('#AthlonRoma', L - MARGINE, A - 44 - alPiede)

  return new Promise((risolvi) => canvas.toBlob((b) => risolvi(b), 'image/png'))
}
