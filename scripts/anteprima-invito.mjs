// L'anteprima del link d'invito (04/11/2026, richiesta di Maurizio: «metti titolo e immagine di anteprima per il link, scegli
// qualcosa di figo»). Dopo `expo export` (build:web) scrive `dist/invito-anteprima.html`: la pagina dell'app di sempre, con i
// tag dell'anteprima di `/invito/<codice>` al posto di quelli di base. `vercel.json` serve questo file per ogni `/invito/*`,
// cosi' chi legge l'indirizzo senza eseguire JavaScript (WhatsApp, Facebook, Telegram, iMessage) vede il titolo e l'immagine
// dell'invito, e il browser carica la stessa app (il percorso resta `/invito/<codice>`: e' lui a scegliere la schermata).
//
// **Il titolo e la descrizione sono uguali per tutti**: chi legge non esegue codice, quindi non si puo' scrivere il nome di
// chi invita («Marco ti invita…») senza una funzione sul server. Il messaggio che il socio manda (`portale-lab-referral`) lo
// dice gia' in prima persona, e questa anteprima fa lo stesso.
//
// Se il file di partenza non ha i segni `anteprima:inizio` / `anteprima:fine` lo script **ferma il build**: una riscrittura
// verso un file che manca spegnerebbe tutti i link d'invito, e un deploy fermato lascia quello di prima.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ORIGINE = 'https://app.athlonroma.it'
/** Lo stesso di `PREZZO_PROVA` in `portale-lab-referral` (APP-ATHLON): cambiano insieme. */
const PREZZO_PROVA = 5

export const TITOLO = 'Allenati con me da Athlon'
export const DESCRIZIONE = `Prova il club con me per 1 settimana, pagando solo ${PREZZO_PROVA} €. Sala, corsi e vasche, senza impegno.`
export const IMMAGINE = `${ORIGINE}/og/invito.jpg`
const ALT = 'Tre persone si allenano insieme ai tapis roulant, in sala'

const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** I tag dell'anteprima dell'invito. */
export function tagInvito() {
  return [
    `<meta name="description" content="${esc(DESCRIZIONE)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Athlon Club" />',
    '<meta property="og:locale" content="it_IT" />',
    `<meta property="og:title" content="${esc(TITOLO)}" />`,
    `<meta property="og:description" content="${esc(DESCRIZIONE)}" />`,
    `<meta property="og:image" content="${IMMAGINE}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(ALT)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(TITOLO)}" />`,
    `<meta name="twitter:description" content="${esc(DESCRIZIONE)}" />`,
    `<meta name="twitter:image" content="${IMMAGINE}" />`,
  ]
    .map((r) => `    ${r}`)
    .join('\n')
}

/** La pagina dell'app con l'anteprima dell'invito. Solleva se mancano i segni. */
export function variante(html) {
  const a = html.indexOf('<!-- anteprima:inizio')
  const fine = '<!-- anteprima:fine -->'
  const b = html.indexOf(fine)
  if (a < 0 || b < a) throw new Error('index.html non ha i segni «anteprima:inizio» e «anteprima:fine»')
  // Dal segno d'inizio a quello di fine si sostituisce tutto (il segno di fine resta, il suo commento e' finito).
  const pagina = `${html.slice(0, a)}${tagInvito().trimStart()}\n    ${html.slice(b)}`
  return pagina.replace(/<title>[^<]*<\/title>/, `<title>${esc(TITOLO)}</title>`)
}

// Da riga di comando: legge dist/index.html e scrive dist/invito-anteprima.html.
if (process.argv[1] && process.argv[1].endsWith('anteprima-invito.mjs')) {
  const dist = process.argv[2] || 'dist'
  const sorgente = join(dist, 'index.html')
  if (!existsSync(sorgente)) throw new Error(`manca ${sorgente}: va lanciato dopo expo export`)
  if (!existsSync(join(dist, 'og', 'invito.jpg'))) throw new Error(`manca ${join(dist, 'og', 'invito.jpg')}: l'immagine dell'anteprima`)
  const out = variante(readFileSync(sorgente, 'utf8'))
  writeFileSync(join(dist, 'invito-anteprima.html'), out)
  console.log(`anteprima-invito: scritto ${join(dist, 'invito-anteprima.html')} (${out.length} byte)`)
}
