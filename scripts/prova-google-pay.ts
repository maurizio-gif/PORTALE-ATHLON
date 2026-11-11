// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano di dove Google Pay va in TEST (src/lib/googlePay.ts, 11/11/2026): solo sulle anteprime di Vercel del portale, mai in produzione. Niente rete e niente React.
//
//   npx tsx scripts/prova-google-pay.ts
import assert from 'node:assert/strict'

import { googlePayInProva } from '../src/lib/googlePay.ts'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log(`ok  ${nome}`)
}

prova('le anteprime del portale su Vercel: TEST', () => {
  for (const h of [
    'portale-athlon-git-claude-sweet-euler-0bvjfb-r2d.vercel.app',
    'portale-athlon-5kxtfnkbxh52dkkfau8smcrmhmlt-r2d.vercel.app',
    'portale-athlon-abc123.vercel.app',
    'PORTALE-ATHLON-ABC123.VERCEL.APP', // gli indirizzi non hanno maiuscole, ma non e' un motivo per sbagliare
    '  portale-athlon-abc123.vercel.app  ',
  ]) assert.equal(googlePayInProva(h), true, h)
})

prova('la produzione e i suoi indirizzi: mai TEST', () => {
  for (const h of ['app.athlonroma.it', 'www.athlonroma.it', 'athlonroma.it', 'portale-athlon.vercel.app']) assert.equal(googlePayInProva(h), false, h)
})

prova('gli alias del ramo main potrebbero essere condivisi: mai TEST', () => {
  for (const h of ['portale-athlon-git-main-r2d.vercel.app', 'portale-athlon-git-main.vercel.app']) assert.equal(googlePayInProva(h), false, h)
})

prova('indirizzi che somigliano, ma non sono nostri: mai TEST', () => {
  for (const h of [
    'localhost',
    '127.0.0.1',
    'evil.com',
    'portale-athlon-abc.vercel.app.evil.com',
    'xportale-athlon-abc.vercel.app',
    'portale-athlon-abc.vercel.app.',
    'crm-athlon-git-claude-x-r2d.vercel.app',
    'portale-athlon-.vercel.app',
    'portale-athlon-a_b.vercel.app',
    'portale-athlon-a b.vercel.app',
  ]) assert.equal(googlePayInProva(h), false, h)
})

prova('nel dubbio no: indirizzo assente o non testuale', () => {
  for (const h of [null, undefined, '', ' ', 0, {}, []]) assert.equal(googlePayInProva(h as never), false, String(h))
})

console.log(`\n${n} prove passate`)
