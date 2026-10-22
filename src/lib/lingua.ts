// Modulo puro (niente React ne' React Native): lo importano anche i calcoli che si provano con `npx tsx`.
// Il gancio per i componenti e' `useLingua` in `lingua-react.ts`.
//
// La lingua dell'app: italiano o inglese, scelta dal socio (Profilo, o la pagina d'accesso) e ricordata sul
// dispositivo. Le parole inglesi seguono quelle di PerfectGym (docs/glossario-inglese.md): chi passa dalla
// nostra app al portale clienti o alle email del club trova gli stessi nomi.
//
// **I testi stanno accanto all'originale**: `t('Prenota', 'Book')`, non una chiave in un dizionario. Chi
// cambia una frase italiana vede la sua traduzione nella stessa riga, e un testo nuovo senza inglese non
// compila (servono tutti e due gli argomenti).
//
// **Cambiare lingua ricarica l'app sul web** (`impostaLingua`): i testi calcolati quando un modulo si carica
// (costanti, formattatori di date) e le risposte delle funzioni gia' in memoria si rifanno da capo, e la
// lingua di tutto torna coerente. Sull'app nativa la schermata si ridisegna (il layout ha `key={lingua}`);
// le poche costanti calcolate al caricamento si aggiornano alla prossima apertura dell'app.
//
// **Le funzioni del server rispondono nella stessa lingua** (`_shared/lingua.ts` di APP-ATHLON):
// `intestazioneLingua()` manda `Accept-Language: en-x-athlon` (o `it-x-athlon`). `Accept-Language` e' una
// intestazione che il browser lascia passare senza toccare il CORS delle funzioni, e il segno `x-athlon` dice al
// server che la scelta e' del socio e non la lingua del browser: un'app di prima, che non lo manda, riceve
// sempre l'italiano.

export type Lingua = 'it' | 'en'

const CHIAVE = 'athlon_lingua'

function salvata(): Lingua | null {
  try {
    const v = globalThis.localStorage?.getItem(CHIAVE)
    return v === 'it' || v === 'en' ? v : null
  } catch {
    return null
  }
}

/** La lingua del dispositivo: italiano se e' italiano, altrimenti inglese (chi non legge l'italiano legge piu' facilmente l'inglese). */
function delDispositivo(): Lingua {
  try {
    const l = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase()
    const nav = typeof navigator !== 'undefined' ? ((navigator as unknown as { languages?: readonly string[]; language?: string }).languages?.[0] ?? (navigator as unknown as { language?: string }).language ?? '') : ''
    const scelta = (nav || l).toLowerCase()
    if (!scelta) return 'it'
    return scelta.startsWith('it') ? 'it' : 'en'
  } catch {
    return 'it'
  }
}

// Si decide alla prima domanda e non al caricamento del modulo: sul nativo `localStorage` lo installa expo-sqlite
// (`localStorage.native.ts`), che puo' arrivare dopo.
let scelta: Lingua | null = null
function cur(): Lingua {
  if (!scelta) scelta = salvata() ?? delDispositivo()
  return scelta
}
const ascoltatori = new Set<() => void>()

/** La lingua di adesso. Si puo' chiamare ovunque, anche fuori dai componenti. */
export function lingua(): Lingua {
  return cur()
}

/** Il testo nella lingua di adesso: il primo e' l'italiano, il secondo l'inglese. */
export function t(it: string, en: string): string {
  return cur() === 'en' ? en : it
}

/** Come `t`, per qualunque valore (un elenco, un oggetto, un elemento). */
export function tv<T>(it: T, en: T): T {
  return cur() === 'en' ? en : it
}

/** La localizzazione per date e numeri: `it-IT` o `en-GB` (giorno prima del mese, euro col simbolo davanti). */
export function locale(): 'it-IT' | 'en-GB' {
  return cur() === 'en' ? 'en-GB' : 'it-IT'
}

/** L'intestazione da mandare alle funzioni del club. */
export function intestazioneLingua(): Record<string, string> {
  return { 'Accept-Language': `${cur()}-x-athlon` }
}

/**
 * Cambia la lingua e la ricorda sul dispositivo. Sul web ricarica la pagina, cosi' ogni testo e ogni dato in
 * memoria si rifa' nella lingua nuova; sul nativo avvisa i componenti, e il layout ridisegna le schermate.
 */
export function impostaLingua(l: Lingua) {
  if (l === cur()) return
  try {
    globalThis.localStorage?.setItem(CHIAVE, l)
  } catch {
    // senza memoria del dispositivo vale per questa apertura
  }
  scelta = l
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.location) {
    window.location.reload()
    return
  }
  for (const f of ascoltatori) f()
}

/** Per `useLingua`: avvisa quando la lingua cambia (solo sul nativo: sul web la pagina si ricarica). */
export function iscriviLingua(f: () => void) {
  ascoltatori.add(f)
  return () => {
    ascoltatori.delete(f)
  }
}
