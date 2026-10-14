import { SUPABASE_URL } from '@/config'

// Il Guest Pass dal link: prima l'email, poi i dati (nome, cognome,
// cellulare e la privacy, sempre) con la Edge Function `guest-pass`. Il resto
// si fa dal link /r/<codice> (portale-link → guest-pass). La prova dal
// laboratorio non c'e' piu': il Guest Pass e' live (14/10/2026).

/** Chi e' per PerfectGym: nessuno (diventera' un Lead), un Lead, un Guest o un Member. */
export type TipoVerifica = 'nuovo' | 'lead' | 'guest' | 'member'

/** I dati del secondo passo: sempre, gia' compilati per chi il club conosce. */
export type DatiContatto = {
  nome: string
  cognome: string
  cellulare: string
  privacy: boolean
  marketing: boolean
}

export type EsitoVerifica =
  | { ok: true; idoneo: false; motivo: string | null }
  // Un Guest Pass gia' in corso per questa email: si riprende, non si
  // ricomincia. `riprendi` e' il passo da cui si riparte, gia' detto alla
  // persona («dal metodo di pagamento»).
  | { ok: true; inCorso: true; riprendi: string; nome: string | null }
  | { ok: true; idoneo: true; tipo: TipoVerifica; persona: { nome: string | null; cognome: string | null; telefono: string | null } | null }
  | { ok: false; errore: string }

async function chiama(corpo: Record<string, unknown>, token?: string): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/guest-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: 'Connessione non riuscita. Controlla la rete e riprova.' } }
  }
}

export async function verificaGuestPass(email: string): Promise<EsitoVerifica> {
  const { ok, dati } = await chiama({ azione: 'verifica', email })
  if (!ok) return { ok: false, errore: dati.errore ?? 'Non riusciamo a controllare l’email adesso.' }
  if (dati.stato === 'non_idoneo' || dati.stato === 'non_disponibile') return { ok: true, idoneo: false, motivo: dati.motivo ?? null }
  if (dati.stato === 'in_corso') return { ok: true, inCorso: true, riprendi: String(dati.riprendi ?? ''), nome: dati.nome ?? null }
  return { ok: true, idoneo: true, tipo: (dati.tipo ?? 'nuovo') as TipoVerifica, persona: dati.persona ?? null }
}

export async function richiediGuestPass(
  email: string,
  dati: DatiContatto,
): Promise<{ ok: true; riprendi: string | null } | { ok: false; nonIdoneo: boolean; errore: string }> {
  const r = await chiama({ azione: 'richiedi', email, dati })
  // Una richiesta gia' in corso non si duplica: il server rimanda la sua.
  if (r.ok) return { ok: true, riprendi: r.dati.ripresa ? String(r.dati.riprendi ?? '') : null }
  return { ok: false, nonIdoneo: r.dati.non_idoneo === true, errore: r.dati.errore ?? 'Non siamo riusciti a mandarti il link adesso.' }
}

/** Il link di prima, di nuovo, per chi ha un Guest Pass a meta'. `nessuna`: non c'e' piu' niente da riprendere. */
export async function riprendiGuestPass(
  email: string,
): Promise<{ ok: true; riprendi: string } | { ok: false; nessuna: boolean; errore: string }> {
  const r = await chiama({ azione: 'riprendi', email })
  if (r.ok) return { ok: true, riprendi: String(r.dati.riprendi ?? '') }
  return { ok: false, nessuna: r.dati.nessuna === true, errore: r.dati.errore ?? 'Non siamo riusciti a rimandarti il link adesso.' }
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pagina: '/r', origine: 'guest-pass-reset' }),
    })
    const d = (await r.json().catch(() => null)) as { esito?: string } | null
    return d?.esito === 'inviata'
  } catch {
    return false
  }
}
