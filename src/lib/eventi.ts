// La prenotazione di un evento dal link per email (Open Day): i tipi e le
// parole della pagina. Ripresi da lib/eventi.ts del CRM; i dati li danno
// `portale-link` e `perfectgym-eventi`.

export type Turno = { class_id: number; inizio: string; fine: string; posti: number; iscritti: number; liberi: number; chiuso: boolean }

export type Bambino = {
  member_id: number
  nome: string | null
  cognome: string | null
  anno: number | null
  prenotato: { class_id: number; attesa: boolean } | null
}

export type PaginaEvento = {
  evento: { slug: string; titolo: string; data: string; nati_dal: number; nati_al: number }
  turni: Turno[]
  bambini: Bambino[]
  fuori_fascia: { nome: string | null; anno: number | null }[]
}

export type EsitoPrenotazione = { member_id: number; esito: 'prenotato' | 'attesa' | 'errore'; errore?: string }

/** L'ora di un turno, a Roma: «16:30». */
export function ora(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

/** «domenica 11 ottobre». Il giorno com'e' scritto, senza fusi. */
export function giornoEsteso(data: string): string {
  const [a, m, g] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g, 12)).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
}

export function nomeDi(b: { nome: string | null; cognome: string | null }): string {
  return [b.nome, b.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

/** La pagina del sito dove si chiede il link, per chi ne ha uno scaduto o deve aggiungere un bambino. */
export function paginaEventoSito(slug?: string): string {
  return slug ? `https://www.athlonroma.it/eventi/${slug}/` : 'https://www.athlonroma.it/eventi/'
}
