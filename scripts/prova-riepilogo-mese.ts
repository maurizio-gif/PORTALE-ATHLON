// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `fit/riepilogoMese.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-riepilogo-mese.ts`
import assert from 'node:assert/strict'

import type { Sessione } from '../src/features/lab/fit/calcoloPunteggio'
import { giorniDelMese, mesePartenza, mesePrima, meseDi, riepilogoMese, serieLunga, testoCondivisione } from '../src/features/lab/fit/riepilogoMese'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

const s = (giorno: string, minuti: number, fonte: Sessione['fonte'] = 'scheda', nome = 'Seduta'): Sessione => ({
  giorno, minuti, fonte, nome, categoria: null, inizio: `${giorno}T17:00:00Z`, serie: 0, volume: 0, esercizi: 0,
})

ok('mesi: prima, giorni, bisestile', () => {
  assert.equal(mesePrima('2026-10'), '2026-09')
  assert.equal(mesePrima('2026-01'), '2025-12')
  assert.equal(giorniDelMese('2026-10'), 31)
  assert.equal(giorniDelMese('2028-02'), 29)
  assert.equal(giorniDelMese('2026-02'), 28)
  assert.equal(meseDi('2026-10-30'), '2026-10')
})

ok('serie: giorni di fila, buchi, doppioni assenti, mese che cambia', () => {
  assert.equal(serieLunga([]), 0)
  assert.equal(serieLunga(['2026-10-03']), 1)
  assert.equal(serieLunga(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06']), 3)
  assert.equal(serieLunga(['2026-10-30', '2026-10-31', '2026-11-01']), 3)
})

const sessioni: Sessione[] = [
  s('2026-09-28', 60), s('2026-09-29', 60), // mese scorso: 2 giorni
  s('2026-10-01', 60), s('2026-10-02', 30), s('2026-10-02', 45, 'lezione', 'Pilates'), // 1 e 2 ottobre
  s('2026-10-05', 15), // sotto i 20 minuti: non e' un giorno attivo, ma e' una sessione
  s('2026-10-06', 50, 'lezione', 'Pilates'), s('2026-10-07', 50, 'lezione', 'Yoga'),
  s('2026-10-20', 40, 'dispositivo', 'Corsa'),
]

ok('totali del mese', () => {
  const r = riepilogoMese(sessioni, '2026-10', '2026-10-30')
  assert.equal(r.sessioni, 7)
  assert.equal(r.lezioni, 3)
  assert.equal(r.altre, 4)
  assert.equal(r.giorniAttivi, 5) // 1, 2, 6, 7, 20 (il 5 e' sotto i 20')
  assert.equal(r.minuti, 60 + 30 + 45 + 15 + 50 + 50 + 40)
  assert.equal(r.incorso, true)
  assert.equal(r.giorniNelMese, 31)
  assert.equal(r.serieMax, 2) // 1-2 e 6-7
  assert.equal(r.haDati, true)
})

ok('lezione preferita: serve almeno due volte, a parita\' l\'ordine alfabetico', () => {
  const r = riepilogoMese(sessioni, '2026-10', '2026-10-30')
  assert.deepEqual(r.preferita, { nome: 'Pilates', volte: 2 })
  const una = riepilogoMese([s('2026-10-01', 60, 'lezione', 'Yoga'), s('2026-10-02', 60, 'lezione', 'Boxe')], '2026-10', '2026-10-30')
  assert.equal(una.preferita, null)
  const pari = riepilogoMese([s('2026-10-01', 60, 'lezione', 'Yoga'), s('2026-10-02', 60, 'lezione', 'Yoga'), s('2026-10-03', 60, 'lezione', 'Boxe'), s('2026-10-04', 60, 'lezione', 'Boxe')], '2026-10', '2026-10-30')
  assert.equal(pari.preferita?.nome, 'Boxe')
})

ok('il mese scorso e\' solo un numero, e non c\'e\' se era vuoto', () => {
  const r = riepilogoMese(sessioni, '2026-10', '2026-10-30')
  assert.deepEqual(r.precedente, { giorniAttivi: 2, sessioni: 2, minuti: 120 })
  assert.equal(riepilogoMese(sessioni, '2026-09', '2026-10-30').precedente, null)
})

ok('settimana migliore: lunedi\'-domenica', () => {
  // 1 ott 2026 e' un giovedi': 1 e 2 stanno nella settimana del 28 set; 6 e 7 in quella del 5 ott.
  const r = riepilogoMese(sessioni, '2026-10', '2026-10-30')
  assert.equal(r.settimanaMigliore, 2)
})

ok('calendario: celle, partenza dal lunedi\', futuro', () => {
  const r = riepilogoMese(sessioni, '2026-10', '2026-10-10')
  assert.equal(r.celle.length, 31)
  assert.equal(r.inizio, 3) // 1 ottobre 2026 = giovedi'
  assert.equal(r.celle[0].attivo, true)
  assert.equal(r.celle[4].attivo, false) // il 5: 15 minuti
  assert.equal(r.celle[9].futuro, false) // il 10 e' oggi
  assert.equal(r.celle[10].futuro, true)
  assert.equal(r.celle[19].attivo, true) // il 20 (futuro rispetto a «oggi» ma con dati: non succede davvero)
  assert.equal(r.incorso, true)
})

ok('un mese finito non e\' in corso; un mese vuoto non ha dati', () => {
  const r = riepilogoMese(sessioni, '2026-09', '2026-10-30')
  assert.equal(r.incorso, false)
  assert.equal(r.celle.every((c) => !c.futuro), true)
  const v = riepilogoMese([], '2026-10', '2026-10-30')
  assert.equal(v.haDati, false)
  assert.equal(v.giorniAttivi, 0)
  assert.equal(v.preferita, null)
  assert.equal(v.serieMax, 0)
  assert.equal(v.settimanaMigliore, 0)
})

ok('mese di partenza: il corrente se ha dati, sennò lo scorso (primi giorni), sennò il corrente', () => {
  assert.equal(mesePartenza(sessioni, '2026-10-30'), '2026-10')
  assert.equal(mesePartenza(sessioni, '2026-11-01'), '2026-10')
  assert.equal(mesePartenza(sessioni, '2026-12-01'), '2026-12')
  assert.equal(mesePartenza([], '2026-10-30'), '2026-10')
})

ok('testo di condivisione: cifre sole, niente dati di persona, niente calorie', () => {
  const x = testoCondivisione(riepilogoMese(sessioni, '2026-10', '2026-10-30'))
  assert.match(x, /Athlon Roma/)
  assert.match(x, /5 giorni attivi/)
  assert.match(x, /7 allenamenti/)
  assert.doesNotMatch(x, /kcal|calori|@|peso/i)
  const uno = testoCondivisione(riepilogoMese([s('2026-10-01', 60)], '2026-10', '2026-10-30'))
  assert.match(uno, /1 giorno attivo, 1 allenamento,/)
})

console.log(`\n${n} gruppi passati`)
