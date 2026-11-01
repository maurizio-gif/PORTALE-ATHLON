// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `rilascio/esercizi.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-rilascio.ts`
import assert from 'node:assert/strict'

import { componiSessione, ESERCIZI, SECONDI_MAX, SECONDI_MIN } from '../src/features/lab/rilascio/esercizi'

// La composizione della sessione di rilascio con il foam roller (01/11/2026).
let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const ids = (s) => s.esercizi.map((e) => e.id)

ok('gli esercizi hanno id diversi e almeno un passaggio ciascuno', () => {
  assert.equal(new Set(ESERCIZI.map((e) => e.id)).size, ESERCIZI.length)
  for (const e of ESERCIZI) assert.ok(e.istruzioni.length >= 2, e.id)
})
ok('nessun video finche\' non ci sono (il segnaposto)', () => {
  for (const e of ESERCIZI) assert.equal(e.video, null)
})
ok('5 minuti, tutto il corpo: cinque esercizi da un minuto', () => {
  const s = componiSessione({ focus: 'tutto', minuti: 5 })
  assert.equal(s.esercizi.length, 5)
  assert.ok(s.esercizi.every((e) => e.secondi === 60))
  assert.equal(s.minuti, 5)
})
ok('10 minuti, tutto il corpo: tutti gli esercizi, un po\' piu\' lunghi', () => {
  const s = componiSessione({ focus: 'tutto', minuti: 10 })
  assert.equal(s.esercizi.length, ESERCIZI.length)
  assert.ok(s.esercizi.every((e) => e.secondi >= SECONDI_MIN && e.secondi <= SECONDI_MAX))
  assert.ok(Math.abs(s.minuti - 10) <= 1)
})
ok('15 minuti: il tempo di un esercizio non passa il massimo, e i minuti veri sono meno', () => {
  const s = componiSessione({ focus: 'tutto', minuti: 15 })
  assert.ok(s.esercizi.every((e) => e.secondi === SECONDI_MAX))
  assert.ok(s.minuti < 15)
})
ok('una zona sola: solo i suoi esercizi', () => {
  assert.deepEqual(ids(componiSessione({ focus: 'schiena_spalle', minuti: 10 })), ['dorsale-alta', 'grande-dorsale', 'apertura-petto'])
  assert.ok(ids(componiSessione({ focus: 'gambe', minuti: 10 })).every((i) => !['dorsale-alta', 'grande-dorsale', 'apertura-petto'].includes(i)))
})
ok('i tempi sono multipli di 10 secondi, cosi\' il mezzo tempo e\' tondo', () => {
  for (const minuti of [5, 10, 15]) for (const focus of ['tutto', 'gambe', 'schiena_spalle'] as const) {
    for (const e of componiSessione({ focus, minuti }).esercizi) {
      assert.equal(e.secondi % 10, 0, `${focus} ${minuti}`)
      assert.equal(Number.isInteger(e.secondi / 2), true)
    }
  }
})
ok('un fastidio toglie gli esercizi che lo caricano', () => {
  const s = componiSessione({ focus: 'tutto', minuti: 10, zone: ['lombare'] })
  assert.ok(!ids(s).includes('dorsale-alta'))
  assert.ok(!ids(s).includes('davanti-coscia'))
  for (const e of ESERCIZI.filter((e) => e.evita.includes('lombare'))) assert.ok(!ids(s).includes(e.id), e.id)
})
ok('tutti i fastidi: nessun esercizio, e nessun errore', () => {
  const s = componiSessione({ focus: 'tutto', minuti: 10, zone: ['spalle', 'polsi_gomiti', 'lombare', 'anche', 'ginocchia', 'caviglie', 'cervicale'] })
  assert.equal(s.esercizi.length, 0)
  assert.equal(s.minuti, 0)
})
ok('la variante cambia quali esercizi entrano quando non ci stanno tutti, e l\'ordine resta quello del corpo', () => {
  const a = ids(componiSessione({ focus: 'tutto', minuti: 5, variante: 0 }))
  const b = ids(componiSessione({ focus: 'tutto', minuti: 5, variante: 1 }))
  assert.notDeepEqual(a, b)
  const posizione = (i) => ESERCIZI.findIndex((e) => e.id === i)
  for (const lista of [a, b]) assert.deepEqual([...lista].sort((x, y) => posizione(x) - posizione(y)), lista)
})
ok('con tutti gli esercizi la variante non cambia niente', () => {
  assert.deepEqual(ids(componiSessione({ focus: 'tutto', minuti: 15, variante: 3 })), ids(componiSessione({ focus: 'tutto', minuti: 15, variante: 0 })))
})
console.log(`${n} gruppi ok`)
