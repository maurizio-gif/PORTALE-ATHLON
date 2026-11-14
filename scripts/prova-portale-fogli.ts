// Prova di `lib/portaleFogli.ts` (puro): `npx tsx scripts/prova-portale-fogli.ts`
// I fogli con un campo di testo, su Android, li disegna `FoglioHost` alla radice (14/11/2026): qui si prova l'elenco di quelli aperti e la presenza dell'host.
import assert from 'node:assert/strict'

import { hostMontato, iscrivi, leggiVoci, mettiInHost, montaHost, togliDalHost } from '../src/lib/portaleFogli'

let n = 0
const prova = (nome: string, f: () => void) => { f(); n++; console.log('ok', nome) }
const ids = () => leggiVoci().map((v) => v.id)

prova('un foglio messo nell’host compare, e tolto sparisce', () => {
  assert.deepEqual(ids(), [])
  mettiInHost('a', 'A')
  assert.deepEqual(ids(), ['a'])
  togliDalHost('a')
  assert.deepEqual(ids(), [])
})

prova('l’ultimo foglio messo sta sopra, e aggiornare un foglio non cambia il suo posto nella pila', () => {
  mettiInHost('a', 'A1')
  mettiInHost('b', 'B1')
  mettiInHost('a', 'A2')
  assert.deepEqual(ids(), ['a', 'b'])
  assert.equal(leggiVoci()[0].nodo, 'A2')
  togliDalHost('a')
  togliDalHost('b')
})

prova('togliere un foglio che non c’e’ non cambia l’elenco ne’ avvisa nessuno', () => {
  mettiInHost('a', 'A')
  const prima = leggiVoci()
  let avvisi = 0
  const smetti = iscrivi(() => avvisi++)
  togliDalHost('non-c-e')
  assert.equal(leggiVoci(), prima)
  assert.equal(avvisi, 0)
  smetti()
  togliDalHost('a')
})

prova('l’elenco e’ lo stesso oggetto finche’ non cambia niente (serve a useSyncExternalStore)', () => {
  assert.equal(leggiVoci(), leggiVoci())
  mettiInHost('a', 'A')
  const v1 = leggiVoci()
  assert.equal(leggiVoci(), v1)
  mettiInHost('a', 'A')
  assert.notEqual(leggiVoci(), v1)
  togliDalHost('a')
})

prova('chi si iscrive e’ avvisato a ogni cambio, e dopo la disiscrizione no', () => {
  let avvisi = 0
  const smetti = iscrivi(() => avvisi++)
  mettiInHost('a', 'A')
  togliDalHost('a')
  assert.equal(avvisi, 2)
  smetti()
  mettiInHost('a', 'A')
  togliDalHost('a')
  assert.equal(avvisi, 2)
})

prova('l’host si annuncia quando si monta e smette quando si smonta, anche se chiude due volte', () => {
  assert.equal(hostMontato(), false)
  const togli = montaHost()
  assert.equal(hostMontato(), true)
  togli()
  togli()
  assert.equal(hostMontato(), false)
})

prova('con due host montati (un rimontaggio sovrapposto) resta montato finche’ ce n’e’ uno', () => {
  const a = montaHost()
  const b = montaHost()
  a()
  assert.equal(hostMontato(), true)
  b()
  assert.equal(hostMontato(), false)
})

console.log(`\n${n} prove passate`)
