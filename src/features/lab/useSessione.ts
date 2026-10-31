import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

import { consumaAccessoDalCrm } from './accessoDalCrm'

/** La sessione del laboratorio: `undefined` finche' non si sa, `null` se non c'e'. */
export function useSessione(): Session | null | undefined {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    // La vista cliente dal CRM porta un accesso nel frammento dell'indirizzo: va consumato prima di leggere la sessione.
    consumaAccessoDalCrm().then(() => supabase.auth.getSession()).then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return sessione
}
