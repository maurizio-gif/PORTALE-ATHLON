// Gli indirizzi che il portale chiama. Le EXPO_PUBLIC_* le inlinea il bundler,
// quindi finiscono nel codice che scarica chiunque: qui solo valori pubblici.

function senzaSlash(u: string): string {
  return u.trim().replace(/\/+$/, '')
}

/** Le API cliente che in fase 1 stanno ancora sul CRM. */
export const CRM_URL = senzaSlash(process.env.EXPO_PUBLIC_CRM_URL || 'https://crm.athlonroma.it')

export const SUPABASE_URL = senzaSlash(process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kdbcwwpdazvtmjolybdm.supabase.co')
// La chiave pubblica del progetto (Supabase → API Keys → Publishable): e' fatta
// per stare nel codice dell'app, i permessi li decide il database.
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_jj5Pt1OYpBJQ72Co_j4ImA_08n4Q3mT'

/** Il sito del club: Club Life nell'app legge i suoi contenuti da `club-life.json`. */
export const SITO_URL = senzaSlash(process.env.EXPO_PUBLIC_SITO_URL || 'https://www.athlonroma.it')
/** La pagina Club Life del sito, per chi la vuole aprire nel browser. Con lo slash finale, la forma canonica del sito. */
export const CLUB_LIFE_URL = `${SITO_URL}/club-life/`
