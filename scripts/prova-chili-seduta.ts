// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova dei chili proposti in seduta (08/11/2026, `schede/comune.ts`, puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-chili-seduta.ts`
import assert from 'node:assert/strict'

import { chiliProposti, dettaglioCarico, indicazione, pianoPiuLeggero, SOGLIA_PIANO_PIU_LEGGERO } from '../src/features/lab/schede/comune'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

// Lo stacco con bilanciere di una tester vera: massimale 68,8 kg (taratura alla prima seduta), Giorno A al 60%, passo di 2,5 kg.
const STACCO = { id: 'riga', esercizio_id: 'stacco', nome: 'Stacco con bilanciere', serie: 4, ripetizioni: '5', carico: null, percentuale: 60, incremento_kg: 2.5, peso_minimo_kg: 20, test: null }
const MASSIMALI = [{ esercizio_id: 'stacco', tipo: 'carico', massimale: 68.8, kg: 60, ripetizioni: 5, fonte: 'seduta', creato_il: '2026-10-27T13:34:23Z' }]
const ind = indicazione(STACCO, MASSIMALI)
const SENZA_PERCENTUALE = indicazione({ ...STACCO, percentuale: null, carico: 'a sensazione' }, MASSIMALI)

ok('il piano dice 40 kg: 60% di 68,8 e 41,3, per difetto al passo di 2,5', () => {
  assert.equal(ind.kg, 40)
})

ok('chiliProposti: la serie di prima, poi il piano, poi l\'ultima volta', () => {
  const ultima = [{ numero: 1, kg: 70 }, { numero: 2, kg: 75 }, { numero: 3, kg: 80 }]
  assert.equal(chiliProposti(ind, 60, ultima, 2), 60, 'la serie di prima, fatta oggi, vince su tutto')
  assert.equal(chiliProposti(ind, null, ultima, 1), 40, 'senza serie di prima: il piano')
  assert.equal(chiliProposti(ind, undefined, ultima, 1), 40)
  assert.equal(chiliProposti(SENZA_PERCENTUALE, null, ultima, 2), 75, 'senza piano: la stessa serie dell\'ultima volta')
  assert.equal(chiliProposti(SENZA_PERCENTUALE, null, ultima, 4), 80, 'una serie in piu\': l\'ultima di allora')
  assert.equal(chiliProposti(SENZA_PERCENTUALE, null, undefined, 1), null)
  assert.equal(chiliProposti(SENZA_PERCENTUALE, null, [], 1), null)
  assert.equal(chiliProposti(SENZA_PERCENTUALE, 0, ultima, 1), 0, 'zero chili scritti sono un dato, non un vuoto')
})

ok('il timer dopo una serie a 60 kg dice 60 e non 40: era il difetto segnalato', () => {
  assert.equal(dettaglioCarico(ind, 60, null), 'Carico: 60 kg · piano: 40 kg')
  // Lo stesso numero che si riempie nel campo della serie dopo.
  assert.equal(chiliProposti(ind, 60, undefined, 2), 60)
})

ok('il timer: piano uguale a quanto fatto, serie scritta a meno del piano, senza piano', () => {
  assert.equal(dettaglioCarico(ind, 40, null), 'Carico: 40 kg · 60%', 'se ha fatto quello che chiede il piano resta la riga col 60%')
  assert.equal(dettaglioCarico(ind, 35, null), 'Carico: 35 kg · piano: 40 kg')
  assert.equal(dettaglioCarico(SENZA_PERCENTUALE, 52.5, null), 'Carico: 52,5 kg')
})

ok('il timer: senza serie fatte oggi resta com\'era (piano, poi ultima volta, poi carico a parole)', () => {
  assert.equal(dettaglioCarico(ind, null, '5 × 60 kg'), 'Carico: 40 kg · 60%')
  assert.equal(dettaglioCarico(SENZA_PERCENTUALE, null, '5 × 60 kg'), 'L’ultima volta: 5 × 60 kg')
  assert.equal(dettaglioCarico(SENZA_PERCENTUALE, null, null), 'Carico: a sensazione')
  assert.equal(dettaglioCarico({ kg: null, carico: null }, null, null), null)
})

ok('pianoPiuLeggero: la serie piu\' pesante dell\'ultima volta supera il piano di oltre il 10%', () => {
  assert.equal(SOGLIA_PIANO_PIU_LEGGERO, 1.1)
  assert.equal(pianoPiuLeggero(40, [{ kg: 70 }, { kg: 75 }, { kg: 80 }]), true)
  assert.equal(pianoPiuLeggero(40, [{ kg: 44 }]), false, 'esattamente +10%: ancora il piano')
  assert.equal(pianoPiuLeggero(40, [{ kg: 44.5 }]), true)
  assert.equal(pianoPiuLeggero(40, [{ kg: 30 }, { kg: 40 }]), false)
  assert.equal(pianoPiuLeggero(40, [{ kg: 30 }, { kg: 80 }]), true, 'conta la serie piu\' pesante, non la prima o la piu\' leggera')
  assert.equal(pianoPiuLeggero(40, [{ kg: null }]), false, 'serie senza chili (tenute a tempo)')
})

ok('pianoPiuLeggero: niente nota senza piano in chili o senza ultima volta', () => {
  assert.equal(pianoPiuLeggero(null, [{ kg: 80 }]), false)
  assert.equal(pianoPiuLeggero(0, [{ kg: 80 }]), false)
  assert.equal(pianoPiuLeggero(40, undefined), false)
  assert.equal(pianoPiuLeggero(40, []), false)
})

console.log(`${n} gruppi passati`)
