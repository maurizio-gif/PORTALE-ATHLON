import type { PersonaDati } from '@/api/abbonamento'

// Il codice fiscale del figlio, chiesto al momento di prenotare nella sezione Junior (13/11/2026, richiesta di Maurizio).
//
// Il server (`portale-lab-calendario`, `prenota` e `acquista`) risponde 409 `codice_fiscale` quando a un bambino manca il codice fiscale, con i
// suoi dati nella forma dell'abbonamento (`persone_dati`). Le funzioni `prenotaLezione` e `acquistaLezione` (`api/lab.ts`) lo dicono qui, e il
// foglio `FoglioCodiceFiscale`, montato una volta sola nel layout del portale, si apre da solo con «Correggi i dati». Stanno in un posto solo
// perche' le prenotazioni partono da piu' schermate (Calendario, sezione Junior, Percorso, Consigli) e un foglio per ognuna divergerebbe.

/**
 * `motivo` (14/11/2026): `prenotazione` (di partenza) quando lo chiede il server al momento di prenotare; `modifica` quando il genitore apre lui il
 * foglio dalla carta «I dati di …» della sezione Junior, per scriverlo prima o correggerlo. `onSalvato`: chi l'ha chiesto rilegge i dati.
 */
export type RichiestaCodiceFiscale = { persona: PersonaDati; mancanti: string[]; motivo?: 'prenotazione' | 'modifica'; onSalvato?: () => void }
type Ascoltatore = (r: RichiestaCodiceFiscale) => void

// Due elenchi (14/11/2026). Il foglio del layout e' un `Modal`, e su iOS un secondo `Modal` non si apre sopra uno gia' aperto: la richiesta partita
// dalla chat dell'assistente (`PrenotaDaChat`, che sta in un `Modal`) restava senza foglio, e il genitore leggeva «scrivilo» senza un campo dove
// scriverlo. Quando una finestra aperta ha un suo foglio **dentro** di se' (`dentro: true`), la richiesta va a quello e solo a quello; altrimenti
// al foglio del layout, come prima.
const ascoltatori = new Set<Ascoltatore>()
const interni = new Set<Ascoltatore>()

/** Chiede il codice fiscale del bambino: apre il foglio, se e' montato. Non solleva. */
export function chiediCodiceFiscale(r: RichiestaCodiceFiscale): void {
  for (const a of interni.size ? interni : ascoltatori) a(r)
}

/**
 * Chi disegna il foglio si iscrive qui; la funzione che ritorna toglie l'iscrizione. `dentro`: il foglio sta dentro una finestra aperta (un `Modal`),
 * e finche' e' iscritto la richiesta va a lui invece che al foglio del layout. Si iscrive solo mentre la finestra e' aperta.
 */
export function ascoltaRichiestaCodiceFiscale(a: Ascoltatore, opzioni?: { dentro?: boolean }): () => void {
  const elenco = opzioni?.dentro ? interni : ascoltatori
  elenco.add(a)
  return () => {
    elenco.delete(a)
  }
}

/** Dalla risposta del server: la richiesta, se e' un blocco per il codice fiscale di un bambino; altrimenti null. */
export function richiestaDaRisposta(dati: Record<string, unknown>): RichiestaCodiceFiscale | null {
  if (dati.codice !== 'codice_fiscale') return null
  const persona = Array.isArray(dati.persone_dati) ? (dati.persone_dati[0] as PersonaDati | undefined) : undefined
  if (!persona || typeof persona.member_id !== 'number') return null
  const mancanti = Array.isArray(dati.mancanti) ? (dati.mancanti as unknown[]).map(String) : ['codice fiscale']
  return { persona, mancanti }
}
