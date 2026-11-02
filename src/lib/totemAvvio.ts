import { INATTIVITA_MS, PROROGA_RICHIESTA_MS, formatoTotem, inModalitaTotem, scalaPer, totemForzato } from './totem'

// Cio' che la modalita' totem (totem.ts) fa al caricamento della pagina, **prima di qualunque altro modulo**: lo importa per primo
// `localStorage.ts` (che a sua volta lo importano `supabase.ts` e `lingua.ts`), cosi' la sessione nasce gia' nel posto giusto.
// Solo sul web e solo sul totem: altrove il modulo non fa niente, a parte tenere d'occhio la forma della finestra (ultima voce).
//
// 1. **Niente resta sul dispositivo.** Il totem e' di tutti. `localStorage` viene rimpiazzato dalla memoria della scheda
//    (`sessionStorage`): la sessione di accesso, la lingua, la cache di Club Life e ogni altra chiave dell'app finiscono li', e
//    muoiono con la scheda, senza toccare il resto del codice (che continua a scrivere su `localStorage`). In piu':
//    - il vero `localStorage` si svuota a ogni apertura (qualcosa che c'era prima, per esempio da una prova a computer);
//    - un `sessionStorage` piu' vecchio di cinque minuti piu' la proroga si butta: i browser che riaprono le schede (`session
//      restore`) restituirebbero la sessione di chi c'era. Il segno e' l'ora dell'ultimo tocco, tenuta in `athlon_totem_ultimo`.
// 2. **La scala.** La pagina si ingrandisce (`zoom` sull'elemento radice, non su un contenitore: i riquadri che React Native
//    attacca al `body` verrebbero fuori dalla scala) cosi' la colonna logica di 540 pixel riempie la larghezza dello schermo.
//    Misurato su Chromium 153: con `zoom` sulla radice `#root` riempie esattamente la finestra, `offsetWidth` e' in pixel logici,
//    `getBoundingClientRect` in pixel veri, `innerWidth` e `visualViewport` restano veri (per questo le schermate leggono la
//    larghezza da `finestra.ts`), e **le unita' `vw`/`vh` si moltiplicano per la scala** (100vw diventa 200vw): il solo uso nell'app
//    e' la regola `display-mode: standalone` di `public/index.html`, che qui si riporta a `100%`.
// 3. **Le richieste in volo si contano** (`richiesteInCorso`): la guardia dell'inattivita' (`features/lab/totem/GuardiaTotem`) le
//    tratta come attesa per al massimo un minuto.
// 4. **Nessun suggerimento dal browser** nei campi: `autocomplete="off"` su ogni `input` e `textarea` che compare.
// 5. **Se la forma della finestra cambia** (il browser del pannello che passa a schermo intero dopo il caricamento) e il formato
//    non e' piu' quello deciso all'avvio, la pagina si ricarica: la modalita' (e con lei dove sta la sessione) si rilegge da capo.

const CHIAVE_ULTIMO = 'athlon_totem_ultimo'
/** Oltre questo tempo dall'ultimo tocco, una memoria di scheda trovata all'apertura non e' piu' di chi c'e' adesso. */
const SCADE_MS = INATTIVITA_MS + PROROGA_RICHIESTA_MS

const eWeb = () => typeof window !== 'undefined' && typeof document !== 'undefined'

let veroLocalStorage: Storage | null = null
let inVolo = 0
/** Da quando c'e' almeno una richiesta in volo (se ce n'e' una), e quanto tempo ce n'e' stata in tutto prima di allora. */
let voloDal = 0
let voloAccumulato = 0
let zoomAttivo = 1

/** Quante richieste di rete sono in corso adesso (solo sul totem; altrove 0). */
export function richiesteInCorso(): number {
  return inVolo
}

/**
 * Quanti millisecondi, da quando e' aperta la pagina, c'e' stata **almeno una richiesta in corso**: il tempo vero di attesa, non il numero
 * di richieste. La guardia dell'inattivita' ne usa la differenza fra un giro e l'altro (una richiesta di cento millisecondi pesa cento
 * millisecondi, non un secondo intero).
 */
export function millisecondiInVolo(): number {
  return voloAccumulato + (inVolo > 0 ? Date.now() - voloDal : 0)
}

/** La scala che la pagina ha davvero adesso: 1 fuori dal totem, o se il browser non sa fare `zoom`. */
export function zoomApplicato(): number {
  return zoomAttivo
}

/** Segna l'ora dell'ultimo tocco nella memoria della scheda (la guardia lo chiama a ogni interazione, con calma). */
export function segnaUltimoTocco(): void {
  try {
    window.sessionStorage.setItem(CHIAVE_ULTIMO, String(Date.now()))
  } catch {
    // Senza memoria della scheda non c'e' niente da segnare.
  }
}

/** Svuota tutto cio' che l'app ha scritto nel browser: la memoria della scheda e, per sicurezza, anche il vero `localStorage`. */
export function svuotaArchivi(): void {
  try {
    window.sessionStorage.clear()
  } catch {
    // Niente da svuotare.
  }
  try {
    veroLocalStorage?.clear()
  } catch {
    // Niente da svuotare.
  }
}

function redirigiLocalStorage() {
  try {
    veroLocalStorage = window.localStorage
    const scheda = window.sessionStorage
    const ultimo = Number(scheda.getItem(CHIAVE_ULTIMO) ?? 0)
    // Una memoria di scheda senza il segno dell'ultimo tocco, o col segno troppo vecchio, non e' di chi c'e' adesso.
    if ((ultimo && Date.now() - ultimo > SCADE_MS) || (!ultimo && scheda.length > 0)) scheda.clear()
    veroLocalStorage.clear()
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => window.sessionStorage })
    scheda.setItem(CHIAVE_ULTIMO, String(Date.now()))
  } catch {
    // Un browser che non lascia riscrivere `localStorage` resta com'e': la guardia svuota comunque tutto all'uscita.
  }
}

function contaLeRichieste() {
  if (typeof window.fetch !== 'function') return
  const originale = window.fetch.bind(window)
  window.fetch = ((...argomenti: Parameters<typeof fetch>) => {
    if (inVolo++ === 0) voloDal = Date.now()
    return originale(...argomenti).finally(() => {
      inVolo = Math.max(0, inVolo - 1)
      if (inVolo === 0) voloAccumulato += Date.now() - voloDal
    })
  }) as typeof fetch
}

function applicaLaScala() {
  const radice = document.documentElement
  // `zoom` e' standard in Chromium, Safari e Firefox da poco: dove manca si resta alla scala 1 e le schermate non si correggono.
  const sa = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '2')
  zoomAttivo = sa ? scalaPer(window.innerWidth) : 1
  radice.style.zoom = zoomAttivo > 1 ? String(zoomAttivo) : ''
}

function riempiLaFinestra() {
  segnaLaRadice()
  const stile = document.createElement('style')
  stile.id = 'totem-reset'
  // `100vh` si moltiplicherebbe per la scala (vedi sopra): con la scala attiva l'altezza e' sempre quella del genitore.
  stile.textContent = 'html[data-totem],html[data-totem] body,html[data-totem] #root{height:100% !important;min-height:0 !important}'
  document.head.appendChild(stile)
}

function segnaLaRadice() {
  document.documentElement.setAttribute('data-totem', '1')
}

function nienteSuggerimenti() {
  const spegni = (el: Element) => {
    el.setAttribute('autocomplete', 'off')
    el.setAttribute('autocorrect', 'off')
    // I gestori di password e di indirizzi che rispettano queste due.
    el.setAttribute('data-lpignore', 'true')
    el.setAttribute('data-1p-ignore', 'true')
  }
  document.querySelectorAll('input,textarea').forEach(spegni)
  new MutationObserver((voci) => {
    for (const v of voci) {
      v.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return
        if (n.matches('input,textarea')) spegni(n)
        n.querySelectorAll?.('input,textarea').forEach(spegni)
      })
    }
  }).observe(document.documentElement, { childList: true, subtree: true })
}

/** Tiene d'occhio la finestra: la scala segue la larghezza, e un cambio di formato ricarica la pagina (con calma: lo stesso gesto puo' scattare piu' volte). */
function osservaLaFinestra(totem: boolean) {
  let attesa: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', () => {
    if (totem) applicaLaScala()
    if (totemForzato() !== null) return
    if (formatoTotem(window.innerWidth, window.innerHeight) === totem) {
      if (attesa) clearTimeout(attesa)
      return
    }
    if (attesa) clearTimeout(attesa)
    attesa = setTimeout(() => {
      if (formatoTotem(window.innerWidth, window.innerHeight) !== totem) window.location.reload()
    }, 1000)
  })
}

if (eWeb()) {
  const totem = inModalitaTotem()
  if (totem) {
    redirigiLocalStorage()
    contaLeRichieste()
    riempiLaFinestra()
    applicaLaScala()
    nienteSuggerimenti()
  }
  osservaLaFinestra(totem)
}
