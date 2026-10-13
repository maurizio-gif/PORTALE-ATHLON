import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config'
import './localStorage'

// Il client Supabase del portale. In fase 1 serve solo al laboratorio (login
// OTP dei tester, tappa 2): le richieste via email non hanno sessione.
//
// La sessione si tiene in `localStorage`: sul web e' quello del browser, su
// iOS e Android lo fornisce `expo-sqlite` (vedi `localStorage.native.ts`).
// `detectSessionInUrl` solo sul web: e' li' che il link dell'email riapre la
// pagina con la sessione nell'URL; nell'app ci si arriva da deep link.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})

// Nell'app il rinnovo del token gira solo con l'app in primo piano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (stato) => {
    if (stato === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
