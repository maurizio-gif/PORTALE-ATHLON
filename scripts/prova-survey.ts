// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano delle survey di Club Life: i dati scritti nell'app (integrita', italiano e inglese), le regole di calcolo
// (media, soglia, forma della nota, user-agent) e l'invio (`inviaSondaggio`) con un `fetch` finto.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-survey.ts
//   SITO_SURVEYS_TS=/percorso/SITO-ATHLON/src/data/surveys.ts npx tsx scripts/prova-survey.ts   (in piu': il confronto col sito)
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

import { impostaLingua } from '../src/lib/lingua'
import { inviaSondaggio } from '../src/api/moduli'
import { agenteApp, etichettaVoto, formaNota, giudizioPositivo, mediaVoti, votiInOrdine } from '../src/features/lab/clublife/survey/calcolo'
import { RECENSIONE_GOOGLE, SLUG_SURVEY, SOGLIA, survey } from '../src/features/lab/clublife/survey/dati'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

// ---------------------------------------------------------------------------
// I dati scritti nell'app (survey/dati.ts).

{
  const s = survey()
  assert.deepEqual(s.temi.map((x) => x.slug), [...SLUG_SURVEY], 'gli slug dei temi sono quelli del menu del sito, nell\'ordine: SLUG_SURVEY non diverge')
  assert.equal(s.temi.some((x) => x.slug === 'iscrizione'), false, 'la survey nascosta (la manda il CRM) non e nell\'app')
  for (const x of s.temi) {
    assert.match(x.slug, /^[a-z0-9-]+$/, `${x.slug}: slug da indirizzo`)
    assert.ok(x.titolo && x.eyebrow && x.intro, `${x.slug}: titolo, occhiello e riga di presentazione`)
    assert.ok(x.domande.length >= 5 && x.domande.length <= 7, `${x.slug}: da cinque a sette domande (${x.domande.length})`)
    assert.equal(new Set(x.domande.map((d) => d.id)).size, x.domande.length, `${x.slug}: gli id delle domande sono unici`)
    for (const d of x.domande) assert.ok(/^[a-z0-9-]+$/.test(d.id) && d.testo.trim().length > 10, `${x.slug}/${d.id}: id da colonna e testo vero`)
  }
  assert.equal(s.stelle.length, 5)
  assert.deepEqual(s.soglia, { nps: 9, media: 4.5 })
  assert.equal(s.soglia.nps, SOGLIA.nps)
  assert.match(s.recensione, /^https:\/\/search\.google\.com\/local\/writereview\?placeid=/)
  assert.equal(s.recensione, RECENSIONE_GOOGLE)
  ok(`${s.temi.length} temi, ${s.temi.reduce((n, x) => n + x.domande.length, 0)} domande: slug e id da colonna, da cinque a sette domande per tema, nessuna iscrizione`)
}
{
  // Ogni testo ha la sua versione inglese (regola dell'app) e nessuna e' rimasta quella italiana per dimenticanza.
  const it = survey()
  impostaLingua('en')
  const en = survey()
  impostaLingua('it')
  assert.equal(survey().temi[0].titolo, it.temi[0].titolo, 'si torna all\'italiano')
  const stessi = []
  const conf = (a: string, b: string, dove: string) => {
    assert.ok(b.trim().length > 0, `${dove}: manca l'inglese`)
    if (a === b) stessi.push(`${dove}: «${a}»`)
  }
  en.temi.forEach((x, i) => {
    assert.equal(x.slug, it.temi[i].slug, 'lo slug non si traduce')
    conf(it.temi[i].titolo, x.titolo, `${x.slug}/titolo`)
    conf(it.temi[i].eyebrow, x.eyebrow, `${x.slug}/occhiello`)
    conf(it.temi[i].intro, x.intro, `${x.slug}/intro`)
    x.domande.forEach((d, k) => {
      assert.equal(d.id, it.temi[i].domande[k].id, `${x.slug}: l'id non si traduce`)
      conf(it.temi[i].domande[k].testo, d.testo, `${x.slug}/${d.id}`)
    })
  })
  conf(it.nps.testo, en.nps.testo, 'nps/testo'); conf(it.nps.minimo, en.nps.minimo, 'nps/minimo'); conf(it.nps.massimo, en.nps.massimo, 'nps/massimo')
  it.stelle.forEach((x, k) => conf(x, en.stelle[k], `stelle/${k + 1}`))
  for (const k of ['neutra', 'sotto', 'sopra']) { conf(it.nota[k].titolo, en.nota[k].titolo, `nota/${k}/titolo`); conf(it.nota[k].aiuto, en.nota[k].aiuto, `nota/${k}/aiuto`) }
  assert.deepEqual(stessi, [], 'testi uguali nelle due lingue (da tradurre): ' + stessi.join(' | '))
  assert.deepEqual(en.soglia, it.soglia)
  ok('italiano e inglese: ogni testo ha la sua traduzione, e slug e id restano gli stessi')
}

// ---------------------------------------------------------------------------
// calcolo: media, soglia, forma della nota.

{
  const s = survey()
  const domande = s.temi.find((x) => x.slug === 'piscina')!.domande
  const voti = votiInOrdine(domande, { corsie: 4, temperatura: 5, fuori: 3 })
  assert.deepEqual(voti.map((v) => [v.id, v.voto]), [['temperatura', 5], ['pulizia-acqua', null], ['corsie', 4], ['ritmo', null], ['bagnino', null], ['turno', null], ['bordo', null]], 'ordine delle domande del sito, null dove non ha risposto, nessun id estraneo')
  assert.equal(mediaVoti(voti), 4.5, 'la media conta solo le stelle date')
  assert.equal(mediaVoti(votiInOrdine(domande, {})), null)
  assert.equal(mediaVoti(votiInOrdine(domande, { temperatura: 5, corsie: 5, bagnino: 4 })), 4.67, 'due decimali, come sul sito')
  assert.ok(votiInOrdine(domande, { temperatura: 0, corsie: 6, bagnino: 2.5 }).every((v) => v.voto === null), 'fuori scala o non intero: non e un voto')
  ok('i voti restano nell ordine delle domande e la media e quella del sito')
}
{
  const { soglia } = survey()
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
  const s = survey()
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
// Il confronto col sito, se si da' il suo file: le survey sono scritte in due posti, e gli `slug` e gli `id` devono restare gli stessi (sono le
// colonne su Supabase), con le stesse parole italiane (la stessa domanda posta in due modi non e' confrontabile).

async function confrontoSito() {
  const percorso = process.env.SITO_SURVEYS_TS
  if (!percorso) return
  const sito = await import(pathToFileURL(percorso).href)
  const s = survey()
  assert.deepEqual(s.temi.map((x) => x.slug), sito.SURVEYS_DEL_MENU.map((x) => x.slug), 'gli stessi temi, nello stesso ordine')
  for (const x of s.temi) {
    const y = sito.SURVEYS_DEL_MENU.find((z) => z.slug === x.slug)
    assert.deepEqual(x.domande.map((d) => d.id), y.domande.map((d) => d.id), `${x.slug}: gli stessi id, nello stesso ordine`)
    x.domande.forEach((d, k) => assert.equal(d.testo, y.domande[k].testo, `${x.slug}/${d.id}: le stesse parole del sito`))
    assert.equal(x.titolo, y.titolo, `${x.slug}: lo stesso titolo`)
    assert.equal(x.eyebrow, y.eyebrow, `${x.slug}: lo stesso occhiello`)
    assert.equal(x.intro, y.intro, `${x.slug}: la stessa presentazione`)
  }
  assert.equal(s.nps.testo, sito.NPS.testo)
  assert.equal(s.nps.minimo, sito.NPS.minimo)
  assert.equal(s.nps.massimo, sito.NPS.massimo)
  assert.deepEqual(s.stelle, [...sito.STELLE])
  assert.deepEqual(s.soglia, { ...sito.SOGLIA }, 'la stessa soglia della recensione')
  assert.equal(s.recensione, sito.RECENSIONE_GOOGLE)
  // Le tre frasi della nota stanno nei dati del sito solo se li' sono esportate (`NOTA`); altrimenti sono dentro il client della pagina e non si confrontano qui.
  if (sito.NOTA) for (const k of ['neutra', 'sotto', 'sopra']) assert.deepEqual(s.nota[k], { ...sito.NOTA[k] }, `la nota «${k}»`)
  ok(`il confronto col sito: ${s.temi.length} temi e ${s.temi.reduce((n, x) => n + x.domande.length, 0)} domande uguali (slug, id e parole), stessa soglia, stessa scala`)
}

invii()
  .then(() => confrontoSito())
  .then(() => console.log(`\n${passi} prove passate`))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
