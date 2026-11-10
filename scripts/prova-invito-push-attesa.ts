// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova a mano dell'invito «Attiva le notifiche per sapere se si libera un posto» (src/features/lab/notifiche/InvitoPushAttesa.tsx), mostrato a chi e' in lista d'attesa
// senza le notifiche push attive (10/11/2026). La regola che decide l'invito e' quella di «Scrivi al team» (`invitoPushRichiesta`, provata anche da prova-assistente.ts):
// qui si controlla che sia davvero quella, e che l'invito sia attaccato ai posti giusti. Niente rete, niente React.
//
//   npx tsx scripts/prova-invito-push-attesa.ts
//
// Esce con codice 0 e scrive «ok» se tutto torna; al primo controllo che non torna lancia l'errore di `assert` col nome del caso.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { invitoPushRichiesta } from '../src/features/lab/assistenza/richieste'

let passi = 0
const ok = (nome: string) => {
  passi++
  console.log(`ok  ${nome}`)
}
const sorgente = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
const invito = sorgente('src/features/lab/notifiche/InvitoPushAttesa.tsx')
const calendario = sorgente('src/features/lab/Calendario.tsx')

// ---------------------------------------------------------------------------
// La regola: chi e' in lista d'attesa e non ha un modo di essere avvisato fuori dall'app.

{
  const casi = [
    ['spento', 0, 'attiva', 'push spenta e nessun dispositivo: un tocco per attivarla'],
    ['bloccato', 0, 'sbloccare', 'bloccata dal browser o dall app: si dice come sbloccare'],
    ['serve_app_installata', 0, 'installare', 'iPhone dal web senza l app sulla schermata Home: si dice come'],
    ['attivo', 0, null, 'gia attive su questo dispositivo: niente'],
    ['attivo', 3, null, 'gia attive: niente'],
    ['spento', 1, null, 'un altro dispositivo del nucleo le ha attive: la push segue il nucleo, l avviso arriva li'],
    ['bloccato', 2, null, 'idem se questo e bloccato'],
    ['serve_app_installata', 1, null, 'idem su iPhone senza app installata'],
    ['verifica', 0, null, 'non si sa ancora: non si invita, niente lampi'],
    ['non_supportato', 0, null, 'browser senza push o totem: niente da offrire'],
    ['non_disponibile', 0, null, 'club senza chiavi push sul server: niente da offrire'],
  ]
  for (const [stato, dispositivi, atteso, perche] of casi) assert.equal(invitoPushRichiesta(stato, dispositivi), atteso, perche)
  ok('la regola: invito solo con push spenta, bloccata o iPhone senza app, e solo se nessun dispositivo del nucleo le ha attive')
}

// ---------------------------------------------------------------------------
// Il componente usa quella regola, e non una copia.

{
  assert.match(invito, /import \{ invitoPushRichiesta \} from '\.\.\/assistenza\/richieste'/, 'importa la regola condivisa')
  assert.match(invito, /invitoPushRichiesta\(stato, dispositivi\)/, 'la chiama con stato e dispositivi')
  assert.doesNotMatch(invito, /stato === 'spento'|stato === 'bloccato'/, 'non ne rifa una copia')
  ok('InvitoPushAttesa usa la regola di «Scrivi al team», senza copiarla')
}

// ---------------------------------------------------------------------------
// Il pulsante c'e' solo dove si puo' attivare davvero, ed e' un tocco solo.

{
  assert.match(invito, /invito === 'attiva' \? <Pulsante[^>]*onPress=\{\(\) => void attiva\(\)\}/, 'il pulsante chiama attiva() ed e solo per l invito «attiva»')
  assert.equal((invito.match(/<Pulsante/g) ?? []).length, 1, 'un solo pulsante: bloccata e iPhone senza app hanno solo il testo')
  assert.match(invito, /usePush\(\)/, 'stesso usePush della carta in Home: le altre carte si aggiornano')
  assert.match(invito, /useAppenaAttivate\(stato\)/, 'dopo l attivazione dice «fatto» per qualche secondo')
  assert.match(invito, /Notifiche attivate/, 'il messaggio di conferma')
  assert.match(invito, /Turn on notifications/, 'anche in inglese')
  ok('il pulsante «Attiva le notifiche» c\'e\' solo per l\'invito «attiva», chiama usePush().attiva, e dopo dice «fatto»')
}

// ---------------------------------------------------------------------------
// Quando non si mostra niente a prescindere dalla regola.

{
  assert.match(invito, /const \{ attivo \} = useNotifiche\(\)/, 'legge se le notifiche esistono per questa persona')
  assert.match(invito, /if \(!attivo \|\| vistaCorrente\(\)\) return null/, 'niente per chi non ha le notifiche nell app, e niente in vista cliente dal CRM')
  ok('niente invito per chi non ha le notifiche nell\'app e in vista cliente dal CRM')
}

// ---------------------------------------------------------------------------
// Dove compare: sotto i pulsanti di una lezione in lista d'attesa, e dopo «Pagamento ricevuto: sei in lista d'attesa».

{
  assert.match(calendario, /import \{ InvitoPushAttesa \} from '\.\/notifiche\/InvitoPushAttesa'/, 'Calendario importa l invito')
  // Dentro AzioniLezione, dopo il ramo dei pulsanti: solo se la lezione non e iniziata, la prenotazione e una lista d'attesa, e non si sta confermando una disdetta.
  const azioni = calendario.slice(calendario.indexOf('export function AzioniLezione'), calendario.indexOf('function RigaAttesa'))
  assert.match(azioni, /\{!l\.iniziata && b\?\.attesa && !conferma \? <InvitoPushAttesa \/> : null\}/, 'sotto i pulsanti di una lezione in lista d attesa')
  assert.equal((azioni.match(/<InvitoPushAttesa/g) ?? []).length, 1, 'una volta sola per lezione')
  // Dopo il pagamento finito in lista d'attesa.
  assert.match(calendario, /\{ritorno\?\.stato === 'attesa' \? <InvitoPushAttesa \/> : null\}/, 'dopo il pagamento finito in lista d attesa')
  assert.equal((calendario.match(/<InvitoPushAttesa/g) ?? []).length, 2, 'due punti e basta')
  ok('l\'invito compare sotto i pulsanti di una lezione in lista d\'attesa (AzioniLezione) e dopo il pagamento finito in lista d\'attesa')
}

// ---------------------------------------------------------------------------
// AzioniLezione e' la stessa per tutti: l'invito arriva ovunque ci si possa mettere in lista.

{
  for (const f of ['consigli/Lezioni.tsx', 'percorso/TappaCarta.tsx', 'junior/Corsi.tsx', 'assistente/PrenotaDaChat.tsx']) {
    assert.match(sorgente(`src/features/lab/${f}`), /import \{ AzioniLezione \} from ['"]\.\.\/Calendario['"]/, `${f} usa AzioniLezione`)
  }
  ok('Consigli, Percorso, Junior e chat dell\'assistente usano AzioniLezione: l\'invito c\'e\' anche li')
}

console.log(`\nok: ${passi} gruppi di controlli`)
