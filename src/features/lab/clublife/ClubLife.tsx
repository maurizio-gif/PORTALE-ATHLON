import * as WebBrowser from 'expo-web-browser'

import { Pulsante } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { useIndirizzoClubLife } from './indirizzo'

// Club Life nell'app nativa. La pagina e' quella del sito e sul web si incorpora
// (ClubLife.web.tsx); qui non c'e' un riquadro che la contenga senza aggiungere
// un modulo nativo, e il browser di sistema, in una vista interna con il suo
// tasto per chiudere, e' la strada che non lo richiede.

export function ClubLife({ emailAccesso }: { emailAccesso?: string | null }) {
  const indirizzo = useIndirizzoClubLife(emailAccesso)
  return (
    <Schermata titolo="Club Life" sottotitolo="News, eventi, servizi dell'abbonamento e l'assistenza del club.">
      <Pulsante testo="Apri Club Life" icona="apriFuori" disabilitato={!indirizzo} onPress={() => indirizzo && void WebBrowser.openBrowserAsync(indirizzo)} />
    </Schermata>
  )
}
