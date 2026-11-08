// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano della survey dell'app «funzione per funzione» (08/11/2026): i dati (integrita', i limiti del server, italiano e inglese),
// le regole di quello che parte (presenza = uso, marcatori `non-usa-*`, nota composta) e l'invio con un `fetch` finto.
//   LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-survey-app.ts
import assert from 'node:assert/strict'

import { inviaSondaggio } from '../src/api/moduli'
import { agenteApp } from '../src/features/lab/clublife/survey/calcolo'
import {
  BOZZA_VUOTA,
  FINALE_VUOTO,
  MAX_NOTA,
  capitoliFatti,
  mediaCapitolo,
  notaCapitolo,
  notaFinale,
  prossimoCapitolo,
  righeCapitolo,
  righeFinale,
  vociMassime,
} from '../src/features/lab/clublife/survey/calcolo-app'
import {
  CAPITOLI_APP,
  DOMANDE_GENERALI,
  ID_SURVEY_APP,
  MAX_PRIORITA,
  MAX_VOCI,
  NPS_APP,
  PROBLEMI,
  SLUG_FINALE,
  SOGLIA_PROBLEMI,
  STELLE_FUNZIONE,
  capitoloApp,
  funzioniTotali,
} from '../src/features/lab/clublife/survey/dati-app'
import { SLUG_SURVEY } from '../src/features/lab/clublife/survey/dati'
import { STATO_APP_VUOTO, aggiornaBozza, aggiornaFinale, azzeraSurveyApp, leggiSurveyApp, segnaInviato, segnaNonUsa } from '../src/features/lab/clublife/survey/statoApp'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

// ---------------------------------------------------------------------------
// I dati.

{
  assert.equal(CAPITOLI_APP.length, 8, 'otto capitoli: la riga finale ne tiene un marcatore ciascuno')
  const ids = new Set<string>()
  const slugs = new Set<string>()
  for (const c of CAPITOLI_APP) {
    assert.match(c.id, /^[a-z0-9-]+$/, `${c.id}: id da indirizzo`)
    assert.equal(c.slug, `app-${c.id}`, `${c.id}: lo slug segue l'id`)
    assert.ok(c.slug.length <= 60, `${c.slug}: il server tronca a 60`)
    assert.ok(!ids.has(c.id) && !slugs.has(c.slug), `${c.id}: id e slug unici`)
    ids.add(c.id)
    slugs.add(c.slug)
    assert.ok(!(SLUG_SURVEY as readonly string[]).includes(c.slug), `${c.slug}: non e uno dei temi del sito`)
    assert.ok(c.id !== 'finale' && c.id !== ID_SURVEY_APP, `${c.id}: non deve coprire la rotta del giudizio finale`)
    assert.ok(c.funzioni.length >= 5 && c.funzioni.length <= MAX_VOCI, `${c.id}: da cinque a ${MAX_VOCI} funzioni (${c.funzioni.length})`)
    const f = new Set<string>()
    for (const x of c.funzioni) {
      assert.match(x.id, /^[a-z0-9-]+$/, `${c.id}/${x.id}: id da colonna`)
      assert.ok(x.id.length <= 60, `${x.id}: il server tronca a 60`)
      assert.ok(!f.has(x.id), `${c.id}/${x.id}: id unico nel capitolo`)
      f.add(x.id)
      assert.ok(!x.id.startsWith('non-usa-'), `${x.id}: non confondibile con un marcatore`)
      assert.ok(x.nome.it.length > 3 && x.cosa.it.length > 10, `${x.id}: nome e descrizione veri`)
    }
  }
  assert.equal(funzioniTotali(), CAPITOLI_APP.reduce((n, c) => n + c.funzioni.length, 0))
  ok(`${CAPITOLI_APP.length} capitoli, ${funzioniTotali()} funzioni: id da colonna, slug app-*, nessuno uguale ai temi del sito`)
}
{
  // I limiti del server: dodici voci per invio. Se un giorno i capitoli diventano nove, i marcatori finirebbero tagliati in silenzio.
  const m = vociMassime()
  assert.ok(m.capitolo <= MAX_VOCI, `il capitolo piu lungo (${m.capitolo}) sta nelle ${MAX_VOCI} voci`)
  assert.ok(m.finale <= MAX_VOCI, `la riga finale ha al massimo ${m.finale} voci (generali + un marcatore per capitolo): oltre ${MAX_VOCI} il server taglia dalla coda`)
  assert.equal(MAX_VOCI, 12, 'il tetto del server e quello di sito-valutazioni (slice(0, 12)): se cambia, cambia anche qui')
  const tutti = [...CAPITOLI_APP.map((c) => c.id)]
  assert.equal(righeFinale(FINALE_VUOTO, tutti).length, m.finale, 'anche con tutti i capitoli inutilizzati')
  ok(`i limiti del server: capitolo ≤ ${m.capitolo} voci, riga finale ≤ ${m.finale} voci su ${MAX_VOCI}`)
}
{
  // Il CRM ripulisce gli id: devono restare leggibili, e nessun id di domanda generale puo coincidere con un marcatore.
  const ripulito = (id: string) => id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
  assert.equal(ripulito('prenotare-una-lezione'), 'Prenotare una lezione')
  assert.equal(ripulito('non-usa-food-recover'), 'Non usa food recover')
  const g = new Set(DOMANDE_GENERALI.map((q) => q.id))
  assert.equal(g.size, DOMANDE_GENERALI.length)
  for (const id of g) assert.ok(!id.startsWith('non-usa-'))
  assert.equal(DOMANDE_GENERALI.length, 4)
  assert.equal(STELLE_FUNZIONE.length, 5)
  assert.equal(SLUG_FINALE, 'app-generale')
  ok('gli id si leggono nel CRM (ripuliti) e le domande generali non si confondono con i marcatori')
}
{
  // Ogni testo ha le due lingue, diverse (tranne i nomi che non si traducono).
  const uguali: string[] = []
  const conf = (x: { it: string; en: string }, dove: string) => {
    assert.ok(x.it.trim().length > 0 && x.en.trim().length > 0, `${dove}: manca una lingua`)
    if (x.it === x.en) uguali.push(`${dove}: «${x.it}»`)
  }
  for (const c of CAPITOLI_APP) {
    conf(c.titolo, `${c.id}/titolo`)
    conf(c.eyebrow, `${c.id}/occhiello`)
    conf(c.intro, `${c.id}/intro`)
    for (const f of c.funzioni) {
      conf(f.nome, `${c.id}/${f.id}/nome`)
      conf(f.cosa, `${c.id}/${f.id}/cosa`)
    }
  }
  STELLE_FUNZIONE.forEach((s, k) => conf(s, `stelle/${k + 1}`))
  PROBLEMI.forEach((p) => conf(p.testo, `problemi/${p.id}`))
  DOMANDE_GENERALI.forEach((q) => conf(q.testo, `generali/${q.id}`))
  conf(NPS_APP.testo, 'nps/testo')
  conf(NPS_APP.minimo, 'nps/minimo')
  conf(NPS_APP.massimo, 'nps/massimo')
  // Marchi e nomi propri che in inglese restano com'e': li dichiara chi li scrive, uno per uno.
  const nomiPropri = new Set(['Gym Floor', 'Athlon TV', 'Athlon Health Score', 'Athlon Health System · Train', 'Personal training'])
  const da_tradurre = uguali.filter((u) => !Array.from(nomiPropri).some((n) => u.endsWith(`«${n}»`)))
  assert.deepEqual(da_tradurre, [], 'testi uguali nelle due lingue (da tradurre): ' + da_tradurre.join(' | '))
  ok('italiano e inglese: ogni testo ha le due lingue, e solo i nomi propri sono uguali')
}

// ---------------------------------------------------------------------------
// Le voci di un capitolo: presenza = uso.

{
  const cap = capitoloApp('prenotazioni')!
  const [a, b, c, d] = cap.funzioni
  // Ordine dei tocchi diverso dall'ordine del capitolo: le voci escono nell'ordine del capitolo.
  const bozza = { ...BOZZA_VUOTA, usate: [c.id, a.id, d.id], voti: { [a.id]: 4, [c.id]: 2, [b.id]: 5, fuori: 3 } }
  const r = righeCapitolo(cap, bozza)
  assert.deepEqual(r, [{ id: a.id, voto: 4 }, { id: c.id, voto: 2 }, { id: d.id, voto: null }], 'solo le usate, in ordine del capitolo, null dove non ha dato un voto')
  assert.ok(!r.some((x) => x.id === b.id), 'un voto dato a una funzione non spuntata come usata non parte: la presenza dice che la usa')
  assert.equal(mediaCapitolo(cap, bozza), 3, 'la media conta solo le stelle date')
  assert.equal(mediaCapitolo(cap, { ...BOZZA_VUOTA, usate: [a.id] }), null, 'usa ma non vota: nessuna media, il server rifiuterebbe')
  assert.deepEqual(righeCapitolo(cap, { ...BOZZA_VUOTA, usate: ['inventata'], voti: { inventata: 5 } }), [], 'un id che non e del capitolo non passa')
  assert.deepEqual(righeCapitolo(cap, { ...BOZZA_VUOTA, usate: [a.id], voti: { [a.id]: 7 } }), [{ id: a.id, voto: null }], 'voto fuori scala: non e un voto')
  assert.deepEqual(righeCapitolo(cap, { ...BOZZA_VUOTA, usate: [a.id], voti: { [a.id]: 2.5 } }), [{ id: a.id, voto: null }])
  ok('un capitolo manda le funzioni usate, in ordine, col voto o null; le altre non ci sono')
}

// ---------------------------------------------------------------------------
// La nota.

{
  const cap = capitoloApp('abbonamento')!
  const [att, sosp, disd] = cap.funzioni
  const bozza = {
    usate: [att.id, sosp.id, disd.id],
    voti: { [att.id]: 5, [sosp.id]: 2, [disd.id]: 3 },
    problemi: { [att.id]: ['lenta'], [sosp.id]: ['confusa', 'lenta'], [disd.id]: ['trovarla'] },
    nota: '  Non ho capito il costo.  ',
  }
  const n = notaCapitolo(cap, bozza)
  assert.equal(
    n,
    'Sospendere l’abbonamento 2/5: confusa, lenta o si blocca.\nDisdire l’abbonamento 3/5: difficile da trovare.\nNon ho capito il costo.',
    'solo le funzioni votate fino a 3 con un motivo; quelle da 5 stelle no anche se hanno un motivo rimasto; il testo in fondo, ripulito',
  )
  assert.equal(SOGLIA_PROBLEMI, 3)
  assert.equal(notaCapitolo(cap, { ...bozza, nota: '' }).split('\n').length, 2, 'senza testo libero, solo le righe strutturate')
  assert.equal(notaCapitolo(cap, { ...BOZZA_VUOTA, nota: 'Solo parole' }), 'Solo parole')
  assert.equal(notaCapitolo(cap, BOZZA_VUOTA), '', 'niente da dire: nota vuota')
  // Un motivo scelto e poi un voto alzato: il motivo non deve restare nella nota.
  assert.equal(notaCapitolo(cap, { ...bozza, voti: { ...bozza.voti, [sosp.id]: 5 }, nota: '' }).includes('Sospendere'), false)
  // Un motivo di una funzione non piu usata non passa.
  assert.equal(notaCapitolo(cap, { ...bozza, usate: [att.id], nota: '' }), '')
  ok('la nota: righe strutturate in italiano per chi ha dato fino a 3 stelle con un motivo, poi le parole della persona')
}
{
  // Il limite di 1000 caratteri: il testo scritto non si taglia, le righe strutturate cadono una alla volta.
  const cap = capitoloApp('train')!
  const usate = cap.funzioni.map((f) => f.id)
  const tuttiProblemi = PROBLEMI.map((p) => p.id)
  const bozza = {
    usate,
    voti: Object.fromEntries(usate.map((id) => [id, 1])),
    problemi: Object.fromEntries(usate.map((id) => [id, tuttiProblemi])),
    nota: '',
  }
  const solo = notaCapitolo(cap, bozza)
  assert.ok(solo.length <= MAX_NOTA, `anche con tutte le funzioni e tutti i motivi: ${solo.length} ≤ ${MAX_NOTA}`)
  const lungo = 'x'.repeat(900)
  const mix = notaCapitolo(cap, { ...bozza, nota: lungo })
  assert.ok(mix.length <= MAX_NOTA, `${mix.length} ≤ ${MAX_NOTA}`)
  assert.ok(mix.endsWith(lungo), 'il testo della persona e intero')
  const pieno = notaCapitolo(cap, { ...bozza, nota: 'y'.repeat(MAX_NOTA) })
  assert.equal(pieno, 'y'.repeat(MAX_NOTA), 'con il campo pieno restano solo le sue parole')
  assert.ok(notaCapitolo(cap, { ...bozza, nota: 'z'.repeat(MAX_NOTA + 500) }).length <= MAX_NOTA, 'anche se arrivasse piu lungo del campo')
  ok(`la nota non supera mai ${MAX_NOTA} caratteri e non taglia le parole della persona`)
}

// ---------------------------------------------------------------------------
// La riga finale.

{
  const voti = { 'facile-da-usare': 4, 'veloce-e-affidabile': 2 }
  const r = righeFinale({ ...FINALE_VUOTO, voti }, ['train', 'club', 'inventato'])
  assert.deepEqual(r, [
    { id: 'facile-da-usare', voto: 4 },
    { id: 'veloce-e-affidabile', voto: 2 },
    { id: 'meno-segreteria', voto: null },
    { id: 'fiducia', voto: null },
    { id: 'non-usa-train', voto: null },
    { id: 'non-usa-club', voto: null },
  ], 'generali in ordine con null dove non ha risposto, poi i marcatori nell ordine dei capitoli; un capitolo inventato non passa')
  assert.deepEqual(righeFinale(FINALE_VUOTO, []).map((x) => x.id), DOMANDE_GENERALI.map((q) => q.id), 'senza capitoli inutilizzati, solo le generali')
  ok('la riga finale: domande generali, poi un non-usa-* per capitolo dichiarato inutilizzato')
}
{
  assert.equal(notaFinale(FINALE_VUOTO), '')
  assert.equal(notaFinale({ ...FINALE_VUOTO, priorita: ['train'], nota: 'Più video' }), 'Da migliorare per primo: Allenarsi: i piani.\nPiù video')
  assert.equal(
    notaFinale({ ...FINALE_VUOTO, priorita: ['club', 'home', 'train'] }),
    'Da migliorare per primo: La Home e il tuo account · Allenarsi: i piani.',
    `al massimo ${MAX_PRIORITA} capitoli, nell ordine dei capitoli`,
  )
  assert.ok(notaFinale({ ...FINALE_VUOTO, priorita: ['home'], nota: 'q'.repeat(MAX_NOTA) }).length <= MAX_NOTA)
  ok('la nota finale: la priorita in italiano (al massimo due) e il testo libero')
}
{
  const nessuno = {}
  assert.equal(capitoliFatti({ home: true }, { club: true }), 2)
  assert.equal(capitoliFatti(nessuno, nessuno), 0)
  assert.equal(prossimoCapitolo('home', nessuno, nessuno)!.id, 'prenotazioni')
  assert.equal(prossimoCapitolo('club', nessuno, nessuno)!.id, 'home', 'dall ultimo si gira in tondo')
  assert.equal(prossimoCapitolo('home', { prenotazioni: true }, { abbonamento: true })!.id, 'train', 'salta quelli fatti o inutilizzati')
  const tuttiTranne = Object.fromEntries(CAPITOLI_APP.filter((c) => c.id !== 'home').map((c) => [c.id, true as const]))
  assert.equal(prossimoCapitolo('home', tuttiTranne, nessuno), null, 'quando restano solo quello in corso, non c e un prossimo')
  ok('conta dei capitoli fatti e prossimo capitolo da fare')
}

// ---------------------------------------------------------------------------
// Lo stato in memoria.

{
  azzeraSurveyApp()
  assert.equal(leggiSurveyApp(), STATO_APP_VUOTO)
  aggiornaBozza('home', (b) => ({ ...b, usate: ['documenti'] }))
  aggiornaBozza('home', (b) => ({ ...b, voti: { documenti: 4 } }))
  assert.deepEqual(leggiSurveyApp().bozze.home, { ...BOZZA_VUOTA, usate: ['documenti'], voti: { documenti: 4 } }, 'gli aggiornamenti si sommano')
  assert.equal(leggiSurveyApp().bozze.train, undefined, 'le altre bozze non si toccano')
  segnaNonUsa('club', true)
  assert.deepEqual(leggiSurveyApp().nonUsa, { club: true })
  segnaInviato('club')
  assert.deepEqual(leggiSurveyApp().nonUsa, {}, 'se poi lo invia, non e piu inutilizzato')
  assert.deepEqual(leggiSurveyApp().inviati, { club: true })
  segnaNonUsa('train', true)
  segnaNonUsa('train', false)
  assert.deepEqual(leggiSurveyApp().nonUsa, {}, 'ci ripensa')
  aggiornaFinale((f) => ({ ...f, nps: 9 }))
  assert.equal(leggiSurveyApp().finale.nps, 9)
  azzeraSurveyApp()
  assert.equal(leggiSurveyApp(), STATO_APP_VUOTO, 'azzera butta tutto')
  ok('lo stato in memoria: bozze, inviati, non uso; si azzera tutto in una volta')
}

// ---------------------------------------------------------------------------
// L'invio, con un fetch finto: cosa parte davvero per un capitolo e per la riga finale.

async function invii() {
  type Chiamata = { url: string; init: any; corpo: any }
  const chiamate: Chiamata[] = []
  globalThis.fetch = (async (url: any, init: any) => {
    chiamate.push({ url: String(url), init, corpo: init?.body ? JSON.parse(init.body) : null })
    return new Response(JSON.stringify({ esito: 'ricevuto' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as any

  const cap = capitoloApp('punteggio')!
  const bozza = { usate: [cap.funzioni[0].id, cap.funzioni[3].id], voti: { [cap.funzioni[0].id]: 5, [cap.funzioni[3].id]: 1 }, problemi: { [cap.funzioni[3].id]: ['inutile'] }, nota: 'Classifica poco chiara' }
  const r = await inviaSondaggio(
    { sondaggio: cap.slug, risposte: righeCapitolo(cap, bozza), nps: null, nota: notaCapitolo(cap, bozza), email: 'maria@esempio.it', numero: '4782' },
    agenteApp('ios'),
  )
  assert.deepEqual(r, { ok: true })
  const c = chiamate[0]
  assert.match(c.url, /\/functions\/v1\/sito-valutazioni\/sondaggio$/)
  assert.equal(c.init.headers['User-Agent'], 'AthlonClub-App/1.0 (ios)')
  assert.deepEqual(c.corpo, {
    sondaggio: 'app-punteggio',
    risposte: [{ id: 'athlon-health-score', voto: 5 }, { id: 'classifica-mensile', voto: 1 }],
    nps: null,
    nota: 'La classifica mensile 1/5: non mi serve.\nClassifica poco chiara',
    email: 'maria@esempio.it',
    userNumber: '4782',
    pagina: '/club-life/survey/app-punteggio',
  })
  ok('un capitolo parte come riga app-punteggio: solo le funzioni usate, nessun NPS, nota strutturata + testo')

  const fin = { ...FINALE_VUOTO, voti: { fiducia: 5 }, nps: 10, priorita: ['abbonamento'], nota: '' }
  await inviaSondaggio({ sondaggio: SLUG_FINALE, risposte: righeFinale(fin, ['junior-inesistente', 'club']), nps: fin.nps, nota: notaFinale(fin), email: 'maria@esempio.it', numero: null }, {})
  const f = chiamate[1]
  assert.equal(f.corpo.sondaggio, 'app-generale')
  assert.equal(f.corpo.nps, 10)
  assert.equal(f.corpo.nota, 'Da migliorare per primo: Abbonamento e pagamenti.')
  assert.deepEqual(f.corpo.risposte.map((x: any) => x.id), ['facile-da-usare', 'veloce-e-affidabile', 'meno-segreteria', 'fiducia', 'non-usa-club'])
  assert.ok(f.corpo.risposte.length <= MAX_VOCI)
  assert.equal('userNumber' in f.corpo, false)
  ok('la riga finale parte come app-generale con NPS, le quattro generali e il marcatore non-usa-club')
}

invii()
  .then(() => console.log(`\n${passi} prove passate`))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
