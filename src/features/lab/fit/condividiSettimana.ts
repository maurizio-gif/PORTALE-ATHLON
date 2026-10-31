import { condividiImmagine, type EsitoCondivisione } from './condividiMese'
import { immagineSettimana, type FormatoImmagine } from './immagineSettimana'
import { testoCondivisioneSettimana, type RiepilogoSettimana } from './riepilogoSettimana'

// Come esce il riepilogo della settimana (31/10/2026): lo stesso giro di «Il tuo mese» (`condividiImmagine`), con il formato a scelta (post o storia).
// Sull'app nativa si condivide il testo. Non solleva mai.

export const condividiSettimana = (r: RiepilogoSettimana, formato: FormatoImmagine = 'feed', soloScarica = false): Promise<EsitoCondivisione> =>
  condividiImmagine(() => immagineSettimana(r, formato), `athlon-settimana-${r.inizio}${formato === 'storia' ? '-storia' : ''}.png`, testoCondivisioneSettimana(r), soloScarica)
