import { esci } from '@/api/lab'

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

/**
 * Le chiavi che `dimentica` lascia stare. `dimentica` si chiama dopo una scrittura (un piano salvato, una misura, il test) per far
 * rileggere i dati che sono cambiati; ci sono dati che una scrittura non cambia e che non si devono riscrivere ogni volta, come il
 * messaggio di benvenuto (un'altra chiamata all'AI e un altro testo). Si svuotano solo uscendo dal laboratorio (`dimentica(true)`).
 */
const durevoli = new Set<string>()

/** Dichiara che questa chiave sopravvive a `dimentica()` (non a `dimentica(true)`, cioe' all'uscita). */
export function durevole(chiave: string) {
  durevoli.add(chiave)
}

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

/** Dopo una scrittura: si rileggono i dati (non le chiavi `durevole`). All'uscita (`tutto`) non deve restare niente dell'utente di prima. */
export function dimentica(tutto = false) {
  for (const chiave of [...valori.keys()]) if (tutto || !durevoli.has(chiave)) valori.delete(chiave)
  inVolo.clear()
}

/** Esce dal laboratorio e svuota la memoria (anche quella di Athlon TV). Uscendo cade anche la vista cliente: al prossimo accesso si riparte dall'app di sempre. */
export async function esciDalLaboratorio() {
  dimentica(true)
  // Il carrello dello shop e' di chi c'era: sul web sta nella scheda del browser, e un dispositivo condiviso non lo deve passare al prossimo.
  svuotaCarrello()
  dimenticaLaVista()
  memoriaTv.vetrine = null
  memoriaTv.video.clear()
  await esci()
}
