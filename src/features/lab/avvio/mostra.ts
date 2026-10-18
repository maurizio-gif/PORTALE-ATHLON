import { Platform } from 'react-native'

import { vistaCorrente } from '../vista'

// Quando l'avvio animato (Avvio.tsx) si vede: **una volta a ogni apertura dell'app**. Sul web
// vuol dire una volta per scheda del browser (sessionStorage: ricaricare la pagina non lo rifa',
// riaprire l'app dopo averla chiusa si'); sul telefono, finche' il processo e' vivo. Non si vede:
//   - in vista cliente (vista.ts): lo staff che guarda l'app di un socio non deve aspettare;
//   - quando l'indirizzo e' un ritorno da un altro sito (`code`, `state`, `error`: il collegamento
//     di un dispositivo, un pagamento): li' c'e' un lavoro da finire, non una scena da fare.
// Decidere e segnare e' la stessa operazione: un ricaricamento a meta' animazione non la rifa'.

const CHIAVE = 'athlon_avvio_mostrato'
let giaMostrato = false

export function avvioDaMostrare(): boolean {
  if (giaMostrato) return false
  giaMostrato = true // da qui in poi, in questo processo, non si rifa' in nessun caso
  if (vistaCorrente()) return false
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const ritorno = new URLSearchParams(window.location.search)
    if (ritorno.has('code') || ritorno.has('state') || ritorno.has('error')) return false
    try {
      if (window.sessionStorage.getItem(CHIAVE)) return false
      window.sessionStorage.setItem(CHIAVE, '1')
    } catch {
      // niente sessionStorage (navigazione privata): vale solo il processo
    }
  }
  return true
}
