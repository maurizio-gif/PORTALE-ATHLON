import { useEffect, useRef, useState } from 'react'

import { anteprimeEsercizi } from '@/api/lab'

import { inMemoria, ricorda } from '../memoria'

// Le miniature degli esercizi nell'editor di un piano (23/10/2026, segnalazione di un tester: «insieme al nome degli
// esercizi potrebbe essere carino mettere l'immagine, cosi' si capisce di quale esercizio si tratta»). La bozza composta o
// letta da un file porta solo i nomi: i poster li chiede qui l'editor, in una chiamata sola per tutti gli esercizi della
// libreria che il piano contiene, e di nuovo per quello che si sceglie con «Cambia esercizio».
//
// **Solo in memoria**, con il resto del laboratorio (`memoria.ts`: esce con l'uscita dall'app e dopo ogni salvataggio). I link
// sono firmati e durano quattro ore: se ne tengono tre (`VALIDITA_MS`), poi si richiedono. **Una miniatura non deve mai
// fermare niente**: se la funzione non risponde o non conosce l'azione (un'app nuova con una funzione vecchia) l'editor
// e' quello di prima, senza riquadri vuoti.

const CHIAVE = 'schede:anteprime'
const VALIDITA_MS = 3 * 3600_000

type Ricordo = Record<string, { poster: string | null; il: number }>

const ricordi = (): Ricordo => inMemoria<Ricordo>(CHIAVE) ?? {}

/** L'esercizio e' uno della libreria? Quelli del socio (`socio-…`) e quelli senza id non hanno ne' video ne' poster. */
export const eDellaLibreria = (id: string | null | undefined): id is string => !!id && !id.startsWith('socio-')

function ricordo(id: string): { poster: string | null } | undefined {
  const r = ricordi()[id]
  return r && Date.now() - r.il < VALIDITA_MS ? r : undefined
}

function scrivi(righe: { id: string; poster: string | null }[]) {
  if (!righe.length) return
  const ora = Date.now()
  const prima = ricordi()
  const dopo: Ricordo = {}
  // Si buttano i ricordi scaduti: la memoria non cresce con le ricerche di un'ora.
  for (const [id, r] of Object.entries(prima)) if (ora - r.il < VALIDITA_MS) dopo[id] = r
  for (const r of righe) dopo[r.id] = { poster: r.poster, il: ora }
  ricorda(CHIAVE, dopo)
}

/**
 * Un piano gia' letto con i suoi poster (un piano del socio che si modifica, uno del club che si copia): `scheda` li
 * da' gia' firmati, e non serve chiederli un'altra volta. Funziona anche dove `anteprime` e' chiusa (vista cliente).
 */
export function seminaAnteprime(esercizi: { esercizio_id: string; immagini: string[] }[]) {
  scrivi(esercizi.filter((e) => eDellaLibreria(e.esercizio_id) && e.immagini?.[0]).map((e) => ({ id: e.esercizio_id, poster: e.immagini[0] })))
}

/**
 * I poster degli esercizi indicati (id → link firmato). `inArrivo(id)` dice se la risposta e' ancora attesa: l'editor tiene il
 * posto della miniatura finche' si aspetta, e lo toglie se non arriva niente (un esercizio senza poster, una funzione
 * che non risponde).
 */
export function useAnteprime(ids: string[]) {
  const [, aggiorna] = useState(0)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const chiave = [...new Set(ids)].sort().join('\n')
  /** Gli id chiesti da questa schermata, e quelli la cui richiesta e' finita (bene o male): non si chiedono due volte. */
  const chiesti = useRef(new Set<string>())
  const chiusi = useRef(new Set<string>())
  const montato = useRef(true)
  useEffect(() => {
    montato.current = true
    return () => {
      montato.current = false
    }
  }, [])

  useEffect(() => {
    const mancanti = [...new Set(idsRef.current)].filter((id) => !ricordo(id) && !chiesti.current.has(id))
    if (!mancanti.length) return
    mancanti.forEach((id) => chiesti.current.add(id))
    // Il risultato si scrive anche se la schermata e' cambiata nel frattempo (un altro esercizio scelto): e' in memoria e serve dopo.
    anteprimeEsercizi(mancanti)
      .then((r) => {
        if (r.ok) {
          const trovati = new Map(r.anteprime.map((a) => [a.id, a.immagini?.[0] ?? null]))
          // Quelli che non tornano non hanno un poster: si ricorda anche questo, per non richiederli.
          scrivi(mancanti.map((id) => ({ id, poster: trovati.get(id) ?? null })))
        }
      })
      .catch(() => undefined)
      .finally(() => {
        mancanti.forEach((id) => chiusi.current.add(id))
        if (montato.current) aggiorna((n) => n + 1)
      })
  }, [chiave])

  return {
    poster: (id: string | null | undefined): string | null => (id ? (ricordo(id)?.poster ?? null) : null),
    inArrivo: (id: string | null | undefined): boolean => !!id && !ricordo(id) && !chiusi.current.has(id),
  }
}
