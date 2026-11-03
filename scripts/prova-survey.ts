// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano delle survey di Club Life: la lettura controllata del feed del sito (`surveyDa`), le regole di calcolo
// (media, soglia, forma della nota, user-agent) e l'invio (`inviaSondaggio`) con un `fetch` finto.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-survey.ts
//   CLUB_LIFE_JSON=/percorso/dist/club-life.json npx tsx scripts/prova-survey.ts   (in piu': il feed vero del sito)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { surveyDa } from '../src/api/clubLife'
import { inviaSondaggio } from '../src/api/moduli'
import { agenteApp, etichettaVoto, formaNota, giudizioPositivo, mediaVoti, votiInOrdine } from '../src/features/lab/clublife/survey/calcolo'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

const FEED = {
  temi: [
    {
      slug: 'piscina',
      titolo: 'Piscina e acqua',
      eyebrow: 'Le vasche',
      intro: 'L’acqua, le corsie.',
      domande: [
        { id: 'temperatura', testo: 'L’acqua era alla temperatura giusta' },
        { id: 'corsie', testo: 'Le corsie erano abbastanza libere' },
        { id: 'bagnino', testo: 'L’assistente bagnino era presente' },
      ],
      fonte: { testo: 'Vasca, corsie e orari', url: 'https://www.athlonroma.it/nuoto-libero/' },
    },
    { slug: 'junior', titolo: 'Corsi bambini', eyebrow: 'Per i genitori', intro: 'Com’è per tuo figlio.', domande: [{ id: 'istruttori', testo: 'Gli istruttori seguono i bambini' }], fonte: null },
  ],
  nps: { testo: 'Quanto è probabile che consigli Athlon?', minimo: 'Per niente probabile', massimo: 'Estremamente probabile' },
  stelle: ['Per niente', 'Poco', 'Abbastanza', 'Molto', 'Moltissimo'],
  soglia: { nps: 9, media: 4.5 },
  nota: {
    neutra: { titolo: 'Vuoi aggiungere qualcosa?', aiuto: 'Facoltativo.' },
    sotto: { titolo: 'Cosa potevamo fare meglio?', aiuto: 'Più è preciso…' },
    sopra: { titolo: 'C’è qualcosa che ti piacerebbe trovare?', aiuto: 'Un suggerimento.' },
  },
  recensione: 'https://search.google.com/local/writereview?placeid=ChIJxwtVpgxkLxMRdzofCeJVsYU',
}

// ---------------------------------------------------------------------------
// surveyDa: la forma controllata del feed.

{
  const s = surveyDa(FEED)!
  assert.equal(s.temi.length, 2)
  assert.equal(s.temi[0].domande.length, 3)
  assert.equal(s.temi[0].fonte!.url, 'https://www.athlonroma.it/nuoto-libero/')
  assert.equal(s.temi[1].fonte, null)
  assert.deepEqual(s.soglia, { nps: 9, media: 4.5 })
  assert.equal(s.nota.sotto.titolo, 'Cosa potevamo fare meglio?')
  ok('un feed buono si legge intero')
}
{
  assert.equal(surveyDa(undefined), null, 'senza il campo (il sito non ha il deploy): niente sezione')
  assert.equal(surveyDa(null), null)
  assert.equal(surveyDa('boh'), null)
  assert.equal(surveyDa({}), null)
  assert.equal(surveyDa({ ...FEED, soglia: undefined }), null, 'senza la soglia non si sa se chiedere la recensione')
  assert.equal(surveyDa({ ...FEED, soglia: { nps: '9', media: 4.5 } }), null, 'una soglia che non e un numero')
  assert.equal(surveyDa({ ...FEED, stelle: ['a', 'b'] }), null, 'la scala deve avere cinque voci')
  assert.equal(surveyDa({ ...FEED, nps: { testo: ' ' } }), null, 'senza la domanda dell NPS')
  assert.equal(surveyDa({ ...FEED, nota: { ...FEED.nota, sopra: undefined } }), null, 'una forma della nota che manca')
  assert.equal(surveyDa({ ...FEED, temi: [] }), null)
  ok('un feed sporco fa sparire la sezione, senza sollevare')
}
{
  const sporco = {
    ...FEED,
    temi: [
      ...FEED.temi,
      { slug: 'Senza Slug Valido!', titolo: 'x', domande: [{ id: 'a', testo: 'b' }] },
      { slug: 'vuoto', titolo: 'Senza domande', domande: [] },
      { slug: 'solo-sporche', titolo: 'Domande sporche', domande: [{ id: '', testo: 'x' }, { id: 'a', testo: ' ' }, null] },
      { slug: 'senza-titolo', titolo: ' ', domande: [{ id: 'a', testo: 'b' }] },
      null,
    ],
  }
  const s = surveyDa(sporco)!
  assert.deepEqual(s.temi.map((t) => t.slug), ['piscina', 'junior'], 'i temi sporchi si scartano, quelli buoni restano')
  const fonteStorta = surveyDa({ ...FEED, temi: [{ ...FEED.temi[0], fonte: { testo: 'x', url: 'javascript:alert(1)' } }] })!
  assert.equal(fonteStorta.temi[0].fonte, null, 'un indirizzo che non e http(s) non diventa un link')
  assert.equal(surveyDa({ ...FEED, recensione: 'javascript:alert(1)' })!.recensione, '', 'idem per la recensione: nessun pulsante')
  ok('temi, domande e indirizzi sporchi si scartano da soli')
}

// ---------------------------------------------------------------------------
// calcolo: media, soglia, forma della nota.

{
  const s = surveyDa(FEED)!
  const domande = s.temi[0].domande
  const voti = votiInOrdine(domande, { corsie: 4, temperatura: 5, fuori: 3 })
  assert.deepEqual(voti, [{ id: 'temperatura', voto: 5 }, { id: 'corsie', voto: 4 }, { id: 'bagnino', voto: null }], 'ordine delle domande, null dove non ha risposto, nessun id estraneo')
  assert.equal(mediaVoti(voti), 4.5, 'la media conta solo le stelle date')
  assert.equal(mediaVoti(votiInOrdine(domande, {})), null)
  assert.equal(mediaVoti(votiInOrdine(domande, { temperatura: 5, corsie: 5, bagnino: 4 })), 4.67, 'due decimali, come sul sito')
  assert.deepEqual(votiInOrdine(domande, { temperatura: 0, corsie: 6, bagnino: 2.5 }).map((v) => v.voto), [null, null, null], 'fuori scala o non intero: non e un voto')
  ok('i voti restano nell ordine delle domande e la media e quella del sito')
}
{
  const { soglia } = surveyDa(FEED)!
  assert.equal(giudizioPositivo(null, null, soglia), false, 'quando non si sa, non si chiede la recensione')
  assert.equal(giudizioPositivo(null, 9, soglia), true, 'NPS 9: promotore')
  assert.equal(giudizioPositivo(null, 8, soglia), false)
  assert.equal(giudizioPositivo(4.5, null, soglia), true, 'media 4,5')
  assert.equal(giudizioPositivo(4.49, null, soglia), false)
  assert.equal(giudizioPositivo(4.67, 6, soglia), true, 'in OR: media alta basta anche con un NPS basso')
  assert.equal(giudizioPositivo(3, 10, soglia), true, 'e un NPS alto basta anche con una media bassa')
  assert.equal(giudizioPositivo(0, 0, soglia), false, 'zero non e «non so»: e un giudizio, e non e positivo')
  ok('la soglia e quella del sito: NPS ≥ 9 oppure media ≥ 4,5, e nel dubbio no')
}
{
  const s = surveyDa(FEED)!
  assert.equal(formaNota(s, null, null).titolo, 'Vuoi aggiungere qualcosa?', 'senza giudizio: la forma neutra')
  assert.equal(formaNota(s, 2, null).titolo, 'Cosa potevamo fare meglio?', 'sotto soglia')
  assert.equal(formaNota(s, 5, 10).titolo, 'C’è qualcosa che ti piacerebbe trovare?', 'sopra soglia')
  assert.equal(formaNota(s, null, 3).titolo, 'Cosa potevamo fare meglio?', 'anche con il solo NPS')
  assert.equal(etichettaVoto(s, 4), 'Molto')
  assert.equal(etichettaVoto(s, undefined), '')
  assert.equal(etichettaVoto(s, 6), '')
  ok('la domanda aperta cambia con i voti: neutra, sotto, sopra')
}
{
  assert.deepEqual(agenteApp('web'), {}, 'sul web il browser ha il suo, e un\'intestazione in piu\' obbligherebbe il CORS a dichiararla')
  assert.deepEqual(agenteApp('windows'), {})
  assert.equal(agenteApp('android')['User-Agent'], 'AthlonClub-App/1.0 (android)')
  assert.equal(agenteApp('ios')['User-Agent'], 'AthlonClub-App/1.0 (ios)')
  // Il formato conta: `isbot` scarta «prodotto/versione» senza il commento della piattaforma (provato con isbot 5.2.2).
  assert.match(agenteApp('android')['User-Agent'], /^[A-Za-z-]+\/\d+(\.\d+)* \((android|ios)\)$/)
  ok('lo user-agent dell\'app ha il formato di un client vero, e solo dal telefono')
}

// ---------------------------------------------------------------------------
// inviaSondaggio, con un fetch finto: cosa parte, e quando la risposta vale «salvata».

// Il progetto e' CommonJS: `tsx` non ammette `await` a livello di modulo, quindi la parte asincrona sta in una funzione.
async function invii() {
type Chiamata = { url: string; init: RequestInit & { headers: Record<string, string> }; corpo: any }
function fetchFinto(risposta: () => Response | Promise<Response>) {
  const chiamate: Chiamata[] = []
  globalThis.fetch = (async (url: any, init: any) => {
    chiamate.push({ url: String(url), init, corpo: init?.body ? JSON.parse(init.body) : null })
    return risposta()
  }) as any
  return chiamate
}
const json = (corpo: unknown, stato = 200) => new Response(JSON.stringify(corpo), { status: stato, headers: { 'Content-Type': 'application/json' } })

const DATI = {
  sondaggio: 'piscina',
  risposte: [{ id: 'temperatura', voto: 5 }, { id: 'corsie', voto: null }],
  nps: 9,
  nota: 'Tutto bene',
  email: 'maria@esempio.it',
  numero: '4782',
}

await (async () => {
  const chiamate = fetchFinto(() => json({ esito: 'ricevuto' }))
  const r = await inviaSondaggio(DATI, agenteApp('android'))
  assert.deepEqual(r, { ok: true })
  assert.equal(chiamate.length, 1)
  const c = chiamate[0]
  assert.match(c.url, /\/functions\/v1\/sito-valutazioni\/sondaggio$/)
  assert.equal(c.init.method, 'POST')
  assert.equal(c.init.headers['Content-Type'], 'application/json')
  assert.equal(c.init.headers['User-Agent'], 'AthlonClub-App/1.0 (android)', 'lo user-agent dell\'app arriva alla funzione')
  assert.deepEqual(c.corpo, {
    sondaggio: 'piscina',
    risposte: [{ id: 'temperatura', voto: 5 }, { id: 'corsie', voto: null }],
    nps: 9,
    nota: 'Tutto bene',
    email: 'maria@esempio.it',
    userNumber: '4782',
    pagina: '/club-life/survey/piscina',
  })
  ok('l\'invio manda l\'utente dell\'accesso (email e numero socio) e la pagina dell\'app')
})()

await (async () => {
  const chiamate = fetchFinto(() => json({ esito: 'ricevuto' }))
  await inviaSondaggio({ ...DATI, numero: null, nps: null }, {})
  assert.equal('userNumber' in chiamate[0].corpo, false, 'senza numero socio la chiave non parte')
  assert.equal(chiamate[0].corpo.nps, null)
  assert.equal(chiamate[0].init.headers['User-Agent'], undefined, 'sul web nessuno user-agent')
  ok('senza numero socio e senza NPS: la chiave manca, l\'NPS e null')
})()

await (async () => {
  // La funzione scarta in silenzio i client che sembrano script: 200 `{ok:true}`, senza `esito`. Non e' «salvata».
  fetchFinto(() => json({ ok: true }))
  const r = await inviaSondaggio(DATI)
  assert.equal(r.ok, false, 'un 200 senza esito «ricevuto» non vale come inviata')
  assert.ok(r.errore.length > 10)
  ok('un 200 senza esito (richiesta scartata come bot) e un errore, mai un «grazie»')
})()

await (async () => {
  fetchFinto(() => json({ errore: 'nessun giudizio' }, 400))
  const r = await inviaSondaggio(DATI)
  assert.deepEqual(r, { ok: false, errore: 'nessun giudizio' }, 'l\'errore del server si mostra')
  fetchFinto(() => json({ errore: 'Non salvato.' }, 500))
  assert.equal((await inviaSondaggio(DATI)).ok, false)
  fetchFinto(() => new Response('<html>502</html>', { status: 502 }))
  const r2 = await inviaSondaggio(DATI)
  assert.equal(r2.ok, false, 'una risposta che non e JSON non rompe niente')
  assert.ok(r2.errore.length > 10)
  ok('errori del server: si mostrano, anche se la risposta non e JSON')
})()

await (async () => {
  globalThis.fetch = (async () => {
    throw new TypeError('Network request failed')
  }) as any
  const r = await inviaSondaggio(DATI)
  assert.equal(r.ok, false)
  assert.match(r.errore, /Connessione non riuscita|Connection failed/)
  ok('rete assente: un messaggio chiaro, senza sollevare')
})()
}

// ---------------------------------------------------------------------------
// Il feed vero del sito, se c'e': e' il contratto fra le due meta.

function feedVero() {
  const percorso = process.env.CLUB_LIFE_JSON
  if (!percorso) return
  const vero = JSON.parse(readFileSync(percorso, 'utf8'))
  const s = surveyDa(vero.survey)
  assert.ok(s, 'il feed del sito ha un campo `survey` che l\'app legge')
  assert.ok(s.temi.length >= 8, `almeno gli otto temi del menu (trovati ${s.temi.length})`)
  assert.equal(s.temi.some((x) => x.slug === 'iscrizione'), false, 'la survey nascosta (la manda il CRM) non e nell\'app')
  for (const x of s.temi) {
    assert.ok(x.domande.length >= 3 && x.domande.length <= 7, `${x.slug}: da tre a sette domande`)
    assert.equal(new Set(x.domande.map((d) => d.id)).size, x.domande.length, `${x.slug}: gli id delle domande sono unici`)
    if (x.fonte) assert.match(x.fonte.url, /^https:\/\/www\.athlonroma\.it\/.+\/$/, `${x.slug}: la fonte e un indirizzo intero con lo slash finale`)
  }
  assert.match(s.recensione, /^https:\/\/search\.google\.com\/local\/writereview\?placeid=/)
  ok(`il feed vero del sito: ${s.temi.length} temi, ${s.temi.reduce((n, x) => n + x.domande.length, 0)} domande, soglia ${s.soglia.nps}/${s.soglia.media}`)
}

invii()
  .then(() => feedVero())
  .then(() => console.log(`\n${passi} prove passate`))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
