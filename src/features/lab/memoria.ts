import { esci } from '@/api/lab'

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

/** L'ultimo valore buono, se c'e'. */
export function inMemoria<T>(chiave: string): T | undefined {
  return valori.get(chiave) as T | undefined
}

/** Scrive o aggiorna un valore (dopo una prenotazione, un salvataggio). */
export function ricorda<T>(chiave: string, valore: T) {
  valori.set(chiave, valore)
}

/** Lo chiede di nuovo (una richiesta sola alla volta per chiave) e lo tiene se e' andato. */
export function prendi<T>(chiave: string, carica: () => Promise<T>): Promise<T> {
  const gia = inVolo.get(chiave)
  if (gia) return gia as Promise<T>
  const p = carica()
    .then((v) => {
      if ((v as { ok?: boolean } | null)?.ok !== false) valori.set(chiave, v)
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
}

/** Toglie tutti i valori che cominciano cosi' (le letture di una persona, per esempio): alla prossima apertura si rileggono. */
export function scordaPrefisso(prefisso: string) {
  for (const k of [...valori.keys()]) if (k.startsWith(prefisso)) valori.delete(k)
}

/** All'uscita dal laboratorio non deve restare niente dell'utente di prima. */
export function dimentica() {
  valori.clear()
  inVolo.clear()
}

/** Esce dal laboratorio e svuota la memoria (anche quella di Athlon TV). Uscendo cade anche la vista cliente: al prossimo accesso si riparte dall'app di sempre. */
export async function esciDalLaboratorio() {
  // Le notifiche push di questo dispositivo sono di chi c'era: si tolgono **prima** di chiudere la sessione (il server vuole
  // sapere chi e') e senza far aspettare chi esce. Su un dispositivo condiviso non devono passare a chi entra dopo.
  await scollegaDispositivo()
  azzeraNotifiche()
  dimentica()
  // Il carrello dello shop e' di chi c'era: sul web sta nella scheda del browser, e un dispositivo condiviso non lo deve passare al prossimo.
  svuotaCarrello()
  // Le risposte dei questionari di «Componi il tuo piano», in sala e in vasca (zone che danno fastidio: dati sulla salute), non passano a chi entra dopo.
  dimenticaTutteLeRisposte()
  dimenticaLaVista()
  memoriaTv.vetrine = null
  memoriaTv.video.clear()
  await esci()
}
