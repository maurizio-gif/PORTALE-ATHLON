// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a chi la sezione Junior mostra il questionario di livello al posto dei turni (src/features/lab/junior/livelloAcqua.ts, 10/11/2026):
// un bambino gia' registrato che non l'ha mai compilato. Niente rete e niente React.
//
//   npx tsx scripts/prova-livello-acqua.ts
import assert from 'node:assert/strict'

import { chiedeLivello, livelloCompleto, livelloMancante, LIVELLO_VUOTO } from '../src/features/lab/junior/livelloAcqua.ts'

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

console.log(`\n${n} prove passate`)
