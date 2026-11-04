// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano delle destinazioni di `/entra` (il link che arriva dal sito): lista chiusa, categorie, nessun percorso libero.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-entra.ts
import assert from 'node:assert/strict'

import { arrivoDa, CATEGORIE, CATEGORIE_EVENTO, giornoValido, idValido, pianoValido } from '../src/features/entra/destinazioni'

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
  const a = arrivoDa('gare')
  assert.deepEqual(a?.href, { pathname: '/junior', params: { voce: 'gare' } })
  assert.ok(a.titolo && a.testo && a.bottone, 'titolo, testo e pulsante ci sono')
  assert.match(a.titolo, /gara/)
  ok('gare porta a Junior, alla voce Gare')
}
{
  assert.deepEqual(arrivoDa('gare', 'Gym Floor', '2026-11-15')?.href, { pathname: '/junior', params: { voce: 'gare' } }, 'gare ignora categoria e giorno')
  ok('gare non prende altro dall\'indirizzo')
}
{
  assert.deepEqual(arrivoDa('evento', 'Eventi Gratuiti', '2026-11-14')?.href, { pathname: '/calendario', params: { giorno: '2026-11-14', attivita: 'Eventi Gratuiti' } })
  assert.deepEqual(arrivoDa('evento', 'Master Class', '2026-11-14')?.href, { pathname: '/calendario', params: { giorno: '2026-11-14', attivita: 'Master Class' } })
  ok('evento porta al Calendario, sul giorno e sulla categoria dell\'evento')
}
{
  assert.deepEqual(arrivoDa('evento', null, '2026-11-14')?.href, { pathname: '/calendario', params: { giorno: '2026-11-14' } })
  assert.deepEqual(arrivoDa('evento', 'Master Class')?.href, { pathname: '/calendario', params: { attivita: 'Master Class' } })
  assert.equal(arrivoDa('evento')?.href, '/calendario')
  ok('evento: il giorno e la categoria sono indipendenti, senza nessuno dei due si apre il Calendario')
}
{
  assert.deepEqual(arrivoDa('evento', 'Group Reformer', '2026-11-14')?.href, { pathname: '/calendario', params: { giorno: '2026-11-14' } }, 'una categoria dei corsi non vale per un evento')
  assert.deepEqual(arrivoDa('prenota', 'Master Class', '2026-11-14')?.href, '/calendario', 'una categoria degli eventi non vale per prenota, e prenota non prende il giorno')
  ok('le due liste di categorie restano separate')
}
{
  for (const g of ['2026-02-30', '2026-13-01', '14/11/2026', '2026-11-14T10:00', '<b>', '', 'domani', '2026-1-4']) {
    assert.equal(giornoValido(g), null, `«${g}» non e' un giorno`)
    assert.equal(arrivoDa('evento', 'Master Class', g)?.href && (arrivoDa('evento', 'Master Class', g)!.href as any).params.giorno, undefined)
  }
  assert.equal(giornoValido('2028-02-29'), '2028-02-29')
  assert.equal(giornoValido('2027-02-29'), null)
  assert.equal(giornoValido(undefined), null)
  ok('un giorno che non esiste non entra nell\'indirizzo del Calendario')
}
{
  // La finestra del Calendario: oggi e i 14 giorni dopo. `oggi` si passa, cosi' la prova non dipende dalla data del giorno.
  const dentro = arrivoDa('evento', 'Master Class', '2026-11-18', '2026-11-04')
  assert.deepEqual(dentro?.href, { pathname: '/calendario', params: { giorno: '2026-11-18', attivita: 'Master Class' } }, 'a 14 giorni e\' ancora nel Calendario')
  const oggi = arrivoDa('evento', 'Master Class', '2026-11-04', '2026-11-04')
  assert.deepEqual(oggi?.href, { pathname: '/calendario', params: { giorno: '2026-11-04', attivita: 'Master Class' } })
  const fuori = arrivoDa('evento', 'Master Class', '2026-11-19', '2026-11-04')
  assert.equal(fuori?.href, '/calendario', 'a 15 giorni non si porta su un altro giorno con la categoria: si apre il Calendario')
  assert.match(fuori.titolo, /non sono ancora aperte/)
  assert.match(fuori.testo, /5 novembre/, 'dice da quando si prenota: 14 giorni prima')
  assert.ok(fuori.bottone)
  ok('un evento oltre i 14 giorni non porta su un giorno vuoto: dice quando si aprono le prenotazioni')
}
{
  // Un evento passato resta nel Calendario (il server lo riporta a oggi): non e' una cosa da dire qui, la pagina del sito non offre il comando.
  assert.deepEqual(arrivoDa('evento', null, '2026-10-01', '2026-11-04')?.href, { pathname: '/calendario', params: { giorno: '2026-10-01' } })
  ok('un evento passato non si tocca')
}
{
  assert.equal(CATEGORIE_EVENTO.length, 2)
  for (const c of CATEGORIE_EVENTO) assert.deepEqual((arrivoDa('evento', c)!.href as any).params.attivita, c)
  ok('le categorie degli eventi passano tutte')
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

{
  const a = arrivoDa('junior', 'Gym Floor', '2026-11-15')
  assert.deepEqual(a?.href, { pathname: '/junior', params: { assistenza: '1' } }, 'junior ignora categoria e giorno, e apre l\'assistente')
  assert.ok(a.titolo && a.testo && a.bottone, 'titolo, testo e pulsante ci sono')
  assert.match(a.bottone, /Junior/)
  ok('junior porta alla sezione Junior con l\'assistente aperto')
}

{
  const OGGI = '2026-11-04'
  assert.deepEqual(arrivoDa('abbonamento', null, null, OGGI, '263')?.href, { pathname: '/abbonamento', params: { piano: '263' } })
  assert.equal(arrivoDa('abbonamento', null, null, OGGI)?.href, '/abbonamento')
  assert.equal(arrivoDa('abbonamento', null, null, OGGI, '/../shop')?.href, '/abbonamento', 'un piano che non e\' un numero non passa')
  assert.equal(arrivoDa('abbonamento', null, null, OGGI, '1234567')?.href, '/abbonamento', 'troppo lungo')
  assert.equal(arrivoDa('abbonamento', 'Gym Floor', '2026-11-10', OGGI)?.href, '/abbonamento', 'abbonamento ignora categoria e giorno')
  assert.equal(arrivoDa('prenota', null, null, OGGI, '263')?.href, '/calendario', 'gli altri ignorano il piano')
  assert.equal(pianoValido('254'), '254')
  assert.equal(pianoValido(''), null)
  ok('abbonamento: il listino con il piano scelto, solo cifre')
}

{
  const OGGI = '2026-11-04'
  assert.deepEqual(arrivoDa('junior', null, null, OGGI, null, '987654')?.href, { pathname: '/junior', params: { assistenza: '1', figlio: '987654' } })
  assert.deepEqual(arrivoDa('junior', null, null, OGGI)?.href, { pathname: '/junior', params: { assistenza: '1' } })
  assert.deepEqual(arrivoDa('junior', null, null, OGGI, null, '12a')?.href, { pathname: '/junior', params: { assistenza: '1' } }, 'un id non numerico non passa')
  assert.equal(arrivoDa('prenota', null, null, OGGI, null, '987654')?.href, '/calendario', 'il bambino vale solo per junior')
  assert.equal(idValido('12345678901'), null, 'troppo lungo')
  ok('junior: si apre sul bambino del link, solo cifre')
}

console.log(`\n${passi} prove passate`)
