// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano dei conti sui file del certificato (10/11/2026): fino a tre file, 8 MB in tutto, niente doppioni, il
// corpo della richiesta (identico a quello di prima con un file solo) e la guardia per una funzione non ancora aggiornata.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-certificato-piu-file.ts
import assert from 'node:assert/strict'

import { aggiungiFile, corpoFile, fileRicevuti, incompleto, MAX_BYTE, MAX_FILE, pesoLeggibile, totaleByte } from '../src/lib/elencoFileCertificato'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}
const MB = 1024 * 1024
const f = (nome: string, byte: number, base64 = `contenuto-${nome}`, tipo = 'application/pdf') => ({ nome, tipo, byte, base64 })

// 1. I limiti sono quelli della funzione.
assert.equal(MAX_FILE, 3)
assert.equal(MAX_BYTE, 8 * MB)
ok('tre file, 8 MB in tutto')

// 2. Si aggiunge fino a tre, nell'ordine.
{
  let elenco = []
  for (const n of ['certificato.pdf', 'ecg.jpg', 'pagina2.png']) {
    const r = aggiungiFile(elenco, f(n, 1 * MB))
    assert.ok(r.ok, n)
    elenco = r.files
  }
  assert.deepEqual(elenco.map((x) => x.nome), ['certificato.pdf', 'ecg.jpg', 'pagina2.png'])
  assert.equal(totaleByte(elenco), 3 * MB)
  const quarto = aggiungiFile(elenco, f('quarto.pdf', 1 * MB))
  assert.ok(!quarto.ok)
  assert.match(quarto.errore, /al massimo 3 file/)
}
ok('si aggiunge fino a tre, il quarto no')

// 3. L'elenco non si tocca quando un file non entra (l'oggetto di prima resta com'e').
{
  const prima = [f('a.pdf', 5 * MB)]
  const r = aggiungiFile(prima, f('b.pdf', 4 * MB))
  assert.ok(!r.ok)
  assert.equal(prima.length, 1)
  assert.equal(prima[0].nome, 'a.pdf')
}
ok('un file che non entra non toglie quelli scelti')

// 4. Il peso: il totale sta nel limite di un file solo. Al limite esatto si', un byte oltre no, e l'errore dice quanto.
{
  assert.ok(aggiungiFile([f('a.pdf', 4 * MB)], f('b.jpg', 4 * MB)).ok, '8 MB esatti entrano')
  const oltre = aggiungiFile([f('a.pdf', 4 * MB)], f('b.jpg', 4 * MB + 1))
  assert.ok(!oltre.ok)
  assert.match(oltre.errore, /8 MB in tutto/)
  assert.match(oltre.errore, /8[,.]0 MB/)
  assert.ok(aggiungiFile([], f('solo.pdf', MAX_BYTE)).ok, 'un file solo da 8 MB passa come prima')
}
ok('8 MB in tutto: al limite si, un byte oltre no')

// 5. Lo stesso file due volte, anche con un altro nome: no. Due file diversi dello stesso peso: si.
{
  const doppio = aggiungiFile([f('a.pdf', 1 * MB, 'AAAA')], f('copia di a.pdf', 1 * MB, 'AAAA'))
  assert.ok(!doppio.ok)
  assert.match(doppio.errore, /già scelto/)
  assert.ok(aggiungiFile([f('a.pdf', 1 * MB, 'AAAA')], f('b.pdf', 1 * MB, 'BBBB')).ok, 'stesso peso, byte diversi')
}
ok('lo stesso file due volte no, due file diversi dello stesso peso si')

// 6. Il corpo: con un file solo e' identico a quello di prima (nome e base64, niente altro); con piu' file gli altri stanno in `altri`.
{
  assert.deepEqual(corpoFile([f('a.pdf', 10, 'AAAA')]), { nome: 'a.pdf', base64: 'AAAA' })
  assert.ok(!('altri' in corpoFile([f('a.pdf', 10, 'AAAA')])))
  assert.deepEqual(corpoFile([f('a.pdf', 10, 'AAAA'), f('ecg.jpg', 20, 'BBBB'), f('p2.png', 30, 'CCCC')]), {
    nome: 'a.pdf',
    base64: 'AAAA',
    altri: [
      { nome: 'ecg.jpg', base64: 'BBBB' },
      { nome: 'p2.png', base64: 'CCCC' },
    ],
  })
  // Il corpo non porta niente che la funzione non conosce (il tipo e il peso sono del client).
  assert.deepEqual(Object.keys(corpoFile([f('a.pdf', 10), f('b.pdf', 20)]).altri[0]).sort(), ['base64', 'nome'])
}
ok('il corpo con un file solo e’ quello di prima; gli altri vanno in `altri`')

// 7. La guardia: una funzione non aggiornata salva un file solo e non dice quanti. Con piu' file mandati la persona lo deve sapere.
{
  assert.equal(fileRicevuti({ ok: true, caricamento: { stato: 'in_verifica', file: 3 } }), 3)
  assert.equal(fileRicevuti({ ok: true, caricamento: { stato: 'in_verifica' } }), null, 'una funzione di prima non lo dice')
  assert.equal(fileRicevuti(null), null)
  assert.equal(fileRicevuti({ caricamento: { file: '3' } }), null, 'non e’ un numero')
  assert.equal(incompleto(1, null), false, 'un file solo e una funzione di prima: va bene')
  assert.equal(incompleto(1, 1), false)
  assert.equal(incompleto(3, 3), false)
  assert.equal(incompleto(2, null), true, 'due file e la funzione non lo dice: ne ha salvato uno')
  assert.equal(incompleto(3, 2), true)
  assert.equal(incompleto(2, 1), true)
}
ok('la guardia segnala i file che una funzione non aggiornata si e’ persa')

// 8. Il peso come lo si legge.
assert.equal(pesoLeggibile(380 * 1024), '380 kB')
assert.equal(pesoLeggibile(1), '1 kB')
assert.match(pesoLeggibile(2.4 * MB), /^2[,.]4 MB$/)
ok('il peso leggibile')

console.log(`\nTutte le prove passano (${passi}).`)
