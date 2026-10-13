// Gli indirizzi che il portale chiama. Le EXPO_PUBLIC_* le inlinea il bundler,
// quindi finiscono nel codice che scarica chiunque: qui solo valori pubblici.

function senzaSlash(u: string): string {
  return u.trim().replace(/\/+$/, '')
}

/** Le API cliente che in fase 1 stanno ancora sul CRM. */
export const CRM_URL = senzaSlash(process.env.EXPO_PUBLIC_CRM_URL || 'https://crm.athlonroma.it')

export const SUPABASE_URL = senzaSlash(process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kdbcwwpdazvtmjolybdm.supabase.co')
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
