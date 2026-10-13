import type { SessioneAdyen } from '@/api/lab'
import { Avviso } from '@/components/Avviso'

// Nell'app nativa il modulo di pagamento di Adyen non c'e' ancora (servira'
// @adyen/react-native, con la sua build): il laboratorio dei pagamenti si prova
// dal web. La versione web e' in adyen.web.tsx.

export const pagamentoDisponibile = false

export function DropIn(_: { sessione: SessioneAdyen; onFine: (sessionResult: string | null) => void; onErrore: (messaggio: string) => void }) {
  return <Avviso tono="attenzione">Il pagamento con carta, per ora, si prova dal sito: app.athlonroma.it/lab.</Avviso>
}

export async function riprendiDopoRedirect(_: { clientKey: string; environment: string; sessionId: string; redirectResult: string }): Promise<string | null> {
  throw new Error('Disponibile solo sul web.')
}
