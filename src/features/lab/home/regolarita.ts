import type { Area, ContrattoArea, PersonaArea } from '@/api/lab'
import { meseAnno, metodoDaPerfectGym } from '@/lib/metodoPagamento'
import type { Tono } from '@/theme'

// La regolarita' degli abbonamenti (17/10/2026). Un abbonamento puo' esserci e
// non essere in regola: la Home prima contava solo quelli «attivi», quindi uno
// non ancora iniziato o con un pagamento in sospeso spariva dal riquadro
// («0 attivi») anche se sulla scheda c'era. Qui si dice, per ogni abbonamento,
// se e' regolare e, se non lo e', di che tipo e' l'irregolarita'. I tre tipi
// sono quelli che il club puo' vedere dal gestionale:
//
//  - debito: la persona ha un pagamento non andato (saldo negativo su
//    PerfectGym), non un addebito ancora in corso;
//  - metodo: nessun metodo di pagamento salvato (o solo «contanti», che non e'
//    un metodo con cui si possa addebitare);
//  - carta: la carta salvata e' scaduta.
//
// Tutto dai dati che la Home ha gia' letto (`portale_la_mia_area`): nessuna
// chiamata in piu'.

type AreaTrovata = Extract<Area, { trovato: true }>

export type ChiaveMotivo = 'debito' | 'metodo' | 'carta'

export type Motivo = {
  chiave: ChiaveMotivo
  /** Per un riquadro stretto: «in debito». */
  breve: string
  /** Per una scheda: cosa non va, in una frase. */
  dettaglio: string
}

export type Regolarita = {
  motivi: Motivo[]
  /** Rosso se c'e' un pagamento non andato, ambra se manca solo di sistemare il metodo; null se e' in regola. */
  tono: Extract<Tono, 'errore' | 'attenzione'> | null
}

const ORDINE: ChiaveMotivo[] = ['debito', 'metodo', 'carta']

function soldi(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function tonoDa(motivi: { chiave: ChiaveMotivo }[]): Regolarita['tono'] {
  if (!motivi.length) return null
  return motivi.some((m) => m.chiave === 'debito') ? 'errore' : 'attenzione'
}

/**
 * Se un abbonamento e' in regola, e se no perche'. Il metodo si guarda solo
 * dove c'e' una quota da addebitare e il contratto non e' sospeso: un
 * abbonamento a costo zero o fermo non ha niente da incassare.
 */
export function regolaritaContratto(c: ContrattoArea, persona: PersonaArea | undefined): Regolarita {
  const motivi: Motivo[] = []
  const importo = persona?.debito?.importo ?? 0
  if (importo > 0) motivi.push({ chiave: 'debito', breve: 'in debito', dettaglio: `Pagamento in sospeso: ${soldi(importo)} da saldare.` })

  if ((c.canone ?? 0) > 0 && c.stato !== 'Freezed') {
    const metodo = metodoDaPerfectGym(c.metodo)
    const tipo = (metodo?.tipo ?? '').toLowerCase()
    if (!metodo || tipo === 'cash') {
      motivi.push({ chiave: 'metodo', breve: 'manca il metodo', dettaglio: 'Manca il metodo di pagamento: aggiungi una carta o un conto corrente per gli addebiti.' })
    } else if (tipo === 'creditcard' && metodo.scaduta) {
      const quando = meseAnno(metodo.scadenza)
      motivi.push({ chiave: 'carta', breve: 'carta scaduta', dettaglio: `La carta salvata è scaduta${quando ? ` (${quando})` : ''}: sostituiscila per gli addebiti.` })
    }
  }
  return { motivi, tono: tonoDa(motivi) }
}

export type RiepilogoAbbonamenti = {
  /** Tutti gli abbonamenti vivi: in corso, non ancora iniziati, sospesi. */
  totale: number
  attivi: number
  inPartenza: number
  sospesi: number
  /** Se ce n'e' uno solo che deve ancora partire, quando. */
  partenza: string | null
  /** I tipi di irregolarita' presenti, senza ripetizioni, nell'ordine in cui vanno detti. */
  motivi: Motivo[]
  tono: Regolarita['tono']
}

/**
 * Gli abbonamenti dell'intero nucleo, per il riquadro della Home. Si contano i soli abbonamenti
 * veri (con una quota): un Guest Pass e' una prova, e i contratti a quota zero non sono
 * abbonamenti. E' lo stesso elenco della sezione sotto il riquadro (`contratti` di
 * portale-abbonamento, che prende i contratti con una quota), cosi' il numero e la lista
 * non si contraddicono (17/10/2026).
 */
export function riepilogoAbbonamenti(area: AreaTrovata): RiepilogoAbbonamenti {
  const veri = area.contratti.filter((c) => (c.canone ?? 0) > 0)
  let attivi = 0
  let inPartenza = 0
  let sospesi = 0
  let partenza: string | null = null
  const trovati = new Map<ChiaveMotivo, Motivo>()
  for (const c of veri) {
    if (c.stato === 'Freezed') sospesi++
    else if (c.stato === 'NotStarted') {
      inPartenza++
      partenza = c.data_inizio
    } else attivi++
    for (const m of regolaritaContratto(c, area.persone.find((x) => x.member_id === c.member_id)).motivi) if (!trovati.has(m.chiave)) trovati.set(m.chiave, m)
  }
  const motivi = ORDINE.flatMap((k) => trovati.get(k) ?? [])
  return { totale: veri.length, attivi, inPartenza, sospesi, partenza: inPartenza === 1 ? partenza : null, motivi, tono: tonoDa(motivi) }
}
