import { router, type Href } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Linking, Platform } from 'react-native'

import type { ClubLife } from '@/api/clubLife'

// Dove porta un link toccato dentro Club Life. Il sito scrive i suoi link interi
// e con lo slash finale (club-life.json), quindi una scheda che rimanda a
// un'altra scheda, o una news che rimanda a un evento, si riconosce: se e' fra
// quelle che l'app ha, si apre qui, senza uscire. Tutto il resto esce: la posta e
// il telefono al sistema, le pagine al browser (sul telefono quello interno, con
// il suo tasto per chiudere; sul web una scheda nuova, aperta dentro il tocco).

/*
 * Il percorso di un indirizzo del sito, o null se e' di un altro. Con una
 * espressione e non con `new URL()`: su iOS e Android l'URL di React Native e'
 * parziale, e `pathname` non e' detto che ci sia.
 */
function percorsoSito(url: string): string | null {
  const m = url.match(/^https?:\/\/(?:www\.)?athlonroma\.it(\/[^?#]*)?(?:[?#]|$)/i)
  return m ? (m[1] ?? '/') : null
}

/** La schermata dell'app per un indirizzo del sito, se ne ha una. */
export function schermataPer(url: string, dati: ClubLife | null): Href | null {
  const percorso = percorsoSito(url)
  if (percorso === null) return null
  const pezzi = percorso.split('/').filter(Boolean)
  if (pezzi.length === 1 && pezzi[0] === 'club-life') return '/club-life'
  if (!dati) return null
  if (pezzi[0] === 'news' && pezzi.length === 2 && dati.news.some((n) => n.id === pezzi[1])) {
    return { pathname: '/club-life/news/[id]', params: { id: pezzi[1] } }
  }
  if (pezzi[0] === 'eventi' && pezzi.length === 2 && dati.eventi.some((e) => e.id === pezzi[1])) {
    return { pathname: '/club-life/eventi/[id]', params: { id: pezzi[1] } }
  }
  if (pezzi[0] === 'wikiathlon' && pezzi.length === 3) {
    const id = `${pezzi[1]}/${pezzi[2]}`
    if (dati.schede.some((s) => s.id === id)) return percorsoScheda(id)
  }
  return null
}

export function percorsoScheda(id: string): Href {
  return { pathname: '/club-life/help-desk/[...scheda]', params: { scheda: id.split('/') } }
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

/** Un link toccato in Club Life: dentro l'app se ha la sua schermata, fuori altrimenti. */
export function apriLink(url: string, dati: ClubLife | null) {
  const qui = schermataPer(url, dati)
  if (qui) router.push(qui)
  else apriFuori(url)
}
