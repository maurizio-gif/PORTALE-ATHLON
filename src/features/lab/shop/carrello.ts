import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'

import type { ArticoloShop, PersonaShop, RigaCarrello, Scelte } from '@/api/shop'

import { rispostaCompleta } from './scelte'

// Il carrello dello shop (18/10/2026): gli articoli scelti, quanti pezzi e, per chi ha un questionario, le risposte. Un solo carrello per app, che si
// ricorda nel tempo di una visita e non oltre.
//
// **Sul web sta nella scheda del browser** (`sessionStorage`), e per una ragione: il pagamento col Drop-in dopo una 3D Secure, o il link sull'app nativa,
// porta fuori dall'app, e al ritorno la pagina si ricarica da capo; un carrello solo in memoria sarebbe vuoto proprio quando serve. Non nel
// `localStorage`: un dispositivo condiviso non deve ritrovare il carrello di chi c'era prima. Sul telefono resta in memoria finche' l'app e' viva.
// **All'uscita dal laboratorio si svuota** (`esciDalLaboratorio`, memoria.ts): non resta niente dell'utente di prima.
//
// **Righe, non solo quantita'** (06/11/2026): un articolo con un questionario (il Kit Agonismo: chi e' l'atleta, taglia della t-shirt e dello short) si compra
// un pezzo per riga, ognuna con le sue risposte; due atleti sono due righe. Gli articoli senza questionario hanno una riga sola con la quantita', come prima.
// Ogni riga ha un `id` locale, per toglierla senza confonderla con un'altra dello stesso articolo; l'id non parte mai verso il server.
//
// Qui ci sono solo identificativi, quantita' e risposte: nome, foto e prezzo si leggono dalla vetrina, cosi' un prezzo cambiato non resta scritto nel
// carrello. Cio' che si paga lo decide la funzione, mai questo file.

const CHIAVE = 'athlon_shop_carrello'

function archivio(): Storage | null {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

let contatore = 0
/** Un id locale per una riga: basta che non si ripeta dentro il carrello. */
const nuovoId = (): string => `${Date.now().toString(36)}${(contatore++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Le risposte ricordate, ripulite: solo testo o un `member_id` intero, niente di cio' che non torna. */
function scelteDa(grezze: unknown): Scelte | undefined {
  if (!grezze || typeof grezze !== 'object' || Array.isArray(grezze)) return undefined
  const out: Scelte = {}
  for (const [k, v] of Object.entries(grezze)) {
    if (typeof v === 'string') out[k] = v
    else if (v && typeof v === 'object' && Number.isInteger((v as { member_id?: unknown }).member_id)) out[k] = { member_id: (v as { member_id: number }).member_id }
  }
  return Object.keys(out).length ? out : undefined
}

/** Il carrello ricordato, ripulito: solo numeri interi positivi, niente di cio' che non torna. */
function leggi(): RigaCarrello[] {
  try {
    const grezzo = archivio()?.getItem(CHIAVE)
    const j = grezzo ? (JSON.parse(grezzo) as unknown) : null
    if (!j || typeof j !== 'object') return []
    // Fino al 06/11/2026 il carrello era `{ <product_id>: quantita }`: una scheda aperta prima dell'aggiornamento lo ritrova, come righe senza risposte.
    if (!Array.isArray(j)) {
      const vecchie: RigaCarrello[] = []
      for (const [k, v] of Object.entries(j)) {
        const id = Number(k)
        if (Number.isInteger(id) && id > 0 && Number.isInteger(v) && (v as number) > 0) vecchie.push({ id: nuovoId(), product_id: id, quantita: v as number })
      }
      return vecchie
    }
    const out: RigaCarrello[] = []
    for (const r of j as Partial<RigaCarrello>[]) {
      if (!r || !Number.isInteger(r.product_id) || (r.product_id as number) <= 0 || !Number.isInteger(r.quantita) || (r.quantita as number) <= 0) continue
      const scelte = scelteDa(r.scelte)
      out.push({ id: typeof r.id === 'string' && r.id ? r.id : nuovoId(), product_id: r.product_id as number, quantita: r.quantita as number, ...(scelte ? { scelte } : {}) })
    }
    return out
  } catch {
    return []
  }
}

// Un'istantanea nuova a ogni cambiamento: `useSyncExternalStore` confronta per riferimento.
let righe: RigaCarrello[] = leggi()
const ascoltatori = new Set<() => void>()

function cambia(nuove: RigaCarrello[]) {
  righe = nuove
  try {
    const a = archivio()
    if (a) {
      if (righe.length) a.setItem(CHIAVE, JSON.stringify(righe))
      else a.removeItem(CHIAVE)
    }
  } catch {
    // Senza archivio il carrello resta in memoria: va bene.
  }
  ascoltatori.forEach((a) => a())
}

/** Quanti pezzi di un articolo ci sono nel carrello, sommando le sue righe: il tetto per articolo vale sul totale. */
const pezziDi = (r: RigaCarrello[], productId: number): number => r.reduce((t, x) => t + (x.product_id === productId ? x.quantita : 0), 0)

/** Aggiunge pezzi a un articolo senza questionario (fino al massimo); torna quanti ce ne sono adesso. */
export function aggiungiAlCarrello(productId: number, quantita: number, massimo: number): number {
  const attuali = pezziDi(righe, productId)
  const aggiungi = Math.min(Math.max(1, Math.floor(quantita)), Math.max(0, massimo - attuali))
  if (aggiungi <= 0) return attuali
  const riga = righe.find((x) => x.product_id === productId && !x.scelte)
  cambia(riga ? righe.map((x) => (x === riga ? { ...x, quantita: x.quantita + aggiungi } : x)) : [...righe, { id: nuovoId(), product_id: productId, quantita: aggiungi }])
  return attuali + aggiungi
}

/**
 * Aggiunge un pezzo di un articolo con questionario, con le sue risposte: una riga nuova. Torna l'id della riga, o `null` se il tetto per articolo e' gia'
 * raggiunto (cinque pezzi in tutto, anche se di atleti diversi).
 */
export function aggiungiRigaConScelte(productId: number, scelte: Scelte, massimo: number): string | null {
  if (pezziDi(righe, productId) >= massimo) return null
  const id = nuovoId()
  cambia([...righe, { id, product_id: productId, quantita: 1, scelte }])
  return id
}

/** Mette la quantita' esatta di un articolo senza questionario; zero o meno lo toglie. */
export function impostaQuantita(productId: number, quantita: number, massimo: number) {
  const riga = righe.find((x) => x.product_id === productId && !x.scelte)
  if (!riga) return
  const q = Math.min(massimo, Math.floor(quantita))
  if (!(q > 0)) return togliRiga(riga.id)
  cambia(righe.map((x) => (x === riga ? { ...x, quantita: q } : x)))
}

/** Toglie una riga (per il suo id locale). */
export function togliRiga(id: string) {
  if (!righe.some((x) => x.id === id)) return
  cambia(righe.filter((x) => x.id !== id))
}

/** Toglie tutte le righe di un articolo: per quando la funzione dice che le sue risposte non tornano piu'. */
export function togliArticolo(productId: number) {
  if (!righe.some((x) => x.product_id === productId)) return
  cambia(righe.filter((x) => x.product_id !== productId))
}

export function svuotaCarrello() {
  if (!righe.length) return
  cambia([])
}

/**
 * Tiene nel carrello solo cio' che la vetrina ha ancora: l'articolo c'e' e non e' esaurito, un preordine e' ancora aperto e le risposte del questionario
 * tornano ancora (un'atleta che non e' piu' nel nucleo, una taglia tolta). Torna gli articoli tolti.
 */
export function allineaAllaVetrina(articoli: ArticoloShop[], persone: PersonaShop[]): number[] {
  const perId = new Map(articoli.map((a) => [a.product_id, a]))
  const tieni = (r: RigaCarrello): boolean => {
    const a = perId.get(r.product_id)
    if (!a || a.esaurito || (a.preordine && !a.preordine_aperto)) return false
    // Un articolo con questionario senza risposte valide non si puo' ordinare: la riga va rifatta dalla scheda.
    if (a.opzioni.length) return rispostaCompleta(a, r.scelte, persone)
    return true
  }
  const restano = righe.filter(tieni)
  if (restano.length === righe.length) return []
  const tolti = [...new Set(righe.filter((r) => !restano.includes(r)).map((r) => r.product_id))]
  cambia(restano)
  return tolti
}

const iscriviti = (a: () => void) => {
  ascoltatori.add(a)
  return () => ascoltatori.delete(a)
}

/** Il carrello, che si aggiorna da solo in ogni schermata che lo mostra. */
export function useCarrello(): { righe: RigaCarrello[]; pezzi: number; quantita: (productId: number) => number } {
  const r = useSyncExternalStore(iscriviti, () => righe, () => righe)
  return { righe: r, pezzi: r.reduce((t, x) => t + x.quantita, 0), quantita: (id) => pezziDi(r, id) }
}

/** Il carrello adesso, fuori da un componente. */
export const carrelloAdesso = (): RigaCarrello[] => righe
