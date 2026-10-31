import { SUPABASE_URL } from '@/config'
import { funzione } from '@/api/lab'
import { intestazioneLingua, t } from '@/lib/lingua'

// La delega sui figli a un altro adulto (31/10/2026, richiesta di Maurizio): il titolare del nucleo manda un link, la persona che lo
// apre si registra (nome, cognome, email, cellulare, data di nascita) e da quel momento vede e gestisce i figli come lui.
// Due funzioni di APP-ATHLON, il contratto e' in `docs/delega-nucleo.md`:
//   - `portale-lab-delega` (con la sessione del titolare): `stato`, `crea`, `revoca`;
//   - `delega-invito` (pubblica, senza sessione): `leggi` e `accetta`, per la pagina /delega/<codice>.
// L'app non decide niente: chi puo' dare una delega, quanti link, la scadenza, i controlli sulle anagrafiche e cosa si scrive su
// PerfectGym sono della funzione.

export type DelegaAttiva = {
  id: string
  /** Nome e iniziale del cognome, mai l'email («Laura R.»). */
  nome: string
  dal: string
}

export type LinkDelega = {
  id: string
  link: string
  scade_il: string
  oggetto: string
  messaggio: string
}

export type StatoDelega =
  | { ok: true; idoneo: false; motivo: string }
  | {
      ok: true
      idoneo: true
      /** I nomi dei figli su cui si da' la delega (solo il nome, per dire a chi si da' l'accesso). */
      figli: string[]
      /** Quante deleghe si possono avere insieme: la dice la funzione. */
      massimo: number
      /** Quanti giorni vale un link: lo dice la funzione. */
      giorni: number
      attive: DelegaAttiva[]
      /** Il link ancora aperto (non scaduto, non usato), se c'e'. */
      aperto: LinkDelega | null
    }
  | { ok: false; errore: string }

const GUASTO = t('Non riusciamo a preparare la delega adesso. Riprova fra qualche minuto.', 'We can’t set up the delegation right now. Try again in a few minutes.')
const NON_ATTIVO = t('La delega ad un altro adulto non è ancora attiva: riprova fra qualche giorno.', 'Delegating to another adult isn’t active yet: try again in a few days.')

function linkDa(d: Record<string, any> | null | undefined): LinkDelega | null {
  if (!d || typeof d.link !== 'string' || !d.link) return null
  return {
    id: String(d.id),
    link: d.link,
    scade_il: String(d.scade_il ?? ''),
    oggetto: String(d.oggetto ?? t('Ti do accesso ai miei figli su Athlon', 'I’m giving you access to my kids on Athlon')),
    messaggio: String(d.messaggio ?? d.link),
  }
}

export async function statoDelega(): Promise<StatoDelega> {
  const { ok, stato, dati } = await funzione('portale-lab-delega', { azione: 'stato' })
  if (!ok) return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO : GUASTO) }
  if (!dati.idoneo) return { ok: true, idoneo: false, motivo: String(dati.motivo ?? '') }
  return {
    ok: true,
    idoneo: true,
    figli: Array.isArray(dati.figli) ? dati.figli.map(String) : [],
    massimo: Number(dati.massimo ?? 2),
    giorni: Number(dati.giorni ?? 7),
    attive: Array.isArray(dati.attive) ? (dati.attive as DelegaAttiva[]) : [],
    aperto: linkDa(dati.aperto),
  }
}

/** Un link nuovo, valido per una persona sola. Se ce n'era uno aperto la funzione lo toglie: e' sempre uno solo. */
export async function creaLinkDelega(): Promise<{ ok: true; link: LinkDelega } | { ok: false; errore: string }> {
  const { ok, stato, dati } = await funzione('portale-lab-delega', { azione: 'crea' })
  const l = ok ? linkDa(dati) : null
  if (l) return { ok: true, link: l }
  return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO : GUASTO) }
}

/** Toglie un link aperto o una delega attiva: dopo, la persona non vede piu' i figli. */
export async function revocaDelega(id: string, cosa: 'link' | 'delega'): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await funzione('portale-lab-delega', { azione: 'revoca', id, cosa })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('Non siamo riusciti a toglierla adesso. Riprova fra qualche minuto.', 'We couldn’t remove it right now. Try again in a few minutes.') }
}

// ---------------------------------------------------------------------------------------------------------------------
// La pagina pubblica: chi apre il link
// ---------------------------------------------------------------------------------------------------------------------

async function chiamaPubblica(corpo: Record<string, unknown>): Promise<{ ok: boolean; stato: number; dati: Record<string, any> }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/delega-invito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify(corpo),
    })
    const dati = ((await r.json().catch(() => null)) ?? {}) as Record<string, any>
    return { ok: r.ok && dati.ok === true, stato: r.status, dati }
  } catch {
    return { ok: false, stato: 0, dati: { errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') } }
  }
}

export type InvitoDelega = { valido: boolean; nome: string | null; figli: number }

/** Chi ti da' la delega (solo il primo nome) e se il link vale ancora. Senza sessione. */
export async function leggiInvitoDelega(codice: string): Promise<InvitoDelega> {
  const r = await chiamaPubblica({ azione: 'leggi', codice })
  return { valido: r.ok && r.dati.valido === true, nome: r.dati.nome ? String(r.dati.nome) : null, figli: Number(r.dati.figli ?? 0) }
}

export type DatiDelegato = {
  nome: string
  cognome: string
  email: string
  telefono: string
  nascita: string
}

/**
 * Chi apre il link si registra. La funzione controlla tutto (maggiorenne, link valido e non usato, che la persona non sia gia' al club
 * con dati diversi) e, se la persona e' nuova, la crea su PerfectGym come Guest; poi la collega al titolare e ai figli.
 * `scaduto` dice che il link non vale piu' (riprovare non serve).
 */
export async function accettaDelega(
  codice: string,
  d: DatiDelegato,
  privacy: boolean,
): Promise<{ ok: true; nome: string } | { ok: false; errore: string; scaduto: boolean }> {
  const r = await chiamaPubblica({ azione: 'accetta', codice, ...d, email: d.email.trim().toLowerCase(), privacy })
  if (r.ok) return { ok: true, nome: String(r.dati.nome ?? d.nome) }
  return {
    ok: false,
    errore: r.dati.errore ?? t('Non siamo riusciti a completare adesso. Riprova fra qualche minuto.', 'We couldn’t complete this right now. Try again in a few minutes.'),
    scaduto: r.dati.scaduto === true,
  }
}
