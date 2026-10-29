// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano delle parti pure dell'assistente del portale (src/features/lab/assistente): il lettore dello streaming, le destinazioni dei pulsanti
// (che devono combaciare con la mappa della funzione e con le rotte vere dell'app) e il riconoscimento della schermata. Niente rete, niente React.
//
//   npx tsx scripts/prova-assistente.ts
//
// Esce con codice 0 e scrive «ok» se tutto torna; al primo controllo che non torna lancia l'errore di `assert` col nome del caso.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DESTINAZIONI_ASSISTENTE, eDestinazioneAssistente, hrefAssistente, schermataAssistente } from '../src/features/lab/assistente/destinazioni'
import { LettoreSse } from '../src/features/lab/assistente/sse'

let passi = 0
const ok = (nome: string) => {
  passi++
  console.log(`ok  ${nome}`)
}

// ---------------------------------------------------------------------------
// Lo streaming.

{
  const corpo =
    'event: inizio\ndata: {"conversazione_id":"c1","messaggio_id":"m1"}\n\n' +
    'event: testo\ndata: {"t":"Hai "}\n\n' +
    'event: testo\ndata: {"t":"21,00 € da pagare."}\n\n' +
    'event: fine\ndata: {"testo":"Hai 21,00 € da pagare.","azioni":[{"destinazione":"home-pagamenti","parametri":{},"etichetta":"Apri Pagamenti"}],"origine":"ai"}\n\n'
  const atteso = [
    { evento: 'inizio', dati: { conversazione_id: 'c1', messaggio_id: 'm1' } },
    { evento: 'testo', dati: { t: 'Hai ' } },
    { evento: 'testo', dati: { t: '21,00 € da pagare.' } },
    { evento: 'fine', dati: { testo: 'Hai 21,00 € da pagare.', azioni: [{ destinazione: 'home-pagamenti', parametri: {}, etichetta: 'Apri Pagamenti' }], origine: 'ai' } },
  ]
  // Tagliato in pezzi di ogni misura, anche a meta' di una riga e di un carattere dell'evento.
  for (const n of [1, 2, 3, 5, 7, 13, 50, 1000]) {
    const l = new LettoreSse()
    const fuori = []
    for (let i = 0; i < corpo.length; i += n) fuori.push(...l.push(corpo.slice(i, i + n)))
    fuori.push(...l.fine())
    assert.deepEqual(fuori, atteso, `pezzi da ${n}`)
  }
  // Con gli a capo di Windows.
  const l = new LettoreSse()
  assert.deepEqual([...l.push(corpo.replace(/\n/g, '\r\n')), ...l.fine()], atteso)
  // Un evento rotto non ferma gli altri, un commento si salta, i dati su piu' righe si uniscono.
  const m = new LettoreSse()
  const e = m.push(': commento\n\nevent: testo\ndata: {rotto\n\nevent: testo\ndata: {"t":\ndata: "ciao"}\n\nevent: fine\ndata: [1,2]\n\n')
  assert.deepEqual(e, [{ evento: 'testo', dati: { t: 'ciao' } }])
  // L'ultimo evento senza la riga vuota si legge a fine corpo.
  const f = new LettoreSse()
  assert.deepEqual(f.push('event: fine\ndata: {"testo":"x"}'), [])
  assert.deepEqual(f.fine(), [{ evento: 'fine', dati: { testo: 'x' } }])
  assert.deepEqual(new LettoreSse().fine(), [])
  ok('LettoreSse: eventi interi comunque sia tagliato il corpo, CRLF, eventi rotti, ultimo evento senza riga vuota')
}

// ---------------------------------------------------------------------------
// Le destinazioni.

const RADICE = join(import.meta.dirname, '..')

/** La rotta esiste in `src/app/(portale)`? Un percorso come «/allenamento/[scheda]» o «/pagamenti/storico». */
function rottaEsiste(pathname: string): boolean {
  const base = join(RADICE, 'src/app/(portale)', pathname === '/' ? 'index' : pathname.replace(/^\//, ''))
  return existsSync(`${base}.tsx`) || existsSync(join(base, 'index.tsx'))
}

{
  for (const d of DESTINAZIONI_ASSISTENTE) {
    const h = hrefAssistente(d)
    assert.ok(h, `una destinazione senza indirizzo: ${d}`)
    const pathname = typeof h === 'string' ? h : (h as { pathname: string }).pathname
    assert.ok(rottaEsiste(pathname), `la rotta di ${d} (${pathname}) esiste nell'app`)
  }
  assert.equal(hrefAssistente('inventata'), null)
  assert.equal(eDestinazioneAssistente('home-pagamenti'), true)
  assert.equal(eDestinazioneAssistente('https://x.it'), false)
  assert.deepEqual(hrefAssistente('home-pagamenti'), { pathname: '/', params: { sezione: 'pagamenti' } })
  assert.deepEqual(hrefAssistente('home-certificato'), { pathname: '/', params: { sezione: 'certificato' } })
  assert.equal(hrefAssistente('metodo-pagamento'), '/metodo-pagamento')
  ok('destinazioni: ogni chiave ha un indirizzo e la sua rotta esiste nell\'app')
}

{
  assert.deepEqual(hrefAssistente('calendario', { giorno: '2026-10-31', attivita: 'Group Reformer' }), { pathname: '/calendario', params: { giorno: '2026-10-31', attivita: 'Group Reformer' } })
  assert.deepEqual(hrefAssistente('calendario', { giorno: '2026-10-31' }), { pathname: '/calendario', params: { giorno: '2026-10-31' } })
  assert.equal(hrefAssistente('calendario', {}), '/calendario')
  assert.equal(hrefAssistente('calendario', { giorno: 'domani' }), '/calendario', 'un giorno che non e una data si ignora')
  assert.equal(hrefAssistente('calendario', { attivita: 'Yoga' }), '/calendario', 'l\'attivita vale solo insieme al giorno (come il Calendario)')
  assert.deepEqual(hrefAssistente('piano', { id: 'abc-123' }), { pathname: '/allenamento/[scheda]', params: { scheda: 'abc-123' } })
  assert.equal(hrefAssistente('piano', { id: '../../x' }), '/allenamento', 'un id che non e un id non entra in un indirizzo')
  assert.equal(hrefAssistente('piano', {}), '/allenamento')
  assert.deepEqual(hrefAssistente('junior', { anno: '2018' }), { pathname: '/junior', params: { anno: '2018' } })
  assert.equal(hrefAssistente('junior', { anno: 'abcd' }), '/junior')
  // L'articolo di Club Life da cui il modello ha preso l'informazione (la funzione manda l'id vero, mai il testo del modello).
  assert.deepEqual(hrefAssistente('club-life-voce', { voce: 'news:chiusura-29-ottobre-2026-interruzione-energia' }), { pathname: '/club-life/news/[id]', params: { id: 'chiusura-29-ottobre-2026-interruzione-energia' } })
  assert.deepEqual(hrefAssistente('club-life-voce', { voce: 'evento:athlon-club-night-si-cambia-pista-31-ottobre' }), { pathname: '/club-life/eventi/[id]', params: { id: 'athlon-club-night-si-cambia-pista-31-ottobre' } })
  assert.deepEqual(hrefAssistente('club-life-voce', { voce: 'scheda:adulti/sospensione' }), { pathname: '/club-life/help-desk/[...scheda]', params: { scheda: ['adulti', 'sospensione'] } })
  assert.equal(hrefAssistente('club-life-voce', {}), '/club-life', 'senza la voce, l\'elenco')
  for (const sporca of ['news:../../x', 'scheda:../x/y', 'scheda:solo', 'news:a b', 'altro:x', 'https://x.it', 'news:' + 'a'.repeat(200)]) {
    assert.equal(hrefAssistente('club-life-voce', { voce: sporca }), '/club-life', 'una voce che non e una voce non entra in un indirizzo: ' + sporca)
  }
  ok('destinazioni: i parametri si ricontrollano (data, id, anno) e non finiscono mai nell\'indirizzo se sbagliati')
}

{
  // Le chiavi sono le stesse della mappa della funzione (tre elenchi da tenere uguali: qui, la funzione, il CRM che le nomina).
  const server = join(RADICE, '..', 'APP-ATHLON/supabase/functions/_shared/assistente/mappa.ts')
  if (existsSync(server)) {
    const testo = readFileSync(server, 'utf8')
    const blocco = testo.slice(testo.indexOf('export const CHIAVI_MAPPA'), testo.indexOf('] as const', testo.indexOf('export const CHIAVI_MAPPA')))
    const chiavi = [...blocco.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
    assert.ok(chiavi.length > 20, 'ho letto le chiavi della funzione')
    assert.deepEqual([...chiavi].sort(), [...DESTINAZIONI_ASSISTENTE].sort(), 'le chiavi dell\'app e quelle della funzione sono le stesse')
    ok('destinazioni: le stesse chiavi della mappa della funzione (APP-ATHLON)')
  } else {
    console.log('--  mappa della funzione non trovata accanto a questo repository: confronto saltato')
  }
}

{
  assert.equal(schermataAssistente('/', 'pagamenti'), 'home-pagamenti')
  assert.equal(schermataAssistente('/', 'certificato'), 'home-certificato')
  assert.equal(schermataAssistente('/', null), null, 'la Home senza sezione non e una schermata della mappa')
  assert.equal(schermataAssistente('/', 'inventata'), null)
  assert.equal(schermataAssistente('/calendario'), 'calendario')
  assert.equal(schermataAssistente('/calendario/'), 'calendario')
  assert.equal(schermataAssistente('/pagamenti/storico'), 'pagamenti-storico')
  assert.equal(schermataAssistente('/metodo-pagamento'), 'metodo-pagamento')
  assert.equal(schermataAssistente('/allenamento'), 'allenamento')
  assert.equal(schermataAssistente('/allenamento/agente'), 'componi-piano')
  assert.equal(schermataAssistente('/allenamento/alimentazione'), 'food')
  assert.equal(schermataAssistente('/allenamento/9f2c1a'), 'piano')
  assert.equal(schermataAssistente('/allenamento/9f2c1a/g1'), 'piano')
  assert.equal(schermataAssistente('/allenamento/balance'), null, 'una schermata dell\'allenamento che non e nella mappa')
  assert.equal(schermataAssistente('/allenamento/punteggio'), null)
  assert.equal(schermataAssistente('/shop/ordini'), 'shop-ordini')
  assert.equal(schermataAssistente('/shop/12'), 'shop')
  assert.equal(schermataAssistente('/club-life/news/3'), 'club-life')
  assert.equal(schermataAssistente('/boh'), null)
  // Quello che dice la schermata e sempre una destinazione che l'app conosce.
  for (const p of ['/', '/calendario', '/allenamento/9f2c1a', '/tv/x/y', '/junior', '/invita', '/notifiche', '/personal', '/abbonamento']) {
    const s = schermataAssistente(p, 'prodotti')
    assert.ok(s === null || eDestinazioneAssistente(s), p)
  }
  ok('schermataAssistente: dove si trova la persona, solo con chiavi della mappa')
}

console.log(`\n${passi} gruppi di prove: ok`)
