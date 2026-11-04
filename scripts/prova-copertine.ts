// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano delle copertine di Athlon TV (src/features/lab/tv/copertine.ts): la foto di ogni raccolta e' quella del suo corso, o del piu' simile.
//   npx tsx scripts/prova-copertine.ts
import assert from 'node:assert/strict'

import { conFotoDelCorso, corsiPerNome, corsoPer, normalizza } from '../src/features/lab/tv/copertine'

let passi = 0
const ok = (n: string) => {
  passi++
  console.log('ok  ' + n)
}

// I 30 corsi di lezioni.json (04/11/2026), con la foto = il nome, cosi' si vede da quale corso arriva. Solo MAT 41 ha un punto da tenere al centro.
const NOMI = [
  'GYM FLOOR', 'BODY SCULPT', 'GINNASTICA DOLCE', 'PILATES MATWORK', 'HBX FUSION', 'HBX BOXING', 'MOTR', 'BOOTY WORKOUT', 'POWER YOGA', 'CALISTHENICS',
  'ANTIGRAVITY', 'STRENGTH DEVELOPMENT', 'GINNASTICA POSTURALE', 'GP COREO', 'DIFESA PERSONALE', 'YOGASSÈ', 'LES MILLS BODY PUMP', 'GINN PILATES',
  'GROUP REFORMER', 'HYDROBIKE', 'AQUA SOFT', 'AQUA TONIC', 'AQUA AEROBIC', 'AQUA TRAINING', 'BALLI DI GRUPPO', 'BABY SWIM', 'SCUOLA NUOTO', 'NUOTO LIBERO',
  'MAT 41', 'HATHA YOGA',
]
const lezioni = Object.fromEntries(NOMI.map((n) => [n, { foto: 'foto:' + n, fuoco: n === 'MAT 41' ? '50% 70%' : null }]))
const corsi = corsiPerNome(lezioni, { PILATES: 'PILATES MATWORK', 'BODY PUMP': 'LES MILLS BODY PUMP', 'MATWORK 41': 'MAT 41' })
const vetrina = (titolo: string, copertina: string | null = 'vimeo:frame') => ({ id: '1', titolo, descrizione: null, copertina, fuoco: null, totale: 5 })
const corso = (titolo: string) => corsoPer(titolo, corsi)?.foto ?? null

{
  assert.equal(normalizza('G-Passè'), 'g passe')
  assert.equal(normalizza('G-Passé'), 'g passe', 'accento acuto o grave, uguale')
  assert.equal(normalizza('Aero & Step'), 'aero e step')
  assert.equal(normalizza('  YOGASSÈ '), 'yogasse')
  ok('i nomi si confrontano senza accenti, segni e maiuscole')
}
{
  // Le 20 raccolte che la funzione conosceva, scritte come sono su Vimeo.
  const attese: [string, string][] = [
    ['Salute', 'GINNASTICA DOLCE'], ['Kids', 'BABY SWIM'], ['G-Passè', 'HBX FUSION'], ['Yoga Fusion', 'YOGASSÈ'], ['Short Lessons', 'BODY SCULPT'],
    ['Atletica Workout', 'GYM FLOOR'], ['Zumba Fitness', 'BALLI DI GRUPPO'], ['Total Body', 'LES MILLS BODY PUMP'], ['Slimming Workout', 'HBX BOXING'],
    ['Power Yoga', 'POWER YOGA'], ['Power Pilates', 'MAT 41'], ['Hatha Yoga', 'HATHA YOGA'], ['Ginnastica Posturale', 'GINNASTICA POSTURALE'], ['GAG', 'GINN PILATES'],
    ['Functional Training', 'STRENGTH DEVELOPMENT'], ['Calisthenics', 'CALISTHENICS'], ['Booty Workout', 'BOOTY WORKOUT'], ['20 Minuti Di', 'ANTIGRAVITY'],
  ]
  for (const [titolo, nome] of attese) assert.equal(corso(titolo), 'foto:' + nome, titolo)
  ok('le raccolte note prendono il loro corso')
}
{
  assert.equal(corso('Aero & Step'), 'foto:GP COREO', 'cardio a ritmo di musica: non il MOTR (attrezzo, Pilates)')
  assert.equal(corso('Body Tone'), 'foto:BODY SCULPT', 'tonificazione: non il Group Reformer')
  ok('le due correzioni rispetto alla tabella di prima')
}
{
  assert.equal(corso('G-Passé'), corso('G-Passè'), 'con l accento sbagliato la raccolta non perde la foto')
  assert.equal(corso('POWER YOGA'), 'foto:POWER YOGA')
  assert.equal(corso('  power   yoga '), 'foto:POWER YOGA', 'spazi e maiuscole')
  ok('accenti e maiuscole diversi non fanno perdere la foto')
}
{
  // Una raccolta con il nome di un corso, o con un alias del sito, prende quel corso.
  assert.equal(corso('Hydrobike'), 'foto:HYDROBIKE')
  assert.equal(corso('Aqua Training'), 'foto:AQUA TRAINING')
  assert.equal(corso('Pilates'), 'foto:PILATES MATWORK', 'alias')
  assert.equal(corso('Body Pump'), 'foto:LES MILLS BODY PUMP', 'alias')
  assert.equal(corso('Matwork 41'), 'foto:MAT 41', 'alias')
  assert.equal(corso('Hatha Yoga Base'), 'foto:HATHA YOGA', 'il nome del corso dentro il titolo')
  assert.equal(corso('Corso di Pilates'), 'foto:PILATES MATWORK', 'un alias dentro il titolo non conta, ma qui lo prende la regola dei simili')
  assert.equal(corso('Nuoto Libero'), 'foto:NUOTO LIBERO')
  ok('stesso nome del corso, alias, o nome del corso dentro il titolo')
}
{
  // Nomi che il club non ha fra i corsi: il piu' simile.
  const simili: [string, string][] = [
    ['Yoga Dolce', 'HATHA YOGA'], ['Vinyasa Flow', 'POWER YOGA'], ['Reformer Pilates', 'GROUP REFORMER'], ['Mal di schiena', 'GINNASTICA POSTURALE'], ['Over 60', 'GINNASTICA DOLCE'],
    ['Kick Boxing', 'HBX BOXING'], ['Autodifesa', 'DIFESA PERSONALE'], ['Acquagym', 'AQUA TONIC'], ['Acqua Soft', 'AQUA SOFT'], ['Acqua Cardio', 'AQUA AEROBIC'],
    ['Aquabike', 'HYDROBIKE'], ['Baby Nuoto', 'BABY SWIM'], ['Nuoto Adulti', 'NUOTO LIBERO'], ['Latin Dance', 'BALLI DI GRUPPO'], ['Step', 'GP COREO'], ['Glutei e Gambe', 'BOOTY WORKOUT'],
    ['Full Body', 'LES MILLS BODY PUMP'], ['Tonificazione', 'BODY SCULPT'], ['Corpo Libero', 'CALISTHENICS'], ['Aerial', 'ANTIGRAVITY'], ['Forza', 'STRENGTH DEVELOPMENT'],
    ['HIIT', 'HBX FUSION'], ['Circuit Training', 'HBX FUSION'], ['Sala Pesi', 'GYM FLOOR'],
  ]
  for (const [titolo, nome] of simili) assert.equal(corso(titolo), 'foto:' + nome, titolo)
  ok('nomi senza un corso: il corso piu simile')
}
{
  assert.equal(corso('Tutorial del club'), null, 'niente di simile: nessuna foto inventata')
  assert.equal(corso(''), null)
  assert.equal(corso('???'), null)
  const v = vetrina('Tutorial del club', 'vimeo:frame')
  assert.deepEqual(conFotoDelCorso(v, corsi), v, 'senza un corso adatto resta la copertina del server')
  ok('nessun corso adatto: resta la copertina del server')
}
{
  const v = vetrina('Power Pilates', 'vimeo:frame')
  const c = conFotoDelCorso(v, corsi)
  assert.equal(c.copertina, 'foto:MAT 41')
  assert.equal(c.fuoco, '50% 70%', 'il punto da tenere al centro e quello del corso')
  assert.equal(c.titolo, 'Power Pilates', 'il resto della raccolta non cambia')
  assert.equal(c.totale, 5)
  assert.equal(conFotoDelCorso(vetrina('Calisthenics', 'vimeo:frame', ), corsi).fuoco, null)
  assert.deepEqual(conFotoDelCorso(v, null), v, 'il sito non risponde: com era')
  ok('la raccolta prende foto e punto del corso; senza corsi non cambia')
}
{
  // Un corso senza foto non si usa: si passa al successivo (o al server).
  const senza = corsiPerNome({ 'POWER YOGA': { foto: null, fuoco: null }, 'HATHA YOGA': { foto: 'foto:HATHA YOGA', fuoco: null } })
  assert.equal(corsoPer('Power Yoga', senza)?.foto, 'foto:HATHA YOGA', 'POWER YOGA non ha foto: vince lo yoga piu vicino')
  assert.equal(corsoPer('Kick Boxing', senza), null, 'senza HBX BOXING e senza nessuno dei vicini, niente')
  ok('un corso senza foto non si sceglie')
}

console.log(`\n${passi} gruppi di prove passati`)
