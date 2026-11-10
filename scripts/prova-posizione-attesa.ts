// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano della riga «Posizione N» delle prenotazioni in lista d'attesa (src/features/lab/posizioneAttesa.ts), in italiano e in inglese.
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
  assert.deepEqual(testoPosizione(1), { posizione: 'Position 1', davanti: 'You are first in line' })
  assert.deepEqual(testoPosizione(2), { posizione: 'Position 2', davanti: '1 person ahead of you' }, 'one person ahead: singular')
  assert.deepEqual(testoPosizione(3), { posizione: 'Position 3', davanti: '2 people ahead of you' })
  assert.deepEqual(testoPosizione(12), { posizione: 'Position 12', davanti: '11 people ahead of you' })
  ok('english: first in line, second with one person ahead, the rest in the plural')
} else {
  assert.deepEqual(testoPosizione(1), { posizione: 'Posizione 1', davanti: 'Sei il primo in lista' })
  assert.deepEqual(testoPosizione(2), { posizione: 'Posizione 2', davanti: '1 persona davanti a te' }, 'una sola persona davanti: singolare')
  assert.deepEqual(testoPosizione(3), { posizione: 'Posizione 3', davanti: '2 persone davanti a te' })
  assert.deepEqual(testoPosizione(12), { posizione: 'Posizione 12', davanti: '11 persone davanti a te' })
  ok('italiano: il primo, la seconda con una persona davanti, il resto al plurale')
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
