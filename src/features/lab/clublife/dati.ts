import { useEffect, useSyncExternalStore } from 'react'

import { clubLifeDalDisco, leggiClubLife, type ClubLife } from '@/api/clubLife'

// Lo stato di Club Life, uno per tutta l'app: l'elenco e le tre schermate di
// dettaglio leggono la stessa copia, cosi' aprire una news non la richiede.
//
// All'apertura si disegna subito l'ultima copia (in memoria, o dal disco se
// l'app e' appena partita) e intanto se ne chiede una fresca: chi entra vede le
// cose subito, e le vede aggiornate un istante dopo. Una copia letta da meno di
// un minuto non si richiede: passare da una news all'elenco non e' un motivo.
//
// Lo stato e' un oggetto che si sostituisce a ogni cambio e si legge con
// `useSyncExternalStore`: con il React Compiler acceso, una lettura fuori da
// React fatta nel corpo di un hook puo' restare quella del primo giro.

const FRESCA_MS = 60_000

type Stato = { dati: ClubLife | null; errore: string | null; inCorso: boolean }

let stato: Stato | null = null
let lettaIl = 0
let inVolo: Promise<void> | null = null
const ascolti = new Set<() => void>()

function attuale(): Stato {
  if (!stato) stato = { dati: clubLifeDalDisco(), errore: null, inCorso: false }
  return stato
}

function cambia(nuovo: Partial<Stato>) {
  stato = { ...attuale(), ...nuovo }
  ascolti.forEach((f) => f())
}

function ascolta(f: () => void) {
  ascolti.add(f)
  return () => {
    ascolti.delete(f)
  }
}

function aggiorna(): Promise<void> {
  if (inVolo) return inVolo
  cambia({ inCorso: true })
  inVolo = leggiClubLife().then((r) => {
    inVolo = null
    if (r.ok) {
      lettaIl = Date.now()
      cambia({ dati: r.dati, errore: null, inCorso: false })
    } else cambia({ errore: r.errore, inCorso: false })
  })
  return inVolo
}

/** Club Life: i dati (o null finche' non ce n'e' nessuna copia), l'errore dell'ultima lettura, e come rileggere. */
export function useClubLife() {
  const s = useSyncExternalStore(ascolta, attuale, attuale)
  useEffect(() => {
    if (Date.now() - lettaIl > FRESCA_MS) aggiorna()
  }, [])
  return { ...s, riprova: aggiorna }
}
