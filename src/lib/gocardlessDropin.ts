import { t } from '@/lib/lingua'

// Nell'app installata il Drop-in di GoCardless non c'e' (servirebbe una WebView, cioe' una build nuova): la pagina del mandato si apre nel
// browser integrato, sopra l'app, con «Fine» per tornare (`apriPagamento`). La versione per il web e' `gocardlessDropin.web.ts`.

export type EsitoDropin = 'firmato' | 'uscito' | 'errore' | 'non_disponibile'

export const dropinDisponibile = false

export async function apriDropin(_flusso: string): Promise<EsitoDropin> {
  return 'non_disponibile'
}

export const testoInAttesa = () => t('Completa l’autorizzazione nel riquadro di GoCardless.', 'Complete the authorisation in the GoCardless window.')
