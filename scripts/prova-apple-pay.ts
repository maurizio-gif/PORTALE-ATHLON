// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano dell'interruttore di Apple Pay (src/lib/applePay.ts, 11/11/2026): da quale versione dell'app si chiede, e che nel dubbio non si chiede.
// Niente rete e niente React Native.
//
//   npx tsx scripts/prova-apple-pay.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { APPLE_PAY_DALLA_VERSIONE, MERCHANT_ID_APPLE_PAY, NOME_NEGOZIO_APPLE_PAY, versioneAlmeno } from '../src/lib/applePay.ts'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log(`ok  ${nome}`)
}

prova('la versione uguale o piu\' alta basta', () => {
  assert.equal(versioneAlmeno('3.1.1', '3.1.1'), true)
  assert.equal(versioneAlmeno('3.1.2', '3.1.1'), true)
  assert.equal(versioneAlmeno('3.2.0', '3.1.1'), true)
  assert.equal(versioneAlmeno('4.0.0', '3.1.1'), true)
})

prova('una versione piu\' bassa non basta (3.1.0 oggi: Apple Pay spento)', () => {
  assert.equal(versioneAlmeno('3.1.0', '3.1.1'), false)
  assert.equal(versioneAlmeno('3.0.9', '3.1.1'), false)
  assert.equal(versioneAlmeno('2.9.9', '3.1.1'), false)
  assert.equal(versioneAlmeno('3.1.0', APPLE_PAY_DALLA_VERSIONE), false)
})

prova('si confronta per numeri, non per testo (3.10.0 e\' dopo 3.9.0)', () => {
  assert.equal(versioneAlmeno('3.10.0', '3.9.0'), true)
  assert.equal(versioneAlmeno('3.9.0', '3.10.0'), false)
  assert.equal(versioneAlmeno('10.0.0', '9.0.0'), true)
})

prova('nel dubbio no: versione assente, vuota o illeggibile', () => {
  for (const v of [null, undefined, '', '  ', '3.1', '3', 'abc', '3.1.x', '3.1.1-beta', '3.1.1.1', 311, {}, []]) {
    assert.equal(versioneAlmeno(v as never, '3.1.1'), false, String(v))
  }
  // Anche una soglia illeggibile spegne.
  assert.equal(versioneAlmeno('3.1.1', 'boh'), false)
})

prova('gli spazi attorno si tolgono', () => {
  assert.equal(versioneAlmeno(' 3.1.1 ', '3.1.1'), true)
})

prova('il Merchant ID e il nome', () => {
  assert.equal(MERCHANT_ID_APPLE_PAY, 'merchant.com.adyen.Point2000SrlSocSpoDilECOM')
  assert.equal(NOME_NEGOZIO_APPLE_PAY, 'Athlon Club')
})

// Il Merchant ID e' lo stesso di app.json (il plugin lo scrive nel permesso).
{
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'))
  const plugin = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === '@adyen/react-native')
  assert.ok(plugin, 'il plugin di Adyen non ha opzioni in app.json')
  assert.equal(plugin[1].merchantIdentifier, MERCHANT_ID_APPLE_PAY)
  n++
  console.log('ok  app.json e lib/applePay.ts hanno lo stesso Merchant ID')
}

console.log(`\n${n} prove passate`)
