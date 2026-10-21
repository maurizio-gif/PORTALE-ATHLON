import { Platform, Share } from 'react-native'

import { t } from '@/lib/lingua'

import { giornoEvento } from './comune'

// «Condividi con un amico» di un evento (21/10/2026, richiesta di Maurizio): lo stesso comando sulla pagina dell'evento
// del sito e nell'app. Si manda il link alla **pagina pubblica dell'evento** (`url`, quella del sito): l'amico la apre
// senza l'app e, se non e' iscritto, vi trova come venire. Niente dati della persona che condivide.
//
// Il foglio di condivisione e' quello del telefono (WhatsApp, messaggi, ...). Dove non c'e' (un computer) il link si copia.

export type EsitoCondivisione = 'condiviso' | 'copiato' | 'annullato' | 'errore'

type DaCondividere = { titolo: string; data: string; ora: string | null; url: string }

/** «Athlon Halloween Night @ Opus Club · Sabato 31 ottobre, 20:00». */
export function testoCondivisione(e: DaCondividere): string {
  return `${e.titolo} · ${giornoEvento(e.data)}${e.ora ? `, ${e.ora}` : ''}. ${t('Vieni anche tu!', 'Join me!')}`
}

export async function condividiEvento(e: DaCondividere): Promise<EsitoCondivisione> {
  const testo = testoCondivisione(e)
  try {
    if (Platform.OS !== 'web') {
      // Su Android il link va dentro il messaggio; su iOS ha il suo campo.
      const r = await Share.share(Platform.OS === 'ios' ? { message: testo, url: e.url } : { message: `${testo}\n${e.url}` })
      return r.action === Share.dismissedAction ? 'annullato' : 'condiviso'
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: e.titolo, text: testo, url: e.url })
      return 'condiviso'
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${testo}\n${e.url}`)
      return 'copiato'
    }
    return 'errore'
  } catch (errore) {
    // Chi chiude il foglio di condivisione non ha sbagliato niente.
    if (errore instanceof Error && errore.name === 'AbortError') return 'annullato'
    return 'errore'
  }
}
