import { Platform } from 'react-native'

import { funzione } from '@/api/lab'
import { schermataDa, type Allegato, type TipoFeedback } from '@/features/lab/feedback/comune'

// Il feedback dei tester (20/10/2026): il messaggio del pulsante «Feedback», con gli allegati, alla funzione
// `portale-lab-feedback` (APP-ATHLON). Arriva nella sezione Tester del CRM; qui non si legge niente: l'app non
// riapre i messaggi, e non c'e' uno storico da mostrare.
//
// Insieme al testo vanno la schermata in cui si trova il tester e il dispositivo: servono a capire un problema, e il foglio
// lo dice a chi scrive. La funzione li ripulisce e, se mancano, prende il dispositivo dall'intestazione della richiesta.

export type EsitoFeedback = { ok: true } | { ok: false; errore: string }

const GUASTO = 'Non siamo riusciti a inviare il messaggio adesso. Riprova fra qualche minuto.'
const NON_ATTIVO = 'Il feedback non è ancora attivo: riprova fra qualche giorno. Nel frattempo scrivi pure a chi ti ha invitato come tester.'

function piattaforma(): 'web' | 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'
}

/** Cosa sta usando: sul web quello che dice il browser, sul telefono il sistema e la sua versione. */
function dispositivo(): string {
  if (Platform.OS === 'web') return typeof navigator !== 'undefined' ? navigator.userAgent : 'web'
  return `${Platform.OS} ${String(Platform.Version)}`
}

export async function inviaFeedback(f: { testo: string; tipo: TipoFeedback | null; schermata: string; allegati: Allegato[] }): Promise<EsitoFeedback> {
  const { ok, stato, dati } = await funzione('portale-lab-feedback', {
    azione: 'invia',
    testo: f.testo,
    tipo: f.tipo,
    schermata: schermataDa(f.schermata),
    piattaforma: piattaforma(),
    dispositivo: dispositivo(),
    allegati: f.allegati.map((a) => ({ nome: a.nome, base64: a.base64 })),
  })
  if (ok) return { ok: true }
  // Una funzione non ancora pubblicata risponde 404 senza il nostro corpo.
  return { ok: false, errore: dati.errore ?? (stato === 404 ? NON_ATTIVO : GUASTO) }
}
