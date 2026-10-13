import * as Linking from 'expo-linking'
import { Platform } from 'react-native'

// Apre una pagina di un altro sito al posto di questa: la pagina della carta
// di PerfectGym/Adyen. Sul web si cambia pagina, come un link; nell'app si
// apre il browser, e si torna con il link di ritorno (`/r/<token>/fatto`).
export function vaiA(url: string) {
  if (Platform.OS === 'web') window.location.assign(url)
  else Linking.openURL(url)
}

export function scrivi(indirizzo: string) {
  Linking.openURL(`mailto:${indirizzo}`)
}
