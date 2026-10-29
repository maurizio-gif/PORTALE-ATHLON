import { SUPABASE_URL } from '@/config'
import { funzione } from '@/api/lab'
import { intestazioneLingua, t } from '@/lib/lingua'

// Il Guest Pass dal link: il primo passo e' l'email con la privacy, e la Edge Function `guest-pass` risponde sempre
// allo stesso modo, «ti abbiamo mandato il link» (21/10/2026): chi puo' averlo, e per chi (per se' o per un figlio dai
// 13 ai 17 anni), si dice solo nel link, nella casella della persona. Il resto si fa dal link /r/<codice>
// (portale-link → guest-pass).

async function chiama(corpo: Record<string, unknown>, token?: string): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/guest-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') } }
  }
}

/**
 * Il primo passo: email, privacy (obbligatoria) e marketing (facoltativo), e il codice dell'invito di un socio se si
 * arriva da /invito/<codice>. Riuscito vuol dire soltanto che il link e' partito: non dice se la persona e' idonea, ne'
 * se aveva gia' una richiesta a meta' (in quel caso le rimanda la sua).
 */
export async function richiediGuestPass(
  email: string,
  consensi: { privacy: boolean; marketing: boolean },
  invito?: string | null,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  const r = await chiama({ azione: 'richiedi', email, privacy: consensi.privacy, marketing: consensi.marketing, ...(invito ? { invito } : {}) })
  if (r.ok) return { ok: true }
  return { ok: false, errore: r.dati.errore ?? t('Non siamo riusciti a mandarti il link adesso.', 'We couldn’t send you the link right now.') }
}

type Aperta = { ok: true; token: string } | { ok: false; errore: string; riprovabile: boolean }
let inVolo: { invito: string; richiesta: Promise<Aperta> } | null = null

/**
 * «Attiva la prova» da dentro l'app (29/10/2026): chi ha gia' un accesso non scrive l'email e non aspetta una posta. La funzione
 * `guest-pass` (azione `app_apri`) apre la richiesta dalla sessione, o riprende quella in corso, e risponde col codice: con quello
 * l'app apre `/r/<codice>`, la stessa procedura del link, senza uscire. Non parte nessuna email.
 *
 * Una richiesta alla volta (la schermata puo' montarsi due volte di fila: sviluppo, navigazione veloce). Un 409 dice perche' non si
 * puo' (un abbonamento in corso, un Guest Pass gia' fatto), un 403 che qui non si apre: riprovare non serve. Il resto si puo' riprovare.
 */
export function apriGuestPassDallApp(invito?: string | null): Promise<Aperta> {
  const chiave = invito ?? ''
  if (inVolo?.invito === chiave) return inVolo.richiesta
  const richiesta: Promise<Aperta> = funzione('guest-pass', { azione: 'app_apri', ...(invito ? { invito } : {}) })
    .then(({ ok, stato, dati }): Aperta => {
      if (ok && typeof dati.token === 'string') return { ok: true, token: dati.token }
      return {
        ok: false,
        errore: dati.errore ?? t('Non siamo riusciti ad aprire il Guest Pass adesso. Riprova fra qualche minuto.', 'We couldn’t open the Guest Pass right now. Try again in a few minutes.'),
        riprovabile: stato !== 409 && stato !== 403,
      }
    })
    .finally(() => {
      if (inVolo?.richiesta === richiesta) inVolo = null
    })
  inVolo = { invito: chiave, richiesta }
  return richiesta
}

/**
 * Il link per reimpostare la password, a chi aveva gia' un account (Guest o
 * Member): la stessa funzione del sito (`sito-reset-password`), che chiede a
 * PerfectGym di mandare la sua email di reset.
 */
export async function chiediResetPassword(email: string): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/sito-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify({ email, pagina: '/r', origine: 'guest-pass-reset' }),
    })
    const d = (await r.json().catch(() => null)) as { esito?: string } | null
    return d?.esito === 'inviata'
  } catch {
    return false
  }
}
