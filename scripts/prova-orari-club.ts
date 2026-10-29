// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano della lettura degli orari del club (src/api/club.ts): la forma controllata della risposta della funzione e l'indirizzo di un avviso.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-orari-club.ts
import assert from 'node:assert/strict'

import { idNewsDaAvviso, orariClubDa } from '../src/api/club'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

const BUONA = {
  ok: true,
  oggi: { data: '2026-10-29', giorno: 'giovedì 29 ottobre', chiuso: false, festivo: false, da: '06:00', a: '22:00', ridotto: false },
  settimana: [{ giorni: 'Lunedì – Venerdì', da: '06:00', a: '22:00' }, { giorni: 'Sabato', da: '08:00', a: '20:00' }],
  avvisi: [{ id: 'news:chiusura-29-ottobre', titolo: ' Il club chiude dalle 8:30 ', categoria: 'Struttura', data: '2026-10-26' }],
}

{
  const o = orariClubDa(BUONA)!
  assert.equal(o.oggi.da, '06:00')
  assert.equal(o.settimana.length, 2)
  assert.equal(o.avvisi[0].titolo, 'Il club chiude dalle 8:30', 'il titolo ripulito')
  ok('una risposta buona si legge intera')
}
{
  assert.equal(orariClubDa(null), null)
  assert.equal(orariClubDa({}), null, 'una funzione di prima: niente')
  assert.equal(orariClubDa({ ok: true, oggi: { data: 'ieri' } }), null, 'una data che non e una data')
  assert.equal(orariClubDa({ ...BUONA, oggi: { ...BUONA.oggi, da: null } }), null, 'un giorno aperto senza orario non si mostra')
  assert.equal(orariClubDa({ ...BUONA, oggi: { ...BUONA.oggi, da: 'presto' } }), null)
  const chiuso = orariClubDa({ ...BUONA, oggi: { ...BUONA.oggi, chiuso: true, festivo: true, da: null, a: null } })!
  assert.equal(chiuso.oggi.chiuso, true, 'un giorno chiuso non ha bisogno dell orario')
  ok('forme sbagliate: niente, senza sollevare; un giorno chiuso va bene senza orario')
}
{
  const sporca = orariClubDa({
    ...BUONA,
    settimana: [{ giorni: 'Sabato', da: '8', a: '20:00' }, null, { giorni: 5, da: '06:00', a: '22:00' }, { giorni: 'Domenica', da: '09:00', a: '18:00' }],
    avvisi: [{ id: 'evento:x', titolo: 'No' }, { id: 'news:a', titolo: '  ' }, null, { id: 'news:b', titolo: 'Sì' }],
  })!
  assert.deepEqual(sporca.settimana.map((f) => f.giorni), ['Domenica'], 'solo le righe con giorni e orari veri')
  assert.deepEqual(sporca.avvisi.map((a) => a.id), ['news:b'], 'solo le news con un titolo')
  ok('righe sporche della settimana e degli avvisi: scartate una per una')
}
{
  assert.equal(idNewsDaAvviso('news:chiusura-29-ottobre'), 'chiusura-29-ottobre')
  for (const x of ['evento:a', 'news:', 'news:../x', 'news:a/b', 'news:' + 'a'.repeat(200), 'x']) assert.equal(idNewsDaAvviso(x), null, x)
  ok('l’indirizzo di una news dall’avviso: solo id veri')
}
console.log(`\n${passi} gruppi di prove: ok`)
