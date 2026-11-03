// Prova di `ordinaPiani` (03/11/2026): Premium prima, poi Smart; dentro ciascuno Annuale a rate, Annuale unico, Mensile Flex; un abbonamento nuovo va in fondo.
//   node --experimental-strip-types scripts/prova-ordine-piani.ts
import assert from 'node:assert/strict'

import { ordinaPiani } from '../src/lib/ordinePiani.ts'

const p = (id: number, abbonamento: string, formula: string) => ({ id, abbonamento, formula })
// L'ordine del listino del sito: Smart (rate, unico, flex) e poi Premium (rate, unico, flex), con un abbonamento nuovo in mezzo.
const dalServer = [
  p(1, 'Smart', 'annuale-rate'), p(2, 'Smart', 'annuale-unico'), p(3, 'Smart', 'flex'),
  p(9, 'Dream', 'flex'),
  p(4, 'Premium', 'annuale-rate'), p(5, 'Premium', 'annuale-unico'), p(6, 'Premium', 'flex'),
]
let gruppi = 0
const r = (nome: string, f: () => void) => { f(); gruppi++; console.log('ok', nome) }

r('Premium prima, poi Smart, poi il resto', () => {
  assert.deepEqual(ordinaPiani(dalServer).map((x) => x.id), [4, 5, 6, 1, 2, 3, 9])
})
r('le formule dentro lo stesso abbonamento: rate, unico, flex, anche se arrivano mescolate', () => {
  const m = [p(3, 'Smart', 'flex'), p(1, 'Smart', 'annuale-rate'), p(2, 'Smart', 'annuale-unico')]
  assert.deepEqual(ordinaPiani(m).map((x) => x.id), [1, 2, 3])
})
r('un elenco vuoto resta vuoto, e l\'originale non si tocca', () => {
  assert.deepEqual(ordinaPiani([]), [])
  const copia = [...dalServer]
  ordinaPiani(dalServer)
  assert.deepEqual(dalServer, copia)
})
r('maiuscole e nomi composti: «Premium Plus» e «SMART» si riconoscono', () => {
  const m = [p(1, 'SMART', 'flex'), p(2, 'Premium Plus', 'flex')]
  assert.deepEqual(ordinaPiani(m).map((x) => x.id), [2, 1])
})
r('due abbonamenti nuovi conservano l\'ordine del server', () => {
  const m = [p(1, 'Zeta', 'flex'), p(2, 'Alfa', 'flex')]
  assert.deepEqual(ordinaPiani(m).map((x) => x.id), [1, 2])
})
console.log(`${gruppi} gruppi, tutti passati`)
