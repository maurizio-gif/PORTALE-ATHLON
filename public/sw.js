// Il service worker del portale (app.athlonroma.it), per l'app installabile
// (PWA, 15/10/2026). Prudente di proposito: la guida di Expo avverte che un
// service worker che tiene in memoria troppo impedisce gli aggiornamenti.
//
// - Le pagine si chiedono sempre alla rete: un aggiornamento arriva subito.
//   Solo senza rete si usa l'ultima pagina buona (l'app si apre e dice che
//   manca la connessione), o la pagina offline.
// - Si tengono solo i file statici con l'impronta nel nome (/_expo/static,
//   /assets): non cambiano mai, a ogni rilascio ne arrivano di nuovi.
// - I dati personali non passano di qui: arrivano da Supabase, un altro
//   dominio, e le richieste verso altri domini non si toccano.
//
// Le notifiche push, quando arriveranno, si aggiungono qui (push, notificationclick).

const VERSIONE = 'v1'
const PAGINE = `athlon-pagine-${VERSIONE}`
const STATICI = `athlon-statici-${VERSIONE}`
const OFFLINE = '/offline.html'
const SHELL = '/__app'
const MASSIMO_STATICI = 80

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(PAGINE)
      .then((c) => c.addAll([OFFLINE, '/logo192.png', '/maskable192.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== PAGINE && k !== STATICI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

/** Tiene la cache dei file statici entro un tetto: via i piu' vecchi (dei rilasci passati). */
async function pota() {
  const c = await caches.open(STATICI)
  const chiavi = await c.keys()
  for (let i = 0; i < chiavi.length - MASSIMO_STATICI; i++) await c.delete(chiavi[i])
}

self.addEventListener('fetch', (evento) => {
  const req = evento.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Le pagine: sempre la rete; senza rete l'ultima pagina buona o quella offline.
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((risposta) => {
          if (risposta.ok) {
            const copia = risposta.clone()
            caches.open(PAGINE).then((c) => c.put(SHELL, copia))
          }
          return risposta
        })
        .catch(async () => (await caches.match(SHELL)) || (await caches.match(OFFLINE)) || Response.error()),
    )
    return
  }

  // I file con l'impronta: dalla cache se ci sono, altrimenti dalla rete (e si tengono).
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(req).then(
        (trovato) =>
          trovato ||
          fetch(req).then((risposta) => {
            if (risposta.ok) {
              const copia = risposta.clone()
              caches.open(STATICI).then((c) => c.put(req, copia).then(pota))
            }
            return risposta
          }),
      ),
    )
  }
  // Tutto il resto (manifest, icone, sw.js stesso): la rete, come senza service worker.
})
