// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova dell'RPE di una serie (11/11/2026, `schede/rpe.ts`): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-rpe.ts`
import assert from 'node:assert/strict'

import { descriviRpe, etichettaRpe, RPE_VALORI, rpeValido } from '../src/features/lab/schede/rpe'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

ok('i valori da scegliere sono gli undici da 0 a 10', () => {
  assert.deepEqual(RPE_VALORI, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

ok('rpeValido: i numeri da 0 a 10, anche scritti come testo; lo zero e\' un valore', () => {
  for (const v of RPE_VALORI) assert.equal(rpeValido(v), v)
  assert.equal(rpeValido('8'), 8)
  assert.equal(rpeValido(8.5), 8.5)
  assert.equal(rpeValido(0), 0)
})

ok('rpeValido: assente, vuoto, non numerico o fuori misura e\' null (mai 0 per sbaglio)', () => {
  for (const v of [null, undefined, '', 'otto', NaN, -1, 10.5, 11, true, false]) assert.equal(rpeValido(v), null, String(v))
})

ok('ogni valore ha la sua descrizione, e le ripetizioni che restavano tornano con la scala', () => {
  for (const v of RPE_VALORI) assert.ok(descriviRpe(v).length > 5, String(v))
  assert.match(descriviRpe(10), /non ne facevi un’altra/)
  assert.match(descriviRpe(9), /ancora 1/)
  assert.match(descriviRpe(8), /ancora 2/)
  assert.match(descriviRpe(7), /ancora 3/)
  assert.match(descriviRpe(6), /ancora 4/)
  assert.match(descriviRpe(5), /5 o più/)
  assert.match(descriviRpe(0), /Nessuno sforzo/)
})

ok('la descrizione non scende mai salendo di valore: dieci e\' il massimo, zero il minimo', () => {
  const diverse = new Set(RPE_VALORI.map(descriviRpe))
  assert.ok(diverse.size >= 9, 'quasi ogni valore dice una cosa sua')
  assert.notEqual(descriviRpe(9), descriviRpe(10))
  assert.equal(descriviRpe(8.5), descriviRpe(8), 'un mezzo punto prende la descrizione del valore sotto')
})

ok('etichettaRpe: «RPE 8», e la virgola per il mezzo punto', () => {
  assert.equal(etichettaRpe(8), 'RPE 8')
  assert.equal(etichettaRpe(8.5), 'RPE 8,5')
  assert.equal(etichettaRpe(0), 'RPE 0')
})

console.log(`\n${n} prove passate`)
