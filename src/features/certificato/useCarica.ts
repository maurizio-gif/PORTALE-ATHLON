import { useCallback, useState } from 'react'

import type { EsitoCarica } from '@/api/certificati'
import { preparaFile, scegliDa, type FileScelto, type FonteCertificato } from '@/lib/fileCertificato'
import { t } from '@/lib/lingua'

// Lo stato di chi carica un certificato: il file scelto, l'attesa, l'errore, l'esito. Lo usano
// il foglio dell'area riservata e la pagina del link, che si vestono in due modi diversi e
// fanno la stessa cosa.

export function useCarica(invia: (f: FileScelto) => Promise<EsitoCarica>) {
  const [file, setFile] = useState<FileScelto | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [inLettura, setInLettura] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [fatto, setFatto] = useState(false)

  /** Apre la scelta del file. Non c'e' un'attesa: chi chiude la finestra senza scegliere non lascia traccia. */
  const scegli = useCallback(async (fonte: FonteCertificato = 'documenti') => {
    setErrore(null)
    let asset
    try {
      asset = await scegliDa(fonte)
    } catch {
      setErrore(t('Non riusciamo ad aprire la scelta del file. Riprova.', 'We can’t open the file picker. Try again.'))
      return
    }
    if (!asset) return
    setInLettura(true)
    const letto = await preparaFile(asset)
    setInLettura(false)
    if (letto.ok) setFile(letto.file)
    else {
      setFile(null)
      setErrore(letto.errore)
    }
  }, [])

  const spedisci = useCallback(async () => {
    if (!file || inCorso) return
    setErrore(null)
    setInCorso(true)
    try {
      const esito = await invia(file)
      if (esito.ok) setFatto(true)
      else setErrore(esito.errore)
    } finally {
      setInCorso(false)
    }
  }, [file, inCorso, invia])

  const ricomincia = useCallback(() => {
    setFile(null)
    setErrore(null)
    setFatto(false)
  }, [])

  return { file, errore, inLettura, inCorso, fatto, scegli, spedisci, ricomincia }
}
