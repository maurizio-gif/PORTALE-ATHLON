import { Platform } from 'react-native'

import { locale } from './lingua'

// La dettatura vocale (30/10/2026): la persona parla e il testo compare nel campo, dove lo rilegge e lo manda lei.
// Non e' un messaggio audio: niente file, niente registrazione che passa da noi. Sul web usa il riconoscimento vocale del
// browser (Chrome, Edge, Safari); nell'app nativa non c'e' (servirebbe un modulo nuovo e quindi una build) e il comando non compare.

type Risultato = { 0: { transcript: string }; length: number }
type EventoRisultato = { results: { length: number; [i: number]: Risultato } }
type EventoErrore = { error?: string }
type Riconoscimento = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: EventoRisultato) => void) | null
  onerror: ((e: EventoErrore) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type CostruttoreRiconoscimento = new () => Riconoscimento

function costruttore(): CostruttoreRiconoscimento | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: CostruttoreRiconoscimento; webkitSpeechRecognition?: CostruttoreRiconoscimento }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Il browser sa riconoscere la voce? (Firefox e l'app nativa no.) */
export function dettaturaDisponibile(): boolean {
  return costruttore() !== null
}

export type ErroreDettatura = 'permesso' | 'nessuna-voce' | 'rete' | 'altro'

export type Dettatura = {
  /** Smette di ascoltare e tiene quello che ha capito fin li'. */
  ferma: () => void
  /** Smette di ascoltare e butta quello che stava arrivando: dopo di questo `onTesto` non parla piu'. */
  annulla: () => void
}

/**
 * Comincia ad ascoltare. `onTesto` riceve tutto quello che e' stato detto in questo ascolto (anche la parte ancora provvisoria) ogni volta
 * che cambia; `onFine` arriva una volta sola, con l'errore se c'e' stato. Un solo ascolto per volta e una frase alla volta: dopo una pausa
 * il browser chiude da se' (in continuo, su Android, le parole si ripetono). Null se il browser non sa ascoltare.
 */
export function avviaDettatura({ onTesto, onFine }: { onTesto: (testo: string) => void; onFine: (errore: ErroreDettatura | null) => void }): Dettatura | null {
  const Costruttore = costruttore()
  if (!Costruttore) return null
  let r: Riconoscimento
  try {
    r = new Costruttore()
  } catch {
    return null
  }
  let zitto = false
  let errore: ErroreDettatura | null = null
  r.lang = locale()
  r.continuous = false
  r.interimResults = true
  r.maxAlternatives = 1
  r.onresult = (e) => {
    if (zitto) return
    let testo = ''
    for (let i = 0; i < e.results.length; i++) testo += e.results[i]?.[0]?.transcript ?? ''
    onTesto(testo)
  }
  r.onerror = (e) => {
    const c = e.error
    // `aborted` e' la nostra stessa chiusura, non un errore.
    if (c === 'aborted') return
    errore = c === 'not-allowed' || c === 'service-not-allowed' ? 'permesso' : c === 'no-speech' ? 'nessuna-voce' : c === 'network' ? 'rete' : 'altro'
  }
  r.onend = () => {
    r.onresult = null
    r.onerror = null
    r.onend = null
    onFine(zitto ? null : errore)
  }
  try {
    r.start()
  } catch {
    return null
  }
  return {
    ferma: () => {
      try {
        r.stop()
      } catch {
        /* gia' fermo */
      }
    },
    annulla: () => {
      zitto = true
      try {
        r.abort()
      } catch {
        /* gia' fermo */
      }
    },
  }
}
