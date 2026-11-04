import { Platform } from 'react-native'

import { SITO_URL } from '@/config'

import { FORME } from '../avvio/logo'
import { F } from '../ui/tema'
import { giornoEvento } from './comune'

// La locandina di un evento in formato storia (04/11/2026, richiesta di Maurizio): la stessa che disegna la pagina dell'evento del sito
// (SITO-ATHLON, `components/CondividiEvento.astro`), 1080 x 1920, con la foto, il logo, una frase in prima persona («Anch'io partecipo»,
// «Vieni con me»), l'occhiello, il titolo, la data e l'indirizzo. Se cambia l'una, va cambiata l'altra.
//
// - **Solo sul web.** Sull'app nativa disegnare un file vuole un modulo nuovo (`react-native-view-shot`) e quindi una build: li' il comando apre
//   la pagina dell'evento sul sito con `?athlon-storia=1`, che apre da se' il passo della locandina (`urlStoriaSito`).
// - **Foto, logo e carattere del titolo arrivano da www.athlonroma.it**, cioe' da un altro dominio: entrano nel canvas solo perche' il sito li
//   serve con `Access-Control-Allow-Origin` (`vercel.json`, `/wp-content/…`). Se non arrivano si disegna lo stesso: senza foto sul fondo scuro,
//   col pittogramma dell'app al posto del logo, con Plus Jakarta al posto di Tusker.
// - **I testi stanno fra 250 e 1670 punti**: sopra e sotto Instagram mette la barra del profilo e il campo di risposta. Il blocco del testo si
//   disegna prima su un livello suo, cosi' la sfumatura scura parte da dove arriva il titolo (un titolo lungo sale fino a meta' storia).

export type EventoLocandina = { id: string; titolo: string; etichetta: string; data: string; ora: string | null; immagine: string | null }

export const FRASI = ['Anch’io partecipo', 'Vieni con me'] as const

const W = 1080
const H = 1920
const X = 84
const ARANCIO = '#ff5701'
const SCURO = '#272423'
const LOGO = `${SITO_URL}/wp-content/uploads/2025/08/Logo-oriz-full.png`
const TUSKER = `${SITO_URL}/wp-content/uploads/2024/07/TuskerGrotesk-3700Bold.woff2`
const TITOLO_FONT = 'Tusker-Grotesk-Locandina'
const LUOGO = 'Athlon Club · Via Ugo Ojetti 134, Roma'

export const locandinaDisponibile = (): boolean => Platform.OS === 'web' && typeof document !== 'undefined'

/** La pagina dell'evento sul sito, aperta sul passo della locandina: la strada dell'app nativa. */
export const urlStoriaSito = (url: string): string => `${url}${url.includes('?') ? '&' : '?'}athlon-storia=1`

const carattere = (peso: number, px: number, famiglia: string) => `${peso} ${px}px "${famiglia}", system-ui, -apple-system, sans-serif`

let tusker: Promise<boolean> | null = null
/** Tusker dal sito, una volta sola; `false` se non arriva (e il titolo si scrive in Plus Jakarta). */
function caricaTusker(): Promise<boolean> {
  tusker ??= (async () => {
    try {
      const f = new FontFace(TITOLO_FONT, `url(${TUSKER}) format('woff2')`, { weight: '700' })
      await f.load()
      document.fonts.add(f)
      return true
    } catch {
      return false
    }
  })()
  return tusker
}

function carica(src: string | null): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    if (!src) return ok(null)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = src
  })
}

function righe(c: CanvasRenderingContext2D, testo: string, larghezza: number): string[] {
  const out: string[] = []
  let riga = ''
  for (const parola of testo.split(/\s+/).filter(Boolean)) {
    const prova = riga ? `${riga} ${parola}` : parola
    if (riga && c.measureText(prova).width > larghezza) {
      out.push(riga)
      riga = parola
    } else riga = prova
  }
  if (riga) out.push(riga)
  return out
}

/** Il testo spaziato a mano: `letterSpacing` del canvas non c'e' in tutti i browser. */
function spaziato(c: CanvasRenderingContext2D, testo: string, x: number, y: number, spazio: number) {
  let cx = x
  for (const ch of testo) {
    c.fillText(ch, cx, y)
    cx += c.measureText(ch).width + spazio
  }
}

function larghezzaSpaziata(c: CanvasRenderingContext2D, testo: string, spazio: number) {
  let w = 0
  for (const ch of testo) w += c.measureText(ch).width + spazio
  return w - spazio
}

/** Il PNG della locandina, o null se il browser non sa disegnarlo. Non solleva. */
export async function locandinaEvento(e: EventoLocandina, frase: string): Promise<Blob | null> {
  if (!locandinaDisponibile()) return null
  try {
    const [haTusker, foto, logo] = await Promise.all([
      caricaTusker(),
      carica(e.immagine),
      carica(LOGO),
      document.fonts.load(`40px "${F.extra}"`).catch(() => undefined),
      document.fonts.load(`40px "${F.bold}"`).catch(() => undefined),
      document.fonts.load(`40px "${F.medio}"`).catch(() => undefined),
    ])

    const livello = document.createElement('canvas')
    livello.width = W
    livello.height = H
    const c = livello.getContext('2d')
    if (!c) return null
    const largo = W - X * 2
    c.textBaseline = 'alphabetic'

    // Dal basso verso l'alto: l'indirizzo, la data, il titolo, l'occhiello, la frase.
    let y = 1640
    c.fillStyle = 'rgba(255,255,255,0.72)'
    c.font = carattere(500, 30, F.medio)
    c.fillText(LUOGO, X, y)
    y -= 46
    c.fillStyle = ARANCIO
    c.fillRect(X, y - 6, 96, 6)
    y -= 52

    c.fillStyle = '#ffffff'
    c.font = carattere(700, 46, F.bold)
    for (const r of righe(c, (e.ora ?? '').trim(), largo).reverse()) {
      c.fillText(r, X, y)
      y -= 58
    }
    c.fillText(giornoEvento(e.data), X, y)
    y -= 84

    // Il titolo, maiuscolo, il piu' grande che sta in quattro righe.
    const titolo = e.titolo.toUpperCase()
    const famiglia = haTusker ? TITOLO_FONT : F.extra
    const massimo = haTusker ? 168 : 112
    let corpo = massimo
    let linee: string[] = []
    for (; corpo >= 60; corpo -= 6) {
      c.font = carattere(haTusker ? 700 : 800, corpo, famiglia)
      linee = righe(c, titolo, largo)
      if (linee.length <= 4 && linee.every((l) => c.measureText(l).width <= largo)) break
    }
    const interlinea = Math.round(corpo * (haTusker ? 0.98 : 1.08))
    c.fillStyle = '#ffffff'
    let base = y
    for (const l of [...linee].reverse()) {
      c.fillText(l, X, base)
      y = base
      base -= interlinea
    }
    y -= Math.round(corpo * (haTusker ? 0.92 : 0.75)) + 34

    if (e.etichetta) {
      c.fillStyle = ARANCIO
      c.font = carattere(800, 32, F.extra)
      spaziato(c, e.etichetta.toUpperCase(), X, y, 5)
      y -= 70
    }

    const testoFrase = frase.toUpperCase()
    c.font = carattere(800, 34, F.extra)
    const pw = larghezzaSpaziata(c, testoFrase, 4) + 64
    const ph = 76
    const py = y - ph + 14
    c.fillStyle = ARANCIO
    c.beginPath()
    if (typeof c.roundRect === 'function') c.roundRect(X, py, pw, ph, ph / 2)
    else c.rect(X, py, pw, ph)
    c.fill()
    c.fillStyle = '#ffffff'
    spaziato(c, testoFrase, X + 32, py + ph / 2 + 12, 4)

    // La storia: il fondo, la foto ritagliata al centro, le sfumature, il logo, il testo.
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const f = canvas.getContext('2d')
    if (!f) return null
    f.fillStyle = SCURO
    f.fillRect(0, 0, W, H)
    if (foto) {
      const s = Math.max(W / foto.naturalWidth, H / foto.naturalHeight)
      const fw = foto.naturalWidth * s
      const fh = foto.naturalHeight * s
      f.drawImage(foto, (W - fw) / 2, (H - fh) / 2, fw, fh)
    }
    const alto = f.createLinearGradient(0, 0, 0, 520)
    alto.addColorStop(0, 'rgba(39,36,35,0.75)')
    alto.addColorStop(1, 'rgba(39,36,35,0)')
    f.fillStyle = alto
    f.fillRect(0, 0, W, 520)
    const inizio = Math.max(420, py - 360)
    const basso = f.createLinearGradient(0, inizio, 0, H)
    basso.addColorStop(0, 'rgba(39,36,35,0)')
    basso.addColorStop(Math.min(0.95, (py - inizio) / (H - inizio)), 'rgba(39,36,35,0.86)')
    basso.addColorStop(1, 'rgba(39,36,35,1)')
    f.fillStyle = basso
    f.fillRect(0, inizio, W, H - inizio)

    if (logo) {
      const lw = 380
      f.drawImage(logo, X, 260, lw, (lw * logo.naturalHeight) / logo.naturalWidth)
    } else {
      // Il pittogramma dell'app e il nome, se il logo del sito non arriva.
      f.save()
      f.translate(X, 250)
      f.scale(0.34, 0.34)
      f.fillStyle = ARANCIO
      for (const forma of FORME) {
        f.beginPath()
        forma.punti.forEach(([px, pyy], i) => (i ? f.lineTo(px, pyy) : f.moveTo(px, pyy)))
        f.closePath()
        f.fill()
      }
      f.restore()
      f.fillStyle = '#ffffff'
      f.font = carattere(800, 40, F.extra)
      f.fillText('ATHLON CLUB', X + 120, 312)
    }
    f.drawImage(livello, 0, 0)

    return await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
  } catch {
    return null
  }
}

export const nomeLocandina = (e: { id: string }) => `${e.id}-storia.png`
