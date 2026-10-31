// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `fit/abitudini.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-abitudini.ts`
import assert from 'node:assert/strict'

import type { AllenamentoDispositivo, GiornoDispositivo } from '../src/api/dispositivi'
import { readFileSync, existsSync } from 'node:fs'

import { calcolaAbitudini, haDatiDaSalute, statoCollegamento, statoDelGiorno, SOGLIA_PASSI, valoriDelTipo } from '../src/features/lab/fit/abitudini'
import { ABITUDINI_MASSIME, CATALOGO, coricamentoDaOra, DI_PARTENZA, oraDaCoricamento, puntoDiPartenza, sceltePredefinite, sfidaValida, sogliaDelGiorno, statoSfida, TIPI } from '../src/features/lab/fit/catalogoAbitudini'

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

// ---------------------------------------------------------------------------------------------------------------------------------
// Abitudini personalizzabili, sfida e nuovi dati (31/10/2026)
const sc = (tipo, extra = {}) => ({ tipo, soglia: CATALOGO[tipo].predefinita.soglia, giorni: 3, dal: '2026-10-01', sfida: null, ...extra })
const cfg = (scelte, registri = []) => ({ scelte, registri })

ok('senza scelte salvate valgono le tre di partenza; con scelte, solo quelle', () => {
  assert.deepEqual(calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([])).map((x) => x.id), ['passi', 'movimento', 'sonno'])
  assert.deepEqual(calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, null).map((x) => x.id), ['passi', 'movimento', 'sonno'])
  const r = calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([sc('luce'), sc('plank')]))
  assert.deepEqual(r.map((x) => x.id), ['luce', 'plank'])
  assert.equal(r[0].scelta.tipo, 'luce')
  assert.equal(calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI)[0].scelta, null) // di partenza: non salvata
  assert.deepEqual(sceltePredefinite().map((x) => x.tipo), [...DI_PARTENZA])
})

ok('la soglia scelta e i giorni a settimana valgono per quella abitudine', () => {
  const giorni = ['2026-10-26', '2026-10-27'].map((d) => g(d, { passi: 4500 }))
  const p = calcolaAbitudini({ giorni, allenamenti: [] }, OGGI, cfg([sc('passi', { soglia: 4000, giorni: 2 })]))[0]
  assert.equal(p.soglia, 4000)
  assert.equal(p.obiettivo, 2)
  assert.equal(p.fatti, 2)
  assert.equal(p.inRitmo, true)
})

ok('sfida: la soglia sale in linea retta da da ad a, e dopo la fine resta ad a', () => {
  const f = { giorni: 30, da: 4000, a: 8000, inizio: '2026-10-01' }
  const s = { tipo: 'passi', soglia: 6000, sfida: f }
  assert.equal(sogliaDelGiorno(s, '2026-10-01'), 4000) // il primo giorno
  assert.equal(sogliaDelGiorno(s, '2026-09-20'), 4000) // prima dell'inizio: da
  assert.equal(sogliaDelGiorno(s, '2026-10-30'), 8000) // l'ultimo giorno
  assert.equal(sogliaDelGiorno(s, '2026-12-01'), 8000) // dopo la fine
  const meta = sogliaDelGiorno(s, '2026-10-15')
  assert.ok(meta > 5000 && meta < 7000, String(meta))
  let prima = 0
  for (let d = 1; d <= 30; d++) {
    const v = sogliaDelGiorno(s, `2026-10-${String(d).padStart(2, '0')}`)
    assert.ok(v >= prima, 'non scende mai')
    assert.equal(v % 50, 0, 'i passi si arrotondano a 50')
    prima = v
  }
  // Senza sfida e' sempre la soglia scelta.
  assert.equal(sogliaDelGiorno({ tipo: 'passi', soglia: 6000, sfida: null }, '2026-10-15'), 6000)
})

ok('sfida: che giorno e', () => {
  const f = { giorni: 30, da: 4000, a: 8000, inizio: '2026-10-01' }
  assert.deepEqual(statoSfida({ sfida: f }, '2026-10-01'), { giorno: 1, giorni: 30, da: 4000, a: 8000, finita: false, nonIniziata: false })
  assert.equal(statoSfida({ sfida: f }, '2026-10-29').giorno, 29)
  assert.equal(statoSfida({ sfida: f }, '2026-10-30').finita, false) // il giorno 30 e' l'ultimo, ancora in corso
  assert.equal(statoSfida({ sfida: f }, '2026-10-31').finita, true)
  assert.equal(statoSfida({ sfida: f }, '2026-10-31').giorno, 30)
  assert.equal(statoSfida({ sfida: f }, '2026-09-30').nonIniziata, true)
  assert.equal(statoSfida({ sfida: null }, OGGI), null)
})

ok('sfida: ogni giorno si giudica con la soglia di quel giorno, non con quella di oggi', () => {
  // Inizio il 26: soglia 1000 il giorno 1 e 8000 il giorno 30. Lunedi' 26 con 1500 passi e' fatto, oggi (giorno 4) ne servono ~1.800.
  const sfida = { giorni: 30, da: 1000, a: 8000, inizio: '2026-10-26' }
  const r = calcolaAbitudini({ giorni: [g('2026-10-26', { passi: 1500 }), g(OGGI, { passi: 1500 })], allenamenti: [] }, OGGI, cfg([sc('passi', { soglia: 4000, sfida })]))[0]
  assert.equal(r.giorni.find((x) => x.data === '2026-10-26').stato, 'fatto')
  assert.equal(r.giorni.find((x) => x.data === OGGI).stato, 'in-corso') // sotto la soglia di oggi, ma oggi non e' finito
  assert.ok(r.soglia > 1500 && r.soglia < 4000, String(r.soglia))
  assert.equal(r.sfida.giorno, 4)
})

ok('punto di partenza della sfida: sotto quello che gia fa, e sale', () => {
  const p = puntoDiPartenza('passi', [7000, 8000, 9000, 6000, 10000])
  assert.ok(p.da < 8000 && p.da > 6000, JSON.stringify(p))
  assert.ok(p.a > 8000 && p.a <= 30000)
  assert.equal(p.giorni, 30)
  assert.ok(sfidaValida('passi', p))
  // Pochi dati o nessuno: dalla meta' alla soglia di partenza.
  const v = puntoDiPartenza('passi', [])
  assert.deepEqual([v.da, v.a], [3000, 6000])
  assert.deepEqual(puntoDiPartenza('passi', [5000, 6000]), v)
  assert.equal(puntoDiPartenza('sonno', [420, 430, 440]), null) // il sonno non ha la sfida
  assert.equal(puntoDiPartenza('coricamento', [300, 310, 320]), null)
  // Sempre valida e che sale, per ogni tipo con la sfida e per qualunque storia.
  for (const t of TIPI.filter((x) => CATALOGO[x].sfida)) {
    for (const storia of [[], [1, 2, 3], [CATALOGO[t].max, CATALOGO[t].max, CATALOGO[t].max], [CATALOGO[t].min, CATALOGO[t].min, CATALOGO[t].min], [0, 0, 0]]) {
      const x = puntoDiPartenza(t, storia)
      assert.ok(x && sfidaValida(t, x), `${t} ${storia}: ${JSON.stringify(x)}`)
      assert.ok(x.a > x.da)
    }
  }
})

ok('sfidaValida: come il server', () => {
  assert.equal(sfidaValida('passi', { giorni: 30, da: 4000, a: 8000 }), true)
  assert.equal(sfidaValida('passi', { giorni: 6, da: 4000, a: 8000 }), false)
  assert.equal(sfidaValida('passi', { giorni: 91, da: 4000, a: 8000 }), false)
  assert.equal(sfidaValida('passi', { giorni: 30, da: 8000, a: 4000 }), false)
  assert.equal(sfidaValida('passi', { giorni: 30, da: 500, a: 4000 }), false)
  assert.equal(sfidaValida('sonno', { giorni: 30, da: 300, a: 400 }), false)
})

ok('movimento: vale il maggiore fra gli allenamenti e l anello Esercizio, mai la somma', () => {
  const dati = { giorni: [g('2026-10-27', { esercizio_minuti: 40 }), g('2026-10-28', { esercizio_minuti: 10 })], allenamenti: [a('2026-10-27T08:00:00Z', 25), a('2026-10-28T08:00:00Z', 15)] }
  const v = valoriDelTipo('movimento', dati)
  assert.equal(v.get('2026-10-27'), 40)
  assert.equal(v.get('2026-10-28'), 15)
})

ok('coricamento: si vince andando a letto non oltre l orario, dal telefono o dalla notte scritta a mano', () => {
  assert.equal(oraDaCoricamento(330), '23:30')
  assert.equal(oraDaCoricamento(435), '01:15')
  assert.equal(oraDaCoricamento(0), '18:00')
  assert.equal(coricamentoDaOra('23:30'), 330)
  assert.equal(coricamentoDaOra('01:15'), 435)
  assert.equal(coricamentoDaOra('00:00'), 360)
  assert.equal(coricamentoDaOra('14:00'), null) // un riposino non e' il coricamento
  assert.equal(coricamentoDaOra('25:00'), null)
  const giorni = [g('2026-10-27', { coricamento_min: 300 }), g('2026-10-28', { coricamento_min: 360 }), g('2026-10-26', { sonno_a_letto: '23:00', sonno_sveglia: '07:00', sonno_minuti: 480 }, 'manuale')]
  const r = calcolaAbitudini({ giorni, allenamenti: [] }, OGGI, cfg([sc('coricamento', { soglia: 330 })]))[0]
  assert.equal(r.inverso, true)
  assert.equal(r.giorni.find((x) => x.data === '2026-10-27').stato, 'fatto') // 23:00
  assert.equal(r.giorni.find((x) => x.data === '2026-10-28').stato, 'no') // mezzanotte, oltre 23:30
  assert.equal(r.giorni.find((x) => x.data === '2026-10-26').stato, 'fatto') // dalla notte scritta a mano: 23:00
  assert.equal(r.giorni.find((x) => x.data === '2026-10-25').stato, 'senza-dato')
  // Due righe per la stessa notte: vale la piu' tarda; il dispositivo vince sulla notte a mano.
  const v = valoriDelTipo('coricamento', { giorni: [g('2026-10-27', { coricamento_min: 300 }), g('2026-10-27', { coricamento_min: 340 }, 'google_salute'), g('2026-10-27', { sonno_a_letto: '21:00', sonno_sveglia: '05:00' }, 'manuale')], allenamenti: [] })
  assert.equal(v.get('2026-10-27'), 340)
})

ok('manuali: un giorno senza valore e un no solo da quando la segui, oggi e in corso', () => {
  const registri = [{ tipo: 'plank', data: '2026-10-27', valore: 75 }, { tipo: 'plank', data: '2026-10-28', valore: 40 }]
  const r = calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([sc('plank', { soglia: 60, dal: '2026-10-26' })], registri))[0]
  assert.equal(r.manuale, true)
  assert.equal(r.giorni.find((x) => x.data === '2026-10-25').stato, 'senza-dato') // prima che la seguissi
  assert.equal(r.giorni.find((x) => x.data === '2026-10-26').stato, 'no') // la seguivi e non l'hai fatta
  assert.equal(r.giorni.find((x) => x.data === '2026-10-27').stato, 'fatto')
  assert.equal(r.giorni.find((x) => x.data === '2026-10-28').stato, 'no') // 40 < 60
  assert.equal(r.giorni.find((x) => x.data === OGGI).stato, 'in-corso')
  assert.equal(r.fatti, 1)
  assert.equal(r.oggi, null)
  // Un valore di oggi si vede, e se arriva alla soglia e' fatto.
  const r2 = calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([sc('squat', { soglia: 30, dal: '2026-10-26' })], [{ tipo: 'squat', data: OGGI, valore: 35 }]))[0]
  assert.equal(r2.oggi, 35)
  assert.equal(r2.giorni.at(-1).stato, 'fatto')
  // I valori di un altro tipo non si mescolano.
  assert.equal(calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([sc('squat', { dal: '2026-10-26' })], registri))[0].conDati, false)
})

ok('mindfulness, ore in piedi e luce: dal telefono; nessuna sessione e un no solo per la meditazione dove il telefono parlava', () => {
  const giorni = [g('2026-10-27', { passi: 100, mindfulness_minuti: 10, ore_in_piedi: 9, luce_minuti: 45 }), g('2026-10-28', { passi: 100, ore_in_piedi: 4, luce_minuti: 10 })]
  const r = calcolaAbitudini({ giorni, allenamenti: [] }, OGGI, cfg([sc('mindfulness', { soglia: 5 }), sc('in_piedi', { soglia: 8 }), sc('luce', { soglia: 30 })]))
  const [m, p, l] = r
  assert.equal(m.giorni.find((x) => x.data === '2026-10-27').stato, 'fatto')
  assert.equal(m.giorni.find((x) => x.data === '2026-10-28').stato, 'no') // il telefono parlava, nessuna meditazione
  assert.equal(m.giorni.find((x) => x.data === '2026-10-20').stato, 'senza-dato')
  assert.equal(p.giorni.find((x) => x.data === '2026-10-27').stato, 'fatto')
  assert.equal(p.giorni.find((x) => x.data === '2026-10-28').stato, 'no')
  assert.equal(p.giorni.find((x) => x.data === '2026-10-26').stato, 'senza-dato') // niente Watch: non si sa
  assert.equal(l.giorni.find((x) => x.data === '2026-10-28').stato, 'no')
})

ok('catalogo: limiti coerenti, copia del server uguale', () => {
  for (const t of TIPI) {
    const v = CATALOGO[t]
    assert.ok(v.min >= 1 && v.max > v.min && v.passo >= 1, t)
    assert.ok(v.predefinita.soglia >= v.min && v.predefinita.soglia <= v.max, `${t}: la soglia di partenza sta nei limiti`)
    assert.ok(v.predefinita.giorni >= 1 && v.predefinita.giorni <= 7)
    if (v.manuale && t !== 'acqua') assert.ok(v.sfida, t)
  }
  assert.ok(ABITUDINI_MASSIME >= 3 && ABITUDINI_MASSIME <= 6)
  assert.equal(CATALOGO.passi.predefinita.soglia, SOGLIA_PASSI)
  // Se i due repository stanno affiancati, il catalogo del server dice le stesse cose.
  const srv = '../APP-ATHLON/supabase/functions/_shared/dispositivi/abitudini.ts'
  if (existsSync(srv)) {
    const testo = readFileSync(srv, 'utf8')
    for (const t of TIPI) {
      const m = new RegExp(`${t}: \\{ min: (\\d+), max: (\\d+), sfida: (true|false), manuale: (true|false) \\}`).exec(testo)
      assert.ok(m, `${t} manca nel catalogo del server`)
      const v = CATALOGO[t]
      assert.deepEqual([Number(m[1]), Number(m[2]), m[3] === 'true', m[4] === 'true'], [v.min, v.max, v.sfida, v.manuale], `${t}: il server dice un'altra cosa`)
    }
    assert.ok(new RegExp(`ABITUDINI_MASSIME = ${ABITUDINI_MASSIME}\\b`).test(testo))
    console.log('   (catalogo confrontato con quello del server)')
  }
})

ok('acqua e mobilita: si scrivono a mano, partono da quando si seguono, l\'acqua non ha la sfida', () => {
  assert.equal(CATALOGO.acqua.manuale, true)
  assert.equal(CATALOGO.acqua.sfida, false)
  assert.equal(CATALOGO.mobilita.manuale, true)
  assert.equal(CATALOGO.mobilita.sfida, true)
  const registri = [{ tipo: 'acqua', data: '2026-10-27', valore: 7 }, { tipo: 'acqua', data: '2026-10-28', valore: 3 }, { tipo: 'mobilita', data: OGGI, valore: 12 }]
  const [acqua] = calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([sc('acqua', { soglia: 6, dal: '2026-10-26' })], registri))
  assert.equal(acqua.manuale, true)
  assert.equal(acqua.giorni.find((g) => g.data === '2026-10-27')?.stato, 'fatto')
  assert.equal(acqua.giorni.find((g) => g.data === '2026-10-28')?.stato, 'no') // 3 bicchieri, sotto i 6
  assert.equal(acqua.giorni.find((g) => g.data === '2026-10-26')?.stato, 'no') // da quando la segue, un giorno senza valore e un no
  assert.equal(acqua.giorni.find((g) => g.data === '2026-10-25')?.stato, 'senza-dato') // prima non c'era
  const [mob] = calcolaAbitudini({ giorni: [], allenamenti: [] }, OGGI, cfg([sc('mobilita', { soglia: 10, dal: '2026-10-26' })], registri))
  assert.equal(mob.oggi, 12)
  assert.equal(mob.giorni.find((g) => g.data === OGGI)?.stato, 'fatto')
  // I due non si confondono: i registri di un tipo non contano per l'altro.
  assert.equal(acqua.oggi, null)
})

console.log(`${n} gruppi passati`)
