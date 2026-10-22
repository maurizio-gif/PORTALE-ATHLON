import * as DocumentPicker from 'expo-document-picker'
import { Platform } from 'react-native'

import { t } from '@/lib/lingua'

import { ALLEGATO_BYTE_MAX, FORMATI_ALLEGATI, pesoLeggibile, tipoAllegatoDa, type Allegato, type TipoAllegato } from './comune'

// Gli allegati del feedback: si scelgono (anche piu' d'uno insieme), si controllano e si portano in base64, che e'
// come la funzione li riceve. Stessa strada del certificato (`src/lib/fileCertificato.ts`), con altri formati e
// altri limiti: JPG, PNG, WebP e PDF, fino a 5 MB l'uno.
//
// **Sul web uno screenshot grande si rimpicciolisce.** Uno schermo retina fa una PNG da 3-6 MB, e per capire un problema
// bastano 1800 pixel sul lato lungo, che pesano un quarto. Si fa solo sopra 1,2 MB, solo per le immagini e solo se il
// risultato pesa meno dell'originale; un PDF non si tocca mai. Nell'app nativa il file parte com'e' (ridurlo
// vorrebbe `expo-image-manipulator` e una nuova build, come per le schede).
//
// **Il selettore non va aspettato con una rotellina**: sul web, chi chiude la finestra dei file senza scegliere non
// fa partire nessun evento. La sola attesa visibile comincia dopo la scelta (`preparaAllegato`).

const RIDUCI_SOPRA = 1.2 * 1024 * 1024
const LATO_MASSIMO = 1800

const TIPI_SELETTORE: TipoAllegato[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/** La finestra di scelta dei file: `[]` se la persona rinuncia. */
export async function scegliAllegati(): Promise<DocumentPicker.DocumentPickerAsset[]> {
  const r = await DocumentPicker.getDocumentAsync({ type: TIPI_SELETTORE, copyToCacheDirectory: true, multiple: true, base64: false })
  return r.canceled ? [] : (r.assets ?? [])
}

function inBase64(blob: Blob): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader()
    lettore.onerror = () => rifiuta(new Error('lettura non riuscita'))
    lettore.onload = () => {
      const risultato = String(lettore.result ?? '')
      risolvi(risultato.slice(risultato.indexOf(',') + 1))
    }
    lettore.readAsDataURL(blob)
  })
}

/** Un'immagine grande portata a 1800 pixel sul lato lungo, in JPEG. Solo sul web; null se non si riesce. */
async function riduciImmagine(blob: Blob): Promise<Blob | null> {
  try {
    const immagine = await createImageBitmap(blob)
    const scala = Math.min(1, LATO_MASSIMO / Math.max(immagine.width, immagine.height))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(immagine.width * scala))
    tela.height = Math.max(1, Math.round(immagine.height * scala))
    const contesto = tela.getContext('2d')
    if (!contesto) return null
    // Il fondo bianco: una PNG con trasparenza diventerebbe nera in JPEG.
    contesto.fillStyle = '#ffffff'
    contesto.fillRect(0, 0, tela.width, tela.height)
    contesto.drawImage(immagine, 0, 0, tela.width, tela.height)
    return await new Promise<Blob | null>((risolvi) => tela.toBlob((b) => risolvi(b), 'image/jpeg', 0.85))
  } catch {
    return null
  }
}

export type EsitoAllegato = { ok: true; allegato: Allegato } | { ok: false; errore: string }

/** Controlla il file scelto e lo porta in base64. Non solleva mai. */
export async function preparaAllegato(a: DocumentPicker.DocumentPickerAsset): Promise<EsitoAllegato> {
  const tipo = tipoAllegatoDa({ name: a.name, mimeType: a.mimeType })
  const nomeOrigine = a.name || 'allegato'
  if (!tipo) return { ok: false, errore: t(`«${nomeOrigine}» non si può allegare: servono ${FORMATI_ALLEGATI}.`, `“${nomeOrigine}” can’t be attached: use ${FORMATI_ALLEGATI}.`) }
  try {
    let blob: Blob = Platform.OS === 'web' && a.file ? a.file : await (await fetch(a.uri)).blob()
    let nome = nomeOrigine
    let tipoFinale: TipoAllegato = tipo
    if (Platform.OS === 'web' && tipo !== 'application/pdf' && blob.size > RIDUCI_SOPRA) {
      const ridotta = await riduciImmagine(blob)
      if (ridotta && ridotta.size > 0 && ridotta.size < blob.size) {
        blob = ridotta
        tipoFinale = 'image/jpeg'
        nome = nome.replace(/\.[A-Za-z0-9]{1,5}$/, '') + '.jpg'
      }
    }
    if (blob.size === 0) return { ok: false, errore: t(`«${nomeOrigine}» è vuoto.`, `“${nomeOrigine}” is empty.`) }
    if (blob.size > ALLEGATO_BYTE_MAX) {
      return { ok: false, errore: t(`«${nomeOrigine}» pesa troppo (${pesoLeggibile(blob.size)}): il limite è ${ALLEGATO_BYTE_MAX / 1024 / 1024} MB per file.`, `“${nomeOrigine}” is too large (${pesoLeggibile(blob.size)}): the limit is ${ALLEGATO_BYTE_MAX / 1024 / 1024} MB per file.`) }
    }
    return {
      ok: true,
      allegato: { nome, tipo: tipoFinale, byte: blob.size, base64: await inBase64(blob), anteprima: tipoFinale === 'application/pdf' ? null : a.uri },
    }
  } catch {
    return { ok: false, errore: t(`Non riusciamo a leggere «${nomeOrigine}». Riprova scegliendolo di nuovo.`, `We can’t read “${nomeOrigine}”. Try choosing it again.`) }
  }
}
