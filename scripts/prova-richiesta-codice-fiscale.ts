// Prova di `lib/richiestaCodiceFiscale.ts` (puro): `npx tsx scripts/prova-richiesta-codice-fiscale.ts`
// Il server risponde 409 `codice_fiscale` quando a un bambino manca il codice fiscale per prenotare nella sezione Junior (13/11/2026): qui si prova
// che la risposta diventi la richiesta del foglio, e solo quella, e che chi si iscrive la riceva (e smetta quando si disiscrive).
import assert from 'node:assert/strict'

import { ascoltaRichiestaCodiceFiscale, chiediCodiceFiscale, richiestaDaRisposta, type RichiestaCodiceFiscale } from '../src/lib/richiestaCodiceFiscale'

const persona = { member_id: 41272, ruolo: 'contraente', nome: 'Alberto', cognome: 'Rossini', data_nascita: '2025-03-02', codice_fiscale: null, senza_codice_fiscale: false, paese: null, telefono: null, indirizzo: null }
let n = 0
const prova = (nome: string, f: () => void) => { f(); n++; console.log('ok', nome) }

prova('la risposta del blocco diventa la richiesta, con la persona e i dati che mancano', () => {
  const r = richiestaDaRisposta({ ok: false, codice: 'codice_fiscale', errore: 'x', mancanti: ['codice fiscale'], persone_dati: [persona] })
  assert.deepEqual(r, { persona, mancanti: ['codice fiscale'] })
})

prova('senza `mancanti` si dice «codice fiscale»', () => {
  assert.deepEqual(richiestaDaRisposta({ codice: 'codice_fiscale', persone_dati: [persona] })?.mancanti, ['codice fiscale'])
})

prova('un altro errore, o un blocco senza persona, non e’ una richiesta', () => {
  assert.equal(richiestaDaRisposta({ ok: false, codice: 'debito', errore: 'x' }), null)
  assert.equal(richiestaDaRisposta({ ok: false, errore: 'Non siamo riusciti a prenotare adesso.' }), null)
  assert.equal(richiestaDaRisposta({ codice: 'codice_fiscale', persone_dati: [] }), null)
  assert.equal(richiestaDaRisposta({ codice: 'codice_fiscale' }), null)
  assert.equal(richiestaDaRisposta({ codice: 'codice_fiscale', persone_dati: [{ nome: 'senza id' }] }), null)
})

prova('chi si iscrive riceve la richiesta, e dopo la disiscrizione no', () => {
  const ricevute: RichiestaCodiceFiscale[] = []
  const smetti = ascoltaRichiestaCodiceFiscale((r) => ricevute.push(r))
  chiediCodiceFiscale({ persona: persona as never, mancanti: ['codice fiscale'] })
  assert.equal(ricevute.length, 1)
  smetti()
  chiediCodiceFiscale({ persona: persona as never, mancanti: ['codice fiscale'] })
  assert.equal(ricevute.length, 1)
})

prova('senza nessun foglio montato la richiesta non solleva', () => {
  chiediCodiceFiscale({ persona: persona as never, mancanti: ['codice fiscale'] })
})

console.log(`\n${n} prove passate`)
