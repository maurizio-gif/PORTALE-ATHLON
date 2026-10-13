import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

/** La sessione del laboratorio: `undefined` finche' non si sa, `null` se non c'e'. */
export function useSessione(): Session | null | undefined {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return sessione
}
