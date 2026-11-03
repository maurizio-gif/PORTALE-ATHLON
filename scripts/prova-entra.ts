// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano delle destinazioni di `/entra` (il link che arriva dal sito): lista chiusa, categorie, nessun percorso libero.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-entra.ts
import assert from 'node:assert/strict'

import { arrivoDa, CATEGORIE } from '../src/features/entra/destinazioni'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

{
  const a = arrivoDa('prenota', 'Group Reformer')
  assert.deepEqual(a?.href, { pathname: '/calendario', params: { attivita: 'Group Reformer' } })
  assert.match(a.titolo, /Group Reformer/)
  ok('prenota con una categoria vera porta al Calendario, gia\' filtrato')
}
{
  assert.equal(arrivoDa('prenota')?.href, '/calendario')
  assert.equal(arrivoDa('prenota', null)?.href, '/calendario')
  ok('prenota senza categoria porta al Calendario intero')
}
{
  assert.equal(arrivoDa('prenota', 'Clicca qui')?.href, '/calendario')
  assert.equal(arrivoDa('prenota', '<b>Gym Floor</b>')?.href, '/calendario')
  assert.equal(arrivoDa('prenota', 'gym floor')?.href, '/calendario', 'il filtro confronta la stringa: le maiuscole contano')
  ok('una categoria che non e\' in lista non passa, la destinazione si')
}
{
  assert.equal(arrivoDa('personal')?.href, '/personal')
  assert.equal(arrivoDa('personal', 'Gym Floor')?.href, '/personal', 'personal ignora la categoria')
  ok('personal')
}
{
  for (const d of [undefined, '', 'admin', '/profilo', '../x', 'https://evil.example', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.equal(arrivoDa(d), null, `«${d}» non e' una destinazione`)
  }
  ok('nessun percorso libero: solo le chiavi della lista (anche non quelle del prototipo)')
}
{
  assert.equal(CATEGORIE.length, 6)
  for (const c of CATEGORIE) assert.deepEqual(arrivoDa('prenota', c)?.href, { pathname: '/calendario', params: { attivita: c } })
  ok('le sei categorie del Calendario passano tutte')
}
{
  const a = arrivoDa('prenota', 'Nuoto Libero')
  assert.ok(a.titolo && a.testo && a.bottone, 'titolo, testo e pulsante ci sono')
  ok('i testi ci sono')
}

console.log(`\n${passi} prove passate`)
