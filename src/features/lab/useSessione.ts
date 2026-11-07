import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

import { consumaAccessoDalCrm } from './accessoDalCrm'
import { useEntrataTrattenuta } from './entrata'

/**
 * La sessione del laboratorio: `undefined` finche' non si sa, `null` se non c'e'.
 * Mentre la pagina d'accesso trattiene l'entrata (`entrata.ts`, la spunta dopo il codice) la sessione appena aperta si vede come assente.
 */
export function useSessione(): Session | null | undefined {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined)
  const trattenuta = useEntrataTrattenuta()
  useEffect(() => {
    // La vista cliente dal CRM porta un accesso nel frammento dell'indirizzo: va consumato prima di leggere la sessione.
    consumaAccessoDalCrm().then(() => supabase.auth.getSession()).then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return trattenuta && sessione ? null : sessione
}
