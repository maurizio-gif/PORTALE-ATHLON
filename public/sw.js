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
// Le notifiche push del club (20/10/2026) sono in fondo: `push` e `notificationclick`.

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

// ---------------------------------------------------------------------------
// Le notifiche push del club (20/10/2026)
//
// Il CRM manda una push cifrata con { titolo, corpo, url, ids, ping, tag }. `ids` sono i gettoni della notifica per le persone
// del nucleo che questo dispositivo serve, e `ping` e' dove dirlo: il service worker non ha la sessione della persona, quindi
// segnala **«ricevuta»** appena la push arriva e **«aperta»** quando la persona la tocca con i gettoni, senza altro.
// Sono i due segni, insieme a quelli che l'app manda da dentro (vista, aperta, pulsante premuto), con cui il club vede se la
// comunicazione e' arrivata. Il tracciamento non deve mai far fallire una notifica: ogni richiesta si ignora se non va.
//
// **Ogni push mostra una notifica**, anche se l'app e' aperta: i browser lo vogliono (con `userVisibleOnly` una push senza
// avviso fa revocare la sottoscrizione, su iPhone al secondo tentativo). Se l'app e' aperta le si dice anche di rileggere
// subito (`notifica-arrivata`), cosi' la finestra compare senza aspettare il giro dei venti secondi.

/** L'indirizzo per segnalare: solo quello della funzione del club, qualunque cosa dica la push. */
function indirizzoPing(ping) {
  return typeof ping === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/portale-lab-notifiche$/.test(ping) ? ping : null
}

/** Dice al club cosa e' successo a una notifica. Non solleva mai. */
function segnala(ping, ids, evento) {
  const url = indirizzoPing(ping)
  if (!url || !Array.isArray(ids) || !ids.length) return Promise.resolve()
  return fetch(url, {
    method: 'POST',
    // Senza intestazioni di contenuto: e' una richiesta «semplice», niente preflight, e basta quello che serve.
    body: JSON.stringify({ azione: 'gettone', ids: ids.slice(0, 10), evento }),
    keepalive: true,
  }).catch(() => undefined)
}

self.addEventListener('push', (evento) => {
  let dati = {}
  try {
    dati = evento.data ? evento.data.json() : {}
  } catch (e) {
    dati = {}
  }
  const titolo = typeof dati.titolo === 'string' && dati.titolo ? dati.titolo : 'Athlon Club'
  const opzioni = {
    body: typeof dati.corpo === 'string' ? dati.corpo : '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    // Lo stesso `tag` sostituisce l'avviso invece di accumularne: un tentativo ripetuto non ne fa due.
    tag: typeof dati.tag === 'string' ? dati.tag : undefined,
    data: { url: typeof dati.url === 'string' ? dati.url : '/notifiche', ids: Array.isArray(dati.ids) ? dati.ids : [], ping: dati.ping },
  }

  evento.waitUntil(
    Promise.all([
      self.registration.showNotification(titolo, opzioni),
      segnala(dati.ping, opzioni.data.ids, 'ricevuta'),
      // Se l'app e' aperta: rilegge subito, e la finestra compare.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
        for (const f of finestre) f.postMessage({ tipo: 'notifica-arrivata' })
      }),
    ]),
  )
})

// Un tocco sull'avviso porta al centro notifiche, riusando una finestra gia' aperta dell'app se c'e'. Solo indirizzi
// dell'app stessa: quello che dice la push non porta fuori.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const dati = evento.notification.data || {}
  let url = '/notifiche'
  try {
    const u = new URL(dati.url || '/notifiche', self.location.origin)
    if (u.origin === self.location.origin) url = u.pathname + u.search
  } catch (e) {
    url = '/notifiche'
  }

  evento.waitUntil(
    Promise.all([
      segnala(dati.ping, dati.ids, 'aperta'),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
        for (const f of finestre) {
          if (new URL(f.url).origin === self.location.origin && 'focus' in f) {
            if ('navigate' in f) return f.navigate(url).then((c) => (c || f).focus()).catch(() => f.focus())
            return f.focus()
          }
        }
        return self.clients.openWindow ? self.clients.openWindow(url) : undefined
      }),
    ]),
  )
})
