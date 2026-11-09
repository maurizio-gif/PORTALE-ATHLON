// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano dei passi del Guest Pass dal link (da dove si riparte, quando i dati bastano, quale metodo c'e' all'apertura).
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-guest-pass-passi.ts
import assert from 'node:assert/strict'

import { analisiDati, datiDa, metodoIniziale, passoIniziale } from '../src/lib/guestPassPassi'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

/** Una richiesta aperta di Maurizio Taruggi (nato il 04/03/1980, codice fiscale valido) con tutto da fare; chi prova cambia quello che serve. */
function pagina(cambia: (p: any) => void = () => {}) {
  const p: any = {
    stato: 'aperta',
    persona: { trovata: true, nome: 'Maurizio', cognome: 'Taruggi', email: 'm@example.com', telefono: '+393401234567', nascita: '1980-03-04', codice_fiscale: 'TRGMRZ80C04H501O', via: null, cap: null, citta: null, residente_estero: false, paese: null, manca: [] },
    scelta: { per: 'me', candidati: [], beneficiario_id: null, figlio: null, tutore: false, eta: { min: 13, max: 17 } },
    verifica: null,
    consensi: [],
    inizio: { dal: '2026-11-07', al: '2026-11-21', scelto: null },
    prezzo: 19,
    password: { obbligatoria: false },
    salvati: [{ id: 7, tipo: 'carta', finale: '4242', scadenza: '2028-05' }],
    scelte: { consensi: [], metodo: null, metodo_pronto: false, payment_source_id: null, dati_confermati: false },
  }
  cambia(p)
  return p
}
const confermata = (p: any) => {
  p.scelte.dati_confermati = true
}

// --- i dati
{
  const d = datiDa(pagina())
  assert.equal(d.nome, 'Maurizio')
  assert.equal(d.codice_fiscale, 'TRGMRZ80C04H501O')
  assert.equal(d.residente_estero, '0')
  assert.equal(d.paese, '')
  assert.equal(analisiDati(d).completi, true)
  ok('i dati di PerfectGym completi e con il codice fiscale giusto bastano')
}
{
  const d = datiDa(pagina((p) => (p.persona.codice_fiscale = null)))
  const a = analisiDati(d)
  assert.equal(a.completi, false)
  assert.equal(a.erroreCf, null, 'un codice fiscale che manca non e\' un errore di scrittura: e\' un dato da chiedere')
  ok('senza codice fiscale i dati non bastano')
}
{
  const a = analisiDati(datiDa(pagina((p) => (p.persona.codice_fiscale = 'TRGMRZ80C04H501X'))))
  assert.equal(a.completi, false)
  assert.ok(a.erroreCf, 'il carattere di controllo sbagliato si dice subito')
  ok('un codice fiscale scritto male non basta, e lo dice')
}
{
  const a = analisiDati(datiDa(pagina((p) => (p.persona.codice_fiscale = 'RSSMRA80A01H501U'))))
  assert.equal(a.completi, false)
  ok('un codice fiscale valido ma di un\'altra persona non basta')
}
{
  const a = analisiDati(datiDa(pagina((p) => { p.persona.codice_fiscale = null; p.persona.residente_estero = true; p.persona.paese = null })))
  assert.equal(a.estero, true)
  assert.equal(a.senzaPaese, true)
  assert.equal(a.completi, false)
  ok('residente all\'estero: senza il Paese non basta')
}
{
  const a = analisiDati(datiDa(pagina((p) => { p.persona.codice_fiscale = null; p.persona.residente_estero = true; p.persona.paese = 'GB' })))
  assert.equal(a.completi, true, 'con la spunta il codice fiscale non si chiede')
  ok('residente all\'estero col Paese: il codice fiscale non serve')
}
{
  const a = analisiDati(datiDa(pagina((p) => (p.persona.telefono = ''))))
  assert.equal(a.completi, false)
  ok('senza cellulare i dati non bastano')
}

// --- il metodo di partenza
{
  assert.equal(metodoIniziale(pagina()), null)
  assert.equal(metodoIniziale(pagina((p) => (p.scelte.metodo = 'carta'))), 'carta')
  assert.equal(metodoIniziale(pagina((p) => { p.scelte.metodo = 'carta'; p.scelte.payment_source_id = 7 })), 's7')
  assert.equal(metodoIniziale(pagina((p) => { p.scelte.metodo = 'carta'; p.scelte.payment_source_id = 99 })), 'carta', 'un metodo salvato che non c\'e\' piu\' non si propone')
  ok('il metodo di partenza: nessuno, nuovo, salvato; un salvato che non c\'e\' piu\' torna al nuovo')
}

// --- da dove si riparte
{
  assert.equal(passoIniziale(pagina(), false), 1)
  ok('una richiesta nuova parte dai dati')
}
{
  assert.equal(passoIniziale(pagina((p) => (p.scelta.per = null)), false), 1)
  assert.equal(passoIniziale(pagina((p) => { p.scelta.per = null; confermata(p); p.inizio.scelto = '2026-11-09'; p.scelte.metodo = 'carta' }), false), 1)
  ok('finche\' non si e\' scelto per chi, si resta al primo passo')
}
{
  assert.equal(passoIniziale(pagina((p) => { delete p.scelta }), false), 1, 'senza `scelta` (funzione di prima) non e\' un ostacolo: i dati decidono')
  assert.equal(passoIniziale(pagina((p) => { delete p.scelta; confermata(p) }), false), 2)
  ok('con una funzione di prima (`scelta` assente) si riparte dai dati come sempre')
}
{
  assert.equal(passoIniziale(pagina((p) => { confermata(p); p.persona.codice_fiscale = null }), false), 1)
  assert.equal(passoIniziale(pagina((p) => { confermata(p); p.persona.codice_fiscale = 'TRGMRZ80C04H501X' }), false), 1)
  ok('dati confermati ma non piu\' completi: si torna ai dati')
}
{
  assert.equal(passoIniziale(pagina((p) => confermata(p)), false), 2)
  ok('dati confermati e niente giorno: si riparte dal giorno')
}
{
  assert.equal(passoIniziale(pagina((p) => { confermata(p); p.inizio.scelto = '2026-11-09' }), false), 3)
  ok('dati e giorno fatti, niente metodo: si riparte dal pagamento')
}
{
  const giaCarta = (p: any) => { confermata(p); p.inizio.scelto = '2026-11-09'; p.scelte.metodo = 'carta' }
  assert.equal(passoIniziale(pagina(giaCarta), false), 4)
  assert.equal(passoIniziale(pagina((p) => { giaCarta(p); p.scelte.payment_source_id = 7 }), false), 4)
  ok('con una carta (nuova o salvata) scelta: si riparte dalla conferma')
}
{
  const iban = (p: any) => { confermata(p); p.inizio.scelto = '2026-11-09'; p.scelte.metodo = 'iban' }
  assert.equal(passoIniziale(pagina(iban), false), 3, 'l\'IBAN da scrivere non e\' un metodo pronto')
  assert.equal(passoIniziale(pagina((p) => { iban(p); p.scelte.metodo_pronto = true }), false), 4)
  ok('l\'IBAN conta solo a conto salvato: prima si resta al pagamento')
}
{
  const tutto = (p: any) => { confermata(p); p.inizio.scelto = '2026-11-09'; p.scelte.metodo = 'carta' }
  assert.equal(passoIniziale(pagina((p) => { tutto(p); p.password = { obbligatoria: true } }), false), 1)
  ok('chi sta creando l\'account torna dalla password: non si salva fra un passo e l\'altro')
}
{
  assert.equal(passoIniziale(pagina((p) => confermata(p)), true), 4)
  assert.equal(passoIniziale(pagina(), true), 1, 'dal ritorno della carta ma senza dati a posto: si parte dai dati')
  assert.equal(passoIniziale(pagina((p) => { confermata(p); p.password = { obbligatoria: true } }), true), 1)
  ok('dal ritorno dalla pagina della carta si va alla conferma, se i dati sono a posto')
}
{
  assert.equal(passoIniziale(pagina((p) => { p.stato = 'attivato'; confermata(p); p.inizio.scelto = '2026-11-09'; p.scelte.metodo = 'carta' }), false), 1)
  ok('a Guest Pass attivato la pagina dei passi non si usa (`passoIniziale` non la manda avanti)')
}
{
  // Una verifica della segreteria non decide il passo: lo dice la pagina in cima, a ogni passo, e ferma solo la conferma.
  assert.equal(passoIniziale(pagina((p) => { confermata(p); p.verifica = { stato: 'in_attesa', testo: 'x' } }), false), 2)
  ok('una verifica in corso non sposta il passo (ferma solo la conferma, come prima)')
}

console.log(`\n${passi} prove, tutte ok`)
