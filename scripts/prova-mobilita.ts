// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `fit/mobilita.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-mobilita.ts`
import assert from 'node:assert/strict'

import { avanti, avvia, ferma, indietro, minutiDaSecondi, nuovoCrono, progredisci, restanti, secondiFatti, vociFocus, vociZone } from '../src/features/lab/fit/mobilita'

// Il cronometro della sessione di mobilita' (31/10/2026), provato con orologi finti: `now` lo decide la prova.
let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const D = [60, 60, 60] // tre esercizi da un minuto
const S = 1000

ok('parte ferma, e dopo «avvia» conta i secondi', () => {
  let c = nuovoCrono()
  assert.equal(restanti(c, 0, D), 60)
  assert.equal(secondiFatti(c, 5 * S, D), 0) // ferma: il tempo non passa
  c = avvia(c, 10 * S)
  assert.equal(restanti(c, 10 * S, D), 60)
  assert.equal(restanti(c, 25 * S, D), 45)
  assert.equal(secondiFatti(c, 25 * S, D), 15)
  assert.equal(restanti(c, 10 * S + 500, D), 60) // per eccesso: 59,5 s rimasti = «60»
  assert.equal(restanti(c, 10 * S + 1500, D), 59)
})

ok('la pausa ferma il conto e riprendere lo fa ripartire da dove era', () => {
  let c = avvia(nuovoCrono(), 0)
  c = ferma(c, 20 * S, D)
  assert.equal(c.ripresoIl, null)
  assert.equal(restanti(c, 500 * S, D), 40) // in pausa per un pezzo: non scende
  assert.equal(secondiFatti(c, 500 * S, D), 20)
  c = avvia(c, 100 * S)
  assert.equal(restanti(c, 110 * S, D), 30)
  assert.equal(secondiFatti(c, 110 * S, D), 30)
})

ok('a fine esercizio passa al successivo da solo, senza deriva', () => {
  let c = avvia(nuovoCrono(), 0)
  // Il timer arriva in ritardo di mezzo secondo: l'esercizio dopo parte comunque dal sessantesimo secondo.
  c = progredisci(c, 60 * S + 500, D)
  assert.equal(c.passo, 1)
  assert.equal(c.accTotale, 60 * S)
  assert.equal(restanti(c, 60 * S + 500, D), 60) // mezzo secondo gia' dentro il nuovo esercizio: 59,5 s = «60»
  assert.equal(restanti(c, 61 * S, D), 59)
  assert.equal(secondiFatti(c, 61 * S, D), 61)
})

ok('con una pausa in mezzo il totale conta solo il tempo fatto, non il doppio', () => {
  let c = avvia(nuovoCrono(), 0)
  c = ferma(c, 20 * S, D) // venti secondi, poi pausa
  c = avvia(c, 500 * S)
  c = progredisci(c, 540 * S, D) // altri quaranta: il primo esercizio e' finito
  assert.equal(c.passo, 1)
  assert.equal(c.accTotale, 60 * S)
  assert.equal(secondiFatti(c, 540 * S, D), 60)
  assert.equal(secondiFatti(c, 560 * S, D), 80)
})

ok('se l\'app e\' stata ferma a lungo, salta piu\' esercizi e finisce', () => {
  let c = avvia(nuovoCrono(), 0)
  c = progredisci(c, 130 * S, D) // due minuti e dieci: due esercizi completi e dieci secondi del terzo
  assert.equal(c.passo, 2)
  assert.equal(restanti(c, 130 * S, D), 50)
  c = progredisci(c, 10_000 * S, D)
  assert.equal(c.finita, true)
  assert.equal(c.ripresoIl, null)
  assert.equal(secondiFatti(c, 10_000 * S, D), 180) // al massimo la durata vera della sessione
  assert.equal(restanti(c, 10_000 * S, D), 0)
})

ok('«avanti» salta senza contare il tempo non fatto; all\'ultimo finisce', () => {
  let c = avvia(nuovoCrono(), 0)
  c = avanti(c, 20 * S, D) // dopo venti secondi sul primo
  assert.equal(c.passo, 1)
  assert.equal(secondiFatti(c, 20 * S, D), 20)
  assert.equal(restanti(c, 20 * S, D), 60)
  c = avanti(c, 20 * S + 5 * S, D)
  assert.equal(c.passo, 2)
  assert.equal(secondiFatti(c, 25 * S, D), 25)
  c = avanti(c, 30 * S, D)
  assert.equal(c.finita, true)
  assert.equal(secondiFatti(c, 999 * S, D), 30)
})

ok('«avanti» in pausa resta in pausa', () => {
  let c = ferma(avvia(nuovoCrono(), 0), 10 * S, D)
  c = avanti(c, 99 * S, D)
  assert.equal(c.passo, 1)
  assert.equal(c.ripresoIl, null)
  assert.equal(secondiFatti(c, 200 * S, D), 10)
})

ok('«indietro» riparte l\'esercizio prima da capo, e il tempo fatto resta fatto', () => {
  let c = avvia(nuovoCrono(), 0)
  c = progredisci(c, 70 * S, D) // dentro il secondo
  assert.equal(c.passo, 1)
  c = indietro(c, 70 * S, D)
  assert.equal(c.passo, 0)
  assert.equal(restanti(c, 70 * S, D), 60)
  assert.equal(secondiFatti(c, 70 * S, D), 70)
  // Dal primo, ricomincia il primo.
  c = indietro(c, 80 * S, D)
  assert.equal(c.passo, 0)
  assert.equal(restanti(c, 80 * S, D), 60)
})

ok('una sessione finita non riparte e «avvia» non la tocca', () => {
  let c = avvia(nuovoCrono(), 0)
  c = progredisci(c, 500 * S, D)
  assert.equal(avvia(c, 600 * S).ripresoIl, null)
  assert.equal(c.finita, true)
})

ok('avvia due volte non azzera il tratto che gira', () => {
  let c = avvia(nuovoCrono(), 0)
  c = avvia(c, 30 * S)
  assert.equal(restanti(c, 40 * S, D), 20)
})

ok('nessun esercizio: nessun conto, nessun giro infinito', () => {
  const c = avvia(nuovoCrono(), 0)
  assert.deepEqual(progredisci(c, 1000 * S, []), c)
  assert.equal(restanti(c, 1000 * S, []), 0)
})

ok('i minuti accreditati sono interi, per difetto', () => {
  assert.equal(minutiDaSecondi(0), 0)
  assert.equal(minutiDaSecondi(59), 0)
  assert.equal(minutiDaSecondi(60), 1)
  assert.equal(minutiDaSecondi(599), 9)
  assert.equal(minutiDaSecondi(600), 10)
})

ok('le chiavi da scegliere sono quelle della funzione', () => {
  assert.deepEqual(vociFocus().map((v) => v.valore), ['tutto', 'collo_spalle', 'schiena', 'anche_gambe'])
  assert.deepEqual(vociZone().map((v) => v.valore).sort(), ['anche', 'caviglie', 'cervicale', 'ginocchia', 'lombare', 'polsi_gomiti', 'spalle'])
})

console.log(`${n} gruppi passati`)
