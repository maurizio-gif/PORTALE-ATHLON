import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

import { passaDalTotem } from '@/features/lab/totem/passaggio'

// La pagina della carta (PerfectGym/Adyen) si apre dentro l'app e non in Safari: nel browser integrato (visto in
// TestFlight il 27/10/2026) chi paga resta nell'app, e tornare e' un tocco su «Fine». Prima `Linking.openURL` mandava
// fuori dall'app e la promessa finiva subito: la schermata partiva con «Verifichiamo il pagamento…» mentre la persona
// non aveva ancora pagato, e al ritorno la rotellina girava senza fine.
//
// Sul web si cambia pagina, come prima. La promessa si risolve quando la persona chiude il browser integrato: e'
// il momento giusto per rileggere l'esito. Se il browser integrato non si apre, si ripiega sul browser di sistema.
//
// **Sul totem** (04/11/2026) la pagina della carta non si apre da sola: prima si passa dalle tre strade (QR, email, con un operatore: `features/lab/totem/passaggio.ts`) e la pagina si apre
// qui solo con un operatore accanto. Chi ha gia' un operatore sbloccato per questo stesso pagamento (`giaAssistito`: la vendita assistita) non lo rifa. Annullato, non si apre niente.
// Risponde `false` se non si e' aperto niente (sul totem: scelto QR o email, o annullato): chi chiama rimette a posto la sua schermata.
export async function apriPagamento(url: string, opzioni?: { giaAssistito?: boolean }): Promise<boolean> {
  if (!opzioni?.giaAssistito && !(await passaDalTotem({ cosa: 'pagamento', url }))) return false
  if (Platform.OS === 'web') {
    window.location.assign(url)
    return true
  }
  try {
    await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'done' })
  } catch {
    await Linking.openURL(url)
  }
  return true
}
