// Prova di `lib/alzaPerTastiera.ts` (puro): `npx tsx scripts/prova-alza-per-tastiera.ts`
// Di quanto alzare un livello a tutto schermo perche' la tastiera non lo copra (Android 16). Da qui dipendono la chat dell'assistente, `Schermata` e i
// fogli con un campo di testo (14/11/2026): la funzione non deve mai alzare due volte, ne' sotto zero.
import assert from 'node:assert/strict'

import { quantoAlzare } from '../src/lib/alzaPerTastiera'

let n = 0
const prova = (nome: string, f: () => void) => { f(); n++; console.log('ok', nome) }

prova('tastiera chiusa: non si alza', () => {
  assert.equal(quantoAlzare(0, 48, 800, 800), 0)
})

prova('finestra non ridimensionata (Android 16): si alza della tastiera piu’ la barra di navigazione', () => {
  assert.equal(quantoAlzare(300, 48, 800, 800), 348)
})

prova('finestra ridimensionata dal sistema fino alla tastiera piu’ la barra: non si alza', () => {
  assert.equal(quantoAlzare(300, 48, 800, 452), 0)
})

prova('finestra ridimensionata dalla sola tastiera: si alza solo della barra che manca', () => {
  assert.equal(quantoAlzare(300, 48, 800, 500), 48)
})

prova('senza barra di navigazione (barra 0) vale la sola tastiera', () => {
  assert.equal(quantoAlzare(280, 0, 800, 800), 280)
})

prova('prima della prima misura (massima e adesso 0) si alza comunque', () => {
  assert.equal(quantoAlzare(300, 48, 0, 0), 348)
})

prova('altezza di adesso maggiore della massima: niente da togliere', () => {
  assert.equal(quantoAlzare(300, 48, 700, 800), 348)
})

prova('il sistema ha tolto piu’ della tastiera: mai un valore negativo', () => {
  assert.equal(quantoAlzare(300, 48, 800, 200), 0)
})

console.log(`\n${n} prove passate`)
