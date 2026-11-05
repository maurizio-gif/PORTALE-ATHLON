// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova quali pagamenti la sezione Pagamenti della Home mette fra quelli «in corso» (src/features/lab/pagamenti/inCorso.ts):
// i SEPA che la banca non ha ancora confermato, e solo quelli che possono davvero essere in corso. Niente rete e niente React.
// Le righe sono quelle che `portale-lab-pagamenti` restituisce per il nucleo del genitore, nella forma di `Movimento`
// (i quattro SEPA del Trofeo Athlon del 05/11/2026, con il giorno dell'addebito in `scadenza`).
//
//   npx tsx scripts/prova-in-corso.ts
import assert from 'node:assert/strict'

import { impostaLingua } from '../src/lib/lingua'
import { eInCorso, giornoLungo, GIORNI_IN_CORSO, pagamentiInCorso, senzaInCorso, statoInCorso } from '../src/features/lab/pagamenti/inCorso.ts'

const ADESSO = Date.parse('2026-11-06T09:00:00+01:00')
const GIORNO = 24 * 60 * 60 * 1000

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log('OK', nome)
}

const riga = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  data: '2026-11-05T19:03:19.386956+01:00',
  importo: 8,
  esito: 'in_corso',
  metodo: 'Direct debit (SEPA)',
  titolo: 'Trofeo Athlon 2026/27 · 1ª gara',
  voci: [],
  per: 'Tommaso',
  scadenza: '2026-11-09',
  nota: null,
  ...extra,
})

const sepa = riga('nativo-232')
const carta = riga('nativo-231', { esito: 'riuscito', scadenza: null, metodo: 'Card' })
const rimborso = riga('nativo-233', { esito: 'rimborso', scadenza: null })

prova('un SEPA con il giorno dell’addebito è in corso', () => {
  assert.equal(eInCorso(sepa, ADESSO), true)
})

prova('un pagamento riuscito o un rimborso non è in corso', () => {
  assert.equal(eInCorso(carta, ADESSO), false)
  assert.equal(eInCorso(rimborso, ADESSO), false)
})

prova('un SEPA con il giorno dell’addebito resta in corso anche se è passato un mese: la banca non l’ha chiuso', () => {
  assert.equal(eInCorso(riga('x', { data: new Date(ADESSO - 90 * GIORNO).toISOString() }), ADESSO), true)
})

prova('senza giorno dell’addebito (un SEPA di PerfectGym) è in corso se è recente', () => {
  const recente = riga('pg-1', { scadenza: null, data: new Date(ADESSO - 3 * GIORNO).toISOString() })
  assert.equal(eInCorso(recente, ADESSO), true)
})

prova(`senza giorno dell’addebito oltre ${GIORNI_IN_CORSO} giorni non è più in corso: è un dato rimasto indietro`, () => {
  const vecchio = riga('pg-2', { scadenza: null, data: new Date(ADESSO - (GIORNI_IN_CORSO + 1) * GIORNO).toISOString() })
  const limite = riga('pg-3', { scadenza: null, data: new Date(ADESSO - GIORNI_IN_CORSO * GIORNO).toISOString() })
  assert.equal(eInCorso(vecchio, ADESSO), false)
  assert.equal(eInCorso(limite, ADESSO), true, 'il trentesimo giorno è ancora dentro')
})

prova('senza data e senza giorno non è in corso (niente da dire)', () => {
  assert.equal(eInCorso(riga('pg-4', { scadenza: null, data: null }), ADESSO), false)
  assert.equal(eInCorso(riga('pg-5', { scadenza: null, data: 'boh' }), ADESSO), false)
})

prova('i quattro SEPA del 05/11 si ordinano dal giorno di addebito più vicino, a pari giorno dal più recente', () => {
  const elenco = [
    riga('a', { scadenza: '2026-11-10' }),
    riga('b', { scadenza: '2026-11-09', data: '2026-11-05T19:03:00+01:00' }),
    riga('c', { scadenza: '2026-11-09', data: '2026-11-05T21:44:00+01:00' }),
    riga('d', { scadenza: null, data: new Date(ADESSO - GIORNO).toISOString() }),
    carta,
  ]
  const ids = pagamentiInCorso(elenco, ADESSO).map((m) => m.id)
  assert.deepEqual(ids.slice(0, 3).sort(), ['a', 'b', 'c'])
  assert.equal(ids.at(-1), 'd', 'quello senza giorno viene dopo quelli con il giorno')
  assert.equal(ids.indexOf('b') < ids.indexOf('a'), true, 'il 9 prima del 10')
  assert.equal(ids.length, 4)
})

prova('gli «effettuati» sono lo storico senza quelli in corso, e insieme fanno lo storico intero', () => {
  const vecchio = riga('pg-6', { scadenza: null, data: new Date(ADESSO - 60 * GIORNO).toISOString() })
  const storico = [sepa, carta, rimborso, vecchio]
  const dentro = pagamentiInCorso(storico, ADESSO).map((m) => m.id)
  const fuori = senzaInCorso(storico, ADESSO).map((m) => m.id)
  assert.deepEqual(dentro, ['nativo-232'])
  assert.deepEqual(fuori, ['nativo-231', 'nativo-233', 'pg-6'], 'quello vecchio resta fra gli effettuati, come prima')
  assert.deepEqual([...dentro, ...fuori].sort(), storico.map((m) => m.id).sort())
})

prova('uno storico vuoto non dà niente', () => {
  assert.deepEqual(pagamentiInCorso([], ADESSO), [])
  assert.deepEqual(senzaInCorso([], ADESSO), [])
})

prova('l’elenco in ingresso non si modifica', () => {
  const storico = [riga('a', { scadenza: '2026-11-10' }), riga('b', { scadenza: '2026-11-09' })]
  const copia = storico.map((m) => m.id)
  pagamentiInCorso(storico, ADESSO)
  assert.deepEqual(storico.map((m) => m.id), copia)
})

prova('lo stato di un SEPA in corso dice il giorno dell’addebito per esteso, in italiano e in inglese', () => {
  impostaLingua('it')
  assert.equal(giornoLungo('2026-11-09'), 'lunedì 9 novembre')
  assert.equal(giornoLungo('2026-11-09', true), 'lunedì 9 novembre 2026')
  assert.equal(statoInCorso(sepa), 'Addebito previsto per lunedì 9 novembre')
  impostaLingua('en')
  assert.match(statoInCorso(sepa), /^Debit expected on Monday,? (9 November|November 9)/)
  impostaLingua('it')
})

prova('senza il giorno dell’addebito lo stato dice solo «In corso», e non inventa una data', () => {
  const senza = riga('pg-7', { scadenza: null })
  assert.equal(statoInCorso(senza), 'In corso')
  assert.ok(!/previsto/i.test(statoInCorso(senza)))
})

console.log(`\n${n} gruppi di prove passati`)
