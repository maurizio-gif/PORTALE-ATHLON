import { funzione } from '@/api/lab'
import { t } from '@/lib/lingua'

// Il totem (04/11/2026): le due cose che si fanno sul server quando una persona, al pannello del club, sceglie come continuare un pagamento.
// Funzione `portale-totem` (APP-ATHLON): verifica il codice dell'operatore (con il limite dei tentativi) e manda un link all'indirizzo della sessione.

export type EsitoTotem<T extends object = object> = ({ ok: true } & T) | { ok: false; errore: string; motivo?: string }

const nonRaggiungibile = () => t('Non riusciamo a farlo adesso. Riprova fra poco.', 'We can’t do this right now. Try again shortly.')

/** Il codice di sei cifre dell'operatore che assiste il pagamento. `motivo` e' una parola sola per il registro («pagamento», «carta salvata»…). */
export async function verificaOperatore(codice: string, motivo: string): Promise<EsitoTotem<{ operatore: { nome: string | null } }>> {
  const { ok, dati } = await funzione('portale-totem', { azione: 'operatore', codice, motivo })
  if (ok) return { ok: true, operatore: { nome: (dati.operatore?.nome as string | null) ?? null } }
  return { ok: false, errore: (dati.errore as string) || nonRaggiungibile(), motivo: dati.motivo as string | undefined }
}

/** Un link all'indirizzo dell'account (mai a un altro: lo decide il server). `pagamento`: la pagina della carta; `schermata`: la stessa sezione dell'app. */
export async function mandaLinkEmail(url: string, tipo: 'pagamento' | 'schermata'): Promise<EsitoTotem> {
  const { ok, dati } = await funzione('portale-totem', { azione: 'link_email', url, tipo })
  if (ok) return { ok: true }
  return { ok: false, errore: (dati.errore as string) || nonRaggiungibile(), motivo: dati.motivo as string | undefined }
}
