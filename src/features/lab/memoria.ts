import { esci } from '@/api/lab'

import { azzeraRimandoPush } from './notifiche/invitoPush'
import { azzeraAssistente } from './assistente/store'
import { azzeraOrariClub } from './clublife/useOrariClub'
import { azzeraNotifiche } from './notifiche/store'
import { scollegaDispositivo } from './notifiche/push'
import { dimenticaTutteLeRisposte } from './schede/rispostePiano'
import { svuotaCarrello } from './shop/carrello'
import { memoria as memoriaTv } from './tv/comune'
import { dimenticaLaVista } from './vista'

// La memoria del laboratorio, per non far aspettare: ogni funzione del
// laboratorio risponde in un secondo o poco piu' (14/10/2026), e cambiando
// scheda si ripartiva ogni volta da zero. Qui restano gli ultimi dati letti:
// la schermata si apre subito con quelli e intanto si aggiorna. Solo in
// memoria, mai sul disco: sono dati personali, e uscendo dall'app spariscono.
//
// Si tiene solo un esito andato a buon fine (`ok` non falso): un errore si
// richiede la volta dopo.

const valori = new Map<string, unknown>()
const inVolo = new Map<string, Promise<unknown>>()
/** Quando ogni valore e' stato scritto (`Date.now()`), per la freschezza. */
const scrittoIl = new Map<string, number>()

// La freschezza (go-live, 05/11/2026): finche' un valore ha meno di questi millisecondi, `prendi` lo restituisce senza
// richiederlo. Prima ogni sezione della Home che si rimontava (Documenti, Prodotti, Tesseramento, i contratti, la mia
// area, l'anagrafica) chiamava la sua funzione a ogni apertura, anche se l'aveva letta dieci secondi prima: con
// tremila persone che aprono l'app il primo giorno sono invocazioni e connessioni al database per dati che non
// cambiano in un minuto. Chi scrive (una prenotazione, un pagamento, un abbonamento nuovo) chiama gia' `scorda` o
// `ricorda`, quindi dopo una scrittura si rilegge comunque. Per chiave, in millisecondi; una chiave assente e' sempre
// da richiedere, com'era prima. Un'opzione di `prendi` vince su questa tabella.
const FRESCHEZZA: Record<string, number> = {
  area: 2 * 60_000,
  // Il link della foto e' firmato e dura un'ora: mezz'ora lo tiene sempre valido.
  anagrafica: 30 * 60_000,
  'abbonamenti:contratti': 2 * 60_000,
  'documenti:elenco': 5 * 60_000,
  'prodotti:elenco': 5 * 60_000,
  'tesseramenti:elenco': 5 * 60_000,
  'pagamenti:movimenti': 2 * 60_000,
}

/** Se il valore in memoria e' ancora fresco per questa chiave. */
function fresco(chiave: string, freschezzaMs: number | undefined): boolean {
  const f = freschezzaMs ?? FRESCHEZZA[chiave]
  // `ricorda(chiave, undefined)` e' un modo di invalidare: un valore vuoto non e' mai fresco.
  if (!f || valori.get(chiave) === undefined) return false
  return Date.now() - (scrittoIl.get(chiave) ?? 0) < f
}

/** L'ultimo valore buono, se c'e'. */
export function inMemoria<T>(chiave: string): T | undefined {
  return valori.get(chiave) as T | undefined
}

/** Scrive o aggiorna un valore (dopo una prenotazione, un salvataggio). */
export function ricorda<T>(chiave: string, valore: T) {
  valori.set(chiave, valore)
  scrittoIl.set(chiave, Date.now())
}

/**
 * Lo chiede di nuovo (una richiesta sola alla volta per chiave) e lo tiene se e' andato. Se in memoria c'e' un valore
 * ancora fresco (`FRESCHEZZA`, o `freschezzaMs` passato qui) lo restituisce senza richiederlo; `freschezzaMs: 0` lo
 * richiede sempre.
 */
export function prendi<T>(chiave: string, carica: () => Promise<T>, opzioni: { freschezzaMs?: number } = {}): Promise<T> {
  const gia = inVolo.get(chiave)
  if (gia) return gia as Promise<T>
  if (fresco(chiave, opzioni.freschezzaMs)) return Promise.resolve(valori.get(chiave) as T)
  const p = carica()
    .then((v) => {
      if ((v as { ok?: boolean } | null)?.ok !== false) {
        valori.set(chiave, v)
        scrittoIl.set(chiave, Date.now())
      }
      return v
    })
    .finally(() => inVolo.delete(chiave))
  inVolo.set(chiave, p)
  return p
}

/** Lo chiede in anticipo, se non c'e' gia': per le schede che probabilmente si apriranno. */
export function precarica<T>(chiave: string, carica: () => Promise<T>) {
  if (!valori.has(chiave) && !inVolo.has(chiave)) prendi(chiave, carica).catch(() => undefined)
}

/** Toglie un valore: alla prossima apertura si rilegge (il nucleo e' cambiato, per esempio). */
export function scorda(chiave: string) {
  valori.delete(chiave)
  scrittoIl.delete(chiave)
}

/** Toglie tutti i valori che cominciano cosi' (le letture di una persona, per esempio): alla prossima apertura si rileggono. */
export function scordaPrefisso(prefisso: string) {
  for (const k of [...valori.keys()]) if (k.startsWith(prefisso)) scorda(k)
}

/** All'uscita dal laboratorio non deve restare niente dell'utente di prima. */
export function dimentica() {
  valori.clear()
  inVolo.clear()
  scrittoIl.clear()
}

/** Esce dal laboratorio e svuota la memoria (anche quella di Athlon TV). Uscendo cade anche la vista cliente: al prossimo accesso si riparte dall'app di sempre. */
export async function esciDalLaboratorio(opzioni: { soloQuestoDispositivo?: boolean } = {}) {
  // Le notifiche push di questo dispositivo sono di chi c'era: si tolgono **prima** di chiudere la sessione (il server vuole
  // sapere chi e') e senza far aspettare chi esce. Su un dispositivo condiviso non devono passare a chi entra dopo.
  await scollegaDispositivo()
  azzeraNotifiche()
  azzeraAssistente()
  azzeraOrariClub()
  // Il «non ora» dell'invito alle notifiche e' del dispositivo: chi entra dopo non lo eredita.
  azzeraRimandoPush()
  dimentica()
  // Il carrello dello shop e' di chi c'era: sul web sta nella scheda del browser, e un dispositivo condiviso non lo deve passare al prossimo.
  svuotaCarrello()
  // Le risposte dei questionari di «Componi il tuo piano», in sala e in vasca (zone che danno fastidio: dati sulla salute), non passano a chi entra dopo.
  dimenticaTutteLeRisposte()
  dimenticaLaVista()
  memoriaTv.vetrine = null
  memoriaTv.video.clear()
  // Sul totem si chiude solo la sessione di questo dispositivo: l'accesso della persona sul suo telefono resta com'e'.
  await esci(opzioni.soloQuestoDispositivo ? 'local' : 'global')
}
