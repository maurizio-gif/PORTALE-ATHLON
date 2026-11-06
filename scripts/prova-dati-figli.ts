// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova quali righe la sezione Famiglia mostra sotto un figlio (src/features/lab/home/datiFigli.ts): il codice fiscale sempre, l'email e il
// cellulare solo se diversi da quelli del titolare, niente per il titolare e per i bambini raggiunti con una delega. Niente rete e niente React.
//
//   npx tsx scripts/prova-dati-figli.ts
import assert from 'node:assert/strict'

import { righeDatiFiglio, stessaEmail, stessoCellulare } from '../src/features/lab/home/datiFigli.ts'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log('OK', nome)
}

const MAMMA = { email: 'Mamma@Hotmail.it', telefono: '+39 320 123 4567' }
const figlio = (dati: Record<string, string | null> | null | undefined, titolare = false) => ({ titolare, dati: dati as never })
const chiavi = (righe: { chiave: string }[]) => righe.map((r) => r.chiave)

prova('il titolare non ha righe, anche se la funzione gli desse dei dati', () => {
  assert.deepEqual(righeDatiFiglio(figlio({ codice_fiscale: 'RSSMRA80A01H501U', email: 'a@b.it', telefono: '3331112233' }, true), MAMMA), [])
})

prova('senza `dati` (delega o funzione di prima) non c\'e\' niente', () => {
  assert.deepEqual(righeDatiFiglio(figlio(undefined), MAMMA), [])
  assert.deepEqual(righeDatiFiglio(figlio(null), MAMMA), [])
})

prova('email e cellulare del genitore non si ripetono: resta il codice fiscale', () => {
  const r = righeDatiFiglio(figlio({ codice_fiscale: 'frgglia10c66h501x', email: ' mamma@hotmail.IT ', telefono: '0039 3201234567' }), MAMMA)
  assert.deepEqual(r, [{ chiave: 'codice_fiscale', valore: 'FRGGLIA10C66H501X' }])
})

prova('email diversa e cellulare uguale (il caso di Gaia): codice fiscale ed email', () => {
  const r = righeDatiFiglio(figlio({ codice_fiscale: 'AAAAAA10A01H501A', email: 'gaia@x.it', telefono: '+393201234567' }), MAMMA)
  assert.deepEqual(chiavi(r), ['codice_fiscale', 'email'])
})

prova('cellulare diverso: compare, nell\'ordine codice fiscale, email, cellulare', () => {
  const r = righeDatiFiglio(figlio({ codice_fiscale: 'AAAAAA10A01H501A', email: 'gaia@x.it', telefono: '347 000 6466' }), MAMMA)
  assert.deepEqual(chiavi(r), ['codice_fiscale', 'email', 'telefono'])
  assert.equal(r[2].valore, '347 000 6466')
})

prova('codice fiscale mancante: nessuna riga per lui, le altre restano', () => {
  assert.deepEqual(righeDatiFiglio(figlio({ codice_fiscale: null, email: null, telefono: '+393201234567' }), MAMMA), [])
  assert.deepEqual(chiavi(righeDatiFiglio(figlio({ codice_fiscale: '  ', email: 'g@x.it', telefono: null }), MAMMA)), ['email'])
})

prova('il titolare non ha email o cellulare: quelli del figlio si mostrano', () => {
  const r = righeDatiFiglio(figlio({ codice_fiscale: null, email: 'g@x.it', telefono: '3201234567' }), { email: null, telefono: null })
  assert.deepEqual(chiavi(r), ['email', 'telefono'])
  assert.deepEqual(chiavi(righeDatiFiglio(figlio({ codice_fiscale: null, email: 'g@x.it', telefono: '3201234567' }), undefined)), ['email', 'telefono'])
})

prova('stessaEmail: maiuscole e spazi non contano, un\'email vuota non e\' mai uguale', () => {
  assert.equal(stessaEmail('A@B.it', ' a@b.IT'), true)
  assert.equal(stessaEmail('a@b.it', 'a@c.it'), false)
  assert.equal(stessaEmail('', ''), false)
  assert.equal(stessaEmail(null, undefined), false)
})

prova('stessoCellulare: prefisso e spazi non contano, un numero troppo corto non si confronta', () => {
  assert.equal(stessoCellulare('+39 320 123 4567', '320-1234567'), true)
  assert.equal(stessoCellulare('0039 3201234567', '+393201234567'), true)
  assert.equal(stessoCellulare('3201234567', '3201234568'), false)
  assert.equal(stessoCellulare('123', '123'), false)
  assert.equal(stessoCellulare('', ''), false)
})

console.log(`\n${n} prove passate`)
