// Il Guest Pass dal link: cosa manda `guest-pass` (azione `pagina`) alla pagina
// /r/<codice>, e le parole delle scelte.

export type PersonaGuestPass = {
  trovata: boolean
  nome: string | null
  cognome: string | null
  email: string | null
  telefono: string | null
  nascita: string | null
  codice_fiscale: string | null
  via: string | null
  cap: string | null
  citta: string | null
  /** I campi che su PerfectGym mancano: si chiedono nel primo passo. */
  manca: string[]
}

export type ConsensoGuestPass = { id: number; nome: string; testo: string; allegato: string | null }

export type PaginaGuestPass = {
  stato: 'aperta' | 'attivato' | 'annullata' | 'errore'
  persona: PersonaGuestPass
  consensi: ConsensoGuestPass[]
  inizio: { dal: string; al: string; scelto: string | null }
  prezzo: number
  scelte: { consensi: number[]; metodo: 'carta' | 'iban' | null; metodo_pronto: boolean }
  contratto: number | null
  pagamento: string | null
}

export const CAMPI: Record<string, string> = {
  nome: 'Nome',
  cognome: 'Cognome',
  telefono: 'Cellulare',
  nascita: 'Data di nascita (AAAA-MM-GG)',
  codice_fiscale: 'Codice fiscale',
  via: 'Via e numero civico',
  cap: 'CAP',
  citta: 'Città',
}

/** I giorni fra `dal` e `al`, compresi: «2026-10-13», … */
export function giorniFra(dal: string, al: string): string[] {
  const out: string[] = []
  const d = new Date(dal + 'T12:00:00Z')
  const fine = new Date(al + 'T12:00:00Z')
  while (d <= fine) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export function giornoBreve(g: string): { settimana: string; numero: string; mese: string } {
  const d = new Date(g + 'T12:00:00Z')
  return {
    settimana: d.toLocaleDateString('it-IT', { weekday: 'short', timeZone: 'UTC' }),
    numero: String(d.getUTCDate()),
    mese: d.toLocaleDateString('it-IT', { month: 'short', timeZone: 'UTC' }),
  }
}

export function giornoLungo(g: string): string {
  return new Date(g + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** L'ultimo giorno di una settimana che comincia `g`. */
export function fineSettimana(g: string): string {
  const d = new Date(g + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}
