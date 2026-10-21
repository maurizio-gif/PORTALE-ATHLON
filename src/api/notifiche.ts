import type { Href } from 'expo-router'

import { hrefSezione } from '@/features/lab/home/sezioni'

import { funzione } from './lab'
import { t } from '@/lib/lingua'

// Le notifiche del club (20/10/2026): la funzione portale-lab-notifiche di APP-ATHLON. Il club scrive al socio dal CRM
// (dalla scheda del contatto o dalla newsletter) e la notifica arriva in tre modi insieme: la **finestra** che compare
// appena arriva, la **push** sul dispositivo (se il socio l'ha attivata) e il **centro notifiche**.
// **Il server dice cosa mostrare e cosa e' successo; l'app non sceglie niente**: legge, e dice quando la notifica e'
// comparsa (`vista`), e' stata aperta (`aperta`) o ha portato a un passo (`azione`) — i segni con cui il club vede se
// la comunicazione e' arrivata. Le funzioni non sollevano mai.

/**
 * Le schermate a cui il pulsante di una notifica porta: lo stesso elenco di `app_notifica_destinazioni()` nel database e di
 * `lib/notificheApp.ts` del CRM. Una chiave che l'app non conosce non e' un pulsante (la notifica si legge e basta).
 */
export const DESTINAZIONI = ['home', 'calendario', 'abbonamenti', 'pagamenti', 'certificato', 'profilo', 'allenamento', 'shop', 'club-life', 'personal', 'tv'] as const
export type DestinazioneNotifica = (typeof DESTINAZIONI)[number]

function eDestinazione(v: unknown): v is DestinazioneNotifica {
  return DESTINAZIONI.some((d) => d === v)
}

/** L'indirizzo dell'app di una schermata. */
export function hrefDestinazione(d: DestinazioneNotifica): Href {
  switch (d) {
    case 'home':
      return '/'
    case 'calendario':
      return '/calendario'
    case 'abbonamenti':
    case 'pagamenti':
    case 'certificato':
    case 'profilo':
      // Le sezioni stanno nella Home (`/?sezione=…`).
      return hrefSezione(d)
    case 'allenamento':
      return '/allenamento'
    case 'shop':
      return '/shop'
    case 'club-life':
      return '/club-life'
    case 'personal':
      return '/personal'
    case 'tv':
      return '/tv'
  }
}

export type NotificaApp = {
  /** Il gettone della notifica per questa persona: lo usa il tracciamento. */
  id: string
  /** L'id della notifica, lo stesso per tutte le persone del nucleo: e' quello che la push porta a `/notifiche?apri=`. */
  notifica: string
  titolo: string
  testo: string
  destinazione: DestinazioneNotifica | null
  /** Una pagina di athlonroma.it, o null. Una sola fra destinazione e link. */
  link: string | null
  /** Il testo del pulsante; senza, «Apri». */
  etichetta: string | null
  creata_il: string
  /** Il club vuole che compaia come finestra, appena arriva. */
  finestra: boolean
  letta: boolean
  aperta: boolean
  /** Se e' rivolta a un'altra persona del nucleo (un figlio): per chi. */
  per: { member_id: number; nome: string | null } | null
}

/** C'e' un pulsante? Una schermata dell'app o una pagina del sito. */
export function conPulsante(n: NotificaApp): boolean {
  return n.destinazione !== null || n.link !== null
}

const LINK_SITO = /^https:\/\/(www\.)?athlonroma\.it(\/[^\s]*)?$/

/** Ricontrolla la forma di quello che arriva: un campo mancante o una schermata sconosciuta non deve rompere l'app. */
function leggi(x: unknown): NotificaApp | null {
  if (!x || typeof x !== 'object') return null
  const n = x as Record<string, unknown>
  if (typeof n.id !== 'string' || typeof n.titolo !== 'string' || typeof n.testo !== 'string' || !n.titolo.trim() || !n.testo.trim()) return null
  const destinazione = eDestinazione(n.destinazione) ? n.destinazione : null
  const link = !destinazione && typeof n.link === 'string' && LINK_SITO.test(n.link) ? n.link : null
  const per = n.per && typeof n.per === 'object' ? (n.per as Record<string, unknown>) : null
  return {
    id: n.id,
    notifica: typeof n.notifica === 'string' ? n.notifica : n.id,
    titolo: n.titolo.trim(),
    testo: n.testo.trim(),
    destinazione,
    link,
    etichetta: typeof n.etichetta === 'string' && n.etichetta.trim() ? n.etichetta.trim() : null,
    creata_il: typeof n.creata_il === 'string' ? n.creata_il : new Date().toISOString(),
    finestra: n.finestra === true,
    letta: n.letta === true,
    aperta: n.aperta === true,
    per: per && typeof per.member_id === 'number' ? { member_id: per.member_id, nome: typeof per.nome === 'string' ? per.nome : null } : null,
  }
}

function elenco(x: unknown): NotificaApp[] {
  return Array.isArray(x) ? x.map(leggi).filter((n): n is NotificaApp => n !== null) : []
}

export type Errore = { ok: false; stato: number; errore: string }

/**
 * Cosa c'e' di nuovo: quante notifiche non lette, e le finestre da far comparire. Si chiede ogni venti secondi mentre l'app
 * e' aperta (`Notifiche.tsx`). `stato` 403 vuol dire «non per te» (non e' fra i tester, o la funzione e' chiusa): chi chiama
 * smette di chiedere.
 */
export async function leggiNuove(): Promise<{ ok: true; nonLette: number; finestre: NotificaApp[] } | Errore> {
  const r = await funzione('portale-lab-notifiche', { azione: 'nuove' })
  if (!r.ok) return { ok: false, stato: r.stato, errore: String(r.dati.errore ?? t('Non riusciamo a leggere le notifiche adesso.', 'We can’t load the notifications right now.')) }
  return { ok: true, nonLette: Math.max(0, Number(r.dati.non_lette) || 0), finestre: elenco(r.dati.finestre) }
}

/** Il centro notifiche: tutto quello che il club ha scritto, dalla piu' recente. */
export async function leggiElenco(): Promise<{ ok: true; notifiche: NotificaApp[] } | Errore> {
  const r = await funzione('portale-lab-notifiche', { azione: 'elenco' })
  if (!r.ok) return { ok: false, stato: r.stato, errore: String(r.dati.errore ?? t('Non riusciamo a leggere le notifiche adesso.', 'We can’t load the notifications right now.')) }
  return { ok: true, notifiche: elenco(r.dati.notifiche) }
}

export type Evento = 'vista' | 'aperta' | 'azione' | 'letta' | 'nascosta'

/**
 * Dice al server cosa ha fatto la persona. `da` serve per `aperta` e `azione`: dalla finestra o dal centro. Non aspetta e non
 * solleva: il tracciamento non deve mai far fallire un tocco.
 */
export function segna(id: string, evento: Evento, da?: 'finestra' | 'centro'): void {
  if (!id) return
  funzione('portale-lab-notifiche', { azione: 'segna', id, evento, ...(da ? { da } : {}) }).catch(() => undefined)
}

/** «Segna tutte come lette»: toglie i pallini. Non conta come apertura. */
export async function leggiTutte(): Promise<boolean> {
  const r = await funzione('portale-lab-notifiche', { azione: 'leggi_tutte' })
  return r.ok
}

// ---------------------------------------------------------------------------
// Le notifiche push

export type StatoPushServer = {
  /** Il club ha configurato le chiavi: senza, l'app non offre il comando. */
  disponibile: boolean
  /** La chiave pubblica con cui il browser si iscrive. */
  chiave: string | null
  /** Questo dispositivo e' gia' iscritto per questo nucleo. */
  questo: boolean
  /** Quanti dispositivi ha il nucleo. */
  dispositivi: number
}

export async function statoPushServer(endpoint?: string): Promise<({ ok: true } & StatoPushServer) | Errore> {
  const r = await funzione('portale-lab-notifiche', { azione: 'push_stato', ...(endpoint ? { endpoint } : {}) })
  if (!r.ok) return { ok: false, stato: r.stato, errore: String(r.dati.errore ?? t('Non riusciamo a leggere lo stato delle notifiche.', 'We can’t load the notification status.')) }
  return {
    ok: true,
    disponibile: r.dati.disponibile === true && typeof r.dati.chiave === 'string' && r.dati.chiave.length > 0,
    chiave: typeof r.dati.chiave === 'string' ? r.dati.chiave : null,
    questo: r.dati.questo === true,
    dispositivi: Math.max(0, Number(r.dati.dispositivi) || 0),
  }
}

export type SottoscrizionePush = { endpoint: string; p256dh: string; auth: string }

export async function iscriviPush(s: SottoscrizionePush): Promise<{ ok: true } | { ok: false; errore: string }> {
  const r = await funzione('portale-lab-notifiche', { azione: 'push_iscrivi', ...s })
  return r.ok ? { ok: true } : { ok: false, errore: String(r.dati.errore ?? t('Non siamo riusciti ad attivare le notifiche. Riprova.', 'We couldn’t turn on notifications. Try again.')) }
}

export async function rimuoviPush(endpoint: string): Promise<boolean> {
  const r = await funzione('portale-lab-notifiche', { azione: 'push_rimuovi', endpoint })
  return r.ok
}
