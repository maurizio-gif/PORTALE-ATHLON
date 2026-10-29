// Prova a mano della classifica mensile (supabase/functions/_shared/classifica/*): il punteggio del mese, le posizioni, quali righe si
// mostrano, il nome pubblico, il mese e il motto. Niente rete, niente database.
//
//   node --experimental-strip-types supabase/functions/_prove/classifica.ts
//   (o: npx tsx supabase/functions/_prove/classifica.ts)
//
// L'equivalenza con il calcolo SQL (`athlon_classifica_punteggio`) si prova a parte, su dati veri in sola lettura: vedi il CLAUDE.md, «La classifica mensile».

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { MOTTO_MAX, validaMotto } from '../_shared/classifica/motto.ts'
import { punteggioMese, quotaNotte, spostaGiorno, type IngressiMese } from '../_shared/classifica/punteggio.ts'
import { meseDa, nomePubblico, posizioni, rigaPubblica, scegliRighe, type Candidato } from '../_shared/classifica/righe.ts'
import { VERSIONE_INFORMATIVA_CLASSIFICA } from '../_shared/classifica/versione.ts'

let passi = 0
const ok = (nome: string) => {
  passi++
  console.log(`ok  ${nome}`)
}

// ---------------------------------------------------------------------------
// Il punteggio del mese. Ottobre 2026: il 1 e' giovedi'. Le settimane (lunedi'-domenica) che lo toccano: 28 set-4 ott (4 giorni nel mese),
// 5-11, 12-18, 19-25 (7 giorni ciascuna) e 26 ott-1 nov (6 giorni; la finestra si ferma al 31).

const base = (extra: Partial<IngressiMese> = {}): IngressiMese => ({
  mese: '2026-10-01', oggi: '2026-11-01', giorniTrain: [], primaTrain: '2026-01-05', food: null, recover: null, ...extra,
})
const P = (i: IngressiMese) => punteggioMese(i).punteggio
const intervallo = (da: string, a: string) => {
  const r: string[] = []
  for (let g = da; g <= a; g = spostaGiorno(g, 1)) r.push(g)
  return r
}
// Tre giorni attivi in ogni finestra di 7 giorni: lunedi', mercoledi', venerdi'.
const treAllaSettimana = ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26', '2026-10-28', '2026-10-30']

assert.equal(P(base()), 0)
assert.equal(P(base({ giorniTrain: treAllaSettimana })), 100)
ok('nessuna attivita\' = 0; tre giorni a settimana tutte le settimane = 100, con i soli Train')

// Una settimana a cavallo pesa per i giorni che ha nel mese: la prima (4 giorni nel mese) con un giorno solo (0,4), le altre al massimo:
// (4 x 0,4 + 7 + 7 + 7 + 6) / 31 = 28,6 / 31 = 0,9226 -> 92. Con una media semplice sulle cinque settimane sarebbe 0,92 -> 92 solo per caso: si prova anche l'opposto.
const dalla5 = treAllaSettimana.filter((g) => g > '2026-10-04')
assert.equal(P(base({ giorniTrain: ['2026-09-29', ...dalla5] })), 92)
// Stesso ritmo ma l'unica settimana debole e' quella da 7 giorni (la seconda): (4 + 0,4 x 7 + 7 + 7 + 6) / 31 = 26,8 / 31 -> 86. Se pesasse uguale ogni settimana sarebbe 88.
const senzaLaSeconda = treAllaSettimana.filter((g) => g < '2026-10-05' || g > '2026-10-11')
assert.equal(P(base({ giorniTrain: [...senzaLaSeconda, '2026-10-06'] })), 86)
ok('le settimane a cavallo di due mesi pesano per i giorni che hanno nel mese (92 e 86)')

// Il bordo del mese: 28 ottobre - 3 novembre. A novembre, il 3, ieri e' il 2: le settimane sono quella del 26 ott (1 giorno in novembre,
// finestra 26 ott-1 nov) e quella del 2 nov (1 giorno, finestra 27 ott-2 nov). Il ritmo di fine ottobre conta a novembre per i giorni che ha li'.
const novembre = base({ mese: '2026-11-15', oggi: '2026-11-03', giorniTrain: ['2026-10-28', '2026-10-30', '2026-11-02'] })
assert.deepEqual(punteggioMese(novembre), { punteggio: 100, giorni_attivi: 1 })
assert.equal(punteggioMese(base({ mese: '2026-11-15', oggi: '2026-11-03', giorniTrain: [] })).punteggio, 0)
// Il 1 novembre il mese non e' ancora cominciato (ieri e' il 31 ottobre): niente settimane.
assert.deepEqual(punteggioMese(base({ mese: '2026-11-01', oggi: '2026-11-01', giorniTrain: treAllaSettimana })), { punteggio: 0, giorni_attivi: 0 })
// E ottobre, a mezzanotte fra il 31 e il 1: stessi giorni, mese chiuso (oggi = 1 novembre) o ancora in corso (oggi = 31 ottobre) cambiano solo l'ultimo giorno.
assert.equal(P(base({ oggi: '2026-10-31', giorniTrain: treAllaSettimana })), 100)
ok('il bordo del mese: 28 ottobre - 3 novembre, il 1 novembre il nuovo mese e\' vuoto')

// I giorni attivi sono quelli del mese, fino a ieri: oggi e i giorni prima del primo non contano.
assert.equal(punteggioMese(base({ oggi: '2026-10-29', giorniTrain: ['2026-09-30', '2026-10-02', '2026-10-28', '2026-10-29'] })).giorni_attivi, 2)
ok('i giorni attivi sono quelli del mese, fino a ieri (oggi no)')

// Le settimane prima della prima attivita' non contano: chi comincia il 20 ottobre non parte penalizzato.
const dal21 = ['2026-10-21', '2026-10-23', '2026-10-26', '2026-10-28', '2026-10-30']
assert.equal(P(base({ primaTrain: '2026-10-20', giorniTrain: dal21 })), 100)
assert.equal(P(base({ primaTrain: '2026-01-05', giorniTrain: dal21 })), 42) // le prime tre settimane valgono 0: (7 + 6) / 31
ok('le settimane prima della prima attivita\' non contano')

// La curva di Train, su una sola settimana (la finestra 25-31 ottobre, la sola che finisce dopo il 26): 1 giorno 0,4; 5 giorni 0,9; 7 giorni 0,7.
const unaSettimana = (giorniTrain: string[]) => base({ oggi: '2026-11-02', primaTrain: '2026-10-26', giorniTrain })
assert.equal(P(unaSettimana(['2026-10-26'])), 40)
assert.equal(P(unaSettimana(intervallo('2026-10-26', '2026-10-30'))), 90)
assert.equal(P(unaSettimana(intervallo('2026-10-25', '2026-10-31'))), 70)
assert.equal(P(unaSettimana(['2026-10-26', '2026-10-28'])), 100)
ok('la curva di Train: 1 giorno 40, 2 giorni 100, 5 giorni 90, 7 giorni 70 (e\' il ritmo che si premia, non il volume)')

// Food e Recover: solo se in uso. Chi non li usa arriva a 100; chi li usa e non scrive niente no: il consenso non e' un vantaggio.
const vuoto = { giorni: [] as string[], prima: '2026-09-01' }
assert.equal(P(base({ giorniTrain: treAllaSettimana, food: null, recover: null })), 100)
assert.equal(P(base({ giorniTrain: treAllaSettimana, food: vuoto, recover: null })), 82) // 70 / 85
assert.equal(P(base({ giorniTrain: treAllaSettimana, food: null, recover: { notti: [], prima: '2026-09-01' } })), 82)
assert.equal(P(base({ giorniTrain: treAllaSettimana, food: vuoto, recover: { notti: [], prima: '2026-09-01' } })), 70) // 70 / 100
ok('chi non usa Food ne\' Recover arriva a 100; chi li usa e non scrive niente no (82 e 70): il consenso non e\' un vantaggio')

// Food: i giorni buoni per finestra, cinque o piu' = massimo; due = 0,4 -> (70 + 15 x 0,4) / 85 = 0,894 -> 89.
const giorniSett = intervallo('2026-09-20', '2026-10-31')
assert.equal(P(base({ giorniTrain: treAllaSettimana, food: { giorni: giorniSett, prima: '2026-09-01' } })), 100)
const lunGio = ['2026-09-28', '2026-10-01', '2026-10-05', '2026-10-08', '2026-10-12', '2026-10-15', '2026-10-19', '2026-10-22', '2026-10-26', '2026-10-29']
assert.equal(P(base({ giorniTrain: treAllaSettimana, food: { giorni: lunGio, prima: '2026-09-01' } })), 89)
ok('Food: cinque giorni di diario buoni = massimo; due = 0,4')

// Recover: sette ore = 1, sei = 0,7, cinque = 0,4, meno = 0,2; cinque notti su sette bastano (le quote si sommano e si dividono per cinque).
assert.equal(quotaNotte(420), 1)
assert.equal(quotaNotte(419), 0.7)
assert.equal(quotaNotte(360), 0.7)
assert.equal(quotaNotte(359), 0.4)
assert.equal(quotaNotte(300), 0.4)
assert.equal(quotaNotte(299), 0.2)
const notti = (minuti: number) => ({ notti: giorniSett.map((giorno) => ({ giorno, minuti })), prima: '2026-09-01' })
const conNotti = (m: number) => P(base({ giorniTrain: treAllaSettimana, recover: notti(m) }))
assert.equal(conNotti(450), 100)
assert.equal(conNotti(360), 100) // 7 x 0,7 / 5 = 0,98 -> (70 + 14,7) / 85 = 0,9965
assert.equal(conNotti(300), 92) // 7 x 0,4 / 5 = 0,56 -> (70 + 8,4) / 85 = 0,9224
assert.equal(conNotti(240), 87) // 7 x 0,2 / 5 = 0,28 -> (70 + 4,2) / 85 = 0,8729
ok('Recover: le notti valgono per le ore (sette ore il massimo)')

// Il pilastro comincia dalla sua prima attivita': notti scritte solo dal 20 ottobre non penalizzano le settimane prima.
const nottiDal20 = { notti: intervallo('2026-10-20', '2026-10-31').map((giorno) => ({ giorno, minuti: 450 })), prima: '2026-10-20' }
assert.equal(P(base({ giorniTrain: treAllaSettimana, recover: nottiDal20 })), 100)
ok('Recover e Food contano dalla loro prima attivita\'')

// ---------------------------------------------------------------------------
// Le posizioni e le righe che si vedono.

const cand = (punti: number[]): Candidato[] => punti.map((p, i) => ({ member_id: 1000 + i, riga_id: `riga-${i}`, punti: p }))
assert.deepEqual(posizioni(cand([90, 80, 80, 70, 70, 70, 10])).map((r) => r.posizione), [1, 2, 2, 4, 4, 4, 7])
assert.deepEqual(posizioni([]), [])
ok('i parimerito hanno la stessa posizione e si salta (1, 2, 2, 4, 4, 4, 7)')

const trenta = posizioni(cand(Array.from({ length: 30 }, (_, i) => 100 - i)))
const pos = (r: { posizione: number }[]) => r.map((x) => x.posizione)
const interi = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k)
assert.deepEqual(pos(scegliRighe(trenta, 1000 + 19)), [...interi(1, 10), ...interi(18, 22)]) // la ventesima: prime dieci, e due sopra e due sotto
assert.deepEqual(pos(scegliRighe(trenta, 1000 + 10)), interi(1, 13)) // l'undicesima: i vicini toccano le prime dieci, senza ripetizioni
assert.deepEqual(pos(scegliRighe(trenta, 1000 + 2)), interi(1, 10)) // fra le prime dieci: niente di piu'
assert.deepEqual(pos(scegliRighe(trenta, 1000 + 29)), [...interi(1, 10), 28, 29, 30]) // l'ultima: solo i due sopra
assert.deepEqual(pos(scegliRighe(trenta, null)), interi(1, 10)) // chi non ha punti non e' in lista: solo le prime dieci
assert.deepEqual(pos(scegliRighe(trenta, 99999)), interi(1, 10))
assert.deepEqual(scegliRighe([], 5), [])
ok('prime dieci posizioni, e la persona con due sopra e due sotto se e\' piu\' in basso')

// Il decimo posto alla pari: chi ha lo stesso punteggio del decimo entra tutto.
const allaPari = posizioni(cand([100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 91, 91, 80]))
assert.deepEqual(pos(scegliRighe(allaPari, null)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10])
ok('chi e\' alla pari al decimo posto entra tutto')

// ---------------------------------------------------------------------------
// Il nome pubblico, il mese, e cosa esce per ogni riga.

assert.equal(nomePubblico('MARCO', 'ROSSI'), 'Marco R.')
assert.equal(nomePubblico('maria grazia', 'de luca'), 'Maria D.')
assert.equal(nomePubblico('Anna-Maria', 'Esposito'), 'Anna-Maria E.')
assert.equal(nomePubblico('Luca', ''), 'Luca')
assert.equal(nomePubblico(null, 'Rossi'), 'Socio R.')
assert.equal(nomePubblico('', ''), 'Socio')
assert.ok(!nomePubblico('Marco', 'Rossi').includes('ossi'))
ok('il nome pubblico: primo nome e iniziale del cognome, mai il cognome intero')

assert.deepEqual(meseDa('2026-10-28'), { id: '2026-10', inizio: '2026-10-01', fine: '2026-10-31', giorni_rimasti: 4 })
assert.equal(meseDa('2026-10-31').giorni_rimasti, 1)
assert.equal(meseDa('2026-11-01').giorni_rimasti, 30)
assert.equal(meseDa('2026-11-01').id, '2026-11')
assert.equal(meseDa('2028-02-10').fine, '2028-02-29')
assert.equal(meseDa('2027-02-10').fine, '2027-02-28')
ok('il mese: primo e ultimo giorno, e i giorni che restano (oggi compreso)')

const riga = rigaPubblica(
  { member_id: 77123, riga_id: 'b1f0c2a4-0000-4000-8000-000000000001', punti: 63, posizione: 5 },
  { nome: 'MARCO', cognome: 'Rossi Bianchi', motto: 'Un passo alla volta', motto_nascosto: false },
  'https://esempio.test/foto.jpg',
  42,
)
assert.deepEqual(Object.keys(riga).sort(), ['foto', 'id', 'motto', 'nome', 'posizione', 'punti', 'tu'])
const testo = JSON.stringify(riga)
assert.ok(!testo.includes('77123') && !testo.includes('Rossi') && !testo.includes('Bianchi'))
assert.equal(riga.nome, 'Marco R.')
assert.equal(riga.tu, false)
assert.equal(rigaPubblica({ member_id: 42, riga_id: 'x', punti: 1, posizione: 9 }, undefined, null, 42).tu, true)
assert.equal(rigaPubblica({ member_id: 1, riga_id: 'x', punti: 1, posizione: 9 }, { nome: 'A', cognome: 'B', motto: 'ciao', motto_nascosto: true }, null, 42).motto, null)
ok('una riga porta solo id opaco, posizione, nome, punti, motto, foto e «tu»: mai il member_id ne\' il cognome intero; il motto nascosto dallo staff non esce')

// ---------------------------------------------------------------------------
// Il motto.

const m = (x: unknown) => validaMotto(x)
assert.deepEqual(m('Un passo alla volta'), { ok: true, motto: 'Un passo alla volta' })
assert.deepEqual(m('  Un   passo\talla\nvolta  '), { ok: true, motto: 'Un passo alla volta' })
assert.deepEqual(m('a' + String.fromCharCode(0x200b) + 'b' + String.fromCharCode(7) + 'c'), { ok: true, motto: 'a b c' }) // invisibili e controllo -> spazio
assert.deepEqual(m(''), { ok: true, motto: null })
assert.deepEqual(m('   '), { ok: true, motto: null })
assert.deepEqual(m(null), { ok: true, motto: null })
assert.deepEqual(m(undefined), { ok: true, motto: null })
assert.equal(m(42).ok, false)
assert.equal(m({}).ok, false)
ok('un motto normale passa, ripulito agli spazi; vuoto o null = nessun motto')

// I numeri sono scritti qui apposta (non `MOTTO_MAX`): se qualcuno cambia il limite, la prova se ne accorge. Lo stesso 80 e' nell'app (`comune.ts`).
assert.equal(MOTTO_MAX, 80)
assert.equal(m('a'.repeat(80)).ok, true)
assert.equal(m('a'.repeat(81)).ok, false)
assert.equal(m('💪'.repeat(80)).ok, true) // conta i caratteri, non i byte
assert.equal(m('💪'.repeat(81)).ok, false)
ok('al massimo 80 caratteri (non byte)')

for (const cattivo of ['vai su https://esempio.it', 'www.athlon.it', 'scrivimi a marco@esempio.it', '@marco_fit', 'sito: esempio.com', 'wa.me/393401234567', 'chiamami 340 1234567', 'tel. 06-1234-5678', 'bit.ly/abc']) {
  assert.equal(m(cattivo).ok, false, cattivo)
}
ok('niente link, mail, @, indirizzi o numeri di telefono')

for (const cattivo of ['che cazzo', 'C4zz0 duro', 'sei una merda', 'vaffanculo', 'v a f f a n c u l o', 'fuck the limits', 'Sh1t happens', 'stronzate? no: stronzo']) {
  assert.equal(m(cattivo).ok, false, cattivo)
}
ok('le parole non ammesse, anche scritte con numeri al posto delle lettere o con gli spazi in mezzo')

for (const buono of ['Kill your limits', 'Ammazzo la fatica', 'Un passo alla volta', 'Ogni giorno un po\' meglio', 'Scarpe nazionali', 'Negroni dopo l\'allenamento', 'Più forte di ieri 💪', 'No pain, no gain', 'Classe 1970: ancora in gara']) {
  assert.equal(m(buono).ok, true, buono)
}
ok('non blocca le frasi da palestra normali (kill your limits, ammazzo la fatica) ne\' parole che ne contengono altre')

const rifiutato = m('scrivimi su me@esempio.it')
assert.ok(!rifiutato.ok && rifiutato.errore.length > 10)
ok('il rifiuto dice il motivo, leggibile da una persona')

// ---------------------------------------------------------------------------
// Le versioni: la costante del server, quella dell'app e quella scritta nella migrazione devono essere la stessa.

const qui = new URL('.', import.meta.url)
const app = ['../../../../../src/features/lab/classifica/informativa.ts', '../../../../PORTALE-ATHLON/src/features/lab/classifica/informativa.ts']
  .map((p) => new URL(p, qui))
  .find((u) => existsSync(u))
if (app) {
  const m2 = readFileSync(app, 'utf8').match(/VERSIONE_INFORMATIVA_CLASSIFICA\s*=\s*'([^']+)'/)
  assert.equal(m2?.[1], VERSIONE_INFORMATIVA_CLASSIFICA)
  ok(`la versione dell'informativa e' la stessa nell'app e nel server (${VERSIONE_INFORMATIVA_CLASSIFICA})`)
} else {
  console.log('--  versione dell\'app: file non trovato da qui, saltata')
}
const migrazione = new URL('../../migrations/20261029a_athlon_classifica.sql', qui)
if (existsSync(migrazione)) {
  assert.ok(readFileSync(migrazione, 'utf8').includes(`('classifica', '${VERSIONE_INFORMATIVA_CLASSIFICA}')`))
  ok('la migrazione parte con la stessa versione')
}

console.log(`\n${passi} gruppi di prove, tutti passati.`)
