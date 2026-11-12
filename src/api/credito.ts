import { funzione } from '@/api/lab'

// Il credito in euro caricato dal CRM (sezione «Agevolazioni», 12/11/2026, richiesta di Maurizio), dalla funzione
// `portale-lab-credito` di APP-ATHLON (sezione «Il credito in euro nella schermata Pagamenti dell'app»). Solo lettura:
// il credito si scala dal server, all'iscrizione a una gara o alla prenotazione di una lezione Baby Nuoto.
// Le persone sono quelle del nucleo: il credito di un bambino lo vede il genitore. Il motivo che scrive l'operatore non arriva.

export type AmbitoCredito = 'abbonamenti' | 'lezioni' | 'shop'

export type LottoCredito = {
  id: number
  member_id: number
  nome: string | null
  residuo_cent: number
  importo_cent: number
  ambiti: AmbitoCredito[]
  /** «AAAA-MM-GG», o `null` se non scade. I crediti scaduti il server non li manda. */
  scade_il: string | null
}

export type Credito = {
  totale_cent: number
  persone: { member_id: number; nome: string | null; totale_cent: number }[]
  crediti: LottoCredito[]
}

/**
 * Il credito del nucleo. **Non dice mai un errore**: se la lettura fallisce (rete, 403 per un ragazzo da 13 a 17 anni,
 * una funzione non ancora pubblicata) la risposta e' un credito vuoto, e la schermata non mostra niente. Un credito che non
 * si legge non deve bloccare i pagamenti.
 */
export async function leggiCredito(): Promise<{ ok: true } & Credito> {
  const vuoto = { ok: true as const, totale_cent: 0, persone: [], crediti: [] }
  const r = await funzione('portale-lab-credito', { azione: 'elenco' })
  if (!r.ok || r.dati.ok !== true) return vuoto
  const totale = Number(r.dati.totale_cent) || 0
  if (totale <= 0) return vuoto
  return {
    ok: true,
    totale_cent: totale,
    persone: Array.isArray(r.dati.persone) ? r.dati.persone : [],
    crediti: Array.isArray(r.dati.crediti) ? (r.dati.crediti as LottoCredito[]).filter((c) => c.residuo_cent > 0) : [],
  }
}
