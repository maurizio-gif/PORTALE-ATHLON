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

/**
 * Il link per vedere il certificato approvato di una persona del nucleo (12/11/2026): firmato da Storage, dura pochi minuti
 * e si chiede al tocco. Il server sceglie il file (l'ultimo caricamento approvato) e ricontrolla che la persona sia del nucleo.
 */
export async function apriCertificato(memberId: number, nomeFile?: (ext: string) => string): Promise<{ ok: true; url: string; nome: string; tipo: string; urlScarica: string } | { ok: false; errore: string }> {
  const { ok, dati } = await funzione('portale-lab-certificati', { azione: 'apri', member_id: memberId })
  if (!ok || typeof dati.url !== 'string') return { ok: false, errore: dati.errore ?? t('Non riusciamo ad aprire il certificato adesso.', 'We can’t open the certificate right now.') }
  const tipo = typeof dati.tipo === 'string' ? dati.tipo : 'application/pdf'
  const ext = tipo === 'image/png' ? 'png' : tipo === 'image/jpeg' ? 'jpg' : 'pdf'
  // Il nome lo sceglie chi chiama (con il nome della persona); se no quello del server, se no uno generico.
  const nome = nomeFile ? nomeFile(ext) : typeof dati.nome === 'string' && dati.nome ? dati.nome : t(`certificato-medico.${ext}`, `medical-certificate.${ext}`)
  // `download=` chiede a Storage di mandare il file come allegato: e' quello che fa «Salva sul dispositivo».
  const urlScarica = typeof dati.url_scarica === 'string' ? dati.url_scarica : `${dati.url}${dati.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(nome)}`
  return { ok: true, url: dati.url, nome, tipo, urlScarica }
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
