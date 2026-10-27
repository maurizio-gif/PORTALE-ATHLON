import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { Platform } from 'react-native'

import { iscriviPushNativo, rimuoviPushNativo, segnaGettone } from '@/api/notifiche'

import { rileggi } from './store'

// Le notifiche push dell'app nativa (27/10/2026, build 5, richiesta di Maurizio). Sul web restano quelle del browser (`push.ts`).
//
// **Il dispositivo e' un gettone di Expo** (`ExponentPushToken[...]`): lo da' il servizio push di Expo, che parla con Apple (APNs) per
// conto del club. Il server lo ricorda come `expo:<gettone>` accanto agli indirizzi dei browser, e il CRM manda le push nativi dal
// servizio di Expo. Per Android serve in piu' la chiave di Firebase (FCM) dentro il progetto Expo: finche' non c'e', il gettone non si
// ottiene e il comando non compare (`gettone()` dice null, senza errore).
//
// **Il permesso si chiede solo con un tocco** (`attivaNativo`), come sul web. In primo piano la push non mostra l'avviso del sistema: l'app
// ha gia' la sua finestra (`FinestraNotifica`) e la rilegge subito. In secondo piano l'avviso lo mostra il sistema; il tocco porta al centro
// notifiche sulla notifica giusta e segna «aperta» col gettone della notifica (nessuna sessione, come il service worker del web).

export const eNativo = Platform.OS === 'ios' || Platform.OS === 'android'

const PREFISSO = 'expo:'

/** L'identificativo che il server ricorda per questo dispositivo. */
export const comeEndpoint = (gettone: string) => `${PREFISSO}${gettone}`

function progetto(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId
}

/** Il gettone di questo dispositivo, o null (permesso negato, simulatore, Android senza Firebase). Non solleva mai. */
export async function gettone(): Promise<string | null> {
  try {
    const id = progetto()
    const r = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined)
    return r.data || null
  } catch {
    return null
  }
}

export type PermessoNativo = 'concesso' | 'negato' | 'da_chiedere'

export async function permessoNativo(): Promise<PermessoNativo> {
  try {
    const p = await Notifications.getPermissionsAsync()
    if (p.granted) return 'concesso'
    return p.canAskAgain === false ? 'negato' : 'da_chiedere'
  } catch {
    return 'da_chiedere'
  }
}

/** Chiede il permesso (dentro il tocco), prende il gettone e lo iscrive. Restituisce l'errore da mostrare, o null. */
export async function attivaNativo(): Promise<{ ok: true } | { ok: false; errore: string | null; negato: boolean }> {
  try {
    let p = await Notifications.getPermissionsAsync()
    if (!p.granted) p = await Notifications.requestPermissionsAsync()
    if (!p.granted) return { ok: false, errore: null, negato: p.canAskAgain === false }
    const g = await gettone()
    if (!g) return { ok: false, errore: 'gettone', negato: false }
    const r = await iscriviPushNativo(g, Platform.OS)
    return r.ok ? { ok: true } : { ok: false, errore: r.errore, negato: false }
  } catch {
    return { ok: false, errore: 'gettone', negato: false }
  }
}

/** Toglie questo dispositivo dal club. Non solleva mai. */
export async function spegniNativo(): Promise<boolean> {
  const g = await gettone()
  if (!g) return true
  return rimuoviPushNativo(g)
}

type Dati = { url?: unknown; ids?: unknown }

function idsDa(dati: Dati): string[] {
  return Array.isArray(dati.ids) ? dati.ids.filter((x): x is string => typeof x === 'string').slice(0, 10) : []
}

function aperturaDa(dati: Dati): string | null {
  const url = typeof dati.url === 'string' ? dati.url : ''
  const m = /[?&]apri=([A-Za-z0-9-]{8,64})/.exec(url)
  return m ? m[1] : null
}

function allaNotifica(r: Notifications.NotificationResponse) {
  const dati = (r.notification.request.content.data ?? {}) as Dati
  const ids = idsDa(dati)
  if (ids.length) void segnaGettone(ids, 'aperta')
  const apri = aperturaDa(dati)
  if (apri) router.navigate({ pathname: '/notifiche', params: { apri } })
  else router.navigate('/notifiche')
}

let attivo = false

/**
 * Da chiamare una volta, quando l'app e' entrata: come si comportano le push in primo piano e cosa fa il tocco. Ritorna la funzione per
 * smettere. Anche la notifica che ha aperto l'app da chiusa (`getLastNotificationResponseAsync`) porta alla sua schermata.
 */
export function ascoltaNotificheNative(): () => void {
  if (!eNativo || attivo) return () => undefined
  attivo = true
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  })
  // In primo piano: la finestra dell'app e' piu' ricca dell'avviso del sistema, quindi si rilegge subito e basta.
  const arrivata = Notifications.addNotificationReceivedListener(() => void rileggi())
  const toccata = Notifications.addNotificationResponseReceivedListener(allaNotifica)
  void Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      if (!r) return
      allaNotifica(r)
      // Senza, a ogni apertura da chiuso l'app tornerebbe alla stessa notifica.
      Notifications.clearLastNotificationResponse()
    })
    .catch(() => undefined)
  return () => {
    arrivata.remove()
    toccata.remove()
    attivo = false
  }
}
