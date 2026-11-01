import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

import { completaProfilo, statoIngresso, type CampoIngresso } from '@/api/registrazione'
import { vistaCorrente } from '@/features/lab/vista'

// Chi ha una sessione puo' non poter ancora entrare: e' nuovo, o la sua scheda non ha la data di nascita (01/11/2026, `portale-registrazione`).
// Questo gancio dice a che punto e': `verifica` mentre si chiede, `dentro` quando si puo' entrare (anche con l'interruttore spento: l'app
// fa come prima), `completa` con i dati che mancano, `segreteria` se serve una persona, `errore` se non si e' potuto sapere.
//
// **Non si chiede in vista cliente** (lo staff che guarda l'app di un socio non si registra). Una sola richiesta per sessione.
//
// Chi e' gia' al club con la scheda completa non vede niente: se la funzione dice `campi` vuoti ma non e' ammesso, il profilo si completa
// da solo (`completa` senza dati), e la persona entra con un solo codice.

export type Ingresso =
  | { fase: 'verifica' }
  | { fase: 'dentro' }
  | { fase: 'completa'; campi: CampoIngresso[]; nuovo: boolean }
  | { fase: 'segreteria' }
  | { fase: 'errore'; errore: string }

export function useIngresso(sessione: Session | null | undefined): { ingresso: Ingresso; fatto: () => void; riprova: () => void } {
  const id = sessione?.user.id ?? null
  const [ingresso, setIngresso] = useState<Ingresso>({ fase: 'verifica' })
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    if (!id) return
    if (vistaCorrente()) return setIngresso({ fase: 'dentro' })
    let vivo = true
    setIngresso({ fase: 'verifica' })
    ;(async () => {
      const r = await statoIngresso()
      if (!vivo) return
      if (!r.ok) return setIngresso({ fase: 'errore', errore: r.errore })
      const { aperta, ammesso, campi, verifica } = r.stato
      if (!aperta) return setIngresso({ fase: 'dentro' })
      if (verifica) return setIngresso({ fase: 'segreteria' })
      if (ammesso) return setIngresso(campi.length ? { fase: 'completa', campi, nuovo: false } : { fase: 'dentro' })
      if (campi.length) return setIngresso({ fase: 'completa', campi, nuovo: true })
      // Gia' al club con la scheda completa, ma non ancora fra chi entra: basta abilitarlo, senza chiedere niente.
      const c = await completaProfilo({})
      if (!vivo) return
      if (c.ok) return setIngresso({ fase: 'dentro' })
      if (c.verifica) return setIngresso({ fase: 'segreteria' })
      setIngresso({ fase: 'errore', errore: c.errore })
    })()
    return () => {
      vivo = false
    }
  }, [id, giro])

  const fatto = useCallback(() => setIngresso({ fase: 'dentro' }), [])
  const riprova = useCallback(() => setGiro((g) => g + 1), [])
  // Senza sessione non c'e' niente da controllare: la pagina d'accesso se ne occupa.
  return { ingresso: id ? ingresso : { fase: 'dentro' }, fatto, riprova }
}
