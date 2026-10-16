// Come in ogni barra di schede, toccare di nuovo «Club Life» quando ci si e'
// gia' riporta l'elenco all'inizio: la barra manda il segnale, la schermata lo
// ascolta e torna in cima.

const ascolti = new Set<() => void>()

/** La barra: «torna all'inizio di Club Life». */
export function clubLifeDaCapo() {
  ascolti.forEach((f) => f())
}

/** La schermata: chiede di essere avvisata. Restituisce come smettere. */
export function ascoltaClubLifeDaCapo(f: () => void): () => void {
  ascolti.add(f)
  return () => {
    ascolti.delete(f)
  }
}
