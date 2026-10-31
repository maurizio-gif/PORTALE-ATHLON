import { Platform } from 'react-native'

// L'app nativa Athlon Club (31/10/2026, richiesta di Maurizio: chi usa la PWA e non ha collegato ne' Apple Salute ne' Google Salute
// viene spinto a installare l'app e a collegarla). **Apple Salute e Health Connect esistono solo nell'app nativa**: dal browser o dalla
// PWA non si possono leggere, quindi per le abitudini che si spuntano da sole bisogna passare di li'.
//
// **I link agli store non sono scritti qui**: non li conosciamo (l'app e' passata da TestFlight) e un link inventato porterebbe fuori
// strada. Si impostano alla pubblicazione con `EXPO_PUBLIC_APP_STORE_URL` e `EXPO_PUBLIC_PLAY_STORE_URL` (Vercel, ambiente del web).
// Senza il link la carta dice cosa fare ma non mostra il pulsante «Scarica l'app».

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

/** Il link dello store per quel telefono, o null se non e' stato impostato. */
export function linkAppNativa(telefono: Telefono): string | null {
  const url = telefono === 'ios' ? process.env.EXPO_PUBLIC_APP_STORE_URL : telefono === 'android' ? process.env.EXPO_PUBLIC_PLAY_STORE_URL : undefined
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null
}
