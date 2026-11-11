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
 * Finche' `app.json` dice una versione piu' bassa, nessuna build lo chiede e il server non lo aggiunge: e' lo stato di oggi (3.1.0). Per accenderlo:
 *   - si alza `version` in `app.json` a questa e si fa la build iOS nuova (con il plugin di `app.json` che porta il permesso);
 *   - oppure, se la 3.1.0 non e' ancora uscita, si porta questa costante a `3.1.0` e si rifa' la build.
 * Alzare `version` separa gli aggiornamenti in volo: le build della versione di prima non ricevono piu' il codice nuovo.
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
