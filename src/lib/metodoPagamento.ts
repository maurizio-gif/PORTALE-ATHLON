// Le regole del metodo di pagamento che servono al portale: controllo
// dell'IBAN e dell'indirizzo prima di mandarli, e come si legge il metodo
// attuale di un abbonamento.
//
// Copiate da `lib/metodoPagamento.ts` del CRM (APP-ATHLON), parola per parola,
// e uguali a quelle della funzione `portale-link` (`regole.ts`): il server le
// ricontrolla comunque. Duplicazione dichiarata: se una regola cambia, va
// cambiata in tutti e tre i posti.

import { t } from './lingua'

/** L'IBAN come lo vuole PerfectGym: maiuscolo, senza spazi. */
export function normalizzaIban(grezzo: string): string {
  return String(grezzo ?? '').replace(/[\s-]+/g, '').toUpperCase()
}

// Le lunghezze dei paesi SEPA che un socio del club può plausibilmente avere.
// Un paese che non è qui passa con il solo controllo di forma e del codice di
// controllo: meglio lasciar provare un conto vero che rifiutarlo per una
// tabella incompleta. PerfectGym fa comunque la sua verifica.
const LUNGHEZZE: Record<string, number> = {
  IT: 27, SM: 27, VA: 22, DE: 22, FR: 27, ES: 24, PT: 25, BE: 16, NL: 18, LU: 20,
  AT: 20, IE: 22, CH: 21, GB: 22, MC: 27, PL: 28, RO: 24, GR: 27, HR: 21, SI: 19,
}

/**
 * Controlla un IBAN prima di mandarlo a PerfectGym: forma, lunghezza del paese
 * e codice di controllo (mod 97). Un errore di battitura si dice qui, subito,
 * con parole che la persona capisce, invece di tornare come un rifiuto del
 * gestionale.
 */
export function controllaIban(grezzo: string): { ok: true; iban: string } | { ok: false; errore: string } {
  const iban = normalizzaIban(grezzo)
  if (!iban) return { ok: false, errore: t('Scrivi l’IBAN del conto.', 'Enter the account’s IBAN.') }
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return { ok: false, errore: t('Un IBAN comincia con due lettere e due cifre, come IT60…', 'An IBAN starts with two letters and two digits, like IT60…') }
  }
  const attesa = LUNGHEZZE[iban.slice(0, 2)]
  if (attesa && iban.length !== attesa) {
    return {
      ok: false,
      errore: t(`Un IBAN ${iban.slice(0, 2)} ha ${attesa} caratteri: questo ne ha ${iban.length}. Controlla di averlo copiato tutto.`, `A ${iban.slice(0, 2)} IBAN has ${attesa} characters: this one has ${iban.length}. Check you copied all of it.`),
    }
  }
  if (iban.length < 15 || iban.length > 34) return { ok: false, errore: t('La lunghezza di questo IBAN non torna.', 'The length of this IBAN doesn’t add up.') }

  // Il codice di controllo: si spostano i primi quattro caratteri in fondo, le
  // lettere diventano numeri (A=10 … Z=35) e il resto della divisione per 97
  // deve fare 1. Si calcola a pezzi perché il numero non sta in un double.
  const riordinato = iban.slice(4) + iban.slice(0, 4)
  let resto = 0
  for (const ch of riordinato) {
    const valore = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch
    for (const cifra of valore) resto = (resto * 10 + Number(cifra)) % 97
  }
  if (resto !== 1) return { ok: false, errore: t('Questo IBAN non è valido: c’è probabilmente un carattere sbagliato.', 'This IBAN isn’t valid: there’s probably a wrong character.') }
  return { ok: true, iban }
}

/** Le ultime cifre, per dire «salvato il conto che finisce con …» senza ripeterlo tutto. */
export function finaleIban(iban: string): string {
  return normalizzaIban(iban).slice(-4)
}

/**
 * L'indirizzo dell'intestatario del conto, scritto da chi compila.
 *
 * Non si prende mai dalla scheda di PerfectGym: il conto può essere di un
 * genitore o del coniuge, e l'indirizzo del mandato SEPA è quello di chi lo
 * intesta, non di chi si allena. Lo stesso controllo gira nel browser e nella
 * rotta, così un campo vuoto si corregge subito e non arriva mai al gestionale.
 */
export function controllaIndirizzo(dati: {
  via?: unknown
  cap?: unknown
  citta?: unknown
}):
  | { ok: true; valori: { via: string; cap: string; citta: string } }
  | { ok: false; errore: string } {
  const pulito = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
  const via = pulito(dati.via)
  const cap = pulito(dati.cap).toUpperCase()
  const citta = pulito(dati.citta)
  if (via.length < 3) return { ok: false, errore: t('Scrivi via e numero civico dell’intestatario del conto.', 'Enter the street and house number of the account holder.') }
  if (via.length > 100) return { ok: false, errore: t('L’indirizzo è troppo lungo.', 'The address is too long.') }
  if (!/^[A-Z0-9][A-Z0-9 -]{2,9}$/.test(cap)) return { ok: false, errore: t('Scrivi il CAP dell’intestatario del conto.', 'Enter the postcode of the account holder.') }
  if (citta.length < 2) return { ok: false, errore: t('Scrivi la città dell’intestatario del conto.', 'Enter the city of the account holder.') }
  if (citta.length > 60) return { ok: false, errore: t('Il nome della città è troppo lungo.', 'The city name is too long.') }
  return { ok: true, valori: { via, cap, citta } }
}

export type MetodoAttuale = { tipo: string; finale: string | null; scadenza: string | null; scaduta: boolean }

export type ContrattoNucleo = {
  contract_id: number
  member_id: number
  nome: string | null
  cognome: string | null
  piano: string | null
  stato: string | null
  data_firma: string | null
  data_inizio: string | null
  data_fine: string | null
  titolare: boolean
  metodo: MetodoAttuale | null
}

export type EsitoContratto = { contract_id: number; ok: boolean; errore: string | null }

/** Un metodo «da sistemare»: nessuno, contanti, o una carta scaduta. */
export function metodoDaSistemare(m: MetodoAttuale | null): boolean {
  if (!m) return true
  const t = m.tipo.toLowerCase()
  if (t === 'cash') return true
  return t === 'creditcard' && m.scaduta
}

/** Mese e anno di una scadenza di carta: «08/2027». */
export function meseAnno(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** «2026-03-30» → «30/03/2026». Il giorno com'è scritto, senza fusi. */
export function dataBreve(iso: string | null | undefined): string | null {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null
}

/**
 * Cosa dice l'indirizzo con cui il gateway rimanda indietro dopo la carta.
 *
 * PerfectGym non documenta i parametri che aggiunge al `thankYouPageUrl`, e
 * non ha un'API per chiedere com'è finita una registrazione. Se però
 * l'indirizzo porta un esito leggibile — `status=failed`, `resultCode=Refused`
 * e simili — è inutile aspettare un minuto una carta che non arriverà: si dice
 * subito che non è andata. Nel dubbio si aspetta, come prima.
 */
export function esitoRitornoCarta(query: string): 'fallito' | null {
  const p = new URLSearchParams(query)
  const chiavi = ['status', 'result', 'resultcode', 'success', 'error', 'state', 'outcome', 'paymentstatus']
  for (const [k, v] of p.entries()) {
    if (!chiavi.includes(k.toLowerCase())) continue
    const valore = v.trim().toLowerCase()
    if (k.toLowerCase() === 'error' && valore) return 'fallito'
    if (/^(false|0|fail|failed|failure|error|refused|declined|cancel|cancelled|canceled|rejected|denied|expired)$/.test(valore)) {
      return 'fallito'
    }
  }
  return null
}

/**
 * Il metodo come lo scrive PerfectGym (`paymentSource` del contratto: tipo,
 * ultime cifre pubbliche, scadenza della carta), nella forma che mostra il
 * portale. La stessa lettura di `metodoDi` in perfectgym-metodo-pagamento.
 */
export function metodoDaPerfectGym(ps: unknown): MetodoAttuale | null {
  const p = ps as { paymentSource?: unknown; publicData?: unknown; validTo?: unknown; isDeleted?: unknown } | null
  if (!p || p.isDeleted) return null
  const tipo = String(p.paymentSource ?? '').trim()
  if (!tipo) return null
  const finale = String(p.publicData ?? '').replace(/\s+/g, '') || null
  const scadenza = p.validTo ? String(p.validTo) : null
  const t = scadenza ? new Date(scadenza).getTime() : NaN
  return { tipo, finale, scadenza, scaduta: Number.isFinite(t) && t < Date.now() }
}
