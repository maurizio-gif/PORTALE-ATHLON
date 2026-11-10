// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a chi la sezione Junior mostra il questionario di livello al posto dei turni (src/features/lab/junior/livelloAcqua.ts, 10/11/2026):
// un bambino gia' registrato che non l'ha mai compilato. Niente rete e niente React.
//
//   npx tsx scripts/prova-livello-acqua.ts
import assert from 'node:assert/strict'

import { applicaRisposta, chiedeLivello, domandaChiusa, livelloCompleto, livelloMancante, LIVELLO_VUOTO, menoMesi, questionarioDaAggiornare, questionarioScaduto, MESI_VALIDITA_QUESTIONARIO } from '../src/features/lab/junior/livelloAcqua.ts'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log('OK', nome)
}

const OGGI = '2026-11-10'
// Un figlio del nucleo, nato nel 2018, che non ha mai compilato il questionario (come lo dice `portale-lab-junior`).
const figlio = (extra: Record<string, unknown> = {}) => ({
  member_id: 4801,
  nome: 'Sofia',
  cognome: 'Rossi',
  data_nascita: '2018-04-23',
  titolare: false,
  minorenne: true,
  idoneo: true,
  motivo: null,
  gruppi: [],
  livello_acqua: null,
  ...extra,
})

prova('un figlio senza risposte: va fermato', () => assert.equal(livelloMancante(figlio(), OGGI), true))
prova('con le risposte: non si ferma', () =>
  assert.equal(livelloMancante(figlio({ livello_acqua: { ha_frequentato: true, sa_nuotare: false, stile_libero: false, quando: '2026-11-09T10:00:00.000Z' } }), OGGI), false))
prova('anche se le risposte sono tutte «no» (e\' una risposta, non un vuoto)', () =>
  assert.equal(livelloMancante(figlio({ livello_acqua: { ha_frequentato: false, sa_nuotare: false, stile_libero: false, quando: '2026-11-09T10:00:00.000Z' } }), OGGI), false))
prova('campo assente (funzione di prima, o lettura non riuscita): non si ferma nessuno', () => {
  const f = figlio()
  delete f.livello_acqua
  assert.equal(livelloMancante(f, OGGI), false)
})
prova('il titolare (un ragazzo con l\'indirizzo suo) non e\' fermato: il questionario lo fa un genitore', () =>
  assert.equal(livelloMancante(figlio({ titolare: true }), OGGI), false))
prova('un maggiorenne non e\' fermato', () => assert.equal(livelloMancante(figlio({ minorenne: false }), OGGI), false))
prova('chi non e\' in eta\' per i corsi non e\' fermato', () => assert.equal(livelloMancante(figlio({ idoneo: false }), OGGI), false))
prova('senza data di nascita non si sa: non e\' fermato', () => assert.equal(livelloMancante(figlio({ data_nascita: null }), OGGI), false))

// La regola dell'eta' e' quella di «Aggiungi un componente» e del sito: tre anni di calendario, cioe' fuori dalle annate del Baby Nuoto.
prova('nato nel 2023: da tre anni di calendario, si chiede', () => assert.equal(chiedeLivello('2023-01-05', OGGI), true))
prova('nato a fine 2023: si chiede (conta l\'anno, non il compleanno)', () => assert.equal(chiedeLivello('2023-12-31', OGGI), true))
prova('nato nel 2024: Baby Nuoto, non si chiede', () => assert.equal(chiedeLivello('2024-01-01', OGGI), false))
prova('il Baby Nuoto non e\' fermato nemmeno se non ha risposte', () => assert.equal(livelloMancante(figlio({ data_nascita: '2025-03-02' }), OGGI), false))
prova('l\'anno cambia con la data: nel 2027 i nati del 2024 si chiedono', () => {
  assert.equal(chiedeLivello('2024-06-01', '2027-01-02'), true)
  assert.equal(chiedeLivello('2024-06-01', '2026-12-31'), false)
})
prova('un formato di data sbagliato non si chiede', () => {
  assert.equal(chiedeLivello('', OGGI), false)
  assert.equal(chiedeLivello('2018', OGGI), false)
  assert.equal(chiedeLivello('23/04/2018', OGGI), false)
})

prova('le tre risposte: tutte insieme', () => {
  assert.equal(livelloCompleto(LIVELLO_VUOTO), false)
  assert.equal(livelloCompleto({ ha_frequentato: 'si', sa_nuotare: 'no', stile_libero: null }), false)
  assert.equal(livelloCompleto({ ha_frequentato: 'si', sa_nuotare: 'no', stile_libero: 'no' }), true)
})

// ---- le risposte sono consequenziali (10/11/2026): «no» a una domanda e' «no» a quelle dopo ----
const R = (a, b, c) => ({ ha_frequentato: a, sa_nuotare: b, stile_libero: c })
prova('«no» alla prima: no anche alle altre due', () => {
  assert.deepEqual(applicaRisposta(LIVELLO_VUOTO, 'ha_frequentato', 'no'), R('no', 'no', 'no'))
  assert.deepEqual(applicaRisposta(R('si', 'si', 'si'), 'ha_frequentato', 'no'), R('no', 'no', 'no'), 'anche se avevano risposto si')
})
prova('«no» alla seconda: no anche alla terza, la prima resta', () => {
  assert.deepEqual(applicaRisposta(R('si', null, null), 'sa_nuotare', 'no'), R('si', 'no', 'no'))
  assert.deepEqual(applicaRisposta(R('si', 'si', 'si'), 'sa_nuotare', 'no'), R('si', 'no', 'no'))
})
prova('«no» alla terza: cambia solo lei', () => assert.deepEqual(applicaRisposta(R('si', 'si', null), 'stile_libero', 'no'), R('si', 'si', 'no')))
prova('«si» non spegne niente', () => {
  assert.deepEqual(applicaRisposta(LIVELLO_VUOTO, 'ha_frequentato', 'si'), R('si', null, null))
  assert.deepEqual(applicaRisposta(R('si', null, null), 'sa_nuotare', 'si'), R('si', 'si', null))
  assert.deepEqual(applicaRisposta(R('si', 'si', 'no'), 'stile_libero', 'si'), R('si', 'si', 'si'), 'la terza era un no dato da lui: si cambia')
})
prova('chi cambia idea da «no» a «si» non si ritrova «no» che non ha dato: le successive tornano da rispondere', () => {
  assert.deepEqual(applicaRisposta(R('no', 'no', 'no'), 'ha_frequentato', 'si'), R('si', null, null))
  assert.deepEqual(applicaRisposta(R('si', 'no', 'no'), 'sa_nuotare', 'si'), R('si', 'si', null))
})
prova('rispondere di nuovo «si» a una domanda che era gia\' «si» non cancella le successive', () => {
  assert.deepEqual(applicaRisposta(R('si', 'si', 'no'), 'ha_frequentato', 'si'), R('si', 'si', 'no'))
  assert.deepEqual(applicaRisposta(R('si', 'si', 'si'), 'sa_nuotare', 'si'), R('si', 'si', 'si'))
})
prova('ogni risposta data dalla cascata e\' una delle quattro coerenti', () => {
  const COERENTI = new Set(['no,no,no', 'si,no,no', 'si,si,no', 'si,si,si'])
  const valori = ['si', 'no']
  const ids = ['ha_frequentato', 'sa_nuotare', 'stile_libero']
  // Tutte le sequenze di tre tocchi (con qualunque ordine delle domande): se alla fine le tre risposte ci sono, sono coerenti.
  for (const i of ids) for (const j of ids) for (const k of ids) for (const a of valori) for (const b of valori) for (const c of valori) {
    const r = applicaRisposta(applicaRisposta(applicaRisposta(LIVELLO_VUOTO, i, a), j, b), k, c)
    if (livelloCompleto(r)) assert.ok(COERENTI.has(`${r.ha_frequentato},${r.sa_nuotare},${r.stile_libero}`), JSON.stringify(r))
  }
})
prova('una domanda chiusa dalla cascata non si cambia, nemmeno chiamando la funzione', () => {
  assert.deepEqual(applicaRisposta(R('no', 'no', 'no'), 'sa_nuotare', 'si'), R('no', 'no', 'no'))
  assert.deepEqual(applicaRisposta(R('no', 'no', 'no'), 'stile_libero', 'si'), R('no', 'no', 'no'))
  assert.deepEqual(applicaRisposta(R('si', 'no', 'no'), 'stile_libero', 'si'), R('si', 'no', 'no'))
})
prova('la domanda risposta dalla cascata e\' chiusa', () => {
  assert.equal(domandaChiusa(LIVELLO_VUOTO, 'ha_frequentato'), false, 'la prima non e\' mai chiusa')
  assert.equal(domandaChiusa(R('no', 'no', 'no'), 'sa_nuotare'), true)
  assert.equal(domandaChiusa(R('no', 'no', 'no'), 'stile_libero'), true)
  assert.equal(domandaChiusa(R('si', 'no', 'no'), 'sa_nuotare'), false, 'dopo un si la seconda si risponde')
  assert.equal(domandaChiusa(R('si', 'no', 'no'), 'stile_libero'), true)
  assert.equal(domandaChiusa(R('si', null, null), 'stile_libero'), false, 'una domanda senza risposta davanti non chiude niente')
})

// ---- quando si propone (10/11/2026, Maurizio): solo se non c'e' un livello reale, e si rifa dopo sei mesi ----
const RISPOSTE = (quando) => ({ ha_frequentato: true, sa_nuotare: false, stile_libero: false, quando })
prova('ogni quanto: sei mesi', () => assert.equal(MESI_VALIDITA_QUESTIONARIO, 6))
prova('il giorno di sei mesi prima', () => {
  assert.equal(menoMesi('2026-11-10', 6), '2026-05-10')
  assert.equal(menoMesi('2026-08-31', 6), '2026-02-28', 'il 31 agosto meno sei mesi e\' la fine di febbraio, non il 3 marzo')
  assert.equal(menoMesi('2028-08-31', 6), '2028-02-29', 'anno bisestile')
  assert.equal(menoMesi('2026-03-15', 6), '2025-09-15', 'a cavallo dell\'anno')
  assert.equal(menoMesi('2026-01-31', 6), '2025-07-31')
})
prova('le risposte scadono dopo sei mesi, non prima', () => {
  assert.equal(questionarioScaduto('2026-05-09T10:00:00.000Z', OGGI), true, 'un giorno oltre i sei mesi')
  assert.equal(questionarioScaduto('2026-05-10T10:00:00.000Z', OGGI), false, 'esattamente sei mesi fa: non ancora piu\' vecchie')
  assert.equal(questionarioScaduto('2026-11-09T10:00:00.000Z', OGGI), false, 'di ieri')
  assert.equal(questionarioScaduto('2025-01-01T00:00:00.000Z', OGGI), true, 'di quasi due anni fa')
})
prova('una data che non si legge non scade: un dato illeggibile non ferma nessuno', () => {
  assert.equal(questionarioScaduto('', OGGI), false)
  assert.equal(questionarioScaduto(null, OGGI), false)
  assert.equal(questionarioScaduto('non e\' una data', OGGI), false)
})
prova('il giorno e\' quello di Roma: le 23:30 UTC del 9 maggio sono gia\' il 10', () => {
  assert.equal(questionarioScaduto('2026-05-09T23:30:00.000Z', OGGI), false)
  assert.equal(questionarioScaduto('2026-05-09T21:30:00.000Z', OGGI), true, 'le 23:30 a Roma del 9')
})
prova('chi ha un livello reale registrato non si interroga MAI: ne\' senza risposte, ne\' con risposte vecchie', () => {
  assert.equal(livelloMancante(figlio({ livello: 'A2 - Stella Marina 2' }), OGGI), false, 'senza risposte')
  assert.equal(livelloMancante(figlio({ livello: 'B1 - Cavalluccio Marino', livello_acqua: RISPOSTE('2025-01-01T00:00:00.000Z') }), OGGI), false, 'con risposte di due anni fa')
})
prova('chi non ha un livello reale: senza risposte si compila, con risposte vecchie si rifa, con risposte fresche no', () => {
  assert.equal(livelloMancante(figlio({ livello: null }), OGGI), true, 'senza risposte (e senza livello: il registro ha la riga vuota)')
  assert.equal(livelloMancante(figlio({ livello: null, livello_acqua: RISPOSTE('2026-05-09T10:00:00.000Z') }), OGGI), true, 'risposte oltre sei mesi: si rifa')
  assert.equal(livelloMancante(figlio({ livello: null, livello_acqua: RISPOSTE('2026-09-01T10:00:00.000Z') }), OGGI), false, 'risposte di settembre: valgono ancora')
})
prova('le altre condizioni valgono anche per chi deve rifarlo', () => {
  const vecchie = RISPOSTE('2025-01-01T00:00:00.000Z')
  assert.equal(livelloMancante(figlio({ livello_acqua: vecchie, titolare: true }), OGGI), false, 'il titolare no')
  assert.equal(livelloMancante(figlio({ livello_acqua: vecchie, minorenne: false }), OGGI), false, 'un maggiorenne no')
  assert.equal(livelloMancante(figlio({ livello_acqua: vecchie, idoneo: false }), OGGI), false, 'chi non e\' in eta\' per i corsi no')
  assert.equal(livelloMancante(figlio({ livello_acqua: vecchie, data_nascita: '2024-02-01' }), OGGI), false, 'il Baby Nuoto no')
})
prova('campo assente: non si ferma nessuno, nemmeno con un livello vuoto', () => {
  const f = figlio({ livello: null })
  delete f.livello_acqua
  assert.equal(livelloMancante(f, OGGI), false)
})
prova('«compila» o «aggiorna»: chi ha delle risposte le aggiorna', () => {
  assert.equal(questionarioDaAggiornare(figlio({ livello_acqua: RISPOSTE('2025-01-01T00:00:00.000Z') })), true)
  assert.equal(questionarioDaAggiornare(figlio()), false)
})

console.log(`\n${n} prove passate`)
