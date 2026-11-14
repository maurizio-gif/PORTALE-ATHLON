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

// 14/11/2026: su iOS un `Modal` non si apre sopra un altro (la chat dell'assistente prenota dentro un `Modal`). Il foglio dentro la chat prende la richiesta
// al posto di quello del layout, e solo finche' la chat e' aperta.
const richiesta = { persona: persona as never, mancanti: ['codice fiscale'] }

prova('con un foglio dentro una finestra aperta, la richiesta va a lui e non a quello del layout', () => {
  const layout: RichiestaCodiceFiscale[] = []
  const dentro: RichiestaCodiceFiscale[] = []
  const smettiLayout = ascoltaRichiestaCodiceFiscale((r) => layout.push(r))
  const smettiDentro = ascoltaRichiestaCodiceFiscale((r) => dentro.push(r), { dentro: true })
  chiediCodiceFiscale(richiesta)
  assert.equal(dentro.length, 1)
  assert.equal(layout.length, 0)
  smettiDentro()
  smettiLayout()
})

prova('chiusa la finestra (il foglio dentro si disiscrive) la richiesta torna al foglio del layout', () => {
  const layout: RichiestaCodiceFiscale[] = []
  const smettiLayout = ascoltaRichiestaCodiceFiscale((r) => layout.push(r))
  const smettiDentro = ascoltaRichiestaCodiceFiscale(() => undefined, { dentro: true })
  smettiDentro()
  chiediCodiceFiscale(richiesta)
  assert.equal(layout.length, 1)
  smettiLayout()
})

prova('un foglio dentro da solo riceve la richiesta, e disiscritto non la riceve piu\'', () => {
  const dentro: RichiestaCodiceFiscale[] = []
  const smetti = ascoltaRichiestaCodiceFiscale((r) => dentro.push(r), { dentro: true })
  chiediCodiceFiscale(richiesta)
  assert.equal(dentro.length, 1)
  smetti()
  chiediCodiceFiscale(richiesta)
  assert.equal(dentro.length, 1)
})

console.log(`\n${n} prove passate`)
