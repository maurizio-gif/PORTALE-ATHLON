import { Platform } from 'react-native'

// La vista cliente (16/10/2026): chi e' abilitato apre l'app dal CRM
// (`/?come=<email del cliente>`) e vede, in sola lettura, quello che vede il
// cliente. E' la STESSA app: cambiano solo l'indirizzo da cui legge i dati e il
// fatto che ogni scrittura viene rifiutata dal server.
//
// Non si entra nell'account del cliente: chi guarda resta dentro col SUO
// accesso, e a ogni richiesta manda l'indirizzo del cliente nell'intestazione
// `X-Athlon-Come`. E' il server a decidere: verifica la sessione di chi chiama,
// controlla che sia in `portale_vista_staff`, lascia passare solo le letture e
// scrive nel registro chi ha guardato chi. Qui non c'e' niente che si possa
// aggirare dal browser: togliere il banner o riscrivere l'intestazione da
// un'altra persona non apre niente che il server non conceda.
//
// Solo sul web, ed e' la scheda del browser a tenerla (sessionStorage): un'altra
// scheda, aperta senza `?come=`, e' l'app di sempre.

const CHIAVE = 'athlon_vista_come'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function scheda(): Storage | null {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

/** Legge `?come=` dall'indirizzo, se c'e', e lo ricorda per la scheda; altrimenti quello gia' ricordato. */
function leggiIniziale(): string | null {
  const s = scheda()
  if (!s) return null
  try {
    const come = new URLSearchParams(window.location.search).get('come')
    if (come !== null) {
      const email = come.trim().toLowerCase()
      if (EMAIL.test(email)) {
        s.setItem(CHIAVE, email)
        return email
      }
      // Un `?come=` malformato non e' un invito a restare nella vista di prima.
      s.removeItem(CHIAVE)
      return null
    }
    const gia = s.getItem(CHIAVE)
    return gia && EMAIL.test(gia) ? gia : null
  } catch {
    return null
  }
}

let corrente: string | null = leggiIniziale()

/** L'indirizzo del cliente che si sta guardando, o `null` se e' l'app di sempre. */
export function vistaCorrente(): string | null {
  return corrente
}

/** Chiude la vista senza ricaricare niente: chi chiama decide cosa mostrare dopo (l'uscita da un logout, per esempio). */
export function dimenticaLaVista() {
  corrente = null
  try {
    scheda()?.removeItem(CHIAVE)
  } catch {
    // niente da fare: la vista resta solo in memoria e finisce con la pagina
  }
}

/** Torna all'app di sempre, con l'accesso di chi guardava: pagina nuova, memoria vuota, nessun dato del cliente rimasto. */
export function esciDallaVista() {
  dimenticaLaVista()
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign('/')
}
