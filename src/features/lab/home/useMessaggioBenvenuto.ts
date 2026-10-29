import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { messaggioDiBenvenuto, type MessaggioBenvenuto } from '@/api/benvenuto'

import { appleSaluteAttivo, appSaluteDelTelefono } from '../dispositivi/appleSalute'
import { inMemoria, ricorda } from '../memoria'

// Quando si scrive un messaggio nuovo: **a ogni ritorno nell'app**.
//
//   - Si apre l'app (la memoria e' vuota): un messaggio nuovo, `apertura`.
//   - Si torna sulla Home dopo mezz'ora o piu' da quando l'ultimo e' stato scritto: un messaggio nuovo, `ritorno`. Vale sia quando
//     la Home resta montata (si lascia l'app o la scheda del browser e si torna: `AppState`, che su web segue la visibilita' della
//     scheda) sia quando si rientra nella Home da un'altra schermata.
//   - Cambiando schermata e tornando alla Home entro mezz'ora si rivede lo stesso: un messaggio che cambia sotto gli occhi a ogni
//     passaggio non e' un messaggio, e ogni uno costa. Il server, in piu', riusa quello di due minuti fa (un ricaricamento).
//
// Solo in memoria, come ogni dato del laboratorio: uscendo dall'app (`dimentica`) non resta niente. **Il messaggio si ricorda con
// l'email della sessione che l'ha chiesto**: una richiesta ancora in volo quando si esce non puo' finire nella Home di chi entra dopo
// (`dimentica` svuota la memoria, ma non le risposte che stanno ancora arrivando). Un errore non si tiene per piu' di due minuti: la
// volta dopo si riprova, ma senza martellare la funzione a ogni passaggio sulla Home.

/** Quanto resta valido un messaggio, e quanto si deve stare fuori dall'app perche' al ritorno ne arrivi uno nuovo. */
export const VALIDITA_MS = 30 * 60_000
/** Dopo un errore non si riprova prima di cosi'. */
const RIPROVA_MS = 2 * 60_000

const CHIAVE = 'benvenuto'

type Memoria = {
  /** Di chi e': l'email della sessione che l'ha chiesto. */
  email: string
  messaggio: MessaggioBenvenuto | null
  /** Quando e' stato scritto, o quando e' fallita la richiesta. */
  il: number
  fallita: boolean
  /** Il socio l'ha nascosto: resta nascosto fino al prossimo messaggio. */
  chiuso: boolean
}

export type StatoBenvenuto = { fase: 'carico' } | { fase: 'pronto'; messaggio: MessaggioBenvenuto } | { fase: 'niente' }

/** Una richiesta alla volta per sessione (la Home puo' montarsi due volte di fila: sviluppo, navigazione veloce). */
let inVolo: { email: string; richiesta: Promise<Memoria> } | null = null

async function scrivi(motivo: 'apertura' | 'ritorno', email: string): Promise<Memoria> {
  if (inVolo?.email === email) return inVolo.richiesta
  // Solo l'app sa se questo telefono ha un'app Salute da collegare e se l'ha gia' fatto: il server propone il collegamento solo cosi'.
  const saluteCollegabile = appSaluteDelTelefono() !== null && !appleSaluteAttivo()
  const richiesta: Promise<Memoria> = messaggioDiBenvenuto(motivo, saluteCollegabile)
    .then((r): Memoria => ({ email, messaggio: r.ok ? r.messaggio : null, il: Date.now(), fallita: !r.ok, chiuso: false }))
    .then((m) => {
      // Solo se la sessione e' ancora quella: chi e' uscito nel frattempo non lascia niente a chi entra.
      if (!inVolo || inVolo.richiesta === richiesta) ricorda(CHIAVE, m)
      return m
    })
    .finally(() => {
      if (inVolo?.richiesta === richiesta) inVolo = null
    })
  inVolo = { email, richiesta }
  return richiesta
}

/** La memoria di questa sessione, se c'e': quella di un'altra non vale. */
function mia(email: string): Memoria | undefined {
  const m = inMemoria<Memoria>(CHIAVE)
  return m?.email === email ? m : undefined
}

function statoDa(m: Memoria | undefined): StatoBenvenuto {
  return m?.messaggio && !m.chiuso ? { fase: 'pronto', messaggio: m.messaggio } : { fase: 'niente' }
}

/**
 * Il messaggio di benvenuto da mostrare, e il comando per nasconderlo. `email` e' quella della sessione. Con `attivo` falso (la vista
 * cliente dello staff) non chiama niente.
 */
export function useMessaggioBenvenuto(attivo: boolean, email: string): { stato: StatoBenvenuto; nascondi: () => void } {
  const [stato, setStato] = useState<StatoBenvenuto>(() => {
    const m = mia(email)
    return attivo && m && Date.now() - m.il < (m.fallita ? RIPROVA_MS : VALIDITA_MS) ? statoDa(m) : { fase: attivo ? 'carico' : 'niente' }
  })
  const vivo = useRef(true)
  const fuoriDal = useRef<number | null>(null)

  const carica = useCallback((motivo: 'apertura' | 'ritorno') => {
    setStato({ fase: 'carico' })
    scrivi(motivo, email).then((m) => {
      if (vivo.current) setStato(statoDa(m))
    })
  }, [email])

  // Al montaggio: un messaggio ancora valido si rivede, altrimenti se ne scrive uno nuovo.
  useEffect(() => {
    vivo.current = true
    if (!attivo) return
    const m = mia(email)
    if (!m) carica('apertura')
    else if (Date.now() - m.il >= (m.fallita ? RIPROVA_MS : VALIDITA_MS)) carica('ritorno')
    else setStato(statoDa(m))
    return () => {
      vivo.current = false
    }
  }, [attivo, email, carica])

  // Con la Home aperta: si lascia l'app (o la scheda) e si torna dopo mezz'ora.
  useEffect(() => {
    if (!attivo) return
    const s = AppState.addEventListener('change', (stato) => {
      if (stato !== 'active') {
        fuoriDal.current ??= Date.now()
        return
      }
      const via = fuoriDal.current
      fuoriDal.current = null
      if (via !== null && Date.now() - via >= VALIDITA_MS) carica('ritorno')
    })
    return () => s.remove()
  }, [attivo, carica])

  const nascondi = useCallback(() => {
    const m = mia(email)
    if (m) ricorda(CHIAVE, { ...m, chiuso: true })
    setStato({ fase: 'niente' })
  }, [email])

  return { stato, nascondi }
}
