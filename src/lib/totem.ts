// La modalita' totem (02/11/2026): l'app aperta sul pannello all'ingresso del club, un 27 pollici verticale che sta in piedi
// davanti a tutti. E' **la stessa app, allo stesso indirizzo**: non c'e' una rotta separata, e' l'app a riconoscere il formato.
//
// Modulo puro e senza import (niente React, niente React Native): lo si prova con `node --experimental-strip-types` e lo
// importano sia il codice che deve sapere se e' sul totem sia quello che applica la scala (`totemAvvio.ts`).
//
// **Il formato si riconosce dalla forma dello schermo, mai dal puntatore.** Windows presenta il pannello touch al browser come
// un computer con il mouse (`pointer: fine`, `hover: hover`), quindi `pointer: coarse` non scatta. Tre condizioni insieme, e
// servono tutte e tre: larghezza >= 900 (esclude un telefono), altezza >= 1200 (esclude una finestra bassa), rapporto
// larghezza/altezza <= 7/10 (fa passare un 9:16, che e' 0,5625, e lascia fuori un tablet 3:4, che e' 0,75). **Sono le stesse tre
// del sito** (`@media (min-width: 900px) and (min-height: 1200px) and (max-aspect-ratio: 7/10)` in `global.css` di SITO-ATHLON):
// vanno tenute in pari, e il perche' del 7/10 invece del 5/8 sta li' (la finestra vera del pannello, con le barre del browser,
// misura 1064x1725, cioe' 0,617).

export const TOTEM_LARGHEZZA_MIN = 900
export const TOTEM_ALTEZZA_MIN = 1200
export const TOTEM_RAPPORTO_MAX = 7 / 10

/**
 * La larghezza **logica** dell'app sul totem, in pixel. Sul pannello l'app si disegna in una colonna stretta, come un telefono
 * grande, e la pagina intera si ingrandisce (`zoom` sull'elemento radice) fino a riempire la larghezza dello schermo. Cosi' il
 * testo resta della stessa misura in millimetri sia a 1080 pixel dichiarati (Windows al 100%) sia a 1440 (al 150%): cambia
 * solo la scala, non cio' che si vede. Con 540 la scala e' ~2 a 1080: il corpo di 15 pixel diventa 30, circa 9 mm sul vetro
 * (il sito tiene 8 mm per il corpo, a 1,2 m), e il piu' piccolo dei testi dell'app (10 pixel) resta sopra i 19 fisici.
 * Sotto i 900 logici l'app usa gia' il suo schema da telefono (`LARGO` in `components/Pagina.tsx`): e' proprio quello che si vuole.
 */
export const LARGHEZZA_LOGICA = 540

/** Dopo quanto tempo senza che nessuno tocchi lo schermo si esce da soli. */
export const INATTIVITA_MS = 5 * 60_000
/** Gli ultimi secondi prima dell'uscita, in cui compare «Sei ancora qui?». */
export const AVVISO_MS = 30_000
/**
 * Una richiesta in corso non e' una persona che tocca lo schermo, ma nemmeno un'attesa che puo' tenere acceso il totem per sempre:
 * mentre c'e' almeno una richiesta in volo il conto dell'inattivita' si ferma, per **al massimo 60 secondi in tutto** (si riparte da
 * zero a ogni tocco). Passato quel minuto la richiesta non rimanda piu' niente.
 */
export const PROROGA_RICHIESTA_MS = 60_000

/** Il formato del pannello? Le stesse tre condizioni del sito (vedi in cima). */
export function formatoTotem(larghezza: number, altezza: number): boolean {
  if (!(larghezza > 0) || !(altezza > 0)) return false
  return larghezza >= TOTEM_LARGHEZZA_MIN && altezza >= TOTEM_ALTEZZA_MIN && larghezza / altezza <= TOTEM_RAPPORTO_MAX
}

/** `?totem=1` forza la modalita', `?totem=0` la spegne; qualunque altro valore (o niente) lascia decidere al formato. */
export function forzatura(ricerca: string): boolean | null {
  try {
    const v = new URLSearchParams(ricerca).get('totem')
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    // Un indirizzo che non si legge non forza niente.
  }
  return null
}

/** Di quanto ingrandire la pagina per una finestra larga `larghezza`: la colonna logica deve riempirla. Mai meno di 1. */
export function scalaPer(larghezza: number): number {
  if (!(larghezza > 0)) return 1
  return Math.max(1, larghezza / LARGHEZZA_LOGICA)
}

/** Le misure che l'app deve vedere sul totem: quelle della colonna logica, non della finestra vera. */
export function dimensioniLogiche<T extends { width: number; height: number }>(d: T): T {
  const s = scalaPer(d.width)
  return { ...d, width: d.width / s, height: d.height / s }
}

const eWeb = () => typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.location !== 'undefined'

// **Decisa una volta sola, al caricamento della pagina.** E' da questa che dipende dove sta la sessione (memoria della scheda e non
// disco): cambiarla a pagina aperta lascerebbe una sessione nel posto sbagliato. Se la finestra cambia forma dopo (il browser del
// pannello che passa a schermo intero) lo dice `totemAvvio.ts`, che ricarica la pagina: la modalita' si rilegge da capo.
let forzata: boolean | null | undefined
let deciso: boolean | undefined

/** Il parametro `?totem=` letto al primo bisogno e tenuto **solo in memoria** (mai in uno storage: e' una prova, non una scelta da ricordare). */
export function totemForzato(): boolean | null {
  if (forzata === undefined) forzata = eWeb() ? forzatura(window.location.search) : null
  return forzata
}

/** Siamo sul totem? Solo sul web. */
export function inModalitaTotem(): boolean {
  if (deciso !== undefined) return deciso
  if (!eWeb()) return (deciso = false)
  const f = totemForzato()
  return (deciso = f !== null ? f : formatoTotem(window.innerWidth, window.innerHeight))
}

/** Per le prove: dimentica cio' che si era deciso. */
export function dimenticaLaModalita(): void {
  forzata = undefined
  deciso = undefined
}
