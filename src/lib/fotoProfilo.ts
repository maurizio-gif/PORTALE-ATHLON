import { Platform } from 'react-native'

import { inDataUrl, pesoLeggibile, scattaFoto, type FileGrezzo } from './fileScheda'
import { ritaglioQuadrato } from './ritaglio'

// La foto del Profilo (20/10/2026): si scatta o si sceglie, la si porta a un quadrato e la si manda alla funzione
// (`portale-lab-anagrafica`, azione `foto`), che la mette su PerfectGym come foto del profilo.
//
// **Sul web la foto diventa un quadrato di 800 pixel in JPEG**, ritagliato come li ritagliano gli avatar del
// Profilo (`ritaglioQuadrato`: sopra il centro, dove stanno le facce): quello che si vede nell'anteprima e' quello
// che si salva, e la foto non viene piu' tagliata da nessuna parte. Pesa 60-200 kB, e passando dalla tela perde
// l'EXIF: la posizione dove e' stata scattata non parte. L'orientamento lo applica il browser (`<img>`), non si
// legge a mano. Una foto piu' piccola di 800 pixel non si ingrandisce; sotto i 200 non e' una foto da profilo.
//
// **Nell'app nativa la foto parte com'e'**, se e' JPEG, PNG o WebP e sta nei 4 MB: ritagliare e togliere l'EXIF
// vorrebbe `expo-image-manipulator`, e quindi una nuova build, come per la fotocamera diretta (`fileScheda.ts`).
// La funzione ricontrolla tutto sui byte, quindi qui si dice subito quello che si puo', non quello che conta.

export const LATO_FOTO = 800
export const LATO_MINIMO = 200
export const MAX_BYTE = 4 * 1024 * 1024

/** Da dove si prende la foto: la fotocamera frontale (sul web, sul telefono) o le foto che si hanno gia'. */
export type OrigineFoto = 'fotocamera' | 'galleria'

export type FotoProfiloPronta = {
  /** «data:image/jpeg;base64,…», come lo riceve la funzione. */
  dati: string
  /** L'indirizzo per mostrarla: lo stesso data URL. */
  anteprima: string
  byte: number
}
export type EsitoFotoProfilo = { ok: true; foto: FotoProfiloPronta } | { ok: false; errore: string }

/** La finestra di scelta. Null se la persona rinuncia. */
export function scegliFotoProfilo(da: OrigineFoto): Promise<FileGrezzo | null> {
  return scattaFoto(da === 'fotocamera' ? 'user' : null)
}

/** Si puo' scattare dal browser? Dove c'e' un touch (telefono, tablet): sul computer `capture` non conta e si aprirebbe una finestra di file. */
export function fotocameraDisponibile(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
}

const FORMATI = /^image\/(jpeg|jpg|png|webp)$/

/** Il tipo dal nome, quando il selettore non lo dice (succede nell'app nativa). */
function tipoDaNome(nome: string): string {
  const e = /\.([a-z0-9]+)$/i.exec(nome)?.[1]?.toLowerCase()
  return e === 'jpg' || e === 'jpeg' ? 'image/jpeg' : e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : ''
}

/**
 * La foto portata al quadrato, solo sul web. `null`: il browser non sa aprire quel file (per esempio un HEIC su un
 * computer); `{ errore }`: si apre ma non va bene.
 */
async function ritagliaWeb(blob: Blob): Promise<{ blob: Blob } | { errore: string } | null> {
  const url = URL.createObjectURL(blob)
  try {
    const immagine = await new Promise<HTMLImageElement | null>((risolvi) => {
      const img = new Image()
      img.onload = () => risolvi(img)
      img.onerror = () => risolvi(null)
      img.src = url
    })
    if (!immagine) return null
    const { naturalWidth: l, naturalHeight: a } = immagine
    if (Math.min(l, a) < LATO_MINIMO) return { errore: `La foto è troppo piccola: servono almeno ${LATO_MINIMO} pixel per lato.` }
    const { x, y, lato } = ritaglioQuadrato(l, a)
    const uscita = Math.min(lato, LATO_FOTO)
    const tela = document.createElement('canvas')
    tela.width = uscita
    tela.height = uscita
    const contesto = tela.getContext('2d')
    if (!contesto) return null
    contesto.imageSmoothingQuality = 'high'
    // Il fondo bianco: una PNG con trasparenza diventerebbe nera in JPEG.
    contesto.fillStyle = '#ffffff'
    contesto.fillRect(0, 0, uscita, uscita)
    contesto.drawImage(immagine, x, y, lato, lato, 0, 0, uscita, uscita)
    const jpeg = await new Promise<Blob | null>((risolvi) => tela.toBlob((b) => risolvi(b), 'image/jpeg', 0.86))
    return jpeg && jpeg.size > 0 ? { blob: jpeg } : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Controlla la foto scelta e la porta in «data:…;base64,…». Non solleva mai. */
export async function preparaFotoProfilo(a: FileGrezzo): Promise<EsitoFotoProfilo> {
  try {
    let blob: Blob = Platform.OS === 'web' && a.file ? a.file : await (await fetch(a.uri)).blob()
    const tipo = (a.mimeType || blob.type || tipoDaNome(a.name)).toLowerCase()
    if (tipo && !tipo.startsWith('image/')) return { ok: false, errore: 'Scegli una foto.' }

    if (Platform.OS === 'web') {
      const r = await ritagliaWeb(blob)
      if (r && 'errore' in r) return { ok: false, errore: r.errore }
      if (r) blob = r.blob
      // Una foto che il browser non sa aprire (per esempio HEIC su un computer) non si puo' ritagliare.
      else if (!FORMATI.test(tipo)) return { ok: false, errore: 'Questo formato di foto non si apre qui: prova con una foto JPG o PNG.' }
    } else if (!FORMATI.test(tipo)) {
      return { ok: false, errore: 'Questo formato di foto non si apre qui: scegli una foto JPG, PNG o WebP.' }
    }

    if (blob.size === 0) return { ok: false, errore: 'La foto è vuota.' }
    if (blob.size > MAX_BYTE) return { ok: false, errore: `La foto pesa troppo (${pesoLeggibile(blob.size)}): il limite è 4 MB.` }
    const dati = await inDataUrl(blob)
    return { ok: true, foto: { dati, anteprima: dati, byte: blob.size } }
  } catch {
    return { ok: false, errore: 'Non riusciamo a leggere la foto. Riprova scegliendola di nuovo.' }
  }
}
