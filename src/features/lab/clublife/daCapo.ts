import { Platform } from 'react-native'

// Club Life e' una pagina del sito dentro l'app: da li' si puo' navigare (una
// news, una scheda dell'Help Desk) e nell'app installata non c'e' un tasto
// indietro. Come in ogni barra di schede, toccare di nuovo la voce gia' attiva
// riporta all'inizio: la barra manda questo segnale, la pagina lo ascolta.

const NOME = 'athlon:club-life-da-capo'

/** La barra: «torna all'inizio di Club Life». */
export function clubLifeDaCapo() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.dispatchEvent(new Event(NOME))
}

/** La pagina: chiede di essere avvisata. Restituisce come smettere. */
export function ascoltaClubLifeDaCapo(f: () => void): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {}
  window.addEventListener(NOME, f)
  return () => window.removeEventListener(NOME, f)
}
