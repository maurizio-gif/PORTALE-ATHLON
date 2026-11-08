import { Platform } from 'react-native'

// L'app nativa Athlon Club (31/10/2026, richiesta di Maurizio: chi usa la PWA e non ha collegato ne' Apple Salute ne' Google Salute
// viene spinto a installare l'app e a collegarla). **Apple Salute e Health Connect esistono solo nell'app nativa**: dal browser o dalla
// PWA non si possono leggere, quindi per le abitudini che si spuntano da sole bisogna passare di li'.
//
// **Il link dell'App Store e' scritto qui (08/11/2026)**: l'app 3.0.0 e' pubblicata e il rilascio e' aperto a tutti, quindi il link
// non e' piu' un'incognita. `EXPO_PUBLIC_APP_STORE_URL` lo sostituisce, se un giorno serve un altro indirizzo (Vercel, ambiente del
// web; vale solo se comincia per `https://`). **Quello di Google Play non c'e' ancora**: l'app Android e' in revisione, e un link
// inventato porterebbe fuori strada. Si imposta all'approvazione con `EXPO_PUBLIC_PLAY_STORE_URL`; senza, la carta dice cosa fare ma
// non mostra il pulsante «Scarica l'app».

/** La pagina dell'app sull'App Store (it). L'ID e' quello di «Athlon Club», lo stesso del banner di Safari in `public/index.html`. */
const APP_STORE_IOS = 'https://apps.apple.com/it/app/athlon-club/id1584157295'

export type Telefono = 'ios' | 'android' | 'altro'

/** Su quale telefono sta il browser: dallo user agent. Fuori dal web, dalla piattaforma. */
export function telefonoDelBrowser(): Telefono {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS
  if (typeof navigator === 'undefined') return 'altro'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'altro'
}

/** Il link dello store per quel telefono, o null se non c'e' (Android, finche' l'app non e' approvata). */
export function linkAppNativa(telefono: Telefono): string | null {
  const url = telefono === 'ios' ? process.env.EXPO_PUBLIC_APP_STORE_URL || APP_STORE_IOS : telefono === 'android' ? process.env.EXPO_PUBLIC_PLAY_STORE_URL : undefined
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null
}
