import { documentoAbbonamento } from '@/api/abbonamento'
import { funzione } from '@/api/lab'

// I documenti del socio e della sua famiglia (16/10/2026): i PDF che PerfectGym
// conserva da sempre - moduli e contratti, ricevute - e i contratti firmati dal
// portale. Il lavoro lo fa `portale-lab-documenti` (repo APP-ATHLON): sceglie
// solo quelli che il socio puo' vedere, e per aprirne uno rilegge il file e
// verifica che sia di una persona del nucleo. Qui si mostra e si apre.

export type Documento = {
  /** `pgm` e' un file di PerfectGym; `portale` un contratto firmato qui (l'id e' il numero). */
  origine: 'pgm' | 'portale'
  id: string
  tipo: 'contratto' | 'ricevuta' | 'altro'
  titolo: string
  sottotitolo: string | null
  /** «AAAA-MM-GG», se PerfectGym la sa. I moduli non ce l'hanno: e' un dato che il gestionale non da'. */
  data: string | null
  member_id: number
  /** Di chi e', solo quando la famiglia ha piu' persone. */
  persona: string | null
}

export type EsitoDocumenti = { ok: true; documenti: Documento[] } | { ok: false; errore: string }

export async function elencoDocumenti(): Promise<EsitoDocumenti> {
  const { ok, dati } = await funzione('portale-lab-documenti', { azione: 'elenco' })
  if (ok) return { ok: true, documenti: (dati.documenti ?? []) as Documento[] }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i tuoi documenti adesso.' }
}

/** Il link per aprire un documento: firmato da Supabase, vale un'ora, e si chiede quando serve. */
export async function apriDocumento(d: Documento): Promise<{ ok: true; url: string } | { ok: false; errore: string }> {
  if (d.origine === 'portale') return documentoAbbonamento(d.id)
  const { ok, dati } = await funzione('portale-lab-documenti', { azione: 'apri', id: d.id })
  if (ok && typeof dati.url === 'string') return { ok: true, url: dati.url }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo ad aprire il documento adesso.' }
}
