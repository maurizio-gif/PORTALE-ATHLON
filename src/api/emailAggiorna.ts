import { SUPABASE_URL } from '@/config'
import { intestazioneLingua, t } from '@/lib/lingua'

// Il link per aggiornare l'email (06/11/2026, richiesta di Maurizio). Chi ha l'indirizzo con la casella piena non riceve il codice per entrare
// nell'app: un SMS al cellulare della scheda porta a `app.athlonroma.it/email/<token>`, dove scrive un indirizzo nuovo, lo conferma con un codice che
// gli arriva **su quell'indirizzo** (non un secondo SMS) e il club lo scrive su PerfectGym. Una funzione sola di APP-ATHLON, pubblica e senza sessione:
// `email-aggiorna` (azioni `leggi`, `codice`, `conferma`). Il contratto e i perche' stanno nella sua testata e in
// `docs/claude/159-link-aggiorna-email-sms-06-11-2026.md` di APP-ATHLON.
//
// L'app non decide niente: se il link vale, quale indirizzo e' accettato (il controllo dei refusi e' quello del server), se e' gia' di un altro profilo,
// e cosa si scrive su PerfectGym sono della funzione. I testi d'errore arrivano gia' nella lingua della persona.

const GUASTO = () => t('Non riusciamo a completare adesso. Riprova fra qualche minuto.', 'We can’t complete this right now. Please try again in a few minutes.')

async function chiama(corpo: Record<string, unknown>): Promise<{ stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/email-aggiorna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { stato: r.status, dati }
  } catch {
    return { stato: 0, dati: { errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') } }
  }
}

export type StatoLink =
  | { esito: 'aperto'; attuale: string }
  | { esito: 'chiuso'; perche: 'sconosciuto' | 'scaduto' | 'completato' | 'segreteria'; nuova?: string }
  | { esito: 'guasto'; errore: string }

/** Se il link vale, e l'indirizzo che ha il problema (mascherato: `ma****@gmail.com`). Non consuma niente. */
export async function leggiLinkEmail(token: string): Promise<StatoLink> {
  const { stato, dati } = await chiama({ azione: 'leggi', token })
  if (stato !== 200 || dati.ok !== true) return { esito: 'guasto', errore: dati.errore ?? GUASTO() }
  if (dati.valido === true) return { esito: 'aperto', attuale: String(dati.attuale ?? '') }
  const perche = ['scaduto', 'completato', 'segreteria'].includes(dati.perche) ? dati.perche : 'sconosciuto'
  return { esito: 'chiuso', perche, nuova: dati.nuova ? String(dati.nuova) : undefined }
}

export type EsitoCodice = { ok: true; a: string; minuti: number } | { ok: false; errore: string; scaduto: boolean }

/** Il codice parte sul nuovo indirizzo. Un indirizzo che il controllo rifiuta (refuso, finto, monouso) o gia' di un altro profilo torna con il suo testo. */
export async function chiediCodiceEmail(token: string, email: string): Promise<EsitoCodice> {
  const { stato, dati } = await chiama({ azione: 'codice', token, email: email.trim().toLowerCase() })
  if (stato === 200 && dati.ok === true) return { ok: true, a: String(dati.a ?? ''), minuti: Number(dati.minuti ?? 15) }
  return { ok: false, errore: dati.errore ?? GUASTO(), scaduto: dati.scaduto === true }
}

export type EsitoConferma =
  | { ok: true; esito: 'fatto' | 'segreteria'; nuova: string; prova: boolean }
  | { ok: false; errore: string; scaduto: boolean; nuovoCodice: boolean }

/**
 * Il codice giusto fa il cambio. `segreteria` vuol dire che l'indirizzo e' verificato ma PerfectGym non ha accettato la modifica da qui: la
 * richiesta e' salva e ci pensa il club. `prova` e' un link di prova: nessuna scheda e' stata toccata.
 */
export async function confermaEmail(token: string, codice: string): Promise<EsitoConferma> {
  const { stato, dati } = await chiama({ azione: 'conferma', token, codice: codice.replace(/\D/g, '') })
  if (stato === 200 && dati.ok === true) {
    return { ok: true, esito: dati.segreteria === true ? 'segreteria' : 'fatto', nuova: String(dati.nuova ?? ''), prova: dati.prova === true }
  }
  return { ok: false, errore: dati.errore ?? GUASTO(), scaduto: dati.scaduto === true, nuovoCodice: dati.nuovoCodice === true }
}
