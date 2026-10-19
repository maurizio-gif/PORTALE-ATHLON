import { hrefDestinazione, type NotificaApp } from '@/api/notifiche'
import { clubLifeDalDisco } from '@/api/clubLife'

import { apriLink, vai } from '../clublife/link'

/**
 * Porta dove dice il pulsante di una notifica: una schermata dell'app, o una pagina del sito. Una pagina del sito si apre
 * nella schermata dell'app che la mostra (una news, un evento, una scheda) se Club Life e' gia' stato letto, altrimenti
 * nel browser, come ogni link di Club Life (`clublife/link.ts`).
 */
export function apriDestinazione(n: NotificaApp) {
  if (n.destinazione) vai(hrefDestinazione(n.destinazione))
  else if (n.link) apriLink(n.link, clubLifeDalDisco(), n.etichetta ?? '')
}
