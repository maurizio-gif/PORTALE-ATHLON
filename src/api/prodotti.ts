import { funzione } from '@/api/lab'

// I prodotti acquistati dal socio e dalla sua famiglia (18/10/2026): lezioni singole, accessi,
// recuperi, sedute di personal training, badge. Il lavoro lo fa `portale-lab-pagamenti`
// (azione `prodotti`, repo APP-ATHLON), dalla stessa funzione che mostra la scheda del CRM:
// qui si legge e si mostra.

export type StatoProdotto = 'valido' | 'consumato' | 'scaduto'

export type Prodotto = {
  id: string
  nome: string
  categoria: string | null
  /** Zero o assente: incluso in un abbonamento, omaggio, recupero. */
  prezzo: number | null
  acquistato_il: string | null
  /** Se ha una scadenza. */
  scade_il: string | null
  quantita_iniziale: number | null
  quantita_residua: number | null
  stato: StatoProdotto
  /** Di chi e', solo per un familiare. */
  per: string | null
}

export type EsitoProdotti = { ok: true; prodotti: Prodotto[] } | { ok: false; errore: string }

export async function elencoProdotti(): Promise<EsitoProdotti> {
  const { ok, dati } = await funzione('portale-lab-pagamenti', { azione: 'prodotti' })
  if (ok) return { ok: true, prodotti: (dati.prodotti ?? []) as Prodotto[] }
  return { ok: false, errore: dati.errore ?? 'Non riusciamo a leggere i tuoi prodotti adesso.' }
}
