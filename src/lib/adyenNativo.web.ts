// Sul web non c'e' l'SDK nativo di Adyen: c'e' il Drop-in del browser (`features/lab/adyen.web.tsx`). La versione per l'app e' `adyenNativo.ts`.
// Le funzioni ci sono comunque, cosi' chi le chiama (`api/shop.ts`, `api/gare.ts`, `api/lab.ts`) non deve sapere dove gira: sul web non aggiungono niente alla richiesta.

export type SdkAdyen = never

export function sdkAdyen(): null {
  return null
}

export type CanaleNativo = { piattaforma?: 'ios' | 'android'; ritorno_nativo?: string }

export async function canaleNativo(_percorso: string, _parametri?: Record<string, string>): Promise<CanaleNativo> {
  return {}
}
