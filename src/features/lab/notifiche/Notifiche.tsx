import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'

import { FinestraNotifica } from './FinestraNotifica'
import { notificheSpente, rileggi, useNotifiche } from './store'

// Il giro delle notifiche del club, montato una volta sola nel layout del portale (20/10/2026), solo per chi e' entrato e non in
// vista cliente (lo staff che guarda l'app di un socio non deve segnare come viste le sue notifiche).
//
// Chiede cosa c'e' di nuovo (`rileggi`) in quattro momenti:
//   - appena l'app e' aperta;
//   - **ogni venti secondi** mentre e' in primo piano: e' cosi' che una notifica appena mandata dal CRM compare come finestra
//     «subito» (entro venti secondi) anche a chi non ha attivato la push. Ferma quando l'app e' in secondo piano;
//   - quando si torna all'app dopo averla lasciata;
//   - **subito** quando il service worker dice che e' arrivata una push (`notifica-arrivata`): e' il caso della finestra
//     istantanea per chi ha la push attiva.
// Se il server risponde «non per te» (403: non e' fra i tester) si smette: inutile richiedere ogni venti secondi.
//
// **La finestra non copre l'avvio animato**: la prima non compare prima che l'avvio (3,25 secondi) sia finito.

const OGNI_MS = 20_000
const PRIMA_MS = 800
/** L'avvio animato dura 3,25 s (avvio/Avvio.tsx): la prima finestra aspetta che finisca, o gli starebbe sopra. */
const ATTESA_AVVIO_MS = 3_700
const T0 = Date.now()

export function Notifiche() {
  const { finestre } = useNotifiche()
  const [dopoAvvio, setDopoAvvio] = useState(() => Date.now() - T0 >= ATTESA_AVVIO_MS)

  useEffect(() => {
    if (dopoAvvio) return
    const t = setTimeout(() => setDopoAvvio(true), Math.max(0, ATTESA_AVVIO_MS - (Date.now() - T0)))
    return () => clearTimeout(t)
  }, [dopoAvvio])

  useEffect(() => {
    const giro = () => {
      if (notificheSpente() || AppState.currentState !== 'active') return
      void rileggi()
    }
    const prima = setTimeout(giro, PRIMA_MS)
    const ciclo = setInterval(giro, OGNI_MS)
    const stato = AppState.addEventListener('change', (s) => {
      if (s === 'active') giro()
    })

    // Il service worker dice «e' arrivata una push»: si rilegge subito, senza aspettare il giro.
    const dalWorker = (e: MessageEvent) => {
      if (e.data && e.data.tipo === 'notifica-arrivata') giro()
    }
    const sw = Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : null
    sw?.addEventListener('message', dalWorker)

    return () => {
      clearTimeout(prima)
      clearInterval(ciclo)
      stato.remove()
      sw?.removeEventListener('message', dalWorker)
    }
  }, [])

  const corrente = dopoAvvio ? finestre[0] : undefined
  return corrente ? <FinestraNotifica key={corrente.id} notifica={corrente} /> : null
}
