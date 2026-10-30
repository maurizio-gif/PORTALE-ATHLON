// Gli orari del club e gli avvisi in corso (30/10/2026): quanto e' aperto il club oggi, la settimana, e le news che toccano gli orari (una
// chiusura, un orario ridotto). **Li calcola la funzione** (`portale-lab-assistente`, azione `club`, `_shared/assistente/club.ts` di APP-ATHLON)
// dalle stesse cose che Club Life mostra: l'app non ha una sua copia degli orari e non legge niente del sito. Sono dati pubblici: si leggono
// anche in vista cliente. **Il modulo e' puro** (niente rete ne' React Native: si prova con `npx tsx`); la chiamata sta in `features/lab/clublife/useOrariClub.ts`.

export type OrarioOggi = {
  /** «AAAA-MM-GG» a Roma. */
  data: string
  /** «giovedì 29 ottobre», gia' nella lingua dell'app. */
  giorno: string
  chiuso: boolean
  festivo: boolean
  da: string | null
  a: string | null
  ridotto: boolean
}

export type FasciaSettimana = { giorni: string; da: string; a: string }

/** Un avviso in corso: `id` e' quello di Club Life («news:<id>»). */
export type AvvisoClub = { id: string; titolo: string; categoria: string; data: string | null }

/** Una chiusura per festivita' o un orario ridotto nei prossimi 7 giorni (oggi compreso). */
export type EccezioneClub = {
  /** «AAAA-MM-GG» a Roma. */
  data: string
  /** «domenica 1 novembre», gia' nella lingua dell'app. */
  giorno: string
  tipo: 'chiuso' | 'ridotto'
  /** L'ora di chiusura di un giorno a orario ridotto. */
  a: string | null
  /** «Tutti i Santi», «Natale», o «Giorno festivo». */
  nome: string | null
}

export type OrariClub = {
  oggi: OrarioOggi
  settimana: FasciaSettimana[]
  avvisi: AvvisoClub[]
  /** Le eccezioni dei prossimi 7 giorni: con una funzione di prima e' un elenco vuoto. */
  prossimi: EccezioneClub[]
}

const testo = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Quello che la funzione manda, con la forma controllata: un campo che non c'e' (una funzione di prima) non rompe niente, la risposta e' `null`. */
export function orariClubDa(d: Record<string, any> | null | undefined): OrariClub | null {
  const o = d?.oggi
  if (!o || typeof o !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(testo(o.data))) return null
  const settimana: FasciaSettimana[] = (Array.isArray(d!.settimana) ? d!.settimana : [])
    .filter((f: any) => f && typeof f.giorni === 'string' && /^\d{1,2}:\d{2}$/.test(testo(f.da)) && /^\d{1,2}:\d{2}$/.test(testo(f.a)))
    .map((f: any) => ({ giorni: f.giorni as string, da: f.da as string, a: f.a as string }))
  const avvisi: AvvisoClub[] = (Array.isArray(d!.avvisi) ? d!.avvisi : [])
    .filter((a: any) => a && typeof a.id === 'string' && /^news:/.test(a.id) && typeof a.titolo === 'string' && a.titolo.trim())
    .map((a: any) => ({ id: a.id as string, titolo: (a.titolo as string).trim(), categoria: testo(a.categoria), data: typeof a.data === 'string' ? a.data : null }))
  const prossimi: EccezioneClub[] = (Array.isArray(d!.prossimi) ? d!.prossimi : [])
    .filter((e: any) => e && /^\d{4}-\d{2}-\d{2}$/.test(testo(e.data)) && (e.tipo === 'chiuso' || e.tipo === 'ridotto') && (e.tipo === 'chiuso' || /^\d{1,2}:\d{2}$/.test(testo(e.a))))
    .map((e: any) => ({ data: e.data as string, giorno: testo(e.giorno), tipo: e.tipo as 'chiuso' | 'ridotto', a: /^\d{1,2}:\d{2}$/.test(testo(e.a)) ? (e.a as string) : null, nome: testo(e.nome).trim() || null }))
    .sort((x: EccezioneClub, y: EccezioneClub) => x.data.localeCompare(y.data))
  const chiuso = o.chiuso === true
  const da = /^\d{1,2}:\d{2}$/.test(testo(o.da)) ? (o.da as string) : null
  const a = /^\d{1,2}:\d{2}$/.test(testo(o.a)) ? (o.a as string) : null
  // Un giorno aperto senza orario non e' una cosa da mostrare.
  if (!chiuso && (!da || !a)) return null
  return { oggi: { data: o.data, giorno: testo(o.giorno), chiuso, festivo: o.festivo === true, da, a, ridotto: o.ridotto === true }, settimana, avvisi, prossimi }
}

/** L'indirizzo di una news di Club Life dall'id di un avviso («news:<id>»), o null se non lo e'. */
export function idNewsDaAvviso(id: string): string | null {
  const m = /^news:([A-Za-z0-9_-]{1,120})$/.exec(id)
  return m ? m[1] : null
}
