import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

// La pagina della carta (PerfectGym/Adyen) si apre dentro l'app e non in Safari: nel browser integrato (visto in
// TestFlight il 27/10/2026) chi paga resta nell'app, e tornare e' un tocco su «Fine». Prima `Linking.openURL` mandava
// fuori dall'app e la promessa finiva subito: la schermata partiva con «Verifichiamo il pagamento…» mentre la persona
// non aveva ancora pagato, e al ritorno la rotellina girava senza fine.
//
// Sul web si cambia pagina, come prima. La promessa si risolve quando la persona chiude il browser integrato: e'
// il momento giusto per rileggere l'esito. Se il browser integrato non si apre, si ripiega sul browser di sistema.
export async function apriPagamento(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.assign(url)
    return
  }
  try {
    await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'done' })
  } catch {
    await Linking.openURL(url)
  }
}
