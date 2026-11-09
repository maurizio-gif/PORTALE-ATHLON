// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova delle risposte al questionario dello shop (src/features/lab/shop/scelte.ts, puro): `npx tsx scripts/prova-shop.ts`
import assert from 'node:assert/strict'

import { conEtichetta, nomePersona, opzioniMancanti, personeAmmesse, rispostaCompleta, testoMancante, testoScelte } from '../src/features/lab/shop/scelte'

let n = 0
const prova = (nome: string, f: () => void) => {
  f()
  n++
  console.log('OK', nome)
}

const persone = [
  { member_id: 11, nome: 'Sara', cognome: 'Rossi', anno: 2014 },
  { member_id: 12, nome: 'Marco', cognome: 'Rossi', anno: 2017 },
]
const kit = {
  opzioni: [
    { id: 'atleta', tipo: 'persona', etichetta: 'Chi è l’atleta?' },
    { id: 'tshirt', tipo: 'scelta', etichetta: 'T-shirt', valori: [{ v: 'S', v_testo: 'S' }, { v: 'M', v_testo: 'M' }, { v: 'L', v_testo: 'L' }] },
    {
      id: 'short',
      tipo: 'scelta',
      etichetta: 'Short',
      valori: [
        { v: 'b10', v_testo: '10 anni', gruppo: 'Bambino' },
        { v: 'b12', v_testo: '12 anni', gruppo: 'Bambino' },
        { v: 'aM', v_testo: 'M', gruppo: 'Adulto' },
      ],
    },
  ],
}

prova('senza risposte mancano tutte le domande, nell’ordine della scheda', () => {
  assert.deepEqual(opzioniMancanti(kit, {}, persone).map((o) => o.id), ['atleta', 'tshirt', 'short'])
  assert.deepEqual(opzioniMancanti(kit, undefined, persone).map((o) => o.id), ['atleta', 'tshirt', 'short'])
  assert.equal(rispostaCompleta(kit, {}, persone), false)
})

prova('con tutte le risposte valide non manca niente', () => {
  const s = { atleta: { member_id: 11 }, tshirt: 'M', short: 'b12' }
  assert.equal(rispostaCompleta(kit, s, persone), true)
  assert.deepEqual(opzioniMancanti(kit, s, persone), [])
})

prova('una risposta a meta’ dice quale manca', () => {
  assert.deepEqual(opzioniMancanti(kit, { atleta: { member_id: 12 }, tshirt: 'S' }, persone).map((o) => o.id), ['short'])
})

prova('un valore che la vetrina non offre piu’ conta come «manca»', () => {
  assert.deepEqual(opzioniMancanti(kit, { atleta: { member_id: 11 }, tshirt: 'XXL', short: 'b12' }, persone).map((o) => o.id), ['tshirt'])
  assert.deepEqual(opzioniMancanti(kit, { atleta: { member_id: 99 }, tshirt: 'M', short: 'b12' }, persone).map((o) => o.id), ['atleta'], 'atleta non più nel nucleo')
})

prova('il tipo sbagliato non è una risposta: una stringa per la persona, un oggetto per la scelta', () => {
  assert.deepEqual(opzioniMancanti(kit, { atleta: 'Sara', tshirt: { member_id: 11 }, short: 'b12' }, persone).map((o) => o.id), ['atleta', 'tshirt'])
})

prova('un articolo senza domande ha sempre la risposta completa', () => {
  assert.equal(rispostaCompleta({ opzioni: [] }, undefined, []), true)
})

prova('il testo di una riga del carrello: nome, poi etichetta e valore', () => {
  const s = { atleta: { member_id: 11 }, tshirt: 'M', short: 'b12' }
  assert.deepEqual(testoScelte(kit, s, persone), ['Sara Rossi', 'T-shirt M', 'Short 12 anni'])
})

prova('una risposta che non si conosce più si salta, non si inventa', () => {
  assert.deepEqual(testoScelte(kit, { atleta: { member_id: 99 }, tshirt: 'XXL', short: 'aM' }, persone), ['Short M'])
})

prova('se il valore contiene già l’etichetta non la si ripete', () => {
  assert.equal(conEtichetta('T-shirt', 'M'), 'T-shirt M')
  assert.equal(conEtichetta('T-shirt', 'T-shirt M'), 'T-shirt M')
  assert.equal(conEtichetta('short', 'Short 12 anni'), 'Short 12 anni', 'senza badare alle maiuscole')
  assert.equal(conEtichetta('', 'M'), 'M')
})

prova('il testo del pulsante spento', () => {
  const manca = (e: string) => `Manca: ${e}`
  const mancano = (e: string) => `Mancano: ${e}`
  assert.equal(testoMancante([kit.opzioni[1]], manca, mancano), 'Manca: T-shirt')
  assert.equal(testoMancante(kit.opzioni, manca, mancano), 'Mancano: Chi è l’atleta?, T-shirt, Short')
})

prova('nome e cognome, anche se uno manca', () => {
  assert.equal(nomePersona({ nome: 'Sara', cognome: 'Rossi' }), 'Sara Rossi')
  assert.equal(nomePersona({ nome: ' Sara ', cognome: null }), 'Sara')
  assert.equal(nomePersona({ nome: null, cognome: null }), '')
})

// Il Kit Agonismo e' per chi ha da 7 a 18 anni (09/11/2026): il server calcola chi del nucleo e' ammesso (`ammessi`), l'app mostra solo loro e non conta gli anni.
const famiglia = [
  { member_id: 10, nome: 'Mario', cognome: 'Rossi', anno: 1985 },
  { member_id: 11, nome: 'Sara', cognome: 'Rossi', anno: 2014 },
  { member_id: 12, nome: 'Marco', cognome: 'Rossi', anno: 2017 },
]
const kitEta = {
  opzioni: [
    { id: 'atleta', tipo: 'persona', etichetta: 'Atleta', eta_min: 7, eta_max: 18, ammessi: [11, 12] },
    { id: 'tshirt', tipo: 'scelta', etichetta: 'T-shirt', valori: [{ v: 'M', v_testo: 'M' }] },
  ],
}
prova('limite di età: si mostrano solo gli ammessi, e senza `ammessi` tutti', () => {
  assert.deepEqual(personeAmmesse(kitEta.opzioni[0], famiglia).map((p) => p.member_id), [11, 12], 'l’adulto non si può scegliere')
  assert.deepEqual(personeAmmesse({ ammessi: null }, famiglia).map((p) => p.member_id), [10, 11, 12], 'null = nessun limite')
  assert.deepEqual(personeAmmesse({}, famiglia).map((p) => p.member_id), [10, 11, 12], 'un server senza il campo: nessun limite')
  assert.deepEqual(personeAmmesse({ ammessi: [] }, famiglia), [], 'un nucleo senza nessuno di quell’età')
  assert.deepEqual(personeAmmesse({ ammessi: [99] }, famiglia), [], 'un id che non è del nucleo non fa comparire nessuno')
})
prova('limite di età: un atleta non ammesso conta come «manca»', () => {
  assert.deepEqual(opzioniMancanti(kitEta, { atleta: { member_id: 11 }, tshirt: 'M' }, famiglia), [], 'la figlia di 11 anni va bene')
  assert.deepEqual(opzioniMancanti(kitEta, { atleta: { member_id: 10 }, tshirt: 'M' }, famiglia).map((o) => o.id), ['atleta'], 'l’adulto no, anche se è del nucleo')
  assert.equal(rispostaCompleta(kitEta, { atleta: { member_id: 10 }, tshirt: 'M' }, famiglia), false)
  // Il carrello ricordava Luca; la vetrina nuova non lo ammette piu' (ha compiuto 19 anni): si rifa la scelta, non si manda quello che il server rifiuta.
  const dopo = { opzioni: [{ ...kitEta.opzioni[0], ammessi: [12] }, kitEta.opzioni[1]] }
  assert.equal(rispostaCompleta(dopo, { atleta: { member_id: 11 }, tshirt: 'M' }, famiglia), false, 'chi non è più ammesso va rifatto')
  assert.equal(rispostaCompleta(dopo, { atleta: { member_id: 12 }, tshirt: 'M' }, famiglia), true)
  // Senza limiti, le persone di prima funzionano come prima.
  assert.equal(rispostaCompleta(kit, { atleta: { member_id: 11 }, tshirt: 'M', short: 'b12' }, persone), true)
})

console.log(`prova-shop: ${n} gruppi passati`)
