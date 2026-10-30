import { useCallback, useEffect, useRef, useState } from 'react'

import { avviaDettatura, dettaturaDisponibile, type Dettatura, type ErroreDettatura } from '@/lib/dettatura'
import { t } from '@/lib/lingua'

import { CARATTERI_MAX } from './useAssistente'

// Il microfono della chat (30/10/2026): detta nel campo di testo. Quello che la persona dice si aggiunge a quello che c'e' gia' scritto
// e resta modificabile: niente parte da solo, si manda con «Invia» come ogni domanda.

const MESSAGGI: Record<ErroreDettatura, () => string> = {
  permesso: () => t('Il microfono è bloccato: consentilo dalle impostazioni del browser.', 'The microphone is blocked: allow it in your browser settings.'),
  'nessuna-voce': () => t('Non ti ho sentito. Tocca il microfono e riprova.', 'I didn’t hear you. Tap the microphone and try again.'),
  rete: () => t('La dettatura non è disponibile adesso: scrivi la domanda.', 'Dictation isn’t available right now: type your question.'),
  altro: () => t('Non sono riuscito a usare il microfono.', 'I couldn’t use the microphone.'),
}

export function useDettatura(onTesto: (testo: string) => void) {
  const [ascolto, setAscolto] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const attiva = useRef<Dettatura | null>(null)
  const base = useRef('')
  const comando = useRef(onTesto)
  comando.current = onTesto

  /** Smette di ascoltare buttando quello che stava arrivando (si manda la domanda, si chiude il foglio). */
  const annulla = useCallback(() => {
    attiva.current?.annulla()
    attiva.current = null
    setAscolto(false)
  }, [])

  const avvia = useCallback(
    (scritto: string) => {
      if (attiva.current) return
      // Quello che c'e' gia' scritto resta, e il parlato viene dopo, con uno spazio in mezzo.
      base.current = scritto.trim() ? `${scritto.replace(/\s+$/, '')} ` : ''
      const d = avviaDettatura({
        onTesto: (parlato) => comando.current((base.current + parlato.trimStart()).slice(0, CARATTERI_MAX)),
        onFine: (e) => {
          attiva.current = null
          setAscolto(false)
          setErrore(e ? MESSAGGI[e]() : null)
        },
      })
      if (!d) {
        setErrore(MESSAGGI.altro())
        return
      }
      attiva.current = d
      setErrore(null)
      setAscolto(true)
    },
    [],
  )

  /** Il comando del microfono: se ascolta smette (tenendo il testo), se no comincia. */
  const tocca = useCallback(
    (scritto: string) => {
      if (attiva.current) attiva.current.ferma()
      else avvia(scritto)
    },
    [avvia],
  )

  useEffect(() => () => attiva.current?.annulla(), [])

  return { disponibile: dettaturaDisponibile(), ascolto, errore, tocca, annulla }
}
