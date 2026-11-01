// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `respiro/tecniche.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-respiro.ts`
import assert from 'node:assert/strict'

import { cicloSecondi, passiScansione, passoScansione, statoRespiro, tecnicaPer, tecniche } from '../src/features/lab/respiro/tecniche'

// Il respiro guidato (01/11/2026): in che punto del respiro si e' dopo tot secondi, e quale frase della scansione.
let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const S = 1000
const vicino = (a: number, b: number, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`)
const lenta = tecnicaPer('lenta').fasi
const scatola = tecnicaPer('scatola').fasi

ok('le tre tecniche e i loro minuti (1, 3, 5; la scansione 3 e 5)', () => {
  assert.deepEqual(tecniche().map((x) => x.id), ['lenta', 'scatola', 'scansione'])
  assert.deepEqual(tecnicaPer('lenta').durate, [1, 3, 5])
  assert.deepEqual(tecnicaPer('scansione').durate, [3, 5])
})
ok('solo la scatola trattiene il fiato (e la lenta e la scansione no)', () => {
  assert.deepEqual(tecniche().map((x) => x.trattieneIlFiato), [false, true, false])
  assert.ok(!tecnicaPer('lenta').fasi.some((f) => f.tipo.endsWith('Fermo')))
  assert.ok(tecnicaPer('scatola').fasi.some((f) => f.tipo.endsWith('Fermo')))
})
ok('la lenta dura 10 secondi a ciclo, la scatola 16', () => {
  assert.equal(cicloSecondi(lenta), 10)
  assert.equal(cicloSecondi(scatola), 16)
})
ok('lenta: si parte vuoti e si inspira; a meta\' inspirazione il cerchio e\' a meta\'; a 4 s e\' pieno e si espira', () => {
  const a = statoRespiro(lenta, 0)
  assert.equal(a.fase, 'inspira')
  vicino(a.pienezza, 0)
  assert.equal(a.restano, 4)
  vicino(statoRespiro(lenta, 2 * S).pienezza, 0.5)
  const b = statoRespiro(lenta, 4 * S)
  assert.equal(b.fase, 'espira')
  vicino(b.pienezza, 1)
  assert.equal(b.restano, 6)
})
ok('lenta: l\'espirazione svuota piano e a 10 s si ricomincia', () => {
  vicino(statoRespiro(lenta, 7 * S).pienezza, 0.5)
  assert.ok(statoRespiro(lenta, 9.9 * S).pienezza < 0.001)
  assert.equal(statoRespiro(lenta, 10 * S).fase, 'inspira')
  assert.equal(statoRespiro(lenta, 25 * S).fase, statoRespiro(lenta, 5 * S).fase)
})
ok('il conto alla rovescia dice «3, 2, 1» e non scende mai sotto 1', () => {
  const lista = [0, 0.5, 1, 1.5, 2, 3, 3.9].map((s) => statoRespiro(lenta, s * S).restano)
  assert.deepEqual(lista, [4, 4, 3, 3, 2, 1, 1])
  for (let ms = 0; ms < 40 * S; ms += 137) assert.ok(statoRespiro(lenta, ms).restano >= 1)
})
ok('scatola: pieno fermo a 1, vuoto fermo a 0, e il cerchio non si muove nelle pause', () => {
  assert.equal(statoRespiro(scatola, 5 * S).fase, 'pienoFermo')
  vicino(statoRespiro(scatola, 5 * S).pienezza, 1)
  vicino(statoRespiro(scatola, 7.9 * S).pienezza, 1)
  assert.equal(statoRespiro(scatola, 13 * S).fase, 'vuotoFermo')
  vicino(statoRespiro(scatola, 13 * S).pienezza, 0)
  vicino(statoRespiro(scatola, 15.5 * S).pienezza, 0)
})
ok('il cerchio non scatta: piccoli passi di tempo, piccoli passi di pienezza', () => {
  for (const fasi of [lenta, scatola]) {
    let prima = statoRespiro(fasi, 0).pienezza
    for (let ms = 20; ms < 40 * S; ms += 20) {
      const ora = statoRespiro(fasi, ms).pienezza
      assert.ok(Math.abs(ora - prima) < 0.03, `${ms}: ${prima} -> ${ora}`)
      prima = ora
    }
  }
})
ok('la pienezza resta fra 0 e 1', () => {
  for (const fasi of [lenta, scatola]) for (let ms = 0; ms < 60 * S; ms += 53) {
    const p = statoRespiro(fasi, ms).pienezza
    assert.ok(p >= 0 && p <= 1)
  }
})
ok('scansione: il tempo si divide in parti uguali, e l\'ultima frase resta fino alla fine', () => {
  const passi = passiScansione()
  const tot = 180 * S
  assert.equal(passoScansione(passi, 0, tot).indice, 0)
  assert.equal(passoScansione(passi, tot / passi.length - 1, tot).indice, 0)
  assert.equal(passoScansione(passi, tot / passi.length, tot).indice, 1)
  assert.equal(passoScansione(passi, tot - 1, tot).indice, passi.length - 1)
  assert.equal(passoScansione(passi, tot * 2, tot).indice, passi.length - 1)
})
ok('la scansione comincia dal posto comodo e finisce con gli occhi che si riaprono, e ha una frase per ogni parte', () => {
  const passi = passiScansione()
  assert.ok(passi.length >= 6)
  assert.ok(/comodo/i.test(passi[0]))
  assert.ok(/riapri/i.test(passi[passi.length - 1]))
})
console.log(`${n} gruppi ok`)
