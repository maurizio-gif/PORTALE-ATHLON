import { SUPABASE_URL } from '@/config'
import { funzione } from '@/api/lab'
import { intestazioneLingua, t } from '@/lib/lingua'

// La registrazione dal portale e dall'app (01/11/2026): email -> codice -> «Completa il profilo» -> dentro. Funzione `portale-registrazione`
// (APP-ATHLON), dietro l'interruttore `portale_registrazione`: spento, `stato` dice `aperta: false` e l'app fa come prima.
// **La data di nascita e' sempre richiesta**: se la scheda ce l'ha non si chiede mai, se manca e' il primo campo.

/** I dati che la funzione chiede, nell'ordine in cui compaiono: la data di nascita per prima. */
export type CampoIngresso = 'nascita' | 'nome' | 'cognome' | 'telefono'

export type StatoIngresso = {
  /** L'interruttore: spento, l'app non chiede niente. */
  aperta: boolean
  /** E' gia' fra chi puo' entrare. */
  ammesso: boolean
  /** Cosa manca; vuoto = si puo' entrare (o, se non e' ammesso, basta `completa` senza dati). */
  campi: CampoIngresso[]
  /** Con questa email ci sono solo schede di minorenni: da guardare in segreteria, non si completa da qui. */
  verifica?: boolean
  /** Quello che la persona ha gia' scritto al club con questa email (il pannello del sito, un modulo): si mostra gia' scritto, da confermare (05/11/2026). */
  precompila?: Partial<Record<'nome' | 'cognome' | 'telefono', string>>
}

/** La pagina d'accesso dice «prima volta qui?» solo se la registrazione e' aperta. Dato pubblico, non solleva mai. */
export async function registrazioneAperta(): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/portale-accesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...intestazioneLingua() },
      body: JSON.stringify({ azione: 'stato' }),
    })
    const dati = (await r.json().catch(() => null)) as { registrazione?: boolean } | null
    return dati?.registrazione === true
  } catch {
    return false
  }
}

const PROVA = t('Non siamo riusciti a controllare i tuoi dati. Riprova tra poco.', 'We couldn’t check your details. Try again shortly.')

export async function statoIngresso(): Promise<{ ok: true; stato: StatoIngresso } | { ok: false; errore: string }> {
  const { ok, dati } = await funzione('portale-registrazione', { azione: 'stato' })
  if (!ok) return { ok: false, errore: String(dati.errore ?? PROVA) }
  return {
    ok: true,
    stato: {
      aperta: dati.aperta === true,
      ammesso: dati.ammesso === true,
      campi: Array.isArray(dati.campi) ? (dati.campi as CampoIngresso[]) : [],
      verifica: dati.verifica === true,
      precompila: precompilaDa(dati.precompila),
    },
  }
}

function precompilaDa(v: unknown): StatoIngresso['precompila'] {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const out: NonNullable<StatoIngresso['precompila']> = {}
  for (const k of ['nome', 'cognome', 'telefono'] as const) if (typeof o[k] === 'string' && o[k]) out[k] = String(o[k]).slice(0, 80)
  return Object.keys(out).length ? out : undefined
}

export type DatiProfilo = Partial<Record<CampoIngresso, string>> & {
  privacy?: boolean
  /** La persona dice di non riconoscere l'indirizzo che le abbiamo mostrato (o di non usarlo piu'): solo allora la richiesta arriva alla segreteria (10/11/2026). */
  segnala?: boolean
}

export type EsitoProfilo =
  | { ok: true }
  | {
      ok: false
      errore: string
      minorenne?: boolean
      verifica?: boolean
      somiglianza?: boolean
      serve?: CampoIngresso[]
      /** Gia' del club con un altro indirizzo: si puo' collegare con un codice via SMS al cellulare della scheda, che finisce con queste due cifre (05/11/2026). */
      sms?: { finale: string }
      /** Gia' del club con un altro indirizzo: gli indirizzi che ci risultano, **in parte nascosti** (`si***i@icloud.com`). La persona entra con quello e la segreteria non e' coinvolta (10/11/2026). */
      emailNote?: string[]
    }

export async function completaProfilo(d: DatiProfilo): Promise<EsitoProfilo> {
  const { ok, dati } = await funzione('portale-registrazione', { azione: 'completa', ...d })
  if (ok) return { ok: true }
  return {
    ok: false,
    errore: String(dati.errore ?? PROVA),
    minorenne: dati.minorenne === true,
    verifica: dati.verifica === true,
    somiglianza: dati.somiglianza === true,
    serve: Array.isArray(dati.serve) ? (dati.serve as CampoIngresso[]) : undefined,
    sms: smsDa(dati.sms),
    emailNote: emailNoteDa(dati.emailNote),
  }
}

/** Al massimo tre indirizzi, e solo testo corto: lo scrive il server, ma e' quello che la persona legge. */
function emailNoteDa(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.filter((x): x is string => typeof x === 'string' && x.includes('@')).map((x) => x.trim().slice(0, 80)).slice(0, 3)
  return out.length ? out : undefined
}

function smsDa(v: unknown): { finale: string } | undefined {
  const f = v && typeof v === 'object' ? String((v as Record<string, unknown>).finale ?? '') : ''
  return /^\d{2}$/.test(f) ? { finale: f } : undefined
}

/** Il codice via SMS al cellulare della scheda trovata (05/11/2026). */
export async function inviaCodiceSms(): Promise<{ ok: true; finale: string } | { ok: false; errore: string }> {
  const { ok, dati } = await funzione('portale-registrazione', { azione: 'sms_invia' })
  if (ok) return { ok: true, finale: String(dati.finale ?? '') }
  return { ok: false, errore: String(dati.errore ?? PROVA) }
}

/** Il codice scritto dalla persona: giusto, l'indirizzo e' collegato alla scheda e si entra. */
export async function verificaCodiceSms(codice: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await funzione('portale-registrazione', { azione: 'sms_verifica', codice })
  if (ok) return { ok: true }
  return { ok: false, errore: String(dati.errore ?? PROVA) }
}
