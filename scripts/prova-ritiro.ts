// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `shop/ritiro.ts` (puro): `npx tsx scripts/prova-ritiro.ts`
import assert from 'node:assert/strict'

import { codiceBreve, daRitirare, PREFISSO_RITIRO, testoRitiro } from '../src/features/lab/shop/ritiro'

const ID = '3f2a8c1e-9b7d-4c1a-8e55-0a1b2c3d4e5f'
assert.equal(testoRitiro(ID), `${PREFISSO_RITIRO}${ID}`)
assert.equal(testoRitiro(ID), 'ATHLON-ORDINE:3f2a8c1e-9b7d-4c1a-8e55-0a1b2c3d4e5f')
assert.equal(codiceBreve(ID), '3F2A8C1E')
assert.equal(codiceBreve('ab-12 cd_34 ef56'), 'AB12CD34', 'senza trattini, spazi e simboli, in maiuscolo')
assert.equal(codiceBreve('abc'), 'ABC')
assert.equal(codiceBreve(''), '')
// Dal 06/11/2026 il QR compare solo quando la merce e' pronta (`stato_ritiro: 'pronto'`): non per un preordine, non per un ordine gia' ritirato.
assert.equal(daRitirare({ stato: 'pagato', consegnato_il: null, stato_ritiro: 'pronto' }), true)
assert.equal(daRitirare({ stato: 'pagato', consegnato_il: null, stato_ritiro: 'in_attesa' }), false, 'preordine: non c\'e\' ancora niente da ritirare')
assert.equal(daRitirare({ stato: 'pagato', consegnato_il: null, stato_ritiro: 'ordinato' }), false, 'ordinato al fornitore: non e\' ancora arrivato')
assert.equal(daRitirare({ stato: 'pagato', consegnato_il: '2026-10-30T09:00:00Z', stato_ritiro: 'ritirato' }), false, 'ritirato: niente QR')
assert.equal(daRitirare({ stato: 'pagato', consegnato_il: '2026-10-30T09:00:00Z', stato_ritiro: 'pronto' }), false, 'consegnato: niente QR anche se lo stato non e\' ancora aggiornato')
assert.equal(daRitirare({ stato: 'avviato', consegnato_il: null, stato_ritiro: null }), false, 'non pagato: niente QR')
assert.equal(daRitirare({ stato: 'errore', consegnato_il: null, stato_ritiro: null }), false)
console.log('prova-ritiro: 13 controlli passati')
