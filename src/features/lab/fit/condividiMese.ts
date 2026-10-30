import { Share } from 'react-native'

import { immagineDisponibile, immagineMese } from './immagineMese'
import { testoCondivisione, type RiepilogoMese } from './riepilogoMese'

// Come esce il riepilogo del mese (30/10/2026). Sul web l'immagine: dove il browser sa condividere un file (`navigator.share` con `files`: telefoni,
// Safari, Chrome su Android) si apre il foglio di condivisione; altrimenti il PNG si scarica. Sull'app nativa si condivide il testo (vedi `immagineMese.ts`).
// Non solleva mai. `annullato`: la persona ha chiuso il foglio, non e' un errore.

export type EsitoCondivisione = 'condiviso' | 'scaricato' | 'annullato' | 'errore'

const nomeFile = (r: RiepilogoMese) => `athlon-${r.mese}.png`

function scarica(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function condividiMese(r: RiepilogoMese, soloScarica = false): Promise<EsitoCondivisione> {
  try {
    const testo = testoCondivisione(r)
    if (immagineDisponibile()) {
      const blob = await immagineMese(r)
      if (!blob) return 'errore'
      const file = new File([blob], nomeFile(r), { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (!soloScarica && typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: testo })
          return 'condiviso'
        } catch (e) {
          if ((e as { name?: string } | null)?.name === 'AbortError') return 'annullato'
          // Il foglio non si e' aperto: si scarica il file.
        }
      }
      scarica(blob, nomeFile(r))
      return 'scaricato'
    }
    const esito = await Share.share({ message: testo })
    return esito.action === Share.dismissedAction ? 'annullato' : 'condiviso'
  } catch {
    return 'errore'
  }
}
