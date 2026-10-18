import { funzione } from './lab'

// I dispositivi personali (19/10/2026): la funzione portale-lab-dispositivi di APP-ATHLON.
// Oura e Polar si collegano con un OAuth: `collega` chiede l'indirizzo del fornitore, il
// socio autorizza, il fornitore lo rimanda a /allenamento/dispositivi?code=…&state=… e
// `completaCollegamento` manda codice e state alla funzione, che scambia il codice (il
// segreto sta li') e fa il primo giro di lettura. Ogni azione fuori da `stato` e `consenso`
// vuole il consenso all'informativa: senza, la funzione risponde 403 con `consenso: false`.
// I token non arrivano mai qui.

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string; senzaConsenso?: boolean }

export type IdFornitore = 'oura' | 'polar'

export type Fornitore = { id: IdFornitore; nome: string; disponibile: boolean }

export type Collegamento = {
  fornitore: IdFornitore
  /** 'da_riautorizzare': il fornitore ha tolto l'accesso, va ricollegato. */
  stato: 'attivo' | 'da_riautorizzare'
  collegato_il: string | null
  ultimo_sync_il: string | null
  ultimo_errore: string | null
}

/** Il recupero com'e' per il fornitore: Oura «prontezza» 0-100, Polar «Nightly Recharge» 1-6. */
export type ScalaRecupero = 'oura_prontezza' | 'polar_recharge'

export type GiornoDispositivo = {
  fornitore: IdFornitore
  /** AAAA-MM-GG, il giorno del risveglio. */
  data: string
  sonno_punteggio: number | null
  sonno_minuti: number | null
  sonno_profondo_minuti: number | null
  sonno_rem_minuti: number | null
  recupero_valore: number | null
  recupero_scala: ScalaRecupero | null
  /** Il battito piu' basso della notte, in battiti al minuto. */
  fc_notte: number | null
  /** La variabilita' del battito (HRV), in millisecondi. */
  hrv_ms: number | null
  passi: number | null
  calorie_attive: number | null
}

export type AllenamentoDispositivo = {
  id: string
  fornitore: IdFornitore
  inizio: string
  durata_minuti: number
  /** Lo sport come lo scrive il fornitore, in minuscolo («running»). */
  sport: string | null
  calorie: number | null
  fc_media: number | null
  fc_max: number | null
}

export type DatiDispositivi = { collegamenti: Collegamento[]; giorni: GiornoDispositivo[]; allenamenti: AllenamentoDispositivo[] }

export type StatoDispositivi = {
  versione: string
  consenso: { versione: string; accettato_il: string } | null
  maggiorenne: boolean
  fornitori: Fornitore[]
  collegamenti: Collegamento[]
}

const chiama = (corpo: Record<string, unknown>) => funzione('portale-lab-dispositivi', corpo)

function errore(dati: Record<string, any>, ripiego: string) {
  return { ok: false as const, errore: (dati.errore as string) ?? ripiego, senzaConsenso: dati.consenso === false }
}

const dei = (dati: Record<string, any>): DatiDispositivi => ({ collegamenti: dati.collegamenti ?? [], giorni: dati.giorni ?? [], allenamenti: dati.allenamenti ?? [] })

export async function statoDispositivi(): Promise<Esito<StatoDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'stato' })
  if (ok) return { ok: true, versione: dati.versione, consenso: dati.consenso ?? null, maggiorenne: !!dati.maggiorenne, fornitori: dati.fornitori ?? [], collegamenti: dati.collegamenti ?? [] }
  return errore(dati, 'Non riusciamo a leggere i tuoi dispositivi adesso.')
}

export async function daiConsensoDispositivi(versione: string): Promise<Esito<{ consenso: { versione: string; accettato_il: string } }>> {
  const { ok, dati } = await chiama({ azione: 'consenso', versione })
  if (ok) return { ok: true, consenso: dati.consenso }
  return errore(dati, 'Non siamo riusciti a registrare il consenso. Riprova.')
}

/** Scollega tutti i dispositivi e cancella i dati: la revoca del consenso. */
export async function revocaConsensoDispositivi(): Promise<Esito<object>> {
  const { ok, dati } = await chiama({ azione: 'revoca' })
  if (ok) return { ok: true }
  return errore(dati, 'Non siamo riusciti a revocare il consenso. Riprova.')
}

/** L'indirizzo del fornitore a cui mandare il socio per autorizzare il club. */
export async function collega(fornitore: IdFornitore): Promise<Esito<{ url: string }>> {
  const { ok, dati } = await chiama({ azione: 'connetti', fornitore })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url }
  return errore(dati, 'Non riusciamo ad avviare il collegamento adesso. Riprova.')
}

/** Chiude il collegamento col codice e lo state che il fornitore ha rimandato all'app. */
export async function completaCollegamento(codice: string, state: string): Promise<Esito<DatiDispositivi & { fornitore: IdFornitore }>> {
  const { ok, dati } = await chiama({ azione: 'completa', codice, state })
  if (ok) return { ok: true, fornitore: dati.fornitore, ...dei(dati) }
  return errore(dati, 'Non siamo riusciti a completare il collegamento. Riprova dal pulsante «Collega».')
}

export async function scollega(fornitore: IdFornitore): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'scollega', fornitore })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, 'Non siamo riusciti a scollegare il dispositivo. Riprova.')
}

export async function datiDispositivi(): Promise<Esito<DatiDispositivi>> {
  const { ok, dati } = await chiama({ azione: 'dati' })
  if (ok) return { ok: true, ...dei(dati) }
  return errore(dati, 'Non riusciamo a leggere i dati dei dispositivi adesso.')
}

/** Rilegge subito dal fornitore (la funzione non lo fa piu' di una volta ogni due minuti). */
export async function aggiornaDispositivi(): Promise<Esito<DatiDispositivi & { aggiornati: number }>> {
  const { ok, dati } = await chiama({ azione: 'aggiorna' })
  if (ok) return { ok: true, aggiornati: Number(dati.aggiornati ?? 0), ...dei(dati) }
  return errore(dati, 'Non siamo riusciti ad aggiornare adesso. Riprova fra poco.')
}
