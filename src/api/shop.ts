import { funzione, type CartaSalvata } from '@/api/lab'
import { t } from '@/lib/lingua'

// Lo shop dell'app (18/10/2026): gli articoli e il merchandising del club, con foto e prezzi, comprati con Adyen
// attraverso PerfectGym e ritirati in segreteria. Il lavoro lo fa `portale-lab-shop` (repo APP-ATHLON): il catalogo
// e' quello di PerfectGym curato dal CRM (Segreteria → Shop), e il prezzo si rilegge da PerfectGym all'ordine. Qui
// si legge e si mostra; **l'app non calcola mai quanto si paga**: il totale che si vede e' una somma per
// comodita', quello vero lo dice la funzione.

export type CategoriaShop = { id: number; nome: string }

export type ArticoloShop = {
  product_id: number
  nome: string
  prezzo: number
  categoria_id: number
  categoria: string
  descrizione: string | null
  /** Indirizzi pubblici, la prima e' quella dell'elenco. Sempre almeno una. */
  foto: string[]
  esaurito: boolean
}

export type Vetrina = { categorie: CategoriaShop[]; articoli: ArticoloShop[]; quantita_max: number }

export type RigaCarrello = { product_id: number; quantita: number }

export type RigaOrdine = { product_id: number; nome: string; prezzo: number; quantita: number; foto: string | null }

export type StatoOrdine = 'avviato' | 'pagato' | 'errore'

export type Ordine = {
  ordine_id: string
  stato: StatoOrdine
  errore: string | null
  totale: number
  creato_il: string
  pagato_il: string | null
  consegnato_il: string | null
  righe: RigaOrdine[]
}

const shop = (corpo: Record<string, unknown>) => funzione('portale-lab-shop', corpo)

export type EsitoVetrina = ({ ok: true } & Vetrina) | { ok: false; errore: string }

export async function leggiVetrina(): Promise<EsitoVetrina> {
  const { ok, dati } = await shop({ azione: 'catalogo' })
  if (ok) return { ok: true, categorie: (dati.categorie ?? []) as CategoriaShop[], articoli: (dati.articoli ?? []) as ArticoloShop[], quantita_max: Number(dati.quantita_max) || 5 }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere lo shop adesso.', 'We can’t load the shop right now.') }
}

/** Cosa non va in un ordine che la funzione ha rifiutato: dice quale articolo e perche', per toglierlo dal carrello. */
export type RifiutoOrdine = { ok: false; errore: string; codice?: 'non_in_vendita' | 'esaurito' | 'prezzo_cambiato'; product_id?: number }

export type OrdineAperto = { ok: true; ordine_id: string; url: string; carta: CartaSalvata | null; totale: number }

/** Apre l'ordine e il pagamento. **Non addebita niente**: apre il link; si paga sulla pagina di Adyen o con la carta salvata. */
export async function ordina(righe: RigaCarrello[]): Promise<OrdineAperto | RifiutoOrdine> {
  const { ok, dati } = await shop({ azione: 'ordina', righe })
  if (ok && typeof dati.url === 'string' && typeof dati.ordine_id === 'string') {
    return { ok: true, ordine_id: dati.ordine_id, url: dati.url, carta: (dati.carta ?? null) as CartaSalvata | null, totale: Number(dati.totale) }
  }
  return {
    ok: false,
    errore: dati.errore ?? t('Non riusciamo ad aprire il pagamento adesso.', 'We can’t open the payment right now.'),
    codice: typeof dati.codice === 'string' ? (dati.codice as RifiutoOrdine['codice']) : undefined,
    product_id: typeof dati.product_id === 'number' ? dati.product_id : undefined,
  }
}

/** L'ordine addebitato sulla carta gia' salvata, senza uscire dall'app; l'esito poi si legge con `esitoOrdine`. */
export async function pagaOrdineConCarta(ordineId: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { ok, dati } = await shop({ azione: 'paga_con_carta', ordine_id: ordineId })
  if (ok) return { ok: true }
  return { ok: false, errore: dati.errore ?? t('La carta non è stata addebitata.', 'The card wasn’t charged.') }
}

/** Com'e' andato un ordine: finche' e' `avviato` si richiede (il pagamento arriva a PerfectGym qualche secondo dopo). */
export async function esitoOrdine(ordineId: string): Promise<{ ok: true; ordine: Ordine } | { ok: false; errore: string }> {
  const { ok, dati } = await shop({ azione: 'esito', ordine_id: ordineId })
  if (ok) return { ok: true, ordine: dati as unknown as Ordine }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a verificare il pagamento adesso.', 'We can’t check the payment right now.') }
}

/** I miei ordini: pagati (da ritirare o ritirati) e quello in corso. */
export async function miOrdini(): Promise<{ ok: true; ordini: Ordine[] } | { ok: false; errore: string }> {
  const { ok, dati } = await shop({ azione: 'ordini' })
  if (ok) return { ok: true, ordini: (dati.ordini ?? []) as Ordine[] }
  return { ok: false, errore: dati.errore ?? t('Non riusciamo a leggere i tuoi ordini adesso.', 'We can’t load your orders right now.') }
}
