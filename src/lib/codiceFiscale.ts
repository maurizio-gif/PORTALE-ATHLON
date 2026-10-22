import { t } from './lingua'
// Il controllo del codice fiscale nella pagina del link, per dirlo subito:
// la stessa regola sta in APP-ATHLON (supabase/functions/_shared/registrazione.ts,
// `codiceFiscaleValido` e `cfCoerente`), che alla conferma decide. Le due copie
// vanno tenute in pari: i due repository non si importano.

const DISPARI: Record<string, number> = {
  0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
}
const OMOCODIA: Record<string, string> = { L: '0', M: '1', N: '2', P: '3', Q: '4', R: '5', S: '6', T: '7', U: '8', V: '9' }
const MESI = 'ABCDEHLMPRST'

/** Ben scritto, col carattere di controllo. Le omocodie passano. */
export function codiceFiscaleValido(cf: string): boolean {
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) return false
  let somma = 0
  for (let i = 0; i < 15; i++) somma += i % 2 === 0 ? DISPARI[cf[i]] : /\d/.test(cf[i]) ? Number(cf[i]) : cf.charCodeAt(i) - 65
  return String.fromCharCode(65 + (somma % 26)) === cf[15]
}

function soloLettere(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z]/g, '')
}

function codiceCognome(cognome: string): string {
  const l = soloLettere(cognome)
  return (l.replace(/[AEIOU]/g, '') + l.replace(/[^AEIOU]/g, '') + 'XXX').slice(0, 3)
}

function codiceNome(nome: string): string {
  const l = soloLettere(nome)
  const consonanti = l.replace(/[AEIOU]/g, '')
  if (consonanti.length >= 4) return consonanti[0] + consonanti[2] + consonanti[3]
  return (consonanti + l.replace(/[^AEIOU]/g, '') + 'XXX').slice(0, 3)
}

/** Il codice e' di questa persona? null se si', altrimenti cosa non torna. */
export function cfCoerente(cf: string, nome: string, cognome: string, nascita: string): string | null {
  const c = cf.toUpperCase().replace(/\s/g, '')
  if (codiceCognome(cognome) !== c.slice(0, 3)) {
    return t('Il codice fiscale non corrisponde al cognome: controlla l’uno e l’altro, il cognome scritto per intero come sul documento.', 'The tax code doesn’t match the surname: check both, with the surname written in full as on your ID.')
  }
  if (codiceNome(nome) !== c.slice(3, 6)) {
    return t('Il codice fiscale non corrisponde al nome: controlla l’uno e l’altro. Se hai più nomi, scrivili tutti, come sul documento.', 'The tax code doesn’t match the first name: check both. If you have more than one name, write them all, as on your ID.')
  }
  const cifre = (t: string) => t.replace(/[LMNPQRSTUV]/g, (x) => OMOCODIA[x])
  const [anno, mese, giorno] = nascita.split('-').map(Number)
  const g = Number(cifre(c.slice(9, 11)))
  if (Number(cifre(c.slice(6, 8))) !== anno % 100 || MESI.indexOf(c[8]) + 1 !== mese || (g > 40 ? g - 40 : g) !== giorno) {
    return t('Il codice fiscale non corrisponde alla data di nascita: controlla l’una e l’altro.', 'The tax code doesn’t match the date of birth: check both.')
  }
  return null
}

/** Cosa dire del codice fiscale scritto, o null se va bene (o se mancano i dati per controllarlo). */
export function problemaCodiceFiscale(d: Record<string, string>): string | null {
  const cf = (d.codice_fiscale ?? '').toUpperCase().replace(/\s/g, '')
  if (!cf) return null
  if (cf.length < 16) return null
  if (!codiceFiscaleValido(cf)) return t('Il codice fiscale non risulta valido: controllalo.', 'The tax code doesn’t look valid: please check it.')
  if (!d.nome?.trim() || !d.cognome?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(d.nascita ?? '')) return null
  return cfCoerente(cf, d.nome, d.cognome, d.nascita)
}
