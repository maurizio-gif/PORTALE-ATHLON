import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import type { ImportiContratto } from '@/api/abbonamento'

// Gli importi del contratto firmato, tenuti allineati con quello che si paga adesso (10/11/2026, Giorgia Levi Minzi). Il contratto si firma con gli importi
// di quel momento, ma il credito sul conto puo' arrivare dopo: il desk lo registra a contratto creato e su PerfectGym l'addebito da 950 € passa a 344 €.
// La schermata del pagamento deve dire quello che si paga, quindi parte dagli importi della firma e li riallinea al server (`dovuto`): quando si apre,
// quando si torna sull'app e, per qualche minuto, ogni mezzo minuto. Una risposta che non arriva non cambia niente.

const OGNI_MS = 30_000
const TENTATIVI = 20

const uguali = (a: ImportiContratto | null, b: ImportiContratto | null) => !!a && !!b && JSON.stringify(a.calendario) === JSON.stringify(b.calendario)

/**
 * @param chiave   il contratto (il numero, o il token della proposta): cambia = si riparte. `null` = niente da rileggere.
 * @param iniziali gli importi della firma, finche' il server non risponde.
 * @param carica   la lettura dal server: `null` se non risponde.
 */
export function useImportiAdesso(chiave: string | null, iniziali: ImportiContratto | null, carica: () => Promise<ImportiContratto | null>): ImportiContratto | null {
  const [importi, setImporti] = useState<ImportiContratto | null>(iniziali)
  const caricaRef = useRef(carica)
  caricaRef.current = carica
  const inizialiRef = useRef(iniziali)
  inizialiRef.current = iniziali

  useEffect(() => {
    setImporti(inizialiRef.current)
    if (!chiave) return
    let attivo = true
    let giri = 0
    const rileggi = async () => {
      const v = await caricaRef.current().catch(() => null)
      if (attivo && v) setImporti((prima) => (uguali(prima, v) ? prima : v))
    }
    void rileggi()
    const timer = setInterval(() => {
      if (++giri > TENTATIVI) return clearInterval(timer)
      void rileggi()
    }, OGNI_MS)
    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') void rileggi()
    })
    return () => {
      attivo = false
      clearInterval(timer)
      sub.remove()
    }
  }, [chiave])

  return importi
}
