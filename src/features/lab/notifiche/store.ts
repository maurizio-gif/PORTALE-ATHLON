import { useSyncExternalStore } from 'react'

import { leggiNuove, segna, type NotificaApp } from '@/api/notifiche'

// Le notifiche del club, per tutta l'app (20/10/2026): quante non sono lette (il pallino sul campanello della Home) e le
// finestre da far comparire. Un solo posto, e un solo giro di richieste per tutta l'app (`Notifiche.tsx`).
//
// Solo in memoria, come ogni dato del laboratorio: uscendo dall'app (`esciDalLaboratorio`) non resta niente di chi c'era.
// **Una finestra si mostra una volta sola**: appena compare si dice al server (`vista`), che non la ridara' piu'; qui si tiene
// anche l'elenco di quelle gia' comparse, perche' una risposta ancora in volo non la faccia riapparire.

type Stato = {
  /** La funzione ha risposto, quindi per questa persona le notifiche esistono. Senza, nemmeno il campanello. */
  attivo: boolean
  /** Il server ha detto «non per te» (non e' fra i tester, sessione scaduta): non si chiede piu' finche' non si rientra. */
  spento: boolean
  nonLette: number
  finestre: NotificaApp[]
}

const VUOTO: Stato = { attivo: false, spento: false, nonLette: 0, finestre: [] }

let stato: Stato = VUOTO
const ascoltatori = new Set<() => void>()
const mostrate = new Set<string>()

function imposta(nuovo: Stato) {
  stato = nuovo
  ascoltatori.forEach((a) => a())
}

function iscrivi(a: () => void) {
  ascoltatori.add(a)
  return () => {
    ascoltatori.delete(a)
  }
}

export function useNotifiche(): Stato {
  return useSyncExternalStore(iscrivi, () => stato, () => VUOTO)
}

/** Il server ha detto di non chiedere piu'? (Per chi gira il giro delle richieste.) */
export function notificheSpente(): boolean {
  return stato.spento
}

let inVolo: Promise<void> | null = null

/** Rilegge cosa c'e' di nuovo. Una richiesta sola alla volta; non solleva mai. */
export function rileggi(): Promise<void> {
  if (stato.spento) return Promise.resolve()
  if (inVolo) return inVolo
  inVolo = leggiNuove()
    .then((r) => {
      if (r.ok) {
        // **La coda delle finestre non si rimpiazza, si allunga**: quella che la persona sta leggendo e' gia' `vista` per il
        // server, che alla risposta dopo non la ridara' piu'; rimpiazzare la coda la farebbe sparire sotto gli occhi.
        // Si aggiunge solo cio' che non e' ne' in coda ne' gia' comparso.
        const nuove = r.finestre.filter((f) => !mostrate.has(f.id) && !stato.finestre.some((x) => x.id === f.id))
        imposta({ attivo: true, spento: false, nonLette: r.nonLette, finestre: [...stato.finestre, ...nuove] })
      } else if (r.stato === 401 || r.stato === 403 || r.stato === 404 || r.stato === 409) {
        // Non per questa persona (sessione scaduta, non e' fra i tester, nessuna scheda) o funzione non ancora pubblicata (404):
        // inutile richiedere ogni venti secondi.
        imposta({ ...VUOTO, spento: true })
      }
      // Rete assente o errore del server: resta quello che si sapeva, e si riprova al giro dopo.
    })
    .catch(() => undefined)
    .finally(() => {
      inVolo = null
    })
  return inVolo
}

/** Una finestra e' comparsa sullo schermo: lo si dice al server, una volta sola. */
export function finestraComparsa(n: NotificaApp) {
  if (mostrate.has(n.id)) return
  mostrate.add(n.id)
  segna(n.id, 'vista')
}

/** La finestra e' chiusa (con o senza aver aperto la notifica): non si mostra piu'. */
export function chiudiFinestra(id: string, letta = false) {
  imposta({
    ...stato,
    nonLette: letta ? Math.max(0, stato.nonLette - 1) : stato.nonLette,
    finestre: stato.finestre.filter((f) => f.id !== id),
  })
}

/** Una notifica del centro e' stata aperta: un pallino in meno, senza aspettare la rilettura. */
export function unaLetta() {
  imposta({ ...stato, nonLette: Math.max(0, stato.nonLette - 1) })
}

export function tutteLette() {
  imposta({ ...stato, nonLette: 0 })
}

/** Uscendo dall'app: niente di chi c'era resta per chi entra. */
export function azzeraNotifiche() {
  mostrate.clear()
  inVolo = null
  imposta(VUOTO)
}
