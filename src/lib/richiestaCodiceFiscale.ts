import type { PersonaDati } from '@/api/abbonamento'

// Il codice fiscale del figlio, chiesto al momento di prenotare nella sezione Junior (13/11/2026, richiesta di Maurizio).
//
// Il server (`portale-lab-calendario`, `prenota` e `acquista`) risponde 409 `codice_fiscale` quando a un bambino manca il codice fiscale, con i
// suoi dati nella forma dell'abbonamento (`persone_dati`). Le funzioni `prenotaLezione` e `acquistaLezione` (`api/lab.ts`) lo dicono qui, e il
// foglio `FoglioCodiceFiscale`, montato una volta sola nel layout del portale, si apre da solo con «Correggi i dati». Stanno in un posto solo
// perche' le prenotazioni partono da piu' schermate (Calendario, sezione Junior, Percorso, Consigli) e un foglio per ognuna divergerebbe.

export type RichiestaCodiceFiscale = { persona: PersonaDati; mancanti: string[] }
type Ascoltatore = (r: RichiestaCodiceFiscale) => void

const ascoltatori = new Set<Ascoltatore>()

/** Chiede il codice fiscale del bambino: apre il foglio, se e' montato. Non solleva. */
export function chiediCodiceFiscale(r: RichiestaCodiceFiscale): void {
  for (const a of ascoltatori) a(r)
}

/** Chi disegna il foglio si iscrive qui; la funzione che ritorna toglie l'iscrizione. */
export function ascoltaRichiestaCodiceFiscale(a: Ascoltatore): () => void {
  ascoltatori.add(a)
  return () => {
    ascoltatori.delete(a)
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
