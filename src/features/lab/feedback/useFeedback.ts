import { useCallback, useRef, useState } from 'react'

import { inviaFeedback } from '@/api/feedback'
import { t } from '@/lib/lingua'

import { preparaAllegato, scegliAllegati } from './allegati'
import { ALLEGATI_MAX, postiLiberi, testoInviabile, type Allegato, type TipoFeedback } from './comune'

// Lo stato di chi scrive un feedback: il testo, il tipo, gli allegati scelti, l'attesa, l'errore, l'esito. Sta in
// `PulsanteFeedback`, che resta montato per tutta la sessione: chiudere il foglio per sbaglio non fa perdere quello che si
// stava scrivendo. Si svuota solo quando il messaggio e' partito (o all'uscita dall'app, che smonta tutto).

export function useFeedback() {
  const [testo, setTesto] = useState('')
  const [tipo, setTipo] = useState<TipoFeedback | null>(null)
  const [allegati, setAllegati] = useState<Allegato[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [inLettura, setInLettura] = useState(false)
  const [inCorso, setInCorso] = useState(false)
  const [fatto, setFatto] = useState(false)
  // Gli allegati come sono adesso, per contare i posti dopo l'attesa del selettore senza leggere uno stato vecchio.
  const attuali = useRef<Allegato[]>([])
  attuali.current = allegati

  /** Apre la scelta dei file e aggiunge quelli buoni; dice cosa non va degli altri. Non c'e' un'attesa finche' non si sceglie. */
  const aggiungi = useCallback(async () => {
    setErrore(null)
    if (postiLiberi(attuali.current.length) === 0) {
      setErrore(t(`Puoi allegare al massimo ${ALLEGATI_MAX} file.`, `You can attach up to ${ALLEGATI_MAX} files.`))
      return
    }
    let scelti
    try {
      scelti = await scegliAllegati()
    } catch {
      setErrore(t('Non riusciamo ad aprire la scelta dei file. Riprova.', 'We can’t open the file picker. Try again.'))
      return
    }
    if (!scelti.length) return
    // I posti si contano dopo la scelta: nel frattempo non e' cambiato niente, ma e' la stessa cifra che vale per il limite.
    const posti = postiLiberi(attuali.current.length)
    setInLettura(true)
    const nuovi: Allegato[] = []
    const problemi: string[] = []
    for (const a of scelti.slice(0, posti)) {
      const r = await preparaAllegato(a)
      if (r.ok) nuovi.push(r.allegato)
      else problemi.push(r.errore)
    }
    if (scelti.length > posti) problemi.push(t(`Si possono allegare al massimo ${ALLEGATI_MAX} file: ne ho presi ${posti}.`, `You can attach up to ${ALLEGATI_MAX} files: I took ${posti}.`))
    setAllegati((prima) => [...prima, ...nuovi])
    setInLettura(false)
    setErrore(problemi.length ? problemi.join(' ') : null)
  }, [])

  const togli = useCallback((posizione: number) => {
    setAllegati((prima) => prima.filter((_, i) => i !== posizione))
    setErrore(null)
  }, [])

  /** Manda il messaggio. `schermata` e' quella in cui era quando ha toccato il pulsante. */
  const invia = useCallback(
    async (schermata: string) => {
      if (inCorso || inLettura || !testoInviabile(testo)) return
      setErrore(null)
      setInCorso(true)
      try {
        const esito = await inviaFeedback({ testo: testo.trim(), tipo, schermata, allegati })
        if (esito.ok) {
          setFatto(true)
          setTesto('')
          setTipo(null)
          setAllegati([])
        } else {
          setErrore(esito.errore)
        }
      } finally {
        setInCorso(false)
      }
    },
    [inCorso, inLettura, testo, tipo, allegati],
  )

  /** Dopo il grazie il foglio torna com'era, pronto per un altro messaggio. */
  const ricomincia = useCallback(() => {
    setFatto(false)
    setErrore(null)
  }, [])

  return { testo, setTesto, tipo, setTipo, allegati, errore, inLettura, inCorso, fatto, aggiungi, togli, invia, ricomincia }
}

export type StatoFeedback = ReturnType<typeof useFeedback>
