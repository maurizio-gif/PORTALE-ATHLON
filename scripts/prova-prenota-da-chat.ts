// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `assistente/prenotaDaChat.ts` (puro): `npx tsx scripts/prova-prenota-da-chat.ts`
import assert from 'node:assert/strict'

import { AZIONE_PRENOTA, conPrenotazioneLezione, prenotaDaAzione } from '../src/features/lab/assistente/prenotaDaChat'
import { DESTINAZIONI_ASSISTENTE, hrefAssistente } from '../src/features/lab/assistente/destinazioni'

let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const az = (parametri: Record<string, string>, destinazione = AZIONE_PRENOTA) => ({ destinazione, parametri, etichetta: 'Prenota Pilates' })

ok('una proposta valida', () => {
  assert.deepEqual(prenotaDaAzione(az({ class_id: '123', giorno: '2026-11-03' })), { classId: 123, giorno: '2026-11-03', etichetta: 'Prenota Pilates' })
  assert.deepEqual(prenotaDaAzione(az({ class_id: '123', giorno: '2026-11-03', member_id: '456' })), { classId: 123, giorno: '2026-11-03', memberId: 456, etichetta: 'Prenota Pilates' })
})

ok('forme che non tornano non sono pulsanti', () => {
  for (const p of [{}, { class_id: '12' }, { giorno: '2026-11-03' }, { class_id: 'abc', giorno: '2026-11-03' }, { class_id: '12', giorno: '3 novembre' }, { class_id: '12', giorno: '2026-11-03', member_id: 'x' }, { class_id: '-1', giorno: '2026-11-03' }, { class_id: '1e3', giorno: '2026-11-03' }, { class_id: '1234567890123', giorno: '2026-11-03' }]) {
    assert.equal(prenotaDaAzione(az(p as Record<string, string>)), null, JSON.stringify(p))
  }
  assert.equal(prenotaDaAzione(az({ class_id: '12', giorno: '2026-11-03' }, 'calendario')), null)
})

ok('non e\' una destinazione: l\'elenco chiuso resta com\'e\' e non ha un indirizzo', () => {
  assert.equal((DESTINAZIONI_ASSISTENTE as readonly string[]).includes(AZIONE_PRENOTA), false)
  assert.equal(hrefAssistente(AZIONE_PRENOTA, { class_id: '12', giorno: '2026-11-03' }), null)
})

const lez = { class_id: 1, inizio: '', fine: '', nome: 'Pilates', categoria: 'Mind&Body', istruttore: null, posti: 10, iscritti: 6, liberi: 4, in_attesa: 0, iniziata: false, prenotabile_dal: null, prenotazione: null, limite: null, scheda: null }

ok('dopo il clic: prenotata, in attesa, disdetta', () => {
  const p = conPrenotazioneLezione(lez, { booking_id: 9, attesa: false }, 1, 0)
  assert.deepEqual([p.iscritti, p.liberi, p.in_attesa, p.prenotazione?.attesa], [7, 3, 0, false])
  const a = conPrenotazioneLezione({ ...lez, liberi: 0, iscritti: 10 }, { booking_id: 9, attesa: true }, 0, 1)
  assert.deepEqual([a.iscritti, a.liberi, a.in_attesa, a.prenotazione?.attesa], [10, 0, 1, true])
  const d = conPrenotazioneLezione(p, null, -1, 0)
  assert.deepEqual([d.iscritti, d.liberi, d.prenotazione], [6, 4, null])
  const senzaAttesa = conPrenotazioneLezione({ ...lez, in_attesa: undefined }, { booking_id: 1, attesa: false }, 1, 0)
  assert.equal('in_attesa' in senzaAttesa && senzaAttesa.in_attesa !== undefined, false)
  assert.equal(conPrenotazioneLezione({ ...lez, liberi: 0 }, { booking_id: 1, attesa: false }, 1, 0).liberi, 0, 'mai sotto zero')
})

console.log(`\n${n} gruppi passati`)
