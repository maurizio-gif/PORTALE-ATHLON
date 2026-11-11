// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova del minimo del test dei massimali (11/11/2026, `schede/minimoTest.ts`, puro): `npx tsx scripts/prova-minimo-test.ts`
import assert from 'node:assert/strict'

import { daCopertura, secondoConsigliato, statoMinimo } from '../src/features/lab/schede/minimoTest'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

// I sette esercizi del test, come li manda il server: quattro di parte superiore, il plank, due di parte inferiore.
const SETTE = [
  { id: 'chest', test_gruppo: 'superiore' },
  { id: 'lat', test_gruppo: 'superiore' },
  { id: 'row', test_gruppo: 'superiore' },
  { id: 'shoulder', test_gruppo: 'superiore' },
  { id: 'plank', test_gruppo: 'core' },
  { id: 'leg-ext', test_gruppo: 'inferiore' },
  { id: 'leg-curl', test_gruppo: 'inferiore' },
]
const con = (...fatti: string[]) => SETTE.map((e) => ({ ...e, ultimo: fatti.includes(e.id) ? { massimale: 50 } : null }))

ok('nessun test: 0 di 3, mancano tutti e tre, 7 da fare', () => {
  const s = statoMinimo(con())
  assert.deepEqual([s.fatti, s.totale, s.raggiunto, s.altri], [0, 3, false, 7])
  assert.deepEqual(s.mancano, ['superiore', 'core', 'inferiore'])
  assert.deepEqual(s.passi.map((p) => [p.gruppo, p.fatto, p.fatti, p.totale]), [['superiore', false, 0, 4], ['core', false, 0, 1], ['inferiore', false, 0, 2]])
})

ok('uno per gruppo: tutti e tre fatti, e ne restano 4 facoltativi', () => {
  const s = statoMinimo(con('lat', 'plank', 'leg-curl'))
  assert.deepEqual([s.fatti, s.totale, s.raggiunto, s.altri], [3, 3, true, 4])
  assert.deepEqual(s.mancano, [])
})

ok('quattro di parte superiore non fanno il minimo: mancano core e parte inferiore', () => {
  const s = statoMinimo(con('chest', 'lat', 'row', 'shoulder'))
  assert.deepEqual([s.fatti, s.raggiunto, s.altri], [1, false, 3])
  assert.deepEqual(s.mancano, ['core', 'inferiore'])
  assert.equal(s.passi[0].fatti, 4)
})

ok('due su tre: manca solo la parte inferiore', () => {
  const s = statoMinimo(con('chest', 'plank'))
  assert.deepEqual([s.fatti, s.raggiunto], [2, false])
  assert.deepEqual(s.mancano, ['inferiore'])
})

ok('tutti e sette: raggiunto, nessun altro da fare', () => {
  const s = statoMinimo(con(...SETTE.map((e) => e.id)))
  assert.deepEqual([s.fatti, s.raggiunto, s.altri], [3, true, 0])
})

ok('un gruppo senza esercizi nel test non conta: il minimo e\' sui gruppi che ci sono', () => {
  const senzaCore = con('chest', 'leg-ext').filter((e) => e.test_gruppo !== 'core')
  const s = statoMinimo(senzaCore)
  assert.deepEqual([s.fatti, s.totale, s.raggiunto], [2, 2, true])
  assert.deepEqual(s.passi.map((p) => p.gruppo), ['superiore', 'inferiore'])
})

ok('elenco vuoto: niente passi, e il minimo non e\' raggiunto', () => {
  const s = statoMinimo([])
  assert.deepEqual([s.fatti, s.totale, s.raggiunto, s.altri], [0, 0, false, 0])
})

ok('l\'ordine dei passi e\' quello della schermata, qualunque sia l\'ordine dell\'elenco', () => {
  const s = statoMinimo([...con('plank')].reverse())
  assert.deepEqual(s.passi.map((p) => p.gruppo), ['superiore', 'core', 'inferiore'])
})

// La copertura del server, dopo un salvataggio.
const gruppo = (fatti: number, minimo = 1) => ({ fatti, minimo, per_verifica: 2, stato: 'singola' })

ok('daCopertura: uno per gruppo e\' raggiunto', () => {
  assert.deepEqual(daCopertura({ gruppi: { superiore: gruppo(1), core: gruppo(1), inferiore: gruppo(1) } }), { fatti: 3, totale: 3, raggiunto: true, mancano: [] })
})

ok('daCopertura: dice cosa manca, nell\'ordine della schermata', () => {
  assert.deepEqual(daCopertura({ gruppi: { inferiore: gruppo(0), core: gruppo(0), superiore: gruppo(3) } }), { fatti: 1, totale: 3, raggiunto: false, mancano: ['core', 'inferiore'] })
})

ok('daCopertura: segue il minimo del server, se un giorno chiede due esercizi per un gruppo', () => {
  assert.deepEqual(daCopertura({ gruppi: { superiore: gruppo(1, 2), core: gruppo(1), inferiore: gruppo(1) } })?.mancano, ['superiore'])
})

ok('daCopertura: senza copertura (un server di prima) non dice niente', () => {
  assert.equal(daCopertura(null), null)
  assert.equal(daCopertura(undefined), null)
  assert.equal(daCopertura({ gruppi: {} }), null)
})

ok('statoMinimo e daCopertura dicono la stessa cosa sugli stessi test', () => {
  for (const fatti of [[], ['chest'], ['chest', 'plank'], ['lat', 'plank', 'leg-curl'], SETTE.map((e) => e.id)]) {
    const s = statoMinimo(con(...fatti))
    const c = daCopertura({ gruppi: Object.fromEntries(s.passi.map((p) => [p.gruppo, gruppo(p.fatti)])) })
    assert.deepEqual(c, { fatti: s.fatti, totale: s.totale, raggiunto: s.raggiunto, mancano: s.mancano })
  }
})

// Il secondo esercizio delle gambe (11/11/2026): consigliato quando ne e' stato fatto uno solo; gli altri gruppi restano facoltativi.
ok('gambe: con uno fatto l\'altro e\' consigliato; con zero e con due no', () => {
  assert.equal(secondoConsigliato('inferiore', 1, 2), true)
  assert.equal(secondoConsigliato('inferiore', 0, 2), false)
  assert.equal(secondoConsigliato('inferiore', 2, 2), false)
})

ok('gambe: se nel test c\'e\' un solo esercizio, non c\'e\' un secondo da consigliare', () => {
  assert.equal(secondoConsigliato('inferiore', 1, 1), false)
})

ok('parte superiore e core: il secondo resta facoltativo', () => {
  assert.equal(secondoConsigliato('superiore', 1, 4), false)
  assert.equal(secondoConsigliato('core', 1, 1), false)
})

ok('minimo fatto con un esercizio per gruppo: dei 4 che restano, 1 e\' consigliato (gambe) e 3 facoltativi', () => {
  const s = statoMinimo(con('chest', 'plank', 'leg-ext'))
  assert.deepEqual([s.raggiunto, s.altri, s.consigliati], [true, 4, 1])
  assert.deepEqual(s.gruppiConsigliati, ['inferiore'])
})

ok('fatte tutte e due le gambe: nessun consigliato', () => {
  const s = statoMinimo(con('chest', 'plank', 'leg-ext', 'leg-curl'))
  assert.deepEqual([s.altri, s.consigliati, s.gruppiConsigliati.length], [3, 0, 0])
})

ok('il consiglio vale anche prima del minimo: una gamba fatta, il resto no', () => {
  const s = statoMinimo(con('leg-curl'))
  assert.deepEqual([s.raggiunto, s.consigliati], [false, 1])
})

ok('nessuna gamba fatta: niente consigliato, la scelta e\' libera', () => {
  const s = statoMinimo(con('chest', 'plank'))
  assert.deepEqual([s.consigliati, s.gruppiConsigliati.length], [0, 0])
})

console.log(`\n${n} prove passate`)
