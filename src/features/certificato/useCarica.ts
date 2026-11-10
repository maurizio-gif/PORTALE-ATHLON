import { useCallback, useState } from 'react'

import type { EsitoCarica } from '@/api/certificati'
import { aggiungiFile, incompleto, MAX_FILE } from '@/lib/elencoFileCertificato'
import { preparaFile, scegliDa, type FileScelto, type FonteCertificato } from '@/lib/fileCertificato'
import { t } from '@/lib/lingua'

// Lo stato di chi carica un certificato: i file scelti, l'attesa, l'errore, l'esito. Lo usano
// il foglio dell'area riservata e la pagina del link, che si vestono in due modi diversi e
// fanno la stessa cosa.
//
// **Fino a tre file** (10/11/2026): il certificato e, se l'ECG sta su un foglio a parte, anche quello. Ogni
// scelta *aggiunge* un file; un file che non va (troppo pesante, lo stesso due volte, non si legge) non
// toglie quelli gia' scelti, e dice perche'. I conti stanno in `lib/elencoFileCertificato`.

export function useCarica(invia: (files: FileScelto[]) => Promise<EsitoCarica>) {
  const [files, setFiles] = useState<FileScelto[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [inLettura, setInLettura] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [fatto, setFatto] = useState(false)
  /** Mandati piu' file e la funzione ne ha ricevuti meno: la persona lo deve sapere (una funzione non ancora aggiornata ne salva uno solo). */
  const [mancanti, setMancanti] = useState(false)

  /**
   * Apre la scelta del file e lo aggiunge. Non c'e' un'attesa: chi chiude la finestra senza scegliere non lascia traccia.
   * Dice se un file e' stato davvero aggiunto: chi ha chiuso il selettore o ha scelto un file che non va (doppione, troppo
   * pesante) ha ancora le tre strade davanti e riprova senza premere di nuovo «Aggiungi un altro file».
   */
  const scegli = useCallback(
    async (fonte: FonteCertificato = 'documenti'): Promise<boolean> => {
      setErrore(null)
      let asset
      try {
        asset = await scegliDa(fonte)
      } catch {
        setErrore(t('Non riusciamo ad aprire la scelta del file. Riprova.', 'We can’t open the file picker. Try again.'))
        return false
      }
      if (!asset) return false
      setInLettura(true)
      const letto = await preparaFile(asset)
      setInLettura(false)
      if (!letto.ok) {
        // Un file che non va non toglie quelli gia' scelti.
        setErrore(letto.errore)
        return false
      }
      const esito = aggiungiFile(files, letto.file)
      if (!esito.ok) {
        setErrore(esito.errore)
        return false
      }
      setFiles(esito.files)
      return true
    },
    [files],
  )

  /** Toglie un file dall'elenco (il suo posto, da 0). */
  const togli = useCallback((indice: number) => {
    setErrore(null)
    setFiles((attuali) => attuali.filter((_, i) => i !== indice))
  }, [])

  const spedisci = useCallback(async () => {
    if (files.length === 0 || inCorso) return
    setErrore(null)
    setInCorso(true)
    try {
      const esito = await invia(files)
      if (esito.ok) {
        setMancanti(incompleto(files.length, esito.ricevuti))
        setFatto(true)
      } else setErrore(esito.errore)
    } finally {
      setInCorso(false)
    }
  }, [files, inCorso, invia])

  const ricomincia = useCallback(() => {
    setFiles([])
    setErrore(null)
    setFatto(false)
    setMancanti(false)
  }, [])

  return { files, puoAggiungere: files.length < MAX_FILE, errore, inLettura, inCorso, fatto, mancanti, scegli, togli, spedisci, ricomincia }
}
