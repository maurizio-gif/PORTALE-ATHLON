// «Residente all'estero» (16/10/2026): le regole che stanno uguali in ogni modulo
// che chiede il codice fiscale o l'indirizzo. Il backend le ricontrolla: qui si
// dicono subito. La lista dei Paesi e' `paesi.ts` (la stessa nei tre repository).

import { NOME_PAESE, PAESI } from './paesi'
import { t } from './lingua'

export const ITALIA = 'IT'

/** Il testo della casella: lo stesso in tutti i moduli. */
export const TESTO_RESIDENTE_ESTERO = t('Sono residente all’estero e non ho un codice fiscale italiano', 'I live abroad and don’t have an Italian tax code')

/** Dove si scrive al posto del codice fiscale, per chi e' residente all'estero. */
export const CODICE_FISCALE_NON_ATTRIBUITO = t('Non attribuito (residente all’estero)', 'Not assigned (lives abroad)')

/** Per un indirizzo: l'Italia in cima (e' il valore di partenza), poi tutti gli altri. */
export const PAESI_CON_ITALIA: readonly (readonly [string, string])[] = [[ITALIA, t('Italia', 'Italy')], ...PAESI]

/** Il nome di un Paese dal suo codice, Italia compresa; null se il codice non c'e'. */
export function nomePaese(codice: string | null | undefined): string | null {
  if (!codice) return null
  return codice === ITALIA ? t('Italia', 'Italy') : (NOME_PAESE[codice] ?? null)
}

/** Il CAP estero mentre si scrive: lettere, cifre, spazio e trattino, al massimo 12 caratteri. */
export function pulisciCapLibero(v: string): string {
  return v.replace(/[^A-Za-z0-9 -]/g, '').slice(0, 12)
}

/** Il CAP estero e' libero: da 2 a 12 caratteri fra lettere, cifre, spazio e trattino. */
export function capLiberoValido(v: string): boolean {
  return /^[A-Za-z0-9 -]{2,12}$/.test(v.trim())
}
