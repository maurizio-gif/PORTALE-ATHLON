// Apple Pay nell'app iPhone (11/11/2026). Modulo puro, senza React Native: lo importano `lib/adyenNativo.ts` e `features/lab/adyen.tsx`, e si prova con
// `scripts/prova-apple-pay.ts`.
//
// **Il Merchant ID** e' quello creato su Apple Developer e legato al certificato proprio caricato su Adyen (utente `ws_345101`). Sta scritto **due volte**, perche' `app.json`
// (il plugin `@adyen/react-native`, che mette il permesso `com.apple.developer.in-app-payments` nella build) non puo' importare TypeScript: se cambia, cambia in tutti e due.
export const MERCHANT_ID_APPLE_PAY = 'merchant.com.adyen.Point2000SrlSocSpoDilECOM'

/** Il nome che compare nel foglio di Apple Pay, accanto all'importo. */
export const NOME_NEGOZIO_APPLE_PAY = 'Athlon Club'

/**
 * **L'interruttore.** Apple Pay si chiede solo dalle build che hanno il permesso, e il permesso sta nella parte nativa: un aggiornamento in volo non lo porta. La versione
 * dell'app e' l'unico segno che il codice puo' leggere (`runtimeVersion` = `version` di `app.json`, vedi `adyenNativo.ts`), quindi Apple Pay e' acceso **da questa versione in su**.
 *
 * La 3.1.0 e' gia' sugli store e non ha il permesso: per lei Apple Pay resta spento, anche se riceve questo codice in volo. La prima build con il permesso e' la **3.1.1**
 * (`version` di `app.json`, alzata insieme a questa costante). Alzare `version` separa gli aggiornamenti in volo (un gruppo per versione): vedi la sezione 198 di `docs/claude`.
 */
export const APPLE_PAY_DALLA_VERSIONE = '3.1.1'

/** `attuale >= minima`, per versioni `1.2.3`. Una versione assente o illeggibile non e' mai abbastanza: nel dubbio Apple Pay non si chiede. */
export function versioneAlmeno(attuale: string | null | undefined, minima: string): boolean {
  const a = parti(attuale)
  const m = parti(minima)
  if (!a || !m) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] > m[i]) return true
    if (a[i] < m[i]) return false
  }
  return true
}

function parti(v: string | null | undefined): [number, number, number] | null {
  if (typeof v !== 'string') return null
  const x = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  return x ? [Number(x[1]), Number(x[2]), Number(x[3])] : null
}
