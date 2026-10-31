// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `fit/riepilogoSettimana.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-riepilogo-settimana.ts`
import assert from 'node:assert/strict'

import type { Sessione } from '../src/features/lab/fit/calcoloPunteggio'
import { fraseSettimana, riepilogoSettimana, settimanaDi, settimanaPartenza, settimanaPrima, testoCondivisioneSettimana, titoloSettimana } from '../src/features/lab/fit/riepilogoSettimana'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

const s = (giorno: string, minuti: number, fonte: Sessione['fonte'] = 'scheda', nome = 'Seduta'): Sessione => ({
  giorno, minuti, fonte, nome, categoria: null, inizio: `${giorno}T17:00:00Z`, serie: 0, volume: 0, esercizi: 0,
})

// 26 ott 2026 e' un lunedi'.
const sessioni: Sessione[] = [
  s('2026-10-19', 60), s('2026-10-21', 45), // settimana prima: 2 giorni
  s('2026-10-25', 60), // domenica 25: ancora la settimana prima (19-25)
  s('2026-10-26', 60), s('2026-10-27', 30), s('2026-10-27', 45, 'lezione', 'Pilates'), // lun e mar
  s('2026-10-28', 15), // sotto i 20 minuti: non e' un giorno attivo, ma e' una sessione
  s('2026-10-29', 50, 'lezione', 'Pilates'), s('2026-10-30', 50, 'lezione', 'Yoga'),
]

ok('settimana: lunedi\' e settimana prima, anche a cavallo del mese e dell\'anno', () => {
  assert.equal(settimanaDi('2026-10-26'), '2026-10-26')
  assert.equal(settimanaDi('2026-11-01'), '2026-10-26') // domenica
  assert.equal(settimanaDi('2026-10-30'), '2026-10-26')
  assert.equal(settimanaDi('2027-01-01'), '2026-12-28')
  assert.equal(settimanaPrima('2026-10-26'), '2026-10-19')
  assert.equal(settimanaPrima('2026-01-05'), '2025-12-29')
})

ok('titolo: dentro il mese e a cavallo', () => {
  assert.equal(titoloSettimana('2026-10-19'), '19–25 ott')
  assert.equal(titoloSettimana('2026-10-26'), '26 ott – 1 nov')
  assert.equal(titoloSettimana('2026-12-28'), '28 dic – 3 gen')
})

ok('totali della settimana', () => {
  const r = riepilogoSettimana(sessioni, '2026-10-26', '2026-10-30')
  assert.equal(r.sessioni, 6)
  assert.equal(r.lezioni, 3)
  assert.equal(r.altre, 3)
  assert.equal(r.giorniAttivi, 4) // 26, 27, 29, 30 (il 28 e' sotto i 20')
  assert.equal(r.minuti, 60 + 30 + 45 + 15 + 50 + 50)
  assert.equal(r.incorso, true)
  assert.equal(r.serieMax, 2) // 26-27 e 29-30
  assert.equal(r.haDati, true)
  assert.equal(r.inizio, '2026-10-26')
  assert.equal(r.fine, '2026-11-01')
})

ok('i giorni fuori dalla settimana non contano (il lunedi\' prima e il lunedi\' dopo)', () => {
  const r = riepilogoSettimana([s('2026-10-25', 60), s('2026-10-26', 60), s('2026-11-01', 60), s('2026-11-02', 60)], '2026-10-26', '2026-10-30')
  assert.equal(r.sessioni, 2) // 26 ottobre e 1 novembre
  assert.equal(r.giorniAttivi, 2)
})

ok('le sette celle: lunedi\' per primo, futuro, oggi', () => {
  const r = riepilogoSettimana(sessioni, '2026-10-26', '2026-10-28')
  assert.equal(r.celle.length, 7)
  assert.deepEqual(r.celle.map((c) => c.numero), [26, 27, 28, 29, 30, 31, 1])
  assert.equal(r.celle[0].attivo, true)
  assert.equal(r.celle[2].attivo, false) // 28: 15 minuti
  assert.equal(r.celle[2].oggi, true)
  assert.equal(r.celle[2].futuro, false)
  assert.equal(r.celle[3].futuro, true)
  assert.equal(r.celle.filter((c) => c.oggi).length, 1)
})

ok('lezioni fatte: le piu\' frequenti per prime, a parita\' alfabetico, al massimo tre', () => {
  const r = riepilogoSettimana(sessioni, '2026-10-26', '2026-10-30')
  assert.deepEqual(r.lezioniFatte, [{ nome: 'Pilates', volte: 2 }, { nome: 'Yoga', volte: 1 }])
  const molte = riepilogoSettimana(['Yoga', 'Boxe', 'Zumba', 'Aqua'].map((nome, i) => s(`2026-10-2${6 + i}`, 60, 'lezione', nome)), '2026-10-26', '2026-10-30')
  assert.deepEqual(molte.lezioniFatte.map((l) => l.nome), ['Aqua', 'Boxe', 'Yoga'])
  assert.equal(riepilogoSettimana([s('2026-10-26', 60)], '2026-10-26', '2026-10-30').lezioniFatte.length, 0)
})

ok('la settimana prima e\' solo un numero, e non c\'e\' se era vuota', () => {
  const r = riepilogoSettimana(sessioni, '2026-10-26', '2026-10-30')
  assert.deepEqual(r.precedente, { giorniAttivi: 3, sessioni: 3, minuti: 165 })
  assert.equal(riepilogoSettimana(sessioni, '2026-10-19', '2026-10-30').precedente, null)
})

ok('una settimana finita non e\' in corso; una vuota non ha dati', () => {
  const r = riepilogoSettimana(sessioni, '2026-10-19', '2026-10-30')
  assert.equal(r.incorso, false)
  assert.equal(r.celle.every((c) => !c.futuro && !c.oggi), true)
  const v = riepilogoSettimana([], '2026-10-26', '2026-10-30')
  assert.equal(v.haDati, false)
  assert.equal(v.giorniAttivi, 0)
  assert.equal(v.serieMax, 0)
  assert.equal(v.lezioniFatte.length, 0)
})

ok('settimana di partenza: la corrente se ha dati, sennò la scorsa (lunedi\', martedi\'), sennò la corrente', () => {
  assert.equal(settimanaPartenza(sessioni, '2026-10-30'), '2026-10-26')
  assert.equal(settimanaPartenza(sessioni, '2026-11-02'), '2026-10-26') // lunedi' vuoto: si mostra la scorsa
  assert.equal(settimanaPartenza(sessioni, '2026-11-09'), '2026-11-09') // due settimane vuote
  assert.equal(settimanaPartenza([], '2026-10-30'), '2026-10-26')
})

ok('frase: cifre sole, nessun consiglio, nessun confronto, niente calorie ne\' dati di persona', () => {
  const x = fraseSettimana(riepilogoSettimana(sessioni, '2026-10-26', '2026-10-30'))
  assert.match(x, /Questa settimana, finora: 4 giorni attivi su 7, 6 allenamenti, /)
  assert.match(x, /La lezione più fatta: Pilates \(2 volte\)\./)
  assert.match(x, /Il tratto più lungo: 2 giorni di fila\./)
  assert.doesNotMatch(x, /dovresti|devi|prova a|meglio|peggio|kcal|calori|peso|@/i)
  const finita = fraseSettimana(riepilogoSettimana(sessioni, '2026-10-19', '2026-11-05'))
  assert.match(finita, /^Nella settimana del 19–25 ott: 3 giorni attivi su 7, 3 allenamenti, 2 h 45\./)
  const una = fraseSettimana(riepilogoSettimana([s('2026-10-26', 60, 'lezione', 'Yoga')], '2026-10-26', '2026-11-05'))
  assert.match(una, /1 giorno attivo su 7, 1 allenamento, 1 h\./)
  assert.match(una, /Lezioni fatte: Yoga\./)
  assert.doesNotMatch(una, /Il tratto più lungo/)
})

ok('testo di condivisione: tre cifre e il club, niente dati di persona', () => {
  const x = testoCondivisioneSettimana(riepilogoSettimana(sessioni, '2026-10-26', '2026-10-30'))
  assert.match(x, /La mia settimana da Athlon Roma: 4 giorni attivi, 6 allenamenti, 4 h 10\. athlonroma\.it/)
  assert.doesNotMatch(x, /kcal|calori|@|peso/i)
  assert.match(testoCondivisioneSettimana(riepilogoSettimana([s('2026-10-26', 60)], '2026-10-26', '2026-10-30')), /1 giorno attivo, 1 allenamento,/)
})

console.log(`\n${n} gruppi passati`)
