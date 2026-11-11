// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `schede/statoTrain.ts` (11/11/2026, puro): in che momento e' la persona nell'area Train. `npx tsx scripts/prova-stato-train.ts`
import assert from 'node:assert/strict'

import { eAssistito, statoTest, statoTrain, usaIMassimali } from '../src/features/lab/schede/statoTrain'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

const ADESSO = Date.parse('2026-11-11T12:00:00Z')
const giorniFa = (g: number) => new Date(ADESSO - g * 86_400_000).toISOString()
const piano = (id: string, extra: object = {}) => ({ id, tipo: 'socio', origine: 'ai', ultimo: null, ...extra })
const MAI = { ultimo: null, fatti: 0, totale: 7, giorni: 42, minimo: 3 }
const fatto = (fatti = 3, g = 5) => ({ ultimo: giorniFa(g), fatti, totale: 7, giorni: 42, minimo: 3 })

ok('assistito: i piani nati dal questionario, col tipo di oggi (socio + origine ai) e con quello di prima (ai)', () => {
  assert.equal(eAssistito({ tipo: 'socio', origine: 'ai' }), true)
  assert.equal(eAssistito({ tipo: 'ai' }), true)
  assert.equal(eAssistito({ tipo: 'socio', origine: 'importata' }), false)
  assert.equal(eAssistito({ tipo: 'socio', origine: 'creata' }), false)
  assert.equal(eAssistito({ tipo: 'personalizzata' }), false)
})

ok('usano i massimali: assistito e del trainer, non quelli caricati o scritti a mano, e mai un piano di nuoto', () => {
  assert.equal(usaIMassimali({ tipo: 'socio', origine: 'ai' }), true)
  assert.equal(usaIMassimali({ tipo: 'personalizzata' }), true)
  assert.equal(usaIMassimali({ tipo: 'socio', origine: 'importata' }), false)
  assert.equal(usaIMassimali({ tipo: 'socio', origine: 'creata' }), false)
  assert.equal(usaIMassimali({ tipo: 'socio', origine: 'ai', ambiente: 'vasca' }), false)
})

ok('lo stato del test: nascosto se non serve e non c\'e\', da fare, in corso, fatto, da rifare', () => {
  assert.equal(statoTest(MAI, false, ADESSO), 'nascosto')
  assert.equal(statoTest(MAI, true, ADESSO), 'da_fare')
  assert.equal(statoTest(fatto(2), true, ADESSO), 'in_corso')
  assert.equal(statoTest(fatto(3), true, ADESSO), 'fatto')
  assert.equal(statoTest(fatto(7, 41), true, ADESSO), 'fatto')
  assert.equal(statoTest(fatto(7, 43), true, ADESSO), 'da_rifare')
})

ok('un test gia\' fatto si vede anche se nessun piano lo usa: un dato che c\'e\' non si nasconde', () => {
  assert.equal(statoTest(fatto(3), false, ADESSO), 'fatto')
  assert.equal(statoTest(fatto(1), false, ADESSO), 'in_corso')
})

ok('nessun piano: fase vuoto, niente test', () => {
  const s = statoTrain([], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.principale, s.test, s.invitoAssistito, s.altri.length], ['vuoto', null, 'nascosto', false, 0])
})

ok('i piani consigliati dal club (standard) non contano: resta vuoto', () => {
  assert.equal(statoTrain([{ id: 'c', tipo: 'standard', ultimo: null }], MAI, false, ADESSO).fase, 'vuoto')
})

ok('appena fatto il questionario: percorso, col test come passo dopo', () => {
  const s = statoTrain([piano('a')], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.test, s.principale.id, s.delPercorso.id, s.invitoAssistito], ['percorso', 'da_fare', 'a', 'a', false])
})

ok('test cominciato e non finito: ancora nel percorso', () => {
  const s = statoTrain([piano('a')], fatto(1), false, ADESSO)
  assert.deepEqual([s.fase, s.test], ['percorso', 'in_corso'])
})

ok('«Lo faccio dopo»: a regime, e la riga del test resta «da fare»', () => {
  const s = statoTrain([piano('a')], MAI, true, ADESSO)
  assert.deepEqual([s.fase, s.test, s.principale.id, s.delPercorso], ['regime', 'da_fare', 'a', null])
})

ok('test fatto: a regime', () => {
  const s = statoTrain([piano('a')], fatto(3), false, ADESSO)
  assert.deepEqual([s.fase, s.test], ['regime', 'fatto'])
})

ok('ha gia\' cominciato ad allenarsi senza il test: niente percorso, la riga dice «da fare»', () => {
  const s = statoTrain([piano('a', { ultimo: giorniFa(1) })], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.test], ['regime', 'da_fare'])
})

ok('un piano di nuoto assistito non apre il percorso e non chiede il test', () => {
  const s = statoTrain([piano('v', { ambiente: 'vasca' })], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.test, s.invitoAssistito], ['regime', 'nascosto', false])
})

ok('solo un piano caricato: a regime, niente test, e l\'invito all\'allenamento assistito', () => {
  const s = statoTrain([piano('i', { origine: 'importata' })], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.test, s.invitoAssistito, s.principale.id], ['regime', 'nascosto', true, 'i'])
})

ok('solo un piano scritto a mano: come quello caricato', () => {
  const s = statoTrain([piano('m', { origine: 'creata' })], MAI, false, ADESSO)
  assert.deepEqual([s.test, s.invitoAssistito], ['nascosto', true])
})

ok('piano del trainer senza test: a regime (non c\'e\' un questionario da cui venire), il test e\' da fare, nessun invito', () => {
  const s = statoTrain([{ id: 't', tipo: 'personalizzata', ultimo: null }], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.test, s.invitoAssistito], ['regime', 'da_fare', false])
})

ok('in cima il piano con l\'allenamento piu\' recente, gli altri sotto nell\'ordine di arrivo', () => {
  const s = statoTrain([piano('a', { ultimo: giorniFa(9) }), piano('i', { origine: 'importata', ultimo: giorniFa(2) }), piano('n', { origine: 'creata' })], fatto(3), false, ADESSO)
  assert.equal(s.principale.id, 'i')
  assert.deepEqual(s.altri.map((x) => x.id), ['a', 'n'])
})

ok('nessuno iniziato: in cima il primo che usa i massimali, non il primo caricato', () => {
  const s = statoTrain([piano('i', { origine: 'importata' }), { id: 't', tipo: 'personalizzata', ultimo: null }], fatto(3), false, ADESSO)
  assert.equal(s.principale.id, 't')
  assert.deepEqual(s.altri.map((x) => x.id), ['i'])
})

ok('un piano assistito nuovo accanto a uno caricato che si usa gia\': il percorso parte lo stesso, col piano nuovo in cima', () => {
  const s = statoTrain([piano('i', { origine: 'importata', ultimo: giorniFa(1) }), piano('a')], MAI, false, ADESSO)
  assert.deepEqual([s.fase, s.principale.id, s.altri.map((x) => x.id).join()], ['percorso', 'a', 'i'])
})

ok('il test da rifare non riapre il percorso: e\' una riga', () => {
  const s = statoTrain([piano('a')], fatto(7, 60), false, ADESSO)
  assert.deepEqual([s.fase, s.test], ['regime', 'da_rifare'])
})

console.log(`\n${n} prove passate`)
