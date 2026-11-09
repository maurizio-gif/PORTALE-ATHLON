import { useSyncExternalStore } from 'react'

// L'entrata trattenuta (07/11/2026, l'animazione di Pacman sul codice di accesso, `ui/CodicePacman.tsx`).
//
// Appena `verifyOtp` riesce, Supabase Auth cambia la sessione e l'app passa da sola all'area: la pagina d'accesso si smonta nello stesso
// istante, e la spunta verde che chiude l'animazione non si vedrebbe mai. Per lasciarle il tempo la pagina d'accesso **trattiene** la
// sessione: `useSessione` la fa vedere agli altri come assente finche' l'animazione non e' finita, poi la **rilascia** e l'app entra come
// sempre. La sessione vera c'e' gia' e non si tocca: si ritarda solo il momento in cui l'app se ne accorge.
//
// **Mai per sempre**: ogni trattenimento si scioglie da solo dopo `massimoMs` (di partenza 6 s), qualunque cosa succeda all'animazione
// (scheda in secondo piano, componente smontato, errore): nessun bug dell'animazione puo' lasciare qualcuno fuori dall'app.

let trattenuta = false
let sicurezza: ReturnType<typeof setTimeout> | null = null
const ascoltatori = new Set<() => void>()
const avvisa = () => ascoltatori.forEach((f) => f())

/** Trattiene la sessione. Si puo' richiamare: riarma il limite di tempo (serve quando arriva il «si'» del server, che puo' essere lento). */
export function trattieniEntrata(massimoMs = 6000) {
  if (sicurezza) clearTimeout(sicurezza)
  sicurezza = setTimeout(rilasciaEntrata, massimoMs)
  if (!trattenuta) {
    trattenuta = true
    avvisa()
  }
}

/** Lascia entrare: la sessione torna visibile e l'app passa all'area. Sicuro da richiamare anche se non c'e' niente da rilasciare. */
export function rilasciaEntrata() {
  if (sicurezza) {
    clearTimeout(sicurezza)
    sicurezza = null
  }
  if (trattenuta) {
    trattenuta = false
    avvisa()
  }
}

function iscrivi(f: () => void) {
  ascoltatori.add(f)
  return () => {
    ascoltatori.delete(f)
  }
}

/** Vero finche' l'entrata e' trattenuta (`useSessione` lo usa per nascondere la sessione). */
export function useEntrataTrattenuta(): boolean {
  return useSyncExternalStore(
    iscrivi,
    () => trattenuta,
    () => false,
  )
}
