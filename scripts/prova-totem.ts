// @ts-nocheck — script da `npx tsx` (o da `node --experimental-strip-types`): usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova la parte pura della modalita' totem (src/lib/totem.ts), senza React ne' browser:
//   npx tsx scripts/prova-totem.ts      oppure      node --experimental-strip-types scripts/prova-totem.ts
import assert from 'node:assert/strict'

import { LARGHEZZA_LOGICA, dimensioniLogiche, formatoTotem, forzatura, scalaPer } from '../src/lib/totem.ts'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log('OK', nome)
}

prova('il pannello 1080x1920 e 1440x2560 e il viewport reale 1064x1725 sono totem', () => {
  assert.equal(formatoTotem(1080, 1920), true)
  assert.equal(formatoTotem(1440, 2560), true)
  assert.equal(formatoTotem(1064, 1725), true) // 0,617: dentro il 7/10 per otto millesimi in meno del 5/8
})
prova('un telefono, un tablet 3:4, una televisione e un desktop non sono totem', () => {
  assert.equal(formatoTotem(390, 844), false) // sotto 900 di larghezza
  assert.equal(formatoTotem(768, 1024), false) // largo < 900
  assert.equal(formatoTotem(1024, 1366), false) // tablet 3:4 grande: 0,75 > 0,7
  assert.equal(formatoTotem(1920, 1080), false)
  assert.equal(formatoTotem(1400, 900), false)
})
prova('le tre soglie sono quelle del sito (900, 1200, 7/10), bordi compresi', () => {
  assert.equal(formatoTotem(900, 1286), true) // 0,6998
  assert.equal(formatoTotem(900, 1285), false) // 0,7004
  assert.equal(formatoTotem(899, 1900), false)
  assert.equal(formatoTotem(900, 1199), false)
  assert.equal(formatoTotem(840, 1200), false) // 840 < 900
  assert.equal(formatoTotem(1000, 1200), false) // 0,83
})
prova('misure assurde non sono totem', () => {
  assert.equal(formatoTotem(0, 0), false)
  assert.equal(formatoTotem(NaN, 1920), false)
  assert.equal(formatoTotem(1080, -1), false)
})
prova('?totem=1 forza, ?totem=0 spegne, il resto lascia decidere al formato', () => {
  assert.equal(forzatura('?totem=1'), true)
  assert.equal(forzatura('?lingua=en&totem=1'), true)
  assert.equal(forzatura('?totem=0'), false)
  assert.equal(forzatura('?totem=2'), null)
  assert.equal(forzatura('?totem='), null)
  assert.equal(forzatura(''), null)
  assert.equal(forzatura('?altro=1'), null)
})
prova('la scala porta la colonna logica a riempire la larghezza', () => {
  assert.equal(LARGHEZZA_LOGICA, 540)
  assert.equal(scalaPer(1080), 2)
  assert.ok(Math.abs(scalaPer(1064) - 1.9704) < 0.001)
  assert.ok(Math.abs(scalaPer(1440) - 2.6667) < 0.001)
  assert.equal(scalaPer(400), 1) // mai meno di 1
  assert.equal(scalaPer(0), 1)
  assert.equal(scalaPer(NaN), 1)
})
prova('le dimensioni logiche sono sempre 540 di larghezza, e l\'altezza segue la proporzione', () => {
  for (const [w, h] of [[1080, 1920], [1064, 1725], [1440, 2560]] as const) {
    const d = dimensioniLogiche({ width: w, height: h, scale: 1, fontScale: 1 })
    assert.ok(Math.abs(d.width - 540) < 1e-9, `larghezza ${d.width}`)
    assert.ok(Math.abs(d.height / d.width - h / w) < 1e-9)
    assert.equal(d.scale, 1) // il resto dell'oggetto passa invariato
  }
  assert.deepEqual(dimensioniLogiche({ width: 400, height: 800 }), { width: 400, height: 800 })
})

console.log(`\n${n} gruppi, tutti passati`)
