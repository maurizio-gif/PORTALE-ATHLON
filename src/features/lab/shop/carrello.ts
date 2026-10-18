import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'

import type { ArticoloShop, RigaCarrello } from '@/api/shop'

// Il carrello dello shop (18/10/2026): gli articoli scelti e quanti pezzi. Un solo carrello per app, che si
// ricorda nel tempo di una visita e non oltre.
//
// **Sul web sta nella scheda del browser** (`sessionStorage`), e per una ragione: il pagamento porta fuori
// dall'app, sulla pagina di Adyen, e al ritorno la pagina si ricarica da capo; un carrello solo in memoria
// sarebbe vuoto proprio quando serve. Non nel `localStorage`: un dispositivo condiviso non deve ritrovare il
// carrello di chi c'era prima. Sul telefono resta in memoria finche' l'app e' viva.
// **All'uscita dal laboratorio si svuota** (`esciDalLaboratorio`, memoria.ts): non resta niente dell'utente di prima.
//
// Qui ci sono solo identificativi e quantita': nome, foto e prezzo si leggono dalla vetrina, cosi' un prezzo
// cambiato non resta scritto nel carrello. Cio' che si paga lo decide la funzione, mai questo file.

const CHIAVE = 'athlon_shop_carrello'

type Righe = Record<number, number>

function archivio(): Storage | null {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

/** Il carrello ricordato, ripulito: solo numeri interi positivi, niente di cio' che non torna. */
function leggi(): Righe {
  try {
    const grezzo = archivio()?.getItem(CHIAVE)
    const j = grezzo ? (JSON.parse(grezzo) as unknown) : null
    if (!j || typeof j !== 'object' || Array.isArray(j)) return {}
    const out: Righe = {}
    for (const [k, v] of Object.entries(j)) {
      const id = Number(k)
      if (Number.isInteger(id) && id > 0 && Number.isInteger(v) && (v as number) > 0) out[id] = v as number
    }
    return out
  } catch {
    return {}
  }
}

let righe: Righe = leggi()
// Un'istantanea nuova a ogni cambiamento: `useSyncExternalStore` confronta per riferimento.
let istantanea: RigaCarrello[] = daRighe(righe)
const ascoltatori = new Set<() => void>()

function daRighe(r: Righe): RigaCarrello[] {
  return Object.entries(r).map(([id, quantita]) => ({ product_id: Number(id), quantita }))
}

function cambia(nuove: Righe) {
  righe = nuove
  istantanea = daRighe(righe)
  try {
    const a = archivio()
    if (a) {
      if (istantanea.length) a.setItem(CHIAVE, JSON.stringify(righe))
      else a.removeItem(CHIAVE)
    }
  } catch {
    // Senza archivio il carrello resta in memoria: va bene.
  }
  ascoltatori.forEach((a) => a())
}

/** Aggiunge pezzi (fino al massimo); torna la quantita' che c'e' adesso. */
export function aggiungiAlCarrello(productId: number, quantita: number, massimo: number): number {
  const q = Math.min(massimo, (righe[productId] ?? 0) + Math.max(1, Math.floor(quantita)))
  cambia({ ...righe, [productId]: q })
  return q
}

/** Mette la quantita' esatta; zero o meno toglie l'articolo. */
export function impostaQuantita(productId: number, quantita: number, massimo: number) {
  const q = Math.min(massimo, Math.floor(quantita))
  if (!(q > 0)) return togliDalCarrello(productId)
  cambia({ ...righe, [productId]: q })
}

export function togliDalCarrello(productId: number) {
  if (!(productId in righe)) return
  const { [productId]: _tolto, ...resto } = righe
  cambia(resto)
}

export function svuotaCarrello() {
  if (!istantanea.length) return
  cambia({})
}

/** Tiene nel carrello solo cio' che la vetrina ha ancora e non e' esaurito; torna gli articoli tolti. */
export function allineaAllaVetrina(articoli: ArticoloShop[]): number[] {
  const vendibili = new Set(articoli.filter((a) => !a.esaurito).map((a) => a.product_id))
  const tolti = Object.keys(righe).map(Number).filter((id) => !vendibili.has(id))
  if (!tolti.length) return []
  cambia(Object.fromEntries(Object.entries(righe).filter(([id]) => vendibili.has(Number(id)))) as Righe)
  return tolti
}

const iscriviti = (a: () => void) => {
  ascoltatori.add(a)
  return () => ascoltatori.delete(a)
}

/** Il carrello, che si aggiorna da solo in ogni schermata che lo mostra. */
export function useCarrello(): { righe: RigaCarrello[]; pezzi: number; quantita: (productId: number) => number } {
  const r = useSyncExternalStore(iscriviti, () => istantanea, () => istantanea)
  return { righe: r, pezzi: r.reduce((t, x) => t + x.quantita, 0), quantita: (id) => r.find((x) => x.product_id === id)?.quantita ?? 0 }
}

/** Il carrello adesso, fuori da un componente. */
export const carrelloAdesso = (): RigaCarrello[] => istantanea
