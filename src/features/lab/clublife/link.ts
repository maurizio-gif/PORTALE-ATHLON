import { router, type Href } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Linking, Platform } from 'react-native'

import type { ClubLife, TipoModulo } from '@/api/clubLife'

import { hrefSezione } from '../home/sezioni'

// Dove porta un link o un pulsante toccato dentro Club Life.
//
// **Chi tocca resta nell'app.** Le schede e le news sono scritte per il sito, e
// i loro comandi portano al sito e a PerfectGym: qui ognuno si traduce nella
// schermata dell'app che fa la stessa cosa. Tre esiti:
//
// - `app`: la schermata dell'app (prenotazioni, pagamenti, un modulo nativo...);
// - `nascondi`: un comando che nell'app non ha senso — «scarica l'app» dentro
//   l'app, «reimposta la password» a chi entra con un codice — e non si disegna;
// - `fuori`: nessuna schermata che lo sostituisca (un sito di terzi, il
//   regolamento, l'iscrizione ai corsi dei bambini): si apre il browser, che sul
//   telefono è quello interno con il suo tasto per chiudere.
//
// Il sito scrive i suoi link interi e con lo slash finale (club-life.json).

export type Destinazione = { tipo: 'app'; href: Href } | { tipo: 'nascondi' } | { tipo: 'fuori' }

const APP = (href: Href): Destinazione => ({ tipo: 'app', href })
const NASCONDI: Destinazione = { tipo: 'nascondi' }
const FUORI: Destinazione = { tipo: 'fuori' }

/** L'indirizzo del modulo nativo per un tipo di modulo delle schede. */
export function hrefModulo(tipo: TipoModulo | 'scrivi', parametri?: Record<string, string>): Href {
  if (tipo === 'metodo-pagamento') return '/metodo-pagamento'
  return { pathname: '/club-life/modulo/[tipo]', params: { tipo, ...parametri } }
}

/*
 * Il percorso di un indirizzo del sito, o null se e' di un altro. Con una
 * espressione e non con `new URL()`: su iOS e Android l'URL di React Native e'
 * parziale, e `pathname` non e' detto che ci sia.
 */
function percorsoSito(url: string): string | null {
  const m = url.match(/^https?:\/\/(?:www\.)?athlonroma\.it(\/[^?#]*)?(?:[?#]|$)/i)
  return m ? (m[1] ?? '/') : null
}

/** La parte dopo il `#/` del portale PerfectGym («Login», «Classes/1/Calendar»), o null. */
function percorsoPortale(url: string): string | null {
  const m = url.match(/^https?:\/\/athlon\.perfectgym\.com\/ClientPortal2\/?#\/([^?#]*)/i)
  return m ? m[1] : null
}

/**
 * Il comando «Accedi al portale» della pagina del sito e' «vai alla tua area»
 * nell'app: dove, lo dice l'etichetta (pagare porta ai pagamenti, prenotare al
 * calendario), e senza indizi e' la Home.
 */
function dalPortale(etichetta: string): Destinazione {
  if (/pag(a|are|amenti)\b|ricevut/i.test(etichetta)) return APP('/pagamenti')
  if (/prenot/i.test(etichetta)) return APP('/calendario')
  if (/scadenz|abbonament|sospension|disdett|rinnov/i.test(etichetta)) return APP(hrefSezione('abbonamenti'))
  return APP('/')
}

export function percorsoScheda(id: string): Href {
  return { pathname: '/club-life/help-desk/[...scheda]', params: { scheda: id.split('/') } }
}

/** Dove porta un indirizzo, dato il testo del comando (che a volte decide) e i dati di Club Life. */
export function destinazione(url: string, dati: ClubLife | null, etichetta = ''): Destinazione {
  const u = url.trim()

  if (/^mailto:/i.test(u)) {
    // Scrivere al club e' un modulo dell'app: il desk riceve la stessa richiesta che gli arriva dal sito.
    if (/^mailto:desk@athlonroma\.it/i.test(u)) return APP(hrefModulo('scrivi'))
    if (/^mailto:disdetta@athlonroma\.it/i.test(u)) return APP(hrefModulo('scrivi', { argomento: 'disdetta' }))
    return FUORI
  }
  // Il telefono lo gestisce il sistema: non e' una pagina, e non c'e' altro modo di chiamare.
  if (/^tel:/i.test(u)) return FUORI

  if (/^https?:\/\/(?:www\.)?onelink\.to\/athlon/i.test(u)) return NASCONDI

  const portale = percorsoPortale(u)
  if (portale !== null) {
    if (/^login$/i.test(portale)) return dalPortale(etichetta)
    if (/^classes\//i.test(portale)) return APP('/calendario')
    // Chi e' dentro l'app e' gia' registrato: partecipare e' prenotare.
    if (/^registration$/i.test(portale)) return APP('/calendario')
    if (/^forgotpassword$/i.test(portale)) return NASCONDI
    // L'iscrizione ai corsi dei bambini (Groups/…) si fa solo li'.
    return FUORI
  }

  const percorso = percorsoSito(u)
  if (percorso === null) return FUORI
  const pezzi = percorso.split('/').filter(Boolean)

  // La home del sito e' la Home dell'app; Club Life e' Club Life.
  if (!pezzi.length) return APP('/')
  if (pezzi.length === 1 && pezzi[0] === 'club-life') return APP('/club-life')
  if (pezzi.length === 1) {
    switch (pezzi[0]) {
      case 'planning':
        return APP('/calendario')
      case 'portale':
        return APP('/')
      case 'personal-training':
        return APP('/personal')
      // Il listino del sito e' la sezione Abbonamenti della Home: li' si vedono i propri e si attivano quelli in piu'.
      case 'abbonamenti':
        return APP(hrefSezione('abbonamenti'))
      case 'prenota-chiamata':
        return APP(hrefModulo('appuntamento'))
    }
    // Le pagine dei corsi: nell'app si prenotano dal calendario.
    if (dati?.corsiPrenotabili.includes(pezzi[0])) return APP('/calendario')
    return FUORI
  }
  if (!dati) return FUORI
  if (pezzi[0] === 'news' && pezzi.length === 2 && dati.news.some((n) => n.id === pezzi[1])) {
    return APP({ pathname: '/club-life/news/[id]', params: { id: pezzi[1] } })
  }
  if (pezzi[0] === 'eventi' && pezzi.length === 2 && dati.eventi.some((e) => e.id === pezzi[1])) {
    return APP({ pathname: '/club-life/eventi/[id]', params: { id: pezzi[1] } })
  }
  if (pezzi[0] === 'wikiathlon' && pezzi.length === 3) {
    const id = `${pezzi[1]}/${pezzi[2]}`
    if (dati.schede.some((s) => s.id === id)) return APP(percorsoScheda(id))
  }
  return FUORI
}

/** Fuori dall'app: posta e telefono al sistema, le pagine al browser. */
export function apriFuori(url: string) {
  if (!/^https?:/i.test(url)) {
    Linking.openURL(url).catch(() => undefined)
    return
  }
  if (Platform.OS === 'web') {
    // Sincrono dentro il tocco: e' questo che il browser accetta come gesto.
    if (!window.open(url, '_blank')) window.location.assign(url)
    return
  }
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url))
}

/**
 * Si va a una schermata dell'app. Le schermate della barra (Home, prenotazioni,
 * pagamenti...) si raggiungono con `navigate`, che non ne impila una copia a ogni
 * tocco; i dettagli (una news, un modulo) con `push`, cosi' il tasto indietro
 * riporta a dove si era.
 */
export function vai(href: Href) {
  const percorso = typeof href === 'string' ? href : (href.pathname ?? '')
  if (percorso.includes('[')) router.push(href)
  else router.navigate(href)
}

/** Un link toccato in Club Life: la schermata dell'app se c'e', altrimenti fuori. */
export function apriLink(url: string, dati: ClubLife | null, etichetta = '') {
  const d = destinazione(url, dati, etichetta)
  if (d.tipo === 'app') vai(d.href)
  else if (d.tipo === 'fuori') apriFuori(url)
}
