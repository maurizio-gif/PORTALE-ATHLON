import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { iscriviPush, iscriviPushNativo, rimuoviPush, statoPushServer } from '@/api/notifiche'
import { t } from '@/lib/lingua'
import { inModalitaTotem } from '@/lib/totem'

import { vistaCorrente } from '../vista'
import { attivaNativo, eNativo, gettone, permessoNativo, spegniNativo } from './pushNativo'

// Le notifiche push sul dispositivo (20/10/2026): solo sul web, dove l'app e' una PWA con il suo service worker (`public/sw.js`).
// Sul telefono nativo non ci sono (servirebbe `expo-notifications` e una build nuova): il centro notifiche e la finestra
// funzionano uguale, e questo file dice «non supportato» e basta.
//
// **Il permesso si chiede solo con un tocco della persona** (il browser chiede il permesso solo cosi', e su iPhone solo con l'app
// installata sulla schermata Home). Se il permesso c'e' gia', dal 12/11/2026 il dispositivo si iscrive da solo dopo l'accesso
// (`registraSePermessoGiaConcesso`, qui sotto). Il permesso e' del dispositivo: lo da' la persona a questo browser. Quello che il
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
  if (eNativo) return true
  // Sul totem (lib/totem.ts) non si attiva nessuna notifica push: l'indirizzo push resterebbe al pannello, e le notifiche di una persona
  // arriverebbero sullo schermo di tutti. Stato `non_supportato`: niente carta in Home, niente finestra di invito, niente richiesta di permesso.
  return eWeb() && !inModalitaTotem() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
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
      if (eNativo) {
        await spegniNativo()
        return
      }
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

// Piu' istanze di `usePush` possono essere montate insieme (la carta in Home, l'offerta nella finestra, la carta del centro): quando una
// cambia lo stato le altre lo rileggono, o la carta in Home direbbe «Attiva» a chi ha appena attivato dalla finestra (25/10/2026).
const istanze = new Set<() => Promise<void>>()
function avvisaLeAltre(mia: () => Promise<void>) {
  istanze.forEach((rileggi) => {
    if (rileggi !== mia) void rileggi()
  })
}

// ---------------------------------------------------------------------------
// La registrazione automatica quando il permesso c'e' gia' (12/11/2026, richiesta di Maurizio).
//
// Il permesso del sistema (iPhone, Android, browser) non si puo' dare al posto della persona. Ma molti telefoni l'hanno **gia'**: Android fino
// alla 12 lo concede all'installazione, e chi l'aveva dato e poi e' uscito dall'app (che toglie il dispositivo, `scollegaDispositivo`) rientra con
// il permesso ancora acceso. A loro l'app diceva «Attiva» e aspettava un tocco, e il club li contava senza push. Ora, dopo l'accesso, se il
// permesso e' gia' concesso e il server non conosce questo dispositivo, lo si iscrive senza chiedere niente: nessuna finestra del sistema.
//
// **Chi le ha spente dall'app resta spento**: «Spegni» lascia un segno sul dispositivo (`SPENTE_A_MANO`) e qui non si riaccende; «Attiva» lo
// toglie. Uscire dall'app non lascia il segno (non e' una scelta sulle notifiche). Sul totem e in vista cliente non si fa niente (`supportato`,
// `vistaCorrente`). Sul web, su iPhone, solo nell'app installata, come sempre. Non solleva mai e gira una volta per apertura.

const SPENTE_A_MANO = 'athlon.push.spente_a_mano'

function segnaSpenteAMano(spente: boolean) {
  try {
    if (spente) globalThis.localStorage?.setItem(SPENTE_A_MANO, '1')
    else globalThis.localStorage?.removeItem(SPENTE_A_MANO)
  } catch {
    // Senza memoria si resta al comportamento di prima: nessun danno.
  }
}

function spenteAMano(): boolean {
  try {
    return globalThis.localStorage?.getItem(SPENTE_A_MANO) === '1'
  } catch {
    return true
  }
}

let registrazioneProvata = false

/** Iscrive questo dispositivo se il permesso delle notifiche c'e' gia' e il server non lo conosce. Restituisce true se l'ha iscritto. */
export async function registraSePermessoGiaConcesso(): Promise<boolean> {
  if (registrazioneProvata) return false
  registrazioneProvata = true
  if (!supportato() || vistaCorrente() || spenteAMano()) return false
  try {
    if (eNativo) {
      if ((await permessoNativo()) !== 'concesso') return false
      const g = await gettone()
      if (!g) return false
      const server = await statoPushServer(undefined, g)
      if (!server.ok || !server.nativo || server.questo) return false
      const r = await iscriviPushNativo(g, Platform.OS)
      if (r.ok) istanze.forEach((rileggi) => void rileggi())
      return r.ok
    }
    // Il browser: solo se il permesso e' gia' «granted» (senza un tocco non si chiede), e su iPhone solo l'app installata.
    if (Notification.permission !== 'granted' || (eIos() && !installata())) return false
    const reg = await navigator.serviceWorker.getRegistration()
    let sub = (await reg?.pushManager.getSubscription()) ?? null
    const server = await statoPushServer(sub?.endpoint)
    if (!server.ok || !server.disponibile || !server.chiave) return false
    if (sub && server.questo) return false
    const r0 = reg ?? (await registrazione())
    if (!r0) return false
    await navigator.serviceWorker.ready
    if (!sub) sub = await r0.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveInByte(server.chiave) as BufferSource })
    const j = sub.toJSON()
    if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return false
    const r = await iscriviPush({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
    if (r.ok) istanze.forEach((rileggi) => void rileggi())
    return r.ok
  } catch {
    return false
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
    if (eNativo) {
      // L'app nativa: il gettone di Expo, non un indirizzo di browser. Il server dice se sa mandarle (`nativo`).
      try {
        const permesso = await permessoNativo()
        const g = permesso === 'concesso' ? await gettone() : null
        const server = await statoPushServer(undefined, g ?? undefined)
        if (!server.ok || !server.nativo) return setStato('non_disponibile')
        setDispositivi(server.dispositivi)
        if (permesso === 'negato') return setStato('bloccato')
        return setStato(g && server.questo ? 'attivo' : 'spento')
      } catch {
        return setStato('non_disponibile')
      }
    }
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
    istanze.add(leggi)
    return () => {
      istanze.delete(leggi)
    }
  }, [leggi])

  const attiva = useCallback(async () => {
    segnaSpenteAMano(false)
    setErrore(null)
    setOccupato(true)
    if (eNativo) {
      try {
        const r = await attivaNativo()
        if (r.ok) {
          setStato('attivo')
          void leggi()
          avvisaLeAltre(leggi)
        } else if (r.negato) setStato('bloccato')
        else if (r.errore === null) setErrore(t('Non hai consentito le notifiche: puoi riprovare quando vuoi.', 'You didn’t allow notifications: you can try again whenever you like.'))
        else if (r.errore === 'gettone') setErrore(t('Questo dispositivo non ha potuto preparare le notifiche. Riprova fra poco.', 'This device couldn’t set up notifications. Try again shortly.'))
        else setErrore(r.errore)
      } finally {
        setOccupato(false)
      }
      return
    }
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
      avvisaLeAltre(leggi)
    } catch {
      setErrore(t('Non siamo riusciti ad attivare le notifiche su questo dispositivo. Riprova fra poco.', 'We couldn’t turn on notifications on this device. Try again shortly.'))
    } finally {
      setOccupato(false)
    }
  }, [leggi])

  const spegni = useCallback(async () => {
    // Una scelta della persona: la registrazione automatica non le riaccende (`registraSePermessoGiaConcesso`).
    segnaSpenteAMano(true)
    setErrore(null)
    setOccupato(true)
    try {
      if (eNativo) {
        await spegniNativo()
        setStato('spento')
        void leggi()
        avvisaLeAltre(leggi)
        return
      }
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await rimuoviPush(sub.endpoint)
        await sub.unsubscribe()
      }
      setStato('spento')
      void leggi()
      avvisaLeAltre(leggi)
    } catch {
      setErrore(t('Non siamo riusciti a spegnere le notifiche su questo dispositivo. Riprova fra poco.', 'We couldn’t turn off notifications on this device. Try again shortly.'))
    } finally {
      setOccupato(false)
    }
  }, [leggi])

  return { stato, occupato, errore, dispositivi, attiva, spegni }
}

/**
 * Vero per qualche secondo dopo che la persona ha acceso le notifiche da questa schermata (da «spento» ad «attivo»): serve a dire
 * «fatto» senza ripeterlo a chi le aveva gia' (per lui lo stato parte da «attivo» e non passa da «spento»).
 */
export function useAppenaAttivate(stato: StatoPush, ms = 6000): boolean {
  const [si, setSi] = useState(false)
  const prima = useRef<StatoPush>('verifica')
  useEffect(() => {
    if (prima.current === 'spento' && stato === 'attivo') setSi(true)
    prima.current = stato
  }, [stato])
  useEffect(() => {
    if (!si) return
    const x = setTimeout(() => setSi(false), ms)
    return () => clearTimeout(x)
  }, [si, ms])
  return si
}
