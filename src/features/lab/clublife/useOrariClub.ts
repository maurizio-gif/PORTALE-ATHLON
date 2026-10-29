import { useEffect, useSyncExternalStore } from 'react'

import { orariClubDa, type OrariClub } from '@/api/club'
import { funzione } from '@/api/lab'

// Gli orari del club, uno stato per tutta l'app: la carta in Home e il blocco in Club Life leggono la stessa copia. Solo in memoria (sono
// dati pubblici, ma «oggi» cambia ogni giorno: una copia di ieri sul disco direbbe l'orario sbagliato). Una copia vale dieci minuti e solo
// per il giorno in cui e' stata letta; si ridisegna subito quella che c'e' e intanto se ne chiede una fresca.

const FRESCA_MS = 10 * 60_000

/** Gli orari di oggi. Non solleva mai: se la funzione non c'e' (ancora) o non risponde, `null` e la schermata non disegna niente. */
async function leggiOrariClub(): Promise<OrariClub | null> {
  const r = await funzione('portale-lab-assistente', { azione: 'club' })
  return r.ok ? orariClubDa(r.dati) : null
}

type Stato = { dati: OrariClub | null; letto: boolean }

let stato: Stato = { dati: null, letto: false }
let lettaIl = 0
let giornoLetto = ''
let inVolo: Promise<void> | null = null
const ascolti = new Set<() => void>()

const oggiLocale = () => new Date().toDateString()

function cambia(nuovo: Stato) {
  stato = nuovo
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
  inVolo = leggiOrariClub()
    .then((dati) => {
      // Una lettura che non riesce non cancella quella di prima: un orario di qualche ora fa e' meglio di niente, se e' di oggi.
      const precedente = giornoLetto === oggiLocale() ? stato.dati : null
      if (dati) {
        lettaIl = Date.now()
        giornoLetto = oggiLocale()
      }
      cambia({ dati: dati ?? precedente, letto: true })
    })
    .catch(() => cambia({ dati: giornoLetto === oggiLocale() ? stato.dati : null, letto: true }))
    .finally(() => {
      inVolo = null
    })
  return inVolo
}

/** Si butta con l'uscita dall'app: nessun dato del laboratorio resta a chi entra dopo (questi sono pubblici, ma lo store e' uno). */
export function azzeraOrariClub() {
  lettaIl = 0
  giornoLetto = ''
  cambia({ dati: null, letto: false })
}

/** Gli orari di oggi e gli avvisi (o null finche' non ci sono, o se non si leggono). */
export function useOrariClub(): OrariClub | null {
  const s = useSyncExternalStore(ascolta, () => stato, () => stato)
  useEffect(() => {
    if (Date.now() - lettaIl > FRESCA_MS || giornoLetto !== oggiLocale()) aggiorna()
  }, [])
  return s.dati
}
