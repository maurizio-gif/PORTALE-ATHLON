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
    },
  }
}

export type DatiProfilo = Partial<Record<CampoIngresso, string>> & { privacy?: boolean }

export type EsitoProfilo = { ok: true } | { ok: false; errore: string; minorenne?: boolean; verifica?: boolean; serve?: CampoIngresso[] }

export async function completaProfilo(d: DatiProfilo): Promise<EsitoProfilo> {
  const { ok, dati } = await funzione('portale-registrazione', { azione: 'completa', ...d })
  if (ok) return { ok: true }
  return {
    ok: false,
    errore: String(dati.errore ?? PROVA),
    minorenne: dati.minorenne === true,
    verifica: dati.verifica === true,
    serve: Array.isArray(dati.serve) ? (dati.serve as CampoIngresso[]) : undefined,
  }
}
