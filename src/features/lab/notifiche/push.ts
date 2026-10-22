import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { iscriviPush, rimuoviPush, statoPushServer } from '@/api/notifiche'
import { t } from '@/lib/lingua'

import { vistaCorrente } from '../vista'

// Le notifiche push sul dispositivo (20/10/2026): solo sul web, dove l'app e' una PWA con il suo service worker (`public/sw.js`).
// Sul telefono nativo non ci sono (servirebbe `expo-notifications` e una build nuova): il centro notifiche e la finestra
// funzionano uguale, e questo file dice «non supportato» e basta.
//
// **Si attivano solo con un tocco della persona** (il browser chiede il permesso solo cosi', e su iPhone solo con l'app
// installata sulla schermata Home). Il permesso e' del dispositivo: lo da' la persona a questo browser. Quello che il
// server sa e' l'indirizzo del servizio push di questo dispositivo, associato al nucleo che l'ha attivato.
//
// **Chi esce dall'app toglie il suo dispositivo** (`scollegaDispositivo`, chiamata da `esciDalLaboratorio`): su un
// dispositivo condiviso le notifiche di una persona non devono arrivare a chi usa l'app dopo.

export type StatoPush =
  | 'verifica'
  /** Il browser non sa fare le push (o e' l'app nativa). */
  | 'non_supportato'
  /** iPhone e iPad: le push arrivano solo all'app aggiunta alla schermata Home. */
  | 'serve_app_installata'
  /** Il club non ha ancora attivato le push sul server. */
  | 'non_disponibile'
  /** L'utente ha negato il permesso al browser: si cambia dalle impostazioni del browser, non da qui. */
  | 'bloccato'
  | 'spento'
  | 'attivo'

function eWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

function supportato(): boolean {
  return eWeb() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function installata(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone o iPad (anche quando Safari si presenta come un Mac). */
function eIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** La chiave pubblica VAPID come la vuole il browser: base64url in byte. */
function chiaveInByte(base64Url: string): Uint8Array {
  const riempimento = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + riempimento).replace(/-/g, '+').replace(/_/g, '/')
  const grezzo = atob(base64)
  return Uint8Array.from([...grezzo].map((c) => c.charCodeAt(0)))
}

async function registrazione(): Promise<ServiceWorkerRegistration | null> {
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
  } catch {
    return null
  }
}

/**
 * Toglie questo dispositivo dal club e dal browser: l'indirizzo push non e' piu' di nessuno. Non solleva mai e non aspetta
 * oltre pochi secondi: chi esce non deve restare bloccato da una rete lenta. Va chiamata **prima** di chiudere la sessione
 * (il server vuole sapere chi e').
 */
export async function scollegaDispositivo(): Promise<void> {
  // In vista cliente il dispositivo non e' del cliente (e il server chiude ogni scrittura): niente da togliere.
  if (!supportato() || vistaCorrente()) return
  try {
    const lavoro = (async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (!sub) return
      await rimuoviPush(sub.endpoint)
      await sub.unsubscribe()
    })()
    await Promise.race([lavoro, new Promise((ok) => setTimeout(ok, 4000))])
  } catch {
    // Niente da fare: la prossima persona che attiva le notifiche su questo dispositivo se lo porta via.
  }
}

/** Lo stato delle push di questo dispositivo e i comandi per attivarle e spegnerle. */
export function usePush() {
  const [stato, setStato] = useState<StatoPush>('verifica')
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [dispositivi, setDispositivi] = useState(0)

  const leggi = useCallback(async () => {
    if (!supportato()) return setStato('non_supportato')
    // Su iPhone le push esistono solo per l'app aggiunta alla schermata Home.
    if (eIos() && !installata()) return setStato('serve_app_installata')
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      const server = await statoPushServer(sub?.endpoint)
      if (!server.ok) return setStato('non_disponibile')
      setDispositivi(server.dispositivi)
      if (!server.disponibile) return setStato('non_disponibile')
      if (Notification.permission === 'denied') return setStato('bloccato')
      setStato(sub && server.questo ? 'attivo' : 'spento')
    } catch {
      setStato('non_disponibile')
    }
  }, [])

  useEffect(() => {
    void leggi()
  }, [leggi])

  const attiva = useCallback(async () => {
    setErrore(null)
    setOccupato(true)
    try {
      // Il permesso va chiesto dentro il tocco: i browser non lo mostrano altrimenti.
      const permesso = await Notification.requestPermission()
      if (permesso !== 'granted') {
        setStato(permesso === 'denied' ? 'bloccato' : 'spento')
        if (permesso !== 'denied') setErrore(t('Non hai consentito le notifiche: puoi riprovare quando vuoi.', 'You didn’t allow notifications: you can try again whenever you like.'))
        return
      }
      const server = await statoPushServer()
      if (!server.ok || !server.disponibile || !server.chiave) {
        setStato('non_disponibile')
        return
      }
      const reg = await registrazione()
      if (!reg) return setErrore(t('Il browser non ha potuto preparare le notifiche. Riprova fra poco.', 'The browser couldn’t set up notifications. Try again shortly.'))
      await navigator.serviceWorker.ready
      const chiave = chiaveInByte(server.chiave)
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiave as BufferSource })
      }
      const j = sub.toJSON()
      if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return setErrore(t('Il browser ha dato un indirizzo per le notifiche che non va bene. Riprova.', 'The browser gave an invalid notification address. Try again.'))
      const r = await iscriviPush({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
      if (!r.ok) return setErrore(r.errore)
      setStato('attivo')
      void leggi()
    } catch {
      setErrore(t('Non siamo riusciti ad attivare le notifiche su questo dispositivo. Riprova fra poco.', 'We couldn’t turn on notifications on this device. Try again shortly.'))
    } finally {
      setOccupato(false)
    }
  }, [leggi])

  const spegni = useCallback(async () => {
    setErrore(null)
    setOccupato(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await rimuoviPush(sub.endpoint)
        await sub.unsubscribe()
      }
      setStato('spento')
      void leggi()
    } catch {
      setErrore(t('Non siamo riusciti a spegnere le notifiche su questo dispositivo. Riprova fra poco.', 'We couldn’t turn off notifications on this device. Try again shortly.'))
    } finally {
      setOccupato(false)
    }
  }, [leggi])

  return { stato, occupato, errore, dispositivi, attiva, spegni }
}
