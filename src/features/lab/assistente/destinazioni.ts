import type { Href } from 'expo-router'

import { hrefSezione, type SezioneHome } from '../home/sezioni'

// Dove porta ogni pulsante dell'assistente (29/10/2026). **Le chiavi sono un elenco chiuso, uguale a quello della mappa della funzione**
// (`_shared/assistente/mappa.ts` di APP-ATHLON): il modello dice una chiave, qui diventa un indirizzo. Una chiave sconosciuta non e' un pulsante.
// Modulo puro (niente React ne' React Native): si prova con `node --experimental-strip-types`.

export const DESTINAZIONI_ASSISTENTE = [
  'home-abbonamenti', 'home-pagamenti', 'pagamenti-storico', 'metodo-pagamento', 'home-prodotti', 'home-documenti', 'home-certificato',
  'home-famiglia', 'home-profilo', 'home-tesseramento', 'calendario', 'abbonamento-scegli', 'personal', 'allenamento', 'piani', 'piano',
  'componi-piano', 'importa-piano', 'consigli', 'food', 'misure', 'dispositivi', 'classifica', 'shop', 'shop-ordini', 'junior',
  'invita', 'notifiche', 'club-life', 'tv',
] as const

export type DestinazioneAssistente = (typeof DESTINAZIONI_ASSISTENTE)[number]

export function eDestinazioneAssistente(v: unknown): v is DestinazioneAssistente {
  return DESTINAZIONI_ASSISTENTE.some((d) => d === v)
}

const SEZIONI_HOME: Partial<Record<DestinazioneAssistente, SezioneHome>> = {
  'home-abbonamenti': 'abbonamenti',
  'home-pagamenti': 'pagamenti',
  'home-prodotti': 'prodotti',
  'home-documenti': 'documenti',
  'home-certificato': 'certificato',
  'home-famiglia': 'famiglia',
  'home-profilo': 'profilo',
  'home-tesseramento': 'tesseramento',
}

const GIORNO = /^\d{4}-\d{2}-\d{2}$/

/** L'indirizzo di una destinazione, coi suoi parametri (gia' controllati dalla funzione, ma qui si ricontrolla la forma). Null se non e' una destinazione nostra. */
export function hrefAssistente(destinazione: string, parametri: Record<string, string> = {}): Href | null {
  if (!eDestinazioneAssistente(destinazione)) return null
  const sezione = SEZIONI_HOME[destinazione]
  if (sezione) return hrefSezione(sezione)
  switch (destinazione) {
    case 'pagamenti-storico':
      return '/pagamenti/storico'
    case 'metodo-pagamento':
      return '/metodo-pagamento'
    case 'calendario': {
      const params: Record<string, string> = {}
      if (GIORNO.test(parametri.giorno ?? '')) {
        params.giorno = parametri.giorno
        if (parametri.attivita && parametri.attivita.length <= 60) params.attivita = parametri.attivita
      }
      return Object.keys(params).length ? { pathname: '/calendario', params } : '/calendario'
    }
    case 'abbonamento-scegli':
      return '/abbonamento'
    case 'personal':
      return '/personal'
    case 'allenamento':
    case 'piani':
      return '/allenamento'
    case 'piano':
      return parametri.id && /^[A-Za-z0-9_-]{1,64}$/.test(parametri.id) ? { pathname: '/allenamento/[scheda]', params: { scheda: parametri.id } } : '/allenamento'
    case 'componi-piano':
      return '/allenamento/agente'
    case 'importa-piano':
      return '/allenamento/importa'
    case 'consigli':
      return '/allenamento/consigli'
    case 'food':
      return '/allenamento/alimentazione'
    case 'misure':
      return '/allenamento/misure'
    case 'dispositivi':
      return '/allenamento/dispositivi'
    case 'classifica':
      return '/allenamento/classifica'
    case 'shop':
      return '/shop'
    case 'shop-ordini':
      return '/shop/ordini'
    case 'junior':
      return /^(19|20)\d{2}$/.test(parametri.anno ?? '') ? { pathname: '/junior', params: { anno: parametri.anno } } : '/junior'
    case 'invita':
      return '/invita'
    case 'notifiche':
      return '/notifiche'
    case 'club-life':
      return '/club-life'
    case 'tv':
      return '/tv'
    default:
      return null
  }
}

/**
 * La chiave della schermata in cui si trova la persona (percorso senza parametri, piu' la sezione della Home), per dirlo all'assistente:
 * «sei gia' qui». Null se non e' una schermata della mappa (la Home senza sezione, per esempio).
 */
export function schermataAssistente(percorso: string, sezione?: string | null): DestinazioneAssistente | null {
  const p = percorso.replace(/\/+$/, '') || '/'
  if (p === '/') return sezione && eDestinazioneAssistente(`home-${sezione}`) ? (`home-${sezione}` as DestinazioneAssistente) : null
  if (p === '/pagamenti' || p === '/pagamenti/index') return 'home-pagamenti'
  if (p.startsWith('/pagamenti/')) return 'pagamenti-storico'
  if (p.startsWith('/metodo-pagamento')) return 'metodo-pagamento'
  if (p === '/calendario') return 'calendario'
  if (p === '/abbonamenti') return 'home-abbonamenti'
  if (p === '/abbonamento') return 'abbonamento-scegli'
  if (p === '/personal') return 'personal'
  if (p === '/allenamento') return 'allenamento'
  if (p === '/allenamento/agente') return 'componi-piano'
  if (p === '/allenamento/importa') return 'importa-piano'
  if (p === '/allenamento/consigli') return 'consigli'
  if (p === '/allenamento/alimentazione') return 'food'
  if (p === '/allenamento/misure') return 'misure'
  if (p === '/allenamento/dispositivi') return 'dispositivi'
  if (p === '/allenamento/classifica') return 'classifica'
  if (/^\/allenamento\/[^/]+(\/[^/]+)?$/.test(p) && !['/allenamento/balance', '/allenamento/calorie', '/allenamento/nuova', '/allenamento/punteggio', '/allenamento/storico', '/allenamento/test', '/allenamento/training', '/allenamento/percorso'].some((x) => p.startsWith(x))) return 'piano'
  if (p === '/shop/ordini') return 'shop-ordini'
  if (p.startsWith('/shop')) return 'shop'
  if (p === '/junior') return 'junior'
  if (p === '/invita') return 'invita'
  if (p === '/notifiche') return 'notifiche'
  if (p.startsWith('/club-life')) return 'club-life'
  if (p.startsWith('/tv')) return 'tv'
  return null
}
