import type { Area, ContrattoArea, PersonaArea } from '@/api/lab'
import { ETA_MINIMA_ABBONAMENTO, etaDa } from '@/lib/eta'
import { meseAnno, metodoDaPerfectGym } from '@/lib/metodoPagamento'
import type { Tono } from '@/theme'
import { locale, t } from '@/lib/lingua'

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

/**
 * E' un abbonamento? Quelli con una quota, e **i principali a quota zero** (20/10/2026, richiesta del club):
 * gli omaggi e gli employee non hanno un canone ma sono abbonamenti veri, e senza questa regola un dipendente
 * apriva l'app e leggeva «0 attivi». Il Guest Pass resta fuori: e' una prova, non un abbonamento. Gli aggiuntivi
 * a quota zero (un servizio incluso) nemmeno, e nemmeno i voucher Covid: per il database sono `gratuito` come gli
 * omaggi, ma la funzione li manda con `tipo = 'voucher_covid'` (richiesta del club, 20/10/2026).
 *
 * Con la funzione del database non ancora aggiornata `tipo` non c'e': si torna alla regola di prima (una quota).
 */
export function eAbbonamento(c: Pick<ContrattoArea, 'canone' | 'tipo' | 'aggiuntivo'>): boolean {
  if ((c.canone ?? 0) > 0) return true
  return c.tipo === 'gratuito' && !c.aggiuntivo
}

/** Le persone del nucleo che hanno un abbonamento in vigore (i contratti dell'area sono tutti vivi: in corso, non ancora iniziati o sospesi). */
export function personeConAbbonamento(area: AreaTrovata): Set<number> {
  return new Set(area.contratti.filter(eAbbonamento).map((c) => c.member_id))
}

/** Del contratto di un abbonamento (`contrattiAbbonamento`) serve solo di chi e', se e' in vigore e che tipo e': lo classifica il server. */
export type ContrattoPerPrincipale = { member_id: number; in_vigore: boolean; categoria: 'principale' | 'aggiuntivo' | 'junior' }

/**
 * La persona ha un abbonamento adulti (principale) in vigore? Con l'elenco dei contratti (`contrattiAbbonamento`) lo dice la `categoria` che
 * il server assegna a ogni contratto: **un corso Junior non e' un abbonamento adulti**. Senza elenco (non ancora letto) si ricade sui dati
 * della Home: un abbonamento vero (`eAbbonamento`) che non sia `aggiuntivo`.
 */
export function haAbbonamentoPrincipale(area: AreaTrovata, membro: number, elenco?: ContrattoPerPrincipale[] | null): boolean {
  if (elenco) return elenco.some((c) => c.member_id === membro && c.in_vigore && c.categoria === 'principale')
  return area.contratti.some((c) => c.member_id === membro && eAbbonamento(c) && !c.aggiuntivo)
}

/** Ha una prova (Guest Pass) in corso: ha gia' il suo «Attiva abbonamento». */
export function haProva(area: AreaTrovata, membro: number): boolean {
  return area.contratti.some((c) => c.member_id === membro && c.tipo === 'guest_pass')
}

/**
 * **Chi nel nucleo puo' avere un abbonamento adulti e non ce l'ha** (03/11/2026, richiesta di Maurizio): ogni persona dai 13 anni compiuti
 * senza un abbonamento principale in vigore (`haAbbonamentoPrincipale`) merita un invito a sceglierne uno, **anche se il genitore ce l'ha gia'**
 * e anche se il ragazzo (13-17) e' solo un figlio sulla scheda. Per i minorenni firma il genitore: lo dice il server (`portale-abbonamento`,
 * `persone`). Restano fuori chi ha una prova in corso (`haProva`) e chi non ha la data di nascita (l'eta' non si sa: la scelta dell'abbonamento
 * resta raggiungibile dal comando generale). Il titolare viene per primo.
 */
export function senzaAbbonamento(area: AreaTrovata, oggi: Date = new Date(), elenco?: ContrattoPerPrincipale[] | null): PersonaArea[] {
  return area.persone
    .filter((x) => !haAbbonamentoPrincipale(area, x.member_id, elenco) && !haProva(area, x.member_id) && (etaDa(x.data_nascita, oggi) ?? -1) >= ETA_MINIMA_ABBONAMENTO)
    .sort((a, b) => Number(b.titolare) - Number(a.titolare))
}

function soldi(n: number): string {
  return n.toLocaleString(locale(), { style: 'currency', currency: 'EUR' })
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
  if (importo > 0) motivi.push({ chiave: 'debito', breve: t('in debito', 'in debt'), dettaglio: t(`Pagamento in sospeso: ${soldi(importo)} da saldare.`, `Outstanding payment: ${soldi(importo)} to pay.`) })

  if ((c.canone ?? 0) > 0 && c.stato !== 'Freezed') {
    const metodo = metodoDaPerfectGym(c.metodo)
    const tipo = (metodo?.tipo ?? '').toLowerCase()
    if (!metodo || tipo === 'cash') {
      motivi.push({ chiave: 'metodo', breve: t('manca il metodo', 'no payment method'), dettaglio: t('Manca il metodo di pagamento: aggiungi una carta o un conto corrente per gli addebiti.', 'Payment method missing: add a card or a bank account for the charges.') })
    } else if (tipo === 'creditcard' && metodo.scaduta) {
      const quando = meseAnno(metodo.scadenza)
      motivi.push({ chiave: 'carta', breve: t('carta scaduta', 'card expired'), dettaglio: t(`La carta salvata è scaduta${quando ? ` (${quando})` : ''}: sostituiscila per gli addebiti.`, `Your saved card has expired${quando ? ` (${quando})` : ''}: replace it for the charges.`) })
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
 * veri (`eAbbonamento`: con una quota, o principali a quota zero come gli omaggi e gli employee):
 * un Guest Pass e' una prova. E' lo stesso elenco della sezione sotto il riquadro (`contratti` di
 * portale-abbonamento, che prende gli stessi contratti), cosi' il numero e la lista
 * non si contraddicono (17/10/2026, e dal 20/10/2026 con gli omaggi e gli employee).
 */
export function riepilogoAbbonamenti(area: AreaTrovata): RiepilogoAbbonamenti {
  const veri = area.contratti.filter(eAbbonamento)
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
