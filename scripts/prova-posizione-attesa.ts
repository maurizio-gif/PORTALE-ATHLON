// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano della riga «Posizione N» (solo il numero) delle prenotazioni in lista d'attesa (src/features/lab/posizioneAttesa.ts), in italiano e in inglese.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-posizione-attesa.ts
//   LINGUA=en npx tsx scripts/prova-posizione-attesa.ts     (la stessa prova in inglese)
import assert from 'node:assert/strict'

// La lingua si sceglie prima di caricare i moduli: `lingua.ts` la legge dalla memoria del dispositivo alla prima domanda.
const EN = process.env.LINGUA === 'en'
globalThis.localStorage = { getItem: () => (EN ? 'en' : 'it'), setItem: () => undefined }
const { testoPosizione } = require('../src/features/lab/posizioneAttesa')

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

if (EN) {
  assert.equal(testoPosizione(1), 'Position 1')
  assert.equal(testoPosizione(3), 'Position 3')
  assert.equal(testoPosizione(12), 'Position 12')
  ok('english: only the position, without how many people are ahead')
} else {
  assert.equal(testoPosizione(1), 'Posizione 1')
  assert.equal(testoPosizione(3), 'Posizione 3')
  assert.equal(testoPosizione(12), 'Posizione 12')
  ok('italiano: solo la posizione, senza dire quante persone ci sono davanti')
}
{
  assert.equal(testoPosizione(null), null, 'senza numero non si dice niente')
  assert.equal(testoPosizione(undefined), null, 'una funzione di prima: nessuna riga')
  assert.equal(testoPosizione(0), null, 'zero non e\' un posto in coda')
  assert.equal(testoPosizione(-2), null)
  assert.equal(testoPosizione(1.5), null)
  assert.equal(testoPosizione(Number.NaN), null)
  assert.equal(testoPosizione('3'), null, 'una stringa non e\' un numero: la funzione manda un numero')
  ok('senza un numero valido non c\'e\' nessuna riga')
}
console.log(`ok: ${passi} gruppi di controlli`)
