import { useSyncExternalStore } from 'react'

import type { AccessoRiservate } from '@/api/abbonamento'

// Le sezioni riservate (05/11/2026, richiesta di Maurizio): Athlon Health System e Athlon TV sono di chi ha un abbonamento principale attivo.
// Qui sta quello che sa l'app: lo stato letto dal server (`accesso` di portale-abbonamento, o quello che arriva con un rifiuto `riservata`
// di una funzione, `segnaRifiuto` da `funzione()` in api/lab.ts) e il modal, aperto o chiuso. **Nessun import che non sia un tipo**: lo
// importa api/lab.ts, e memoria.ts (che importa api/lab.ts) lo azzera all'uscita.

export type SezioneRiservata = 'salute' | 'tv'

type Stato = {
  /** undefined: non ancora letto; null: la funzione non lo sa dire (di prima, o non risponde) e le sezioni restano aperte. */
  accesso: AccessoRiservate | null | undefined
  lettoIl: number
  /** La sezione da cui si e' aperto il modal, o null se e' chiuso. */
  modal: SezioneRiservata | null
}

const VUOTO: Stato = { accesso: undefined, lettoIl: 0, modal: null }
let stato: Stato = VUOTO
const ascoltatori = new Set<() => void>()

function cambia(f: (s: Stato) => Stato) {
  stato = f(stato)
  ascoltatori.forEach((a) => a())
}

export function leggiRiservate(): Stato {
  return stato
}

export function useStatoRiservate(): Stato {
  return useSyncExternalStore(
    (a) => {
      ascoltatori.add(a)
      return () => ascoltatori.delete(a)
    },
    () => stato,
    () => VUOTO,
  )
}

/** Lo stato letto dal server (`accesso`). */
export function impostaAccesso(accesso: AccessoRiservate | null) {
  cambia((s) => ({ ...s, accesso, lettoIl: Date.now() }))
}

/** Una funzione ha rifiutato un'azione riservata: da qui le sezioni sono in anteprima, con lo stato che il rifiuto porta. */
export function segnaRifiuto(accesso: unknown) {
  const a = accesso as Partial<AccessoRiservate> | null | undefined
  const gp = Number(a?.guest_pass?.prezzo)
  impostaAccesso({ attivo: false, guest_pass: Number.isFinite(gp) && gp > 0 ? { prezzo: gp } : null })
}

/** Le sezioni sono chiuse per questa persona? Solo se il server l'ha detto: finche' non si sa, o con una funzione di prima, sono aperte. */
export const sezioniChiuse = (s: Stato) => s.accesso != null && !s.accesso.attivo

export function apriRiservata(sezione: SezioneRiservata) {
  cambia((s) => ({ ...s, modal: sezione }))
}

export function chiudiRiservata() {
  cambia((s) => ({ ...s, modal: null }))
}

/** Dopo un Guest Pass o un abbonamento nuovo: alla prossima apertura di una sezione si rilegge. */
export function scordaAccesso() {
  cambia((s) => ({ ...s, lettoIl: 0 }))
}

/** All'uscita dal laboratorio (memoria.ts): niente dell'utente di prima. */
export function azzeraRiservate() {
  cambia(() => VUOTO)
}
