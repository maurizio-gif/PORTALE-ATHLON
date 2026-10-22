import * as DocumentPicker from 'expo-document-picker'
import { Platform } from 'react-native'
import { t } from './lingua'

// La foto del piatto per la sezione Alimentazione (19/10/2026): la si sceglie (o la
// si scatta: sul telefono il selettore del browser offre la fotocamera), la si
// rimpicciolisce e la si porta in base64, che e' come la funzione la riceve.
//
// **Sul web si porta sempre a 1280 pixel sul lato lungo, in JPEG.** Per riconoscere
// un piatto bastano e avanzano, e una foto da 4 MB diventerebbe 300 kB: meno attesa
// e meno dati a un servizio esterno. Sull'app nativa si manda com'e', se sta sotto
// il limite della funzione (4 MB).
//
// Come per il certificato: l'attesa visibile comincia dopo la scelta, perche' chi
// chiude la finestra dei file sul web non fa partire nessun evento.

const LATO = 1280
export const MAX_BYTE = 4 * 1024 * 1024

export async function scegliFoto(): Promise<DocumentPicker.DocumentPickerAsset | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true, multiple: false, base64: false })
  return r.canceled ? null : (r.assets?.[0] ?? null)
}

function inBase64(blob: Blob): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader()
    lettore.onerror = () => rifiuta(new Error('lettura non riuscita'))
    lettore.onload = () => risolvi(String(lettore.result ?? ''))
    lettore.readAsDataURL(blob)
  })
}

async function riduci(blob: Blob): Promise<Blob | null> {
  try {
    const immagine = await createImageBitmap(blob)
    const scala = Math.min(1, LATO / Math.max(immagine.width, immagine.height))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(immagine.width * scala))
    tela.height = Math.max(1, Math.round(immagine.height * scala))
    const contesto = tela.getContext('2d')
    if (!contesto) return null
    contesto.fillStyle = '#ffffff'
    contesto.fillRect(0, 0, tela.width, tela.height)
    contesto.drawImage(immagine, 0, 0, tela.width, tela.height)
    return await new Promise<Blob | null>((risolvi) => tela.toBlob((b) => risolvi(b), 'image/jpeg', 0.82))
  } catch {
    return null
  }
}

/** La foto pronta da mandare, come «data:image/jpeg;base64,…», e l'indirizzo per mostrarla. Non solleva mai. */
export async function preparaFoto(a: DocumentPicker.DocumentPickerAsset): Promise<{ ok: true; dati: string; anteprima: string } | { ok: false; errore: string }> {
  try {
    let blob: Blob = Platform.OS === 'web' && a.file ? a.file : await (await fetch(a.uri)).blob()
    if (blob.type && !blob.type.startsWith('image/')) return { ok: false, errore: t('Scegli una foto.', 'Choose a photo.') }
    if (Platform.OS === 'web') {
      const ridotta = await riduci(blob)
      if (ridotta && ridotta.size > 0) blob = ridotta
      // Una foto che il browser non sa aprire (per esempio HEIC su un computer) non si puo' ridurre.
      else if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) return { ok: false, errore: t('Questo formato di foto non si apre qui: prova con una foto JPG o PNG.', 'This photo format can’t be opened here: try a JPG or PNG photo.') }
    }
    if (blob.size === 0) return { ok: false, errore: t('La foto è vuota.', 'The photo is empty.') }
    if (blob.size > MAX_BYTE) return { ok: false, errore: t('La foto pesa troppo: il limite è 4 MB.', 'The photo is too large: the limit is 4 MB.') }
    const dati = await inBase64(blob)
    return { ok: true, dati, anteprima: dati }
  } catch {
    return { ok: false, errore: t('Non riusciamo a leggere la foto. Riprova scegliendola di nuovo.', 'We can’t read the photo. Try choosing it again.') }
  }
}
