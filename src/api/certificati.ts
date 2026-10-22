import { funzione } from '@/api/lab'
import { chiamaLink } from '@/api/link'
import type { FileScelto } from '@/lib/fileCertificato'
import { t } from '@/lib/lingua'

// Il certificato medico caricato dal cliente (17/10/2026), da due porte:
//   - l'area riservata, con la sessione: `portale-lab-certificati` (APP-ATHLON);
//   - il link dell'email, col token: `portale-link`, tipo `certificato`.
// In tutte e due il file va nel bucket privato, il certificato resta «in verifica» e il desk
// riceve un'email col file; lo stato lo legge la Home da `portale_la_mia_area`.

export type EsitoCarica = { ok: true } | { ok: false; errore: string }

const GUASTO = t('Non siamo riusciti a inviare il certificato adesso. Riprova fra qualche minuto.', 'We couldn’t send the certificate right now. Try again in a few minutes.')

/** Dall'area riservata: `memberId` e' la persona del nucleo di cui si carica il certificato. */
export async function caricaCertificato(memberId: number, f: FileScelto): Promise<EsitoCarica> {
  const { ok, dati } = await funzione('portale-lab-certificati', { azione: 'carica', member_id: memberId, nome: f.nome, base64: f.base64 })
  return ok ? { ok: true } : { ok: false, errore: dati.errore ?? GUASTO }
}

/** Cosa mostra la pagina del link. */
export type PaginaCertificato = {
  /** Nome e cognome di chi serve il certificato. */
  persona: string
  minore: boolean
  /** `da_caricare`, `in_verifica` (gia' caricato, non ancora visto) o `valido` (non serve altro). */
  stato: 'da_caricare' | 'in_verifica' | 'valido'
  scadenza: string | null
  /** Se l'ultimo certificato e' stato rifiutato da poco: il motivo scritto dalla segreteria. */
  rifiuto: { motivo: string | null } | null
}

/** Dal link dell'email. */
export async function caricaDaLink(token: string, f: FileScelto): Promise<EsitoCarica> {
  const { ok, dati } = await chiamaLink(token, 'carica', { nome: f.nome, base64: f.base64 })
  return ok ? { ok: true } : { ok: false, errore: dati.errore ?? GUASTO }
}
