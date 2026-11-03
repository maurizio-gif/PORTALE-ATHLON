// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova il passaggio dal totem per i pagamenti (src/features/lab/totem/passaggio.ts), senza React ne' browser:
//   npx tsx scripts/prova-passaggio.ts
import assert from 'node:assert/strict'

let n = 0
async function principale() {
const prova = async (nome: string, f: () => unknown | Promise<unknown>) => {
  await f()
  n++
  console.log('OK', nome)
}

// 1. Fuori dal totem: risponde subito `true`, niente cambia.
{
  const { passaDalTotem } = await import('../src/features/lab/totem/passaggio.ts')
  await prova('fuori dal totem il pagamento prosegue subito', async () => {
    assert.equal(await passaDalTotem({ cosa: 'pagamento', url: 'https://athlon.perfectgym.com/x' }), true)
  })
}

// 2. Sul totem (forzato da ?totem=1, come in totem.ts).
;(globalThis as any).window = { location: { search: '?totem=1', origin: 'https://app.athlonroma.it' }, innerWidth: 1064, innerHeight: 1725, addEventListener() {} }
;(globalThis as any).document = {}
const totem = await import('../src/lib/totem.ts')
totem.dimenticaLaModalita()
const { passaDalTotem, ascoltaPassaggio, passaggioCorrente, indirizzoSezione } = await import('../src/features/lab/totem/passaggio.ts')

await prova('sul totem senza una schermata che lo mostri non si paga', async () => {
  assert.equal(await passaDalTotem({ cosa: 'carta salvata', percorso: '/shop' }), false)
})

let avvisi = 0
const smetti = ascoltaPassaggio(() => avvisi++)

await prova('sul totem la richiesta aspetta, e con un operatore prosegue', async () => {
  const p = passaDalTotem({ cosa: 'pagamento', url: 'https://athlon.perfectgym.com/x' })
  const c = passaggioCorrente()
  assert.ok(c)
  assert.equal(c.richiesta.url, 'https://athlon.perfectgym.com/x')
  c.risolvi(true)
  assert.equal(await p, true)
  assert.equal(passaggioCorrente(), null)
  assert.ok(avvisi >= 2, 'la schermata e avvisata all apertura e alla chiusura')
})
await prova('annullata (QR, email, «Annulla»), il pagamento non parte', async () => {
  const p = passaDalTotem({ cosa: 'carta salvata', percorso: '/pagamenti' })
  passaggioCorrente()!.risolvi(false)
  assert.equal(await p, false)
})
await prova('una richiesta nuova chiude quella di prima, che non parte', async () => {
  const prima = passaDalTotem({ cosa: 'pagamento', url: 'https://athlon.perfectgym.com/a' })
  const seconda = passaDalTotem({ cosa: 'pagamento', url: 'https://athlon.perfectgym.com/b' })
  assert.equal(await prima, false)
  assert.equal(passaggioCorrente()!.richiesta.url, 'https://athlon.perfectgym.com/b')
  passaggioCorrente()!.risolvi(true)
  assert.equal(await seconda, true)
})
await prova('risolvere due volte non rompe niente', async () => {
  const p = passaDalTotem({ cosa: 'pagamento', percorso: '/personal' })
  const c = passaggioCorrente()!
  c.risolvi(true)
  c.risolvi(false)
  assert.equal(await p, true)
})
await prova('l indirizzo di una sezione e quello del totem, con la barra', () => {
  assert.equal(indirizzoSezione('/shop/carrello'), 'https://app.athlonroma.it/shop/carrello')
  assert.equal(indirizzoSezione('pagamenti'), 'https://app.athlonroma.it/pagamenti')
})
smetti()
console.log(`${n} gruppi OK`)
}
principale().catch((e) => {
  console.error(e)
  process.exit(1)
})
