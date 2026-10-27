import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'
import { t } from './lingua'

// Il file di una scheda di allenamento da importare (19/10/2026): una foto (scattata o scelta) o un PDF.
// Lo si sceglie (anche piu' d'uno: le pagine dello stesso piano), lo si controlla e lo si porta in «data:…;base64,…», che e' come lo riceve la funzione
// (`portale-lab-schede`, azione `importa`), e da li' il workflow che lo legge.
//
// **Formati: foto JPG, PNG, WebP e PDF; fino a 4 MB l'uno, quattro file e 10 MB in tutto.** Sono i limiti della funzione, che guarda i primi byte
// del file e non il nome: qui serve a dirlo subito e con parole chiare.
//
// **Sul web una foto si porta sempre a 1800 pixel sul lato lungo, in JPEG.** Per leggere una tabella servono
// piu' pixel che per un piatto (`fotoPiatto.ts`, 1280), ma non quelli di un telefono moderno: 12 megapixel sono
// 4-6 MB, e una scheda fotografata a 1800 pixel pesa 300-600 kB, con meno attesa e meno dati a un servizio
// esterno. Un PDF non si tocca mai. Sull'app nativa la foto si manda com'e', se sta nel limite.
//
// **Il selettore non va aspettato con una rotellina.** Sul web, chi chiude la finestra dei file senza scegliere
// non fa partire nessun evento sui vecchi browser: la promessa puo' restare li'. La sola attesa visibile comincia
// dopo la scelta (`preparaFileScheda`), come per il certificato e per la foto del piatto.

export const MAX_BYTE = 4 * 1024 * 1024
/** Un piano lungo non sta in uno screenshot (20/10/2026): fino a quattro file per lo stesso piano, 10 MB in tutto. Gli stessi limiti della funzione. */
export const MAX_FILE = 4
export const MAX_TOTALE_BYTE = 10 * 1024 * 1024
const LATO = 1800

export type TipoFileScheda = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

/** Quello che serve del file scelto: la forma di `DocumentPicker.DocumentPickerAsset`, e di un `File` del browser. */
export type FileGrezzo = { uri: string; name: string; mimeType?: string; file?: File }

export type FileScheda = {
  nome: string
  tipo: TipoFileScheda
  byte: number
  /** «data:image/jpeg;base64,…», pronto da mandare. */
  dati: string
  /** L'indirizzo per mostrare una foto; null per un PDF. */
  anteprima: string | null
}
export type EsitoFileScheda = { ok: true; file: FileScheda } | { ok: false; errore: string }

const comeFile = (a: DocumentPicker.DocumentPickerAsset): FileGrezzo => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file })

/** La finestra di scelta: una o piu' foto o PDF (sul telefono offre anche la fotocamera). Vuota se la persona rinuncia. */
export async function scegliFile(): Promise<FileGrezzo[]> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: true, base64: false })
  return r.canceled ? [] : (r.assets ?? []).map(comeFile)
}

/**
 * Nell'app: la fotocamera vera (frontale per il Profilo, posteriore per il resto) e, con `null`, la libreria foto. Prima
 * era il selettore dei file e su iPhone si apriva l'app Documenti, anche premendo «Scatta una foto» (visto in TestFlight
 * il 27/10/2026). Se la persona nega il permesso la finestra non si apre e si torna indietro, senza errore.
 */
async function scattaFotoNativa(fotocamera: 'environment' | 'user' | null): Promise<FileGrezzo | null> {
  try {
    const permesso = fotocamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permesso.granted) return null
    const opzioni: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, exif: false, allowsEditing: false }
    const r = fotocamera
      ? await ImagePicker.launchCameraAsync({ ...opzioni, cameraType: fotocamera === 'user' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync({ ...opzioni, allowsMultipleSelection: false })
    const a = r.canceled ? null : r.assets?.[0]
    if (!a) return null
    return { uri: a.uri, name: a.fileName || `foto-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg' }
  } catch {
    return null
  }
}

/**
 * La fotocamera. Sul web apre quella posteriore del telefono (`capture`), e sul computer, dove `capture` non
 * conta, la scelta di una foto. Nell'app nativa per ora e' il selettore delle foto (serve `expo-image-picker`
 * per la fotocamera diretta, e quindi una nuova build).
 *
 * `fotocamera`: `'user'` apre quella frontale (la foto del Profilo, `fotoProfilo.ts`); `null` non chiede la
 * fotocamera e lascia scegliere fra le foto del telefono. Di partenza e' la posteriore, come per le schede.
 */
export function scattaFoto(fotocamera: 'environment' | 'user' | null = 'environment'): Promise<FileGrezzo | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return scattaFotoNativa(fotocamera)
  return new Promise((risolvi) => {
    const campo = document.createElement('input')
    campo.type = 'file'
    campo.accept = 'image/*'
    if (fotocamera) campo.setAttribute('capture', fotocamera)
    campo.style.display = 'none'
    const chiudi = (f: FileGrezzo | null) => {
      campo.remove()
      risolvi(f)
    }
    campo.addEventListener('change', () => {
      const file = campo.files?.[0]
      chiudi(file ? { uri: URL.createObjectURL(file), name: file.name || 'scheda.jpg', mimeType: file.type, file } : null)
    })
    campo.addEventListener('cancel', () => chiudi(null))
    document.body.appendChild(campo)
    campo.click()
  })
}

function tipoDi(a: FileGrezzo): TipoFileScheda | null {
  const mime = (a.mimeType ?? '').toLowerCase()
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg'
  if (mime === 'image/png') return 'image/png'
  if (mime === 'image/webp') return 'image/webp'
  if (mime === 'application/pdf') return 'application/pdf'
  const estensione = /\.([a-z0-9]+)$/i.exec(a.name)?.[1]?.toLowerCase()
  if (estensione === 'jpg' || estensione === 'jpeg') return 'image/jpeg'
  if (estensione === 'png') return 'image/png'
  if (estensione === 'webp') return 'image/webp'
  if (estensione === 'pdf') return 'application/pdf'
  return null
}

/** Il peso come lo si legge: «2,4 MB», «380 kB». */
export function pesoLeggibile(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1).replace('.', t(',', '.'))} MB` : `${Math.max(1, Math.round(byte / 1024))} kB`
}

export function inDataUrl(blob: Blob): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader()
    lettore.onerror = () => rifiuta(new Error('lettura non riuscita'))
    lettore.onload = () => risolvi(String(lettore.result ?? ''))
    lettore.readAsDataURL(blob)
  })
}

/** Una foto portata a 1800 pixel sul lato lungo, in JPEG. Solo sul web; null se il browser non la sa aprire. */
async function riduci(blob: Blob): Promise<Blob | null> {
  try {
    const immagine = await createImageBitmap(blob)
    const scala = Math.min(1, LATO / Math.max(immagine.width, immagine.height))
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

/** Controlla il file scelto e lo porta in «data:…;base64,…». Non solleva mai. */
export async function preparaFileScheda(a: FileGrezzo): Promise<EsitoFileScheda> {
  const tipo = tipoDi(a)
  if (!tipo) return { ok: false, errore: t('Il file deve essere una foto (JPG, PNG, WebP) o un PDF.', 'The file must be a photo (JPG, PNG, WebP) or a PDF.') }
  try {
    let blob: Blob = Platform.OS === 'web' && a.file ? a.file : await (await fetch(a.uri)).blob()
    let tipoFinale: TipoFileScheda = tipo
    let nome = a.name || 'scheda'
    if (Platform.OS === 'web' && tipo !== 'application/pdf') {
      const ridotta = await riduci(blob)
      if (ridotta && ridotta.size > 0) {
        blob = ridotta
        tipoFinale = 'image/jpeg'
        nome = nome.replace(/\.[A-Za-z0-9]{1,5}$/, '') + '.jpg'
      }
      // Una foto che il browser non sa aprire (per esempio HEIC su un computer) non si puo' ridurre.
      else if (!/^image\/(jpeg|png|webp)$/.test(blob.type)) return { ok: false, errore: t('Questo formato di foto non si apre qui: prova con una foto JPG o PNG.', 'This photo format can’t be opened here: try a JPG or PNG photo.') }
    }
    if (blob.size === 0) return { ok: false, errore: t('Il file è vuoto.', 'The file is empty.') }
    if (blob.size > MAX_BYTE) {
      return {
        ok: false,
        errore:
          tipoFinale === 'application/pdf'
            ? t(`Il PDF pesa troppo (${pesoLeggibile(blob.size)}): il limite è 4 MB. Prova con una foto del piano.`, `The PDF is too large (${pesoLeggibile(blob.size)}): the limit is 4 MB. Try a photo of the plan.`)
            : t(`La foto pesa troppo (${pesoLeggibile(blob.size)}): il limite è 4 MB.`, `The photo is too large (${pesoLeggibile(blob.size)}): the limit is 4 MB.`),
      }
    }
    const dati = await inDataUrl(blob)
    return { ok: true, file: { nome, tipo: tipoFinale, byte: blob.size, dati, anteprima: tipoFinale === 'application/pdf' ? null : dati } }
  } catch {
    return { ok: false, errore: t('Non riusciamo a leggere il file. Riprova scegliendolo di nuovo.', 'We can’t read the file. Try choosing it again.') }
  }
}
