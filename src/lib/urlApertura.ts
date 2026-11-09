import * as Linking from 'expo-linking'
import { Platform } from 'react-native'

import { memoriaLink, tokenDaFrammento } from './linkToken'

// Il link che ha aperto l'app nativa, e il token che porta (08/11/2026).
//
// I link delle email del club — `/entra?d=…#th=<token>`, `/delega/conferma/<codice>#th=<token>` — portano l'accesso monouso **nel frammento**:
// non parte verso nessun server. Sul web lo legge `leggiEToglieToken` da `window.location.hash`. **Nell'app nativa il frammento non e' in nessuna
// `window`**: il sistema consegna l'indirizzo intero a `Linking` (`getInitialURL` se l'app era chiusa, l'evento `url` se era aperta) e il
// router lo spezza, lasciando il frammento fra i parametri della rotta con il nome `'#'`.
//
// Questo file tiene due strade, perche' nessuna e' certa da sola: l'indirizzo intero (documentato, ma l'evento puo' arrivare prima che la pagina
// lo chieda: per questo si ascolta dall'avvio) e il parametro `'#'` del router (sempre li' quando la pagina si apre, ma e' un dettaglio
// interno del router). La pagina passa il secondo a `tokenDelLinkAperto`, che prova prima quello e poi l'altro.
//
// Il percorso conta: un token visto da `/delega/…` non serve a `/entra` (`linkToken.ts`). **Non si ascolta niente sul web.**

const memoria = memoriaLink()
let lettura: Promise<void> | null = null

/** Si mette in ascolto degli indirizzi che aprono l'app. Da chiamare all'avvio (`app/_layout.tsx`) e ogni volta che serve: lo fa una volta sola. */
export function ascoltaIndirizzi(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve()
  if (!lettura) {
    // Parte all'avvio per tutti: qualunque cosa vada storta qui non deve fermare l'app, che senza il token funziona come prima.
    try {
      Linking.addEventListener('url', ({ url }) => memoria.ricorda(url))
      lettura = Linking.getInitialURL().then(
        (url) => memoria.ricorda(url),
        () => undefined,
      )
    } catch {
      lettura = Promise.resolve()
    }
  }
  return lettura
}

/**
 * Il token del link che ha aperto l'app su quel percorso (`/entra`, `/delega/conferma`), una volta sola. `frammentoDelRouter` e' il parametro `'#'`
 * della rotta (`th=…`), se c'e'. Sul web non fa niente: li' c'e' `leggiEToglieToken`.
 */
export async function tokenDelLinkAperto(percorso: string, frammentoDelRouter?: string | null): Promise<string | null> {
  if (Platform.OS === 'web') return null
  await ascoltaIndirizzi()
  // Si prende sempre dalla memoria (la svuota), anche se il router ha gia' dato il token: sono lo stesso, e non deve restare.
  const visto = memoria.prendi(percorso)
  return tokenDaFrammento(frammentoDelRouter) ?? visto
}
