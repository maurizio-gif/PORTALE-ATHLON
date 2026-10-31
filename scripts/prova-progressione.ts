// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `schede/progressione.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-progressione.ts`
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { applicaProgressione, durataValida, esercizioDellaSettimana, haPercentuali, incrementoCarico, PUNTI_MASSIMI, settimanaDi, SETTIMANE_MAX, SETTIMANE_MIN, vociDelCiclo } from '../src/features/lab/schede/progressione'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

const E = (id: string, over = {}) => ({ id, esercizio_id: id, nome: id, serie: 4, ripetizioni: '8', carico: null, percentuale: 70, recupero_serie: 90, recupero_dopo: 90, superserie: null, note: null, immagini: [], video: null, muscoli_primari: [], attrezzo: null, istruzioni: [], ...over })
const SCHEDA = (prog, over = {}) => ({ id: 's1', tipo: 'socio', titolo: 'Piano', descrizione: null, obiettivo: null, livello: 'intermedio', giorni_settimana: 3, rivista_il: null, ambiente: 'sala', progressione: prog, giorni: [{ id: 'g1', nome: 'A', note: null, esercizi: [E('panca'), E('squat', { serie: 3, percentuale: 80 }), E('plank', { serie: 3, ripetizioni: '30 s', percentuale: null, carico: 'corpo libero' }), E('curl', { serie: 1, percentuale: 40 })] }, { id: 'g2', nome: 'B', note: null, esercizi: [E('rematore', { serie: 2, percentuale: 60 })] }], ...over })

ok('i limiti della durata', () => {
  assert.deepEqual([SETTIMANE_MIN, SETTIMANE_MAX], [3, 8])
  for (const v of [3, 4, 5, 6, 7, 8]) assert.ok(durataValida(v), String(v))
  for (const v of [2, 9, 0, -3, 4.5, '4', null, undefined, NaN]) assert.ok(!durataValida(v), String(v))
})

ok('i punti di carico: da 0 a +5 nell\'ultima settimana di carico, e niente in scarico', () => {
  assert.deepEqual([1, 2, 3, 4].map((x) => incrementoCarico(x, 4)), [0, 3, 5, 0]) // 4 settimane: +0, +3, +5, scarico
  assert.deepEqual([1, 2, 3].map((x) => incrementoCarico(x, 3)), [0, 5, 0])
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((x) => incrementoCarico(x, 6)), [0, 1, 3, 4, 5, 0])
  for (let di = 3; di <= 8; di++) {
    const punti = Array.from({ length: di }, (_, i) => incrementoCarico(i + 1, di))
    assert.equal(punti[0], 0, `${di}: la prima parte dai carichi del piano`)
    assert.equal(punti[di - 1], 0, `${di}: lo scarico non somma`)
    assert.equal(punti[di - 2], PUNTI_MASSIMI, `${di}: l'ultima di carico e' a +${PUNTI_MASSIMI}`)
    for (let i = 1; i < di - 1; i++) assert.ok(punti[i] >= punti[i - 1], `${di}: il carico non scende`)
  }
})

ok('la settimana del ciclo: parte dall\'inizio, ricomincia da sola e non va prima', () => {
  const p = { settimane: 4, inizio: '2026-10-31' }
  const s = (oggi: string) => settimanaDi(p, oggi)
  assert.deepEqual([s('2026-10-31').numero, s('2026-10-31').ciclo, s('2026-10-31').dal, s('2026-10-31').al], [1, 1, '2026-10-31', '2026-11-06'])
  assert.equal(s('2026-11-06').numero, 1) // ultimo giorno della prima
  assert.equal(s('2026-11-07').numero, 2)
  assert.equal(s('2026-11-14').numero, 3)
  const scarico = s('2026-11-21')
  assert.deepEqual([scarico.numero, scarico.scarico, scarico.punti], [4, true, 0])
  assert.deepEqual([s('2026-11-27').numero, s('2026-11-27').scarico], [4, true]) // ultimo giorno dello scarico
  const nuovo = s('2026-11-28')
  assert.deepEqual([nuovo.numero, nuovo.ciclo, nuovo.scarico, nuovo.dal], [1, 2, false, '2026-11-28']) // il ciclo ricomincia
  assert.equal(s('2027-01-01').ciclo, 3)
  assert.equal(s('2026-10-20').numero, 1) // prima dell'inizio: la prima settimana
  // Un ciclo di 3 settimane e uno di 8.
  assert.equal(settimanaDi({ settimane: 3, inizio: '2026-10-31' }, '2026-11-14').scarico, true)
  assert.equal(settimanaDi({ settimane: 8, inizio: '2026-10-31' }, '2026-12-19').scarico, true) // 7 settimane dopo
  // Il cambio d'ora non sposta i giorni (si ragiona su date, non su ore).
  assert.equal(settimanaDi({ settimane: 4, inizio: '2026-10-24' }, '2026-10-31').numero, 2)
})

ok('un esercizio in carico: la percentuale sale, il resto no, e l\'originale non si tocca', () => {
  const e = E('panca', { percentuale: 70, serie: 4 })
  const x = esercizioDellaSettimana(e, { scarico: false, punti: 3 })
  assert.equal(x.percentuale, 73)
  assert.equal(x.serie, 4)
  assert.equal(e.percentuale, 70)
  assert.equal(esercizioDellaSettimana(e, { scarico: false, punti: 0 }), e) // niente da cambiare: lo stesso oggetto
  assert.equal(esercizioDellaSettimana(E('x', { percentuale: 98 }), { scarico: false, punti: 5 }).percentuale, 100) // mai oltre il cento
  const senza = E('plank', { percentuale: null, carico: 'corpo libero', ripetizioni: '30 s', serie: 3 })
  assert.deepEqual(esercizioDellaSettimana(senza, { scarico: false, punti: 5 }), senza) // senza percentuale non si inventa niente
})

ok('lo scarico: serie al 60% (almeno una), carichi al 90% (almeno il 20%)', () => {
  const f = (serie: number, percentuale: number | null) => { const x = esercizioDellaSettimana(E('x', { serie, percentuale }), { scarico: true, punti: 0 }); return [x.serie, x.percentuale] }
  assert.deepEqual(f(5, 70), [3, 63])
  assert.deepEqual(f(4, 80), [2, 72])
  assert.deepEqual(f(3, 60), [2, 54])
  assert.deepEqual(f(2, 50), [1, 45])
  assert.deepEqual(f(1, 40), [1, 36]) // almeno una serie
  assert.deepEqual(f(6, 70), [4, 63]) // 60% di 6 = 3,6 -> 4 (col 50% sarebbero 3)
  assert.deepEqual(f(8, 70), [5, 63]) // 4,8 -> 5 (col 50% sarebbero 4)
  assert.deepEqual(f(3, 20), [2, 20]) // mai sotto il 20%
  assert.deepEqual(f(3, null), [2, null]) // senza percentuale: solo le serie
  for (let serie = 1; serie <= 12; serie++) {
    const x = esercizioDellaSettimana(E('x', { serie }), { scarico: true, punti: 0 })
    assert.ok(x.serie >= 1 && x.serie <= serie, `${serie} -> ${x.serie}`)
  }
})

ok('il piano della settimana: copia, giorno per giorno; il piano di base resta com\'e\'', () => {
  const base = SCHEDA({ settimane: 4, inizio: '2026-10-31' })
  const copiaBase = JSON.stringify(base)
  // Settimana 1: i carichi del piano, lo stesso oggetto.
  const s1 = applicaProgressione(base, '2026-10-31')
  assert.equal(s1.scheda, base)
  assert.deepEqual([s1.settimana.numero, s1.settimana.scarico], [1, false])
  // Settimana 2: +3 punti dove c'e' una percentuale.
  const s2 = applicaProgressione(base, '2026-11-07')
  assert.deepEqual(s2.scheda.giorni[0].esercizi.map((e) => e.percentuale), [73, 83, null, 43])
  assert.deepEqual(s2.scheda.giorni[1].esercizi.map((e) => e.percentuale), [63])
  assert.deepEqual(s2.scheda.giorni[0].esercizi.map((e) => e.serie), [4, 3, 3, 1])
  // Settimana 3: +5.
  assert.deepEqual(applicaProgressione(base, '2026-11-14').scheda.giorni[0].esercizi.map((e) => e.percentuale), [75, 85, null, 45])
  // Settimana 4: scarico.
  const s4 = applicaProgressione(base, '2026-11-21')
  assert.equal(s4.settimana.scarico, true)
  assert.deepEqual(s4.scheda.giorni[0].esercizi.map((e) => [e.serie, e.percentuale]), [[2, 63], [2, 72], [2, null], [1, 36]])
  assert.deepEqual(s4.scheda.giorni[1].esercizi.map((e) => [e.serie, e.percentuale]), [[1, 54]])
  // Le serie di un gruppo di superserie scendono insieme (stessa regola, stesso numero di partenza).
  const gruppo = applicaProgressione(SCHEDA({ settimane: 4, inizio: '2026-10-31' }, { giorni: [{ id: 'g', nome: 'A', note: null, esercizi: [E('a', { serie: 4, superserie: 'A' }), E('b', { serie: 4, superserie: 'A' })] }] }), '2026-11-21')
  assert.equal(new Set(gruppo.scheda.giorni[0].esercizi.map((e) => e.serie)).size, 1)
  // Il piano di base non e' mai stato toccato, ne' dal carico ne' dallo scarico.
  assert.equal(JSON.stringify(base), copiaBase)
})

ok('senza progressione, o dove non vale, il piano e\' quello com\'e\'', () => {
  const senza = SCHEDA(null)
  assert.deepEqual(applicaProgressione(senza, '2026-11-21'), { scheda: senza, settimana: null })
  assert.deepEqual(applicaProgressione(SCHEDA(undefined), '2026-11-21').settimana, null)
  const vasca = SCHEDA({ settimane: 4, inizio: '2026-10-31' }, { ambiente: 'vasca' })
  assert.deepEqual(applicaProgressione(vasca, '2026-11-21'), { scheda: vasca, settimana: null }) // un piano di nuoto non ha carichi
  // Una progressione che arriva sporca non fa danni.
  for (const brutta of [{ settimane: 2, inizio: '2026-10-31' }, { settimane: 9, inizio: '2026-10-31' }, { settimane: 4, inizio: 'ieri' }, { settimane: 4.5, inizio: '2026-10-31' }]) {
    assert.equal(applicaProgressione(SCHEDA(brutta), '2026-11-21').settimana, null, JSON.stringify(brutta))
  }
})

ok('le voci del ciclo e le percentuali', () => {
  assert.deepEqual(vociDelCiclo(4).map((v) => [v.tipo, v.punti]), [['base', 0], ['carico', 3], ['carico', 5], ['scarico', 0]])
  assert.deepEqual(vociDelCiclo(3).map((v) => v.tipo), ['base', 'carico', 'scarico'])
  assert.equal(vociDelCiclo(8).filter((v) => v.tipo === 'scarico').length, 1)
  assert.ok(haPercentuali(SCHEDA(null)))
  assert.ok(!haPercentuali(SCHEDA(null, { giorni: [{ id: 'g', nome: 'A', note: null, esercizi: [E('plank', { percentuale: null })] }] })))
})

ok('i limiti sono uguali a quelli del server (se i due repository stanno affiancati)', () => {
  const srv = '../APP-ATHLON/supabase/functions/_shared/schede/progressione.ts'
  if (!existsSync(srv)) return
  const testo = readFileSync(srv, 'utf8')
  assert.ok(new RegExp(`SETTIMANE_MIN = ${SETTIMANE_MIN}\\b`).test(testo))
  assert.ok(new RegExp(`SETTIMANE_MAX = ${SETTIMANE_MAX}\\b`).test(testo))
  console.log('   (limiti confrontati con quelli del server)')
})

console.log(`${n} gruppi passati`)
