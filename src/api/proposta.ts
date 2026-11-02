import type { AnteprimaContratto, EsitoContratto, EsitoFirma, EsitoPagamento, Formula, MetodoAbbonamento, StatoContratto } from '@/api/abbonamento'
import { SUPABASE_URL } from '@/config'
import { intestazioneLingua, t } from '@/lib/lingua'

// La proposta di abbonamento (vendita assistita, 02/11/2026): il link o il QR che il totem o il CRM danno a chi compra.
// Chi lo apre non ha un account e non ha una sessione: la credenziale e' il token del link, e la data di nascita di chi
// ha digitato i dati (la verifica la fa `proposte`, con il blocco dopo gli errori). Come `api/link.ts`: funzioni
// pubbliche, nessuna intestazione di autorizzazione.
//
// Due funzioni:
//   - `proposte`            apri (verifica la data di nascita);
//   - `portale-abbonamento` proposta_anteprima / proposta_firma / proposta_paga / proposta_esito: lo stesso motore
//                           dell'abbonamento di sempre (contratto, firma, pagamento, esito), che qui si apre dal token.
// Prezzi, date e importi li calcola il server: qui si mostrano soltanto.

type Funzione = 'proposte' | 'portale-abbonamento'
type Risposta = { ok: boolean; stato: number; dati: Record<string, any> }

/** Un token di proposta: 24 byte in base64url, 32 caratteri (come `formaToken` del server). Altre forme non sono proposte. */
export const eTokenProposta = (token: string): boolean => /^[A-Za-z0-9_-]{32,64}$/.test(token)

async function chiama(funzione: Funzione, corpo: Record<string, unknown>): Promise<Risposta> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${funzione}`, {
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

/** Perche' una proposta non si puo' usare, o non si puo' ancora: i motivi che il server dice, piu' quelli di rete. */
export type MotivoProposta =
  | 'non_attivo'
  | 'annullata'
  | 'proposta_scaduta'
  | 'token_scaduto'
  | 'bloccata'
  | 'dati_mancanti'
  | 'non_verificata'
  | 'nascita_errata'
  | 'gia_firmata'
  | 'giorno_non_confermato'
  | 'rete'
  | 'altro'

export type ErroreProposta = {
  motivo: MotivoProposta
  /** Il testo del server, gia' nella lingua della persona. */
  errore: string
  /** Solo `nascita_errata`. */
  tentativi_rimasti?: number
  /** Solo `bloccata`: da quando si puo' riprovare (ISO). */
  riprova_dopo?: string | null
  /** Solo 409 `mancanti`: i dati che il contratto non ha. */
  mancanti?: string[]
}

const MOTIVI: MotivoProposta[] = ['annullata', 'proposta_scaduta', 'token_scaduto', 'bloccata', 'dati_mancanti', 'non_verificata', 'nascita_errata', 'gia_firmata', 'giorno_non_confermato']

function errore(r: Risposta, ripiego: string): ErroreProposta {
  const d = r.dati
  const motivo: MotivoProposta = d.non_attivo === true || r.stato === 503 ? 'non_attivo' : r.stato === 0 ? 'rete' : (MOTIVI.find((m) => m === d.motivo) ?? 'altro')
  return {
    motivo,
    errore: typeof d.errore === 'string' && d.errore ? d.errore : ripiego,
    ...(typeof d.tentativi_rimasti === 'number' ? { tentativi_rimasti: d.tentativi_rimasti } : {}),
    ...(typeof d.riprova_dopo === 'string' ? { riprova_dopo: d.riprova_dopo } : {}),
    ...(Array.isArray(d.mancanti) ? { mancanti: d.mancanti.map(String) } : {}),
  }
}

// ---------------------------------------------------------------------------
// Aprire il link

export type PianoProposta = { piano_id: number; titolo?: string; etichetta?: string; formula?: Formula; importo?: number; periodo?: string }

/** Quello che `proposte` mostra a chi ha verificato la data di nascita: pochi dati, i nomi abbreviati e il telefono mascherato. */
export type VistaProposta = {
  id: string
  stato: string
  esito: string
  prossimo: string | null
  firmatario: 'se_stesso' | 'genitore'
  modalita: 'qr' | 'email' | 'assistita'
  data_inizio: string | null
  scade_il: string
  piano: PianoProposta
  persona: { nome: string; telefono: string | null } | null
  beneficiario: { nome: string } | null
  contratto_numero: string | null
}

/** Il token e' una proposta? Si chiede senza data di nascita: la risposta e' sempre «serve la verifica», se la proposta c'e' ed e' pronta. */
export type Sonda =
  | { tipo: 'proposta' }
  | { tipo: 'proposta_ferma'; errore: ErroreProposta }
  | { tipo: 'altro' }

/**
 * Il dispatch di `/r/<token>`: dopo `portale-link`, che non lo conosce, si prova qui. E' una proposta se la funzione risponde
 * «serve la verifica» (200), «bloccata» (429), «annullata/scaduta» (410) o «dati mancanti» (409). 404 (non valido) e 503
 * (non attivo) lasciano il «link non valido» di sempre; una rete che non risponde e' un guasto e non una pagina scaduta.
 */
export async function sondaProposta(token: string): Promise<Sonda | { tipo: 'guasto' }> {
  const r = await chiama('proposte', { azione: 'apri', token })
  if (r.ok && r.dati.richiede_verifica === true) return { tipo: 'proposta' }
  if (r.stato === 0) return { tipo: 'guasto' }
  if (r.stato === 404 || r.stato === 503) return { tipo: 'altro' }
  if (r.stato === 429 || r.stato === 410 || r.stato === 409) return { tipo: 'proposta_ferma', errore: errore(r, '') }
  if (r.ok) return { tipo: 'proposta' }
  return { tipo: 'guasto' }
}

/** Con la data di nascita: la proposta, se e' quella di chi la scrive. */
export async function verificaProposta(token: string, nascita: string): Promise<{ ok: true; proposta: VistaProposta } | ({ ok: false } & ErroreProposta)> {
  const r = await chiama('proposte', { azione: 'apri', token, nascita })
  if (r.ok && r.dati.proposta) return { ok: true, proposta: r.dati.proposta as VistaProposta }
  return { ok: false, ...errore(r, t('Non riusciamo a verificare la data adesso.', 'We can’t check the date right now.')) }
}

// ---------------------------------------------------------------------------
// Il contratto

/** L'anteprima del contratto di una proposta: come quella di sempre, piu' il giorno e se il totale e' cambiato. */
export type AnteprimaProposta = Omit<AnteprimaContratto, 'persone_dati'> & {
  proposta: { id: string; firmatario: 'se_stesso' | 'genitore'; data_inizio: string; giorno_confermato: boolean }
  /** Il preventivo fatto al totem non e' piu' quello di adesso (data passata, promozione finita). */
  cambiato: { prima: number; adesso: number } | null
}

/**
 * Senza `dataInizio` si legge l'anteprima per il giorno proposto; con, la persona CONFERMA quel giorno (il server lo segna e
 * la firma lo pretende). Il contratto che torna e' quello per quel giorno.
 */
export async function anteprimaProposta(token: string, dataInizio?: string): Promise<{ ok: true; anteprima: AnteprimaProposta } | ({ ok: false } & ErroreProposta)> {
  const r = await chiama('portale-abbonamento', { azione: 'proposta_anteprima', token, ...(dataInizio ? { data_inizio: dataInizio } : {}) })
  if (r.ok && r.dati.documento) return { ok: true, anteprima: r.dati as unknown as AnteprimaProposta }
  return { ok: false, ...errore(r, t('Non riusciamo a preparare il contratto adesso.', 'We can’t prepare the contract right now.')) }
}

export async function firmaProposta(token: string, impronta: string, consensi: Record<string, boolean>, firmaPng: string): Promise<{ ok: true; esito: EsitoFirma } | ({ ok: false } & ErroreProposta)> {
  const r = await chiama('portale-abbonamento', { azione: 'proposta_firma', token, dati_confermati: true, impronta, consensi, firma_png: firmaPng })
  if (r.ok && r.dati.numero) {
    return { ok: true, esito: { numero: String(r.dati.numero), stato: r.dati.stato as StatoContratto, totale_oggi: Number(r.dati.totale_oggi ?? 0), cambio: null } }
  }
  return { ok: false, ...errore(r, t('Non siamo riusciti a registrare il contratto adesso.', 'We couldn’t register the contract right now.')) }
}

// ---------------------------------------------------------------------------
// Il pagamento

/** Il metodo: la carta nuova (si paga e si salva sulla pagina sicura) o un IBAN nuovo. Chi non ha un account non ha un metodo gia' salvato. */
export type MetodoProposta = Extract<MetodoAbbonamento, { metodo: 'carta' }> | Extract<MetodoAbbonamento, { iban: string }>

export async function pagaProposta(token: string, m: MetodoProposta): Promise<{ ok: true; esito: EsitoPagamento } | ({ ok: false } & ErroreProposta)> {
  const r = await chiama('portale-abbonamento', { azione: 'proposta_paga', token, ...m })
  if (r.ok && r.dati.numero) {
    return { ok: true, esito: { numero: String(r.dati.numero), stato: r.dati.stato as StatoContratto, url: typeof r.dati.url === 'string' ? r.dati.url : null } }
  }
  return { ok: false, ...errore(r, t('Non siamo riusciti a completare il pagamento adesso.', 'We couldn’t complete the payment right now.')) }
}

/** `non_firmata`: la proposta e' verificata ma il contratto non c'e' ancora. */
export type EsitoProposta = { firmata: false } | ({ firmata: true } & EsitoContratto)

/**
 * Dopo la firma, e al ritorno dalla pagina di pagamento. Richiede solo che il server abbia gia' la verifica (`verificata_il`):
 * non la data di nascita. Per questo e' la prima cosa che si chiede quando la pagina si riapre.
 */
export async function esitoProposta(token: string): Promise<{ ok: true; esito: EsitoProposta } | ({ ok: false } & ErroreProposta)> {
  const r = await chiama('portale-abbonamento', { azione: 'proposta_esito', token })
  if (r.ok && r.dati.stato === 'non_firmata') return { ok: true, esito: { firmata: false } }
  if (r.ok) {
    return { ok: true, esito: { firmata: true, stato: r.dati.stato as StatoContratto, pagamento: r.dati.pagamento ?? null, errore: r.dati.errore ?? null } }
  }
  return { ok: false, ...errore(r, t('Non riusciamo a verificare il contratto adesso.', 'We can’t check the contract right now.')) }
}
