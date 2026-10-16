import type { Href } from 'expo-router'

// Le sei sezioni della Home (17/10/2026, i Documenti dal 16/10): la Home e' l'hub dell'account, e
// cio' che riguarda la persona sta in una di queste. Si scelgono dai riquadri e
// dal parametro dell'indirizzo, `/?sezione=pagamenti`, cosi' un link o un
// ricaricamento riportano alla stessa sezione.

export const SEZIONI = ['abbonamenti', 'pagamenti', 'documenti', 'certificato', 'famiglia', 'profilo'] as const
export type SezioneHome = (typeof SEZIONI)[number]

/** Da dove si parte quando il parametro manca o non e' una sezione. */
export const SEZIONE_INIZIALE: SezioneHome = 'abbonamenti'

/** La sezione dal valore del parametro; null se non e' una sezione nostra. */
export function sezioneDa(valore: string | string[] | undefined): SezioneHome | null {
  const v = Array.isArray(valore) ? valore[0] : valore
  return SEZIONI.find((s) => s === v) ?? null
}

/** L'indirizzo della Home sulla sezione data. */
export function hrefSezione(sezione: SezioneHome): Href {
  return { pathname: '/', params: { sezione } }
}
