// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `guide/guide.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-guide.ts`
import assert from 'node:assert/strict'

import { CHIAVI_GUIDA, SCHEDA_DI_GUIDA, chiaveMemoria, giaVista, guidaDiRotta, guidaSuPiattaforma, schedaPresente, segnaVista } from '../src/features/lab/guide/guide'

// Le guide con il video alla prima apertura di una sezione (08/11/2026): quale guida va con quale schermata, e il «gia' visto».
let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const memoriaFinta = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), tutte: () => [...m.keys()] }
}

ok('ogni schermata principale ha la sua guida', () => {
  assert.equal(guidaDiRotta('/'), 'home')
  assert.equal(guidaDiRotta('/calendario'), 'prenotazioni')
  assert.equal(guidaDiRotta('/junior'), 'junior')
  assert.equal(guidaDiRotta('/invita'), 'invita')
  assert.equal(guidaDiRotta('/allenamento'), 'ahs')
})
ok('nella Home la sezione Certificato ha la sua; le altre sezioni sono la Home', () => {
  assert.equal(guidaDiRotta('/', 'certificato'), 'certificato')
  assert.equal(guidaDiRotta('/', 'pagamenti'), 'home')
  assert.equal(guidaDiRotta('/', 'abbonamenti'), 'home')
  assert.equal(guidaDiRotta('/', null), 'home')
})
ok('lo slash finale non conta', () => {
  assert.equal(guidaDiRotta('/calendario/'), 'prenotazioni')
  assert.equal(guidaDiRotta('/allenamento/'), 'ahs')
})
ok('dentro una sezione (un piano, un pagamento, una pagina di AHS) non c\'e\' guida', () => {
  for (const p of ['/allenamento/punteggio', '/allenamento/balance', '/allenamento/importa', '/pagamenti/storico', '/shop', '/club-life/help-desk/app/home', '/notifiche', '/profilo', '/tv']) {
    assert.equal(guidaDiRotta(p), null, p)
  }
})
ok('le sei guide portano a sei schede diverse, tutte nelle due aree nuove', () => {
  assert.equal(CHIAVI_GUIDA.length, 6)
  const id = Object.values(SCHEDA_DI_GUIDA)
  assert.equal(new Set(id).size, 6)
  for (const x of id) assert.match(x, /^(app|ahs)\/[a-z0-9-]+$/)
})
ok('il «gia\' visto» e\' per persona e per guida', () => {
  const m = memoriaFinta()
  assert.equal(giaVista(m, 'u1', 'home'), false)
  segnaVista(m, 'u1', 'home')
  assert.equal(giaVista(m, 'u1', 'home'), true)
  assert.equal(giaVista(m, 'u1', 'junior'), false, 'un\'altra guida non e\' vista')
  assert.equal(giaVista(m, 'u2', 'home'), false, 'un\'altra persona sullo stesso telefono la vede')
  assert.deepEqual(m.tutte(), [chiaveMemoria('u1', 'home')])
})
ok('senza memoria (o con una che solleva) non rompe: la guida risulta non vista e non si segna', () => {
  assert.equal(giaVista(undefined, 'u1', 'home'), false)
  assert.doesNotThrow(() => segnaVista(undefined, 'u1', 'home'))
  const rotta = { getItem: () => { throw new Error('storage bloccato') }, setItem: () => { throw new Error('storage bloccato') } }
  assert.equal(giaVista(rotta, 'u1', 'home'), false)
  assert.doesNotThrow(() => segnaVista(rotta, 'u1', 'home'))
})
ok('solo nell\'app: iOS e Android si, il web (e quindi la PWA) no', () => {
  assert.equal(guidaSuPiattaforma('ios'), true)
  assert.equal(guidaSuPiattaforma('android'), true)
  assert.equal(guidaSuPiattaforma('web'), false)
  assert.equal(guidaSuPiattaforma('windows'), false)
  assert.equal(guidaSuPiattaforma(''), false)
})
ok('la finestra compare solo se la scheda c\'e\' nel feed', () => {
  const feed = [{ id: 'app/home' }, { id: 'generali/prenotazioni' }, { id: 'ahs/cos-e' }]
  assert.equal(schedaPresente('home', feed), true)
  assert.equal(schedaPresente('ahs', feed), true)
  assert.equal(schedaPresente('prenotazioni', feed), false, 'la scheda vecchia non e\' la guida')
  assert.equal(schedaPresente('junior', feed), false)
  assert.equal(schedaPresente('home', null), false)
  assert.equal(schedaPresente('home', undefined), false)
  assert.equal(schedaPresente('home', []), false)
})

console.log(`\n${n} prove ok`)
