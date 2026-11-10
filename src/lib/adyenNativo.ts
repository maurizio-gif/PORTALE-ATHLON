import * as Linking from 'expo-linking'
import { NativeModules, Platform } from 'react-native'

// L'SDK nativo di Adyen (`@adyen/react-native`, 10/11/2026), caricato solo se questa build lo contiene.
//
// **Perche' non un `import` normale.** L'SDK e' un modulo nativo: sta nella build dell'app, non nel codice JavaScript. Importare la libreria dove il modulo non c'e' la fa
// sollevare gia' al caricamento (`ModuleMock` risponde con un errore a ogni accesso), cioe' l'app non si apre. La prima cintura e' la versione: l'app ha gli aggiornamenti in volo
// (`expo-updates`) con `runtimeVersion` = versione dell'app, e il modulo e' entrato con la 3.1.0, quindi una build 3.0.0 non riceve codice che lo usa. Questo controllo e' la seconda:
// Expo Go, un development build vecchio, una versione dimenticata nell'`app.json`. Si guarda prima se i moduli nativi ci sono e solo allora si carica la libreria; se non ci
// sono, `sdkAdyen()` e' `null` e ogni schermata resta com'era (la carta nuova passa dal link nel browser integrato). Stessa scelta di `healthConnect.ts`.
//
// Sul web c'e' `adyenNativo.web.ts`, che non fa niente: li' c'e' il Drop-in del browser (`features/lab/adyen.web.tsx`).

export type SdkAdyen = typeof import('@adyen/react-native')

let caricato: SdkAdyen | null | undefined

/** L'SDK di Adyen se questa build lo contiene, altrimenti `null`. Non solleva mai. */
export function sdkAdyen(): SdkAdyen | null {
  if (caricato !== undefined) return caricato
  caricato = null
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return caricato
  // I due moduli che l'SDK usa per aprire il pagamento: se mancano, la libreria non si carica nemmeno.
  if (!NativeModules.AdyenDropIn || !NativeModules.SessionHelper) return caricato
  try {
    caricato = require('@adyen/react-native') as SdkAdyen
  } catch {
    caricato = null
  }
  return caricato
}

/** I campi in piu' da mandare al server per avere una sessione per l'app (`_shared/adyen-canale.ts` di APP-ATHLON). Vuoti sul web e senza l'SDK: la sessione e' quella di sempre. */
export type CanaleNativo = { piattaforma?: 'ios' | 'android'; ritorno_nativo?: string }

/**
 * Il canale della sessione: `iOS` o `Android`, e l'indirizzo con cui Adyen riporta nell'app dopo un reindirizzamento (una 3D Secure che esce dall'SDK).
 * Su iPhone e' lo schema dell'app (`athlon://<percorso>`); su Android e' quello che l'SDK calcola, e il server controlla che sia dell'app.
 * `percorso` e' la schermata a cui tornare (`shop/ordine/<id>`), senza barra davanti: se il reindirizzamento non lo prende l'SDK, lo apre il router.
 * Non solleva: se non si riesce a leggere, si chiede una sessione web come prima.
 */
export async function canaleNativo(percorso: string, parametri?: Record<string, string>): Promise<CanaleNativo> {
  const sdk = sdkAdyen()
  if (!sdk) return {}
  try {
    if (Platform.OS === 'ios') return { piattaforma: 'ios', ritorno_nativo: Linking.createURL(percorso, parametri ? { queryParams: parametri } : undefined) }
    return { piattaforma: 'android', ritorno_nativo: await sdk.AdyenDropIn.getReturnURL() }
  } catch {
    return {}
  }
}

/**
 * L'ambiente come lo vuole l'SDK nativo: il web dice `live` (Europa), l'app `live-eu`. Un valore che non si riconosce vale `live-eu` e non `test`: il conto del club
 * non ha un ambiente di prova, e una chiave `live_…` su `test` fallirebbe senza dire perche'.
 */
export function ambienteNativo(ambiente: string): 'test' | 'live-eu' | 'live-us' | 'live-au' | 'live-apse' | 'live-in' | 'live-nea' {
  if (ambiente === 'test') return 'test'
  if (ambiente === 'live-us' || ambiente === 'live-au' || ambiente === 'live-apse' || ambiente === 'live-in' || ambiente === 'live-nea') return ambiente
  return 'live-eu'
}
