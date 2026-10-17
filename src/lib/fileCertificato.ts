import * as DocumentPicker from 'expo-document-picker'
import { Platform } from 'react-native'

// Il file del certificato medico: lo si sceglie, lo si controlla e lo si porta in
// base64, che e' come la funzione lo riceve (come l'allegato dell'Help Desk del sito).
//
// **Formati: JPG, PNG, PDF; fino a 8 MB.** Sono gli stessi controlli della funzione
// (`_shared/certificati.ts`, APP-ATHLON): qui servono a dirlo subito e con parole
// chiare, la' sono l'ultima parola e guardano i primi byte del file, non il nome.
//
// **Sul web una foto grande si rimpicciolisce.** Un telefono scatta a 12 megapixel e
// 4-6 MB: per leggere un certificato bastano 2400 pixel sul lato lungo, che pesano un
// quarto. Si fa solo sopra i 2,5 MB, solo per le immagini e solo se il risultato pesa
// meno dell'originale; un PDF non si tocca mai.
//
// **Il selettore non va aspettato con una rotellina.** Sul web, chi chiude la finestra
// dei file senza scegliere non fa partire nessun evento: la promessa non si risolve mai.
// Per questo la sola attesa visibile comincia dopo la scelta (`preparaFile`).

export const MAX_BYTE = 8 * 1024 * 1024
const RIDUCI_SOPRA = 2.5 * 1024 * 1024
const LATO_MASSIMO = 2400

export type TipoCertificato = 'image/jpeg' | 'image/png' | 'application/pdf'
const TIPI: TipoCertificato[] = ['image/jpeg', 'image/png', 'application/pdf']

export type FileScelto = { nome: string; tipo: TipoCertificato; byte: number; base64: string }
export type EsitoFile = { ok: true; file: FileScelto } | { ok: false; errore: string }

/** La finestra di scelta del file. Null se la persona rinuncia. */
export async function scegliDocumento(): Promise<DocumentPicker.DocumentPickerAsset | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: TIPI, copyToCacheDirectory: true, multiple: false, base64: false })
  return r.canceled ? null : (r.assets?.[0] ?? null)
}

function tipoDi(a: { name: string; mimeType?: string }): TipoCertificato | null {
  const mime = (a.mimeType ?? '').toLowerCase()
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg'
  if (mime === 'image/png') return 'image/png'
  if (mime === 'application/pdf') return 'application/pdf'
  const estensione = /\.([a-z0-9]+)$/i.exec(a.name)?.[1]?.toLowerCase()
  if (estensione === 'jpg' || estensione === 'jpeg') return 'image/jpeg'
  if (estensione === 'png') return 'image/png'
  if (estensione === 'pdf') return 'application/pdf'
  return null
}

/** Il peso come lo si legge: «2,4 MB», «380 kB». */
export function pesoLeggibile(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(byte / 1024))} kB`
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

/** Una foto grande portata a 2400 pixel sul lato lungo, in JPEG. Solo sul web; null se non si riesce. */
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

/** Controlla il file scelto e lo porta in base64. Non solleva mai. */
export async function preparaFile(a: DocumentPicker.DocumentPickerAsset): Promise<EsitoFile> {
  const tipo = tipoDi(a)
  if (!tipo) return { ok: false, errore: `Il file deve essere una foto JPG o PNG, oppure un PDF.` }
  try {
    let blob: Blob = Platform.OS === 'web' && a.file ? a.file : await (await fetch(a.uri)).blob()
    let nome = a.name || 'certificato'
    let tipoFinale = tipo
    if (Platform.OS === 'web' && tipo !== 'application/pdf' && blob.size > RIDUCI_SOPRA) {
      const ridotta = await riduciImmagine(blob)
      if (ridotta && ridotta.size > 0 && ridotta.size < blob.size) {
        blob = ridotta
        tipoFinale = 'image/jpeg'
        nome = nome.replace(/\.[A-Za-z0-9]{1,5}$/, '') + '.jpg'
      }
    }
    if (blob.size === 0) return { ok: false, errore: 'Il file è vuoto.' }
    if (blob.size > MAX_BYTE) {
      return { ok: false, errore: `Il file pesa troppo (${pesoLeggibile(blob.size)}): il limite è ${MAX_BYTE / 1024 / 1024} MB.` }
    }
    return { ok: true, file: { nome, tipo: tipoFinale, byte: blob.size, base64: await inBase64(blob) } }
  } catch {
    return { ok: false, errore: 'Non riusciamo a leggere il file. Riprova scegliendolo di nuovo.' }
  }
}
