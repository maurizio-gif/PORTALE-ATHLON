import type { SchedaLezione } from '@/api/lab'

// La prenotazione di un evento dal link per email (Open Day): i tipi e le
// parole della pagina. Ripresi da lib/eventi.ts del CRM; i dati li danno
// `portale-link` e `perfectgym-eventi`.

export type Turno = {
  class_id: number
  inizio: string
  fine: string
  posti: number
  iscritti: number
  liberi: number
  chiuso: boolean
  istruttore?: string | null
}

/** Una persona del nucleo che si puo' prenotare all'evento. */
export type Persona = {
  member_id: number
  nome: string | null
  cognome: string | null
  anno: number | null
  titolare?: boolean
  prenotato: { class_id: number; attesa: boolean } | null
}

/** Il nome di prima: all'Open Day si prenotavano solo bambini. */
export type Bambino = Persona

export type PaginaEvento = {
  evento: {
    slug: string
    titolo: string
    data: string
    nati_dal: number | null
    nati_al: number | null
    /** Per chi: i figli (Open Day), tutta la famiglia o solo chi ha chiesto il link (20/10/2026). Manca nelle risposte di prima del 13/10/2026. */
    per?: 'figli' | 'famiglia' | 'persona'
    /** Il tipo di lezione su PerfectGym. */
    lezione?: string
    categoria?: string | null
  }
  turni: Turno[]
  /** Le persone ammesse; `bambini` e' lo stesso elenco, col nome di prima. */
  persone?: Persona[]
  bambini: Persona[]
  fuori_fascia: { nome: string | null; anno: number | null }[]
  /** La scheda della lezione dal sito (foto, video, descrizione), se c'e'. */
  scheda?: SchedaLezione | null
  /** Se la lezione e' a pagamento aggiuntivo (Master Class, Eventi): il prodotto da comprare per chi non lo ha compreso. */
  pagamento?: { prodotto: Prodotto | null } | null
}

/** Il prodotto PerfectGym che apre la prenotazione di una lezione a pagamento. */
export type Prodotto = { product_id: number; nome: string; prezzo: number | null }

/** «10 €», «7,50 €». */
export function euro(prezzo: number): string {
  return `${prezzo.toLocaleString('it-IT', { minimumFractionDigits: Number.isInteger(prezzo) ? 0 : 2, maximumFractionDigits: 2 })} €`
}

export type EsitoPrenotazione = { member_id: number; esito: 'prenotato' | 'attesa' | 'errore' | 'da_pagare'; errore?: string; prodotto?: Prodotto | null }

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
