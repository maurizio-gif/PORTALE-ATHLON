// Il motto della classifica (29/10/2026): una frase che la persona scrive e che altri soci leggono. **Il server e' l'autorita'**:
// l'app controlla solo l'ovvio (lunghezza, indirizzi) per dirlo subito, e qui si ricontrolla tutto e si risponde 422 col motivo.
//
// Regole: al massimo 80 caratteri (conta i caratteri, non i byte), ripulito agli spazi e ai caratteri di controllo; niente indirizzi,
// link, mail, `@` o numeri di telefono; niente parole non ammesse (italiano e inglese). L'elenco e' un punto di partenza, non una
// garanzia: l'ultima difesa e' la segnalazione dei soci e lo staff che toglie il motto (vedi la migrazione, «MODERAZIONE»).
// **Contenuto scritto da persone e visto da altre persone** (App Store, linea guida 1.2: filtro, segnalazione, staff che agisce).
// Puro: si prova con `node --experimental-strip-types supabase/functions/_prove/classifica.ts`.

import { t } from '../lingua.ts'

export const MOTTO_MAX = 80

export type EsitoMotto = { ok: true; motto: string | null } | { ok: false; errore: string }

/** Parole intere non ammesse (dopo aver tolto accenti e sostituito i numeri-lettera: `c4zzo` -> `cazzo`). */
const PAROLE = [
  'cazzo', 'cazzi', 'merda', 'merde', 'stronzo', 'stronza', 'stronzi', 'vaffanculo', 'puttana', 'puttane', 'troia', 'troie', 'minchia', 'figa',
  'coglione', 'coglioni', 'culo', 'frocio', 'froci', 'negro', 'negri', 'bastardo', 'bastarda', 'zoccola', 'sborra', 'pompino', 'pene', 'ricchione',
  'mongoloide', 'handicappato', 'nazi', 'hitler', 'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'cock', 'pussy',
  'whore', 'slut', 'nigger', 'nigga', 'faggot', 'retard', 'rape', 'stupro', 'suicidio',
]
// Non ci sono «kill», «uccidi», «ammazza»: in una palestra sono linguaggio normale («kill your limits», «ammazzo la fatica»).
/** Radici che non stanno dentro parole innocenti: si cercano anche dentro il testo senza spazi (`v a f f a n c u l o`). */
const RADICI = ['vaffanculo', 'stronz', 'puttan', 'coglion', 'fottut', 'fuck', 'shit', 'bitch', 'nigger', 'faggot', 'merdos', 'cazzat', 'troiaio']

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' }

/** Il testo ridotto a lettere minuscole senza accenti, con i numeri-lettera sciolti. */
function normalizzato(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0134@$57!]/g, (c) => LEET[c] ?? c)
}

function parolaNonAmmessa(s: string): boolean {
  const n = normalizzato(s)
  const token = n.split(/[^a-z]+/).filter(Boolean)
  if (token.some((w) => PAROLE.includes(w))) return true
  const compatto = n.replace(/[^a-z]/g, '')
  return RADICI.some((r) => compatto.includes(r))
}

const INDIRIZZO = /(https?:|ftp:|www\.|:\/\/|\bwa\.me\b|\bt\.me\b|\bbit\.ly\b)/i
const DOMINIO = /\b[a-z0-9][a-z0-9-]*\.(com|it|net|org|io|me|co|eu|app|ly|gl|tv|xyz|info|biz|shop|site|online|link|gg)\b/i
const TELEFONO = /\d[\d\s().-]{5,}\d/

/** Il motto controllato: `ok` con il testo ripulito (null se vuoto), o `ok: false` con il motivo, leggibile da una persona. */
export function validaMotto(x: unknown): EsitoMotto {
  if (x === null || x === undefined) return { ok: true, motto: null }
  if (typeof x !== 'string') return { ok: false, errore: t('Il motto non è valido.', 'The motto isn’t valid.') }
  // eslint-disable-next-line no-control-regex
  const s = x
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return { ok: true, motto: null }
  if ([...s].length > MOTTO_MAX) return { ok: false, errore: t(`Il motto può avere al massimo ${MOTTO_MAX} caratteri.`, `Your motto can have at most ${MOTTO_MAX} characters.`) }
  if (s.includes('@') || INDIRIZZO.test(s) || DOMINIO.test(s)) return { ok: false, errore: t('Il motto non può contenere link, indirizzi o mail.', 'Your motto can’t contain links, addresses or emails.') }
  if (TELEFONO.test(s)) return { ok: false, errore: t('Il motto non può contenere numeri di telefono.', 'Your motto can’t contain phone numbers.') }
  if (parolaNonAmmessa(s)) return { ok: false, errore: t('Il motto contiene parole non ammesse: scegline un’altra.', 'Your motto contains words that aren’t allowed: please choose another.') }
  return { ok: true, motto: s }
}
