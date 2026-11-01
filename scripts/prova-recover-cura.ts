// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova della «cura del corpo» (mobilita' e foam roller) nel punteggio di Recover: `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-recover-cura.ts`
import assert from 'node:assert/strict'

import { calcolaPunteggio, calcolaRelax, CURA_GIORNI, CURA_MINUTI_GIORNO, CURA_QUOTA, curaDa, giorniCuraDi, PUNTI, quotaRecover } from '../src/features/lab/fit/calcoloPunteggio'
import { puntiSettimana } from '../src/features/lab/fit/calcoloLivelli'

// Richiesta di Maurizio (02/11/2026): mobilita' e foam roller nel punteggio di Recover, «senza spingere a utilizzarlo troppo».
let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const vicino = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)
const rec = (data: string, mobilita: number, rilascio: number) => ({ data, mobilita, rilascio })
const notte = (data: string, minuti: number) => ({ fornitore: 'manuale', data, sonno_minuti: minuti, sonno_punteggio: null })

ok('la quota piccola: il 20% di Recover, cioe\' 3 punti su 15', () => {
  vicino(CURA_QUOTA, 0.2)
  assert.equal(Math.round(CURA_QUOTA * PUNTI.relax), 3)
})
ok('chi dorme come serve arriva al massimo anche senza cura, e la cura non cambia niente', () => {
  vicino(quotaRecover(5, 0), 1)
  vicino(quotaRecover(5, CURA_GIORNI), 1)
  vicino(quotaRecover(5, 7), 1)
})
ok('la cura da sola vale al massimo il 20%', () => {
  vicino(quotaRecover(0, 0), 0)
  vicino(quotaRecover(0, 1), 0.2 / 3)
  vicino(quotaRecover(0, CURA_GIORNI), 0.2)
})
ok('di piu\' non serve: oltre i 3 giorni non cresce', () => {
  for (let g = CURA_GIORNI; g <= 7; g++) vicino(quotaRecover(2, g), quotaRecover(2, CURA_GIORNI))
})
ok('la cura non toglie mai: con qualunque sonno e qualunque giorno e\' almeno quanto il sonno da solo', () => {
  for (let s = 0; s <= 5; s += 0.5) for (let g = 0; g <= 7; g++) assert.ok(quotaRecover(s, g) >= Math.min(1, s / 5) - 1e-12, `${s} ${g}`)
})
ok('la cura puo\' colmare un sonno scarso, ma non oltre il massimo', () => {
  vicino(quotaRecover(4, CURA_GIORNI), 1)
  assert.ok(quotaRecover(4, 1) > quotaRecover(4, 0) && quotaRecover(4, 1) < 1)
})
ok('i minuti si sommano per giorno (mobilita\' + rullo), le righe vuote non contano', () => {
  const c = curaDa([rec('2026-10-30', 6, 4), rec('2026-10-31', 0, 0), rec('2026-10-29', 0, 25)])
  assert.equal(c.get('2026-10-30'), 10)
  assert.equal(c.has('2026-10-31'), false)
  assert.equal(c.get('2026-10-29'), 25)
})
ok('un giorno vale con almeno 10 minuti: 9 no, 10 si\', e due sessioni lo stesso giorno valgono una volta', () => {
  const c = curaDa([rec('2026-10-27', 9, 0), rec('2026-10-28', 10, 0), rec('2026-10-29', 6, 4), rec('2026-10-30', 100, 100)])
  assert.equal(CURA_MINUTI_GIORNO, 10)
  assert.equal(giorniCuraDi(c, () => true), 3)
})
ok('i giorni fuori dalla settimana non contano', () => {
  const c = curaDa([rec('2026-10-20', 30, 0), rec('2026-10-27', 30, 0)])
  assert.equal(giorniCuraDi(c, (g) => g >= '2026-10-26' && g <= '2026-11-01'), 1)
})
ok('chi comincia dalla cura non e\' penalizzato dalle settimane prima: la storia parte dal primo giorno', () => {
  const senza = calcolaRelax(new Map(), '2026-11-02')
  const con = calcolaRelax(new Map(), '2026-11-02', curaDa([rec('2026-10-31', 15, 0), rec('2026-10-30', 0, 15), rec('2026-10-29', 15, 0)]))
  assert.equal(senza.haStoria, false)
  assert.equal(con.haStoria, true)
  // Le settimane prima del primo giorno non contano e i pesi si normalizzano: vale la quota della settimana in cui ha cominciato (3 giorni = il 20%).
  vicino(con.settimane[0].quota, 0.2)
  vicino(con.quota, 0.2)
  assert.equal(con.settimane.filter((s) => s.conta).length, 1)
})
ok('calcolaRelax: sonno pieno + cura = come il sonno solo', () => {
  const notti = new Map(['2026-10-31', '2026-10-30', '2026-10-29', '2026-10-28', '2026-10-27'].map((d) => [d, 480]))
  const cura = curaDa([rec('2026-10-31', 20, 0), rec('2026-10-30', 0, 20), rec('2026-10-29', 20, 0)])
  vicino(calcolaRelax(notti, '2026-11-02', cura).quota, calcolaRelax(notti, '2026-11-02').quota)
})
ok('calcolaPunteggio: i punti di Recover non scendono con la cura, e salgono per chi ha poco sonno', () => {
  const base = { oggi: '2026-11-02', sessioni: [], food: null }
  const giorni = ['2026-10-31', '2026-10-30'].map((d) => notte(d, 480))
  const recupero = [rec('2026-10-31', 20, 0), rec('2026-10-30', 0, 20), rec('2026-10-29', 20, 0)]
  const senza = calcolaPunteggio({ ...base, relax: { consenso: true, giorni } })
  const con = calcolaPunteggio({ ...base, relax: { consenso: true, giorni, recupero } })
  assert.ok(con.relax.punti >= senza.relax.punti)
  assert.ok(con.relax.punti > senza.relax.punti)
})
ok('livelli: i punti della settimana. Cura da sola = 3, e piu\' giorni non danno di piu\'', () => {
  const lunedi = '2026-10-26'
  const w = (...g: string[]) => g.map((d) => rec(d, 15, 0))
  const nessuno = puntiSettimana(lunedi, [], null, [], [])
  const tre = puntiSettimana(lunedi, [], null, [], w('2026-10-26', '2026-10-27', '2026-10-28'))
  const sette = puntiSettimana(lunedi, [], null, [], w('2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'))
  assert.equal(nessuno.relax, 0)
  assert.equal(tre.relax, 3)
  assert.equal(sette.relax, 3)
})
ok('livelli: la cura non cambia i punti di chi ha gia\' il sonno pieno, e senza dati (null) e\' come prima', () => {
  const lunedi = '2026-10-26'
  const notti = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].map((d) => notte(d, 480))
  assert.equal(puntiSettimana(lunedi, [], null, notti, null).relax, 15)
  assert.equal(puntiSettimana(lunedi, [], null, notti, [rec('2026-10-26', 30, 30)]).relax, 15)
  assert.equal(puntiSettimana(lunedi, [], null, notti).relax, 15)
})
ok('la cura di un\'altra settimana non conta in questa', () => {
  assert.equal(puntiSettimana('2026-10-26', [], null, [], [rec('2026-10-19', 30, 30), rec('2026-10-20', 30, 30), rec('2026-10-21', 30, 30)]).relax, 0)
})
console.log(`${n} gruppi ok`)
