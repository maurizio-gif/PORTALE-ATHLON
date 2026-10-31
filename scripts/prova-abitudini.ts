// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `fit/abitudini.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-abitudini.ts`
import assert from 'node:assert/strict'

import type { AllenamentoDispositivo, GiornoDispositivo } from '../src/api/dispositivi'
import { calcolaAbitudini, haDatiDaSalute, statoCollegamento, statoDelGiorno, SOGLIA_PASSI } from '../src/features/lab/fit/abitudini'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}

// Oggi e' giovedi' 29 ottobre 2026 (a Roma): la settimana va da lunedi' 26 a domenica 1 novembre.
const OGGI = '2026-10-29'
const g = (data: string, extra: Partial<GiornoDispositivo> = {}, fornitore: GiornoDispositivo['fornitore'] = 'apple_salute'): GiornoDispositivo => ({
  fornitore, data, sonno_punteggio: null, sonno_minuti: null, sonno_profondo_minuti: null, sonno_rem_minuti: null, recupero_valore: null, recupero_scala: null, fc_notte: null, hrv_ms: null, passi: null, calorie_attive: null, ...extra,
})
const a = (inizio: string, minuti: number, fornitore: AllenamentoDispositivo['fornitore'] = 'apple_salute'): AllenamentoDispositivo => ({
  id: `${inizio}`, fornitore, inizio, durata_minuti: minuti, sport: 'running', calorie: null, fc_media: null, fc_max: null,
})
const per = (r, id) => r.find((x) => x.id === id)

ok('un giorno: fatto, no, senza dato, in corso, futuro', () => {
  assert.equal(statoDelGiorno('2026-10-30', OGGI, null, 100, false), 'futuro')
  assert.equal(statoDelGiorno('2026-10-28', OGGI, 6000, 6000, false), 'fatto')
  assert.equal(statoDelGiorno('2026-10-28', OGGI, 5999, 6000, false), 'no')
  assert.equal(statoDelGiorno('2026-10-28', OGGI, null, 6000, false), 'senza-dato')
  assert.equal(statoDelGiorno('2026-10-28', OGGI, null, 20, true), 'no') // il telefono parlava e nessun allenamento
  assert.equal(statoDelGiorno(OGGI, OGGI, 3000, 6000, false), 'in-corso') // oggi non e' finito
  assert.equal(statoDelGiorno(OGGI, OGGI, null, 6000, true), 'in-corso')
  assert.equal(statoDelGiorno(OGGI, OGGI, 7000, 6000, false), 'fatto')
})

ok("passi: la settimana in corso conta da lunedi a oggi, senza dato non e un no", () => {
  const r = calcolaAbitudini({ giorni: [g('2026-10-26', { passi: 8000 }), g('2026-10-27', { passi: 6000 }), g('2026-10-28', { passi: 2000 }), g(OGGI, { passi: 1000 })], allenamenti: [] }, OGGI)
  const p = per(r, 'passi')
  assert.equal(p.fatti, 2)
  assert.equal(p.inRitmo, false)
  assert.equal(p.raggiungibile, true) // 2 + oggi + venerdi', sabato, domenica = 6 >= 5
  assert.equal(p.giorni.at(-1).stato, 'in-corso')
  assert.equal(p.giorni.find((x) => x.data === '2026-10-28').stato, 'no')
  assert.equal(p.giorni.find((x) => x.data === '2026-10-20').stato, 'senza-dato')
  assert.equal(p.giorni.length, 28)
  assert.deepEqual(p.ultimo, { data: OGGI, valore: 1000 })
})

ok('passi: non piu raggiungibile quando i giorni che restano non bastano', () => {
  // Oggi domenica 1 novembre: lunedi' e martedi' fatti, il resto no.
  const dom = '2026-11-01'
  const giorni = ['2026-10-26', '2026-10-27'].map((d) => g(d, { passi: 9000 })).concat(['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'].map((d) => g(d, { passi: 100 })), g(dom, { passi: 200 }))
  const p = per(calcolaAbitudini({ giorni, allenamenti: [] }, dom), 'passi')
  assert.equal(p.fatti, 2)
  assert.equal(p.raggiungibile, false) // 2 + oggi = 3 < 5
})

ok('passi: due righe per lo stesso giorno non si sommano (vale la piu alta)', () => {
  const r = calcolaAbitudini({ giorni: [g('2026-10-28', { passi: 4000 }), g('2026-10-28', { passi: 7000 }, 'google_salute')], allenamenti: [] }, OGGI)
  assert.equal(per(r, 'passi').giorni.find((x) => x.data === '2026-10-28').valore, 7000)
  assert.equal(per(r, 'passi').giorni.find((x) => x.data === '2026-10-28').stato, 'fatto')
})

ok('serie: settimane di fila nel ritmo, una settimana senza dati si salta, una sotto soglia spezza', () => {
  // Settimane concluse: 19-25 ott (5 giorni da 7000) e 12-18 ott (5 giorni da 7000), 5-11 ott vuota, 28 set-4 ott: solo 1 giorno.
  const giorni = []
  for (const d of ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']) giorni.push(g(d, { passi: 7000 }))
  giorni.push(g('2026-09-30', { passi: 7000 }))
  const p = per(calcolaAbitudini({ giorni, allenamenti: [] }, OGGI), 'passi')
  assert.equal(p.inRitmo, false)
  assert.equal(p.serie, 2) // 2 settimane nel ritmo, la vuota si salta, quella da 1 giorno spezza
})

ok('serie: la settimana corrente conta solo se gia nel ritmo', () => {
  const giorni = []
  for (const d of ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']) giorni.push(g(d, { passi: 7000 }))
  assert.equal(per(calcolaAbitudini({ giorni, allenamenti: [] }, OGGI), 'passi').serie, 1)
  for (const d of ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']) giorni.push(g(d, { passi: 7000 }))
  // 30 e' futuro rispetto a OGGI: contano 4 giorni (lun-gio)
  assert.equal(per(calcolaAbitudini({ giorni, allenamenti: [] }, OGGI), 'passi').fatti, 4)
  assert.equal(per(calcolaAbitudini({ giorni, allenamenti: [] }, '2026-10-30'), 'passi').inRitmo, true)
  assert.equal(per(calcolaAbitudini({ giorni, allenamenti: [] }, '2026-10-30'), 'passi').serie, 2)
})

ok("movimento: i minuti si sommano nel giorno (a Roma), da 20 in su; senza allenamenti dove il telefono parlava e un no", () => {
  const r = calcolaAbitudini(
    {
      giorni: [g('2026-10-27', { passi: 100 }), g('2026-10-28', { passi: 100 })],
      allenamenti: [a('2026-10-26T17:00:00Z', 12), a('2026-10-26T18:00:00Z', 10), a('2026-10-28T08:00:00Z', 45, 'manuale')],
    },
    OGGI,
  )
  const m = per(r, 'movimento')
  assert.equal(m.giorni.find((x) => x.data === '2026-10-26').stato, 'fatto') // 12 + 10 = 22
  assert.equal(m.giorni.find((x) => x.data === '2026-10-27').stato, 'no') // il telefono ha mandato i passi, nessun allenamento
  assert.equal(m.giorni.find((x) => x.data === '2026-10-28').stato, 'fatto')
  assert.equal(m.giorni.find((x) => x.data === '2026-10-20').stato, 'senza-dato')
  assert.equal(m.fatti, 2)
})

ok('movimento: un giorno senza dati dal telefono non spezza la serie, uno con dati e nessun allenamento si', () => {
  // Settimana 19-25: telefono presente tutti i giorni, 3 allenamenti -> nel ritmo. Settimana 12-18: telefono presente, 1 allenamento -> spezza.
  const giorni = []
  for (let d = 12; d <= 25; d++) giorni.push(g(`2026-10-${d}`, { passi: 100 }))
  const allenamenti = [a('2026-10-19T17:00:00Z', 30), a('2026-10-21T17:00:00Z', 30), a('2026-10-23T17:00:00Z', 30), a('2026-10-13T17:00:00Z', 30)]
  const m = per(calcolaAbitudini({ giorni, allenamenti }, OGGI), 'movimento')
  assert.equal(m.serie, 1)
})

ok('sonno: viene dalla notte (dispositivo prima di quella scritta a mano), 7 ore bastano', () => {
  const giorni = [
    g('2026-10-27', { sonno_minuti: 420 }),
    g('2026-10-28', { sonno_minuti: 419 }),
    g('2026-10-26', { sonno_minuti: 300 }, 'manuale'),
    g('2026-10-26', { sonno_minuti: 450 }), // il dispositivo vince sulla notte scritta a mano
  ]
  const s = per(calcolaAbitudini({ giorni, allenamenti: [] }, OGGI), 'sonno')
  assert.equal(s.fatti, 2)
  assert.equal(s.giorni.find((x) => x.data === '2026-10-28').stato, 'no')
  assert.equal(s.giorni.find((x) => x.data === '2026-10-26').valore, 450)
  assert.equal(s.giorni.at(-1).stato, 'in-corso') // stanotte non e' ancora finita? oggi senza notte: in corso
})

ok('senza nessun dato: nessuna abitudine ha dati e nessun giorno e un no', () => {
  const r = calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI)
  assert.equal(r.length, 3)
  for (const x of r) {
    assert.equal(x.conDato ?? x.conDati, false)
    assert.equal(x.serie, 0)
    assert.equal(x.ultimo, null)
    assert.ok(x.giorni.every((y) => y.stato === 'senza-dato' || y.stato === 'in-corso'))
  }
})

ok('collegamento: dati da Apple o da Google = collegato, anche dalla PWA', () => {
  const dati = { giorni: [g('2026-10-28', { passi: 1 }, 'google_salute')], allenamenti: [] }
  assert.equal(haDatiDaSalute(dati), true)
  assert.equal(statoCollegamento({ piattaforma: 'web', appSalute: null, attivo: false, dati }), 'collegato')
  assert.equal(statoCollegamento({ piattaforma: 'ios', appSalute: 'apple', attivo: true, dati }), 'collegato')
  // Il sonno scritto a mano o i dati legacy di Oura non sono Apple ne Google.
  const manuale = { giorni: [g('2026-10-28', { sonno_minuti: 400 }, 'manuale')], allenamenti: [a('2026-10-28T17:00:00Z', 30, 'manuale')] }
  assert.equal(haDatiDaSalute(manuale), false)
  assert.equal(haDatiDaSalute(null), false)
})

ok('collegamento: PWA senza app Salute -> da installare; nativo -> da collegare o senza dati; nativo senza app Salute -> niente', () => {
  assert.equal(statoCollegamento({ piattaforma: 'web', appSalute: null, attivo: false, dati: null }), 'da-installare')
  assert.equal(statoCollegamento({ piattaforma: 'web', appSalute: null, attivo: false, dati: { giorni: [], allenamenti: [] } }), 'da-installare')
  assert.equal(statoCollegamento({ piattaforma: 'ios', appSalute: 'apple', attivo: false, dati: null }), 'da-collegare')
  assert.equal(statoCollegamento({ piattaforma: 'android', appSalute: 'google', attivo: false, dati: null }), 'da-collegare')
  assert.equal(statoCollegamento({ piattaforma: 'ios', appSalute: 'apple', attivo: true, dati: { giorni: [], allenamenti: [] } }), 'senza-dati')
  assert.equal(statoCollegamento({ piattaforma: 'android', appSalute: null, attivo: false, dati: null }), 'niente')
})

ok('soglie: sono quelle del punteggio e dichiarate', () => {
  assert.equal(SOGLIA_PASSI, 6000)
})

console.log(`${n} gruppi passati`)
