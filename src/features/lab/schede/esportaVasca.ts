import { Platform, Share } from 'react-native'

import type { SchedaLab } from '@/api/lab'

import { htmlPianoVasca, nomeFilePiano, testoPianoVasca } from './documentoVasca'

// Stampare, salvare in PDF e condividere un piano di nuoto (23/10/2026). Il documento lo compone `documentoVasca.ts`;
// qui si sceglie come farlo uscire. **Sul web** la pagina si stampa da un riquadro nascosto: la finestra di stampa del
// browser stampa e, scegliendo «Salva come PDF», salva — niente libreria, niente file che passa da un server. **Sull'app
// nativa** non c'e' un modulo per creare PDF (servirebbe una build nuova): si apre il foglio di condivisione del telefono
// col piano in testo, da cui si salva (Note, File, email) o si stampa. Non scrive mai niente sul server.

export type EsitoEsporta = 'stampa' | 'condiviso' | 'copiato' | 'errore'

const web = () => Platform.OS === 'web' && typeof document !== 'undefined'

/** Sul web apre la stampa del piano; altrove il foglio di condivisione. */
export async function stampaPiano(s: SchedaLab): Promise<EsitoEsporta> {
  try {
    if (!web()) return await condividiPiano(s)
    const telaio = document.createElement('iframe')
    telaio.setAttribute('aria-hidden', 'true')
    telaio.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    telaio.srcdoc = htmlPianoVasca(s)
    const titoloPrima = document.title
    const pulisci = () => {
      document.title = titoloPrima
      telaio.remove()
    }
    await new Promise<void>((ok, no) => {
      telaio.onload = () => ok()
      telaio.onerror = () => no(new Error('iframe'))
      document.body.appendChild(telaio)
    })
    const finestra = telaio.contentWindow
    if (!finestra) {
      pulisci()
      return 'errore'
    }
    // Il browser propone come nome del PDF il titolo della pagina: per il tempo della stampa e' quello del piano.
    document.title = nomeFilePiano(s.titolo)
    finestra.addEventListener('afterprint', pulisci)
    finestra.focus()
    finestra.print()
    // Se `afterprint` non arriva (alcuni browser), si pulisce comunque dopo un po'.
    setTimeout(pulisci, 60_000)
    return 'stampa'
  } catch {
    return 'errore'
  }
}

/** Il piano in testo: foglio di condivisione dove c'e', altrimenti negli appunti. */
export async function condividiPiano(s: SchedaLab): Promise<EsitoEsporta> {
  const testo = testoPianoVasca(s)
  try {
    if (web()) {
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> }
      if (typeof nav.share === 'function') {
        await nav.share({ title: s.titolo, text: testo })
        return 'condiviso'
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(testo)
        return 'copiato'
      }
      return 'errore'
    }
    const r = await Share.share({ title: s.titolo, message: testo })
    return r.action === Share.dismissedAction ? 'errore' : 'condiviso'
  } catch (e) {
    // Chi chiude il foglio di condivisione del browser non ha sbagliato niente.
    return e instanceof Error && e.name === 'AbortError' ? 'condiviso' : 'errore'
  }
}
