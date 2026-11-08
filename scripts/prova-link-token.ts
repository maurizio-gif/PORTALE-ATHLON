// @ts-nocheck — script da `npx tsx` (o da `node --experimental-strip-types`): usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova la parte pura del token dei link delle email, quella che l'app nativa usa al posto di `window.location.hash` (src/lib/linkToken.ts):
//   npx tsx scripts/prova-link-token.ts      oppure      node --experimental-strip-types scripts/prova-link-token.ts
import assert from 'node:assert/strict'

import { VALE_MS, corrisponde, memoriaLink, percorsoDi, tokenDaFrammento, tokenDaUrl } from '../src/lib/linkToken.ts'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log('OK', nome)
}

const TOKEN = 'a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuV'

prova('il token si legge dal frammento di un link universale, con la query davanti', () => {
  assert.equal(tokenDaUrl(`https://app.athlonroma.it/entra?d=certificato#th=${TOKEN}`), TOKEN)
  assert.equal(tokenDaUrl(`https://app.athlonroma.it/entra?d=evento&a=Master%20Class&g=2026-11-22#th=${TOKEN}`), TOKEN)
})
prova('e dall\'indirizzo con lo schema dell\'app (`athlon://`)', () => {
  assert.equal(tokenDaUrl(`athlon://entra?d=certificato#th=${TOKEN}`), TOKEN)
  assert.equal(tokenDaUrl(`athlon:///entra#th=${TOKEN}`), TOKEN)
})
prova('con altri parametri nel frammento, il primo `th` decide', () => {
  assert.equal(tokenDaUrl(`https://app.athlonroma.it/entra#x=1&th=${TOKEN}&y=2`), TOKEN)
  assert.equal(tokenDaUrl(`https://app.athlonroma.it/entra#th=${TOKEN}&th=ALTRO_TOKEN_LUNGO_ABBASTANZA`), TOKEN)
})
prova('senza frammento, o con un frammento senza `th`, non c\'e\' token', () => {
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra?d=certificato'), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#'), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#sezione=pagamenti'), null)
  assert.equal(tokenDaUrl(`https://app.athlonroma.it/entra?th=${TOKEN}`), null, 'nella query non vale: sta solo nel frammento')
  assert.equal(tokenDaUrl(null), null)
  assert.equal(tokenDaUrl(undefined), null)
  assert.equal(tokenDaUrl(''), null)
})
prova('un token che non puo\' essere vero si butta', () => {
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th='), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th=corto'), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th=' + 'a'.repeat(201)), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th=<script>alert(1)</script>aaaaaaaaaa'), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th=abc def ghi jkl mno pqr'), null)
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th=' + 'a'.repeat(16)), 'a'.repeat(16))
  assert.equal(tokenDaUrl('https://app.athlonroma.it/entra#th=' + 'a'.repeat(200)), 'a'.repeat(200))
})
prova('il frammento del router (`th=…`, senza #) si legge come quello di un indirizzo', () => {
  assert.equal(tokenDaFrammento(`th=${TOKEN}`), TOKEN)
  assert.equal(tokenDaFrammento(`#th=${TOKEN}`), TOKEN)
  assert.equal(tokenDaFrammento(''), null)
  assert.equal(tokenDaFrammento(undefined), null)
  assert.equal(tokenDaFrammento('th'), null)
})
prova('il percorso di un indirizzo: link universale e schema dell\'app danno lo stesso', () => {
  assert.equal(percorsoDi(`https://app.athlonroma.it/entra?d=x#th=${TOKEN}`), '/entra')
  assert.equal(percorsoDi('athlon://entra?d=x'), '/entra')
  assert.equal(percorsoDi('athlon:///entra'), '/entra')
  assert.equal(percorsoDi('https://app.athlonroma.it'), '/')
  assert.equal(percorsoDi('https://app.athlonroma.it/'), '/')
  assert.equal(percorsoDi('https://app.athlonroma.it/delega/conferma/abcd2345efgh#th=x'), '/delega/conferma/abcd2345efgh')
  assert.equal(percorsoDi('athlon://delega/conferma/abcd2345efgh'), '/delega/conferma/abcd2345efgh')
  assert.equal(percorsoDi('qualcosa che non e\' un indirizzo'), '/')
})
prova('un percorso corrisponde a se stesso e a quelli sotto, non a un nome che comincia uguale', () => {
  assert.equal(corrisponde('/entra', '/entra'), true)
  assert.equal(corrisponde('/entra/', '/entra'), true)
  assert.equal(corrisponde('/entra/x', '/entra'), true)
  assert.equal(corrisponde('/entrata', '/entra'), false)
  assert.equal(corrisponde('/delega/conferma/abcd', '/delega/conferma'), true)
  assert.equal(corrisponde('/delega/conferma/abcd', '/entra'), false)
  assert.equal(corrisponde('/', '/entra'), false)
})

prova('la memoria tiene l\'ultimo token, a quel percorso, e lo da\' una volta sola', () => {
  const m = memoriaLink(() => 1000)
  m.ricorda(`https://app.athlonroma.it/entra?d=gare#th=${TOKEN}`)
  assert.equal(m.prendi('/entra'), TOKEN)
  assert.equal(m.prendi('/entra'), null, 'gia\' preso: non si riprende')
})
prova('un token visto per un percorso non serve a un altro', () => {
  const m = memoriaLink(() => 1000)
  m.ricorda(`https://app.athlonroma.it/delega/conferma/abcd2345efgh#th=${TOKEN}`)
  assert.equal(m.prendi('/entra'), null)
  assert.equal(m.prendi('/delega/conferma'), TOKEN, 'e quello sbagliato non l\'ha consumato')
})
prova('un indirizzo senza token non cancella quello che c\'e\'', () => {
  const m = memoriaLink(() => 1000)
  m.ricorda(`athlon://entra?d=certificato#th=${TOKEN}`)
  m.ricorda('https://app.athlonroma.it/calendario')
  assert.equal(m.prendi('/entra'), TOKEN)
})
prova('un token nuovo prende il posto del vecchio', () => {
  const m = memoriaLink(() => 1000)
  const ALTRO = 'Z9y8X7w6V5u4T3s2R1q0PoNmLkJiHgFe'
  m.ricorda(`https://app.athlonroma.it/entra#th=${TOKEN}`)
  m.ricorda(`https://app.athlonroma.it/entra#th=${ALTRO}`)
  assert.equal(m.prendi('/entra'), ALTRO)
})
prova('dopo il tempo che vale in memoria, il token non si da\' piu\'', () => {
  let ora = 0
  const m = memoriaLink(() => ora)
  m.ricorda(`https://app.athlonroma.it/entra#th=${TOKEN}`)
  ora = VALE_MS
  assert.equal(m.prendi('/entra'), TOKEN, 'al limite c\'e\' ancora')
  m.ricorda(`https://app.athlonroma.it/entra#th=${TOKEN}`)
  ora = 2 * VALE_MS + 1
  assert.equal(m.prendi('/entra'), null)
})
prova('senza nessun link visto non c\'e\' niente', () => {
  assert.equal(memoriaLink().prendi('/entra'), null)
})

console.log(`\n${n} prove ok`)
