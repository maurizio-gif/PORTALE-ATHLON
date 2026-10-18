import type { Alternativa, DatiLezione, TappaSettimana } from '@/api/percorso'

// Le tappe-lezione della settimana, divise per cosa se ne puo' fare adesso: la logica di «Prenota la
// settimana» (`PrenotaSettimana.tsx`), tenuta qui perche' e' pura e si prova senza schermata.
//
// **Cosa entra e cosa no.** Entrano le lezioni che si possono prenotare adesso: ci sono in programma, comprese
// nell'abbonamento, la prenotazione e' aperta, il limite della categoria non e' pieno, non aspettano un'altra
// lezione dello stesso percorso (`dopo`) e **hanno ancora posti**. Una lezione al completo non si mette in lista
// d'attesa da sola: va in «Al completo», dove il socio sceglie fra la lista d'attesa, un'alternativa con posti
// liberi o lasciar stare. Restano fuori, ognuna col suo motivo: quelle che si aprono piu' avanti, quelle non
// comprese (si prenotano una per una, pagando la lezione singola), quelle che questa settimana non ci sono.

export type Voce = { t: TappaSettimana; d: DatiLezione; /** Una lezione al completo che il socio ha gia' sostituito: `d` e' l'alternativa che ha prenotato. */ alternativa?: Alternativa }

/** Una lezione al completo, e le alternative che si possono prenotare adesso al suo posto. */
export type Completa = Voce & { alternative: Alternativa[] }

/** Un'alternativa che il riepilogo puo' prenotare con un tocco: ha posti, e' in programma, la prenotazione e' aperta e il limite non e' pieno. */
export function prenotabileOra(a: Alternativa): boolean {
  return a.liberi > 0 && !a.prenotazione && !a.iniziata && !a.prenotabile_dal && !a.limite && a.compresa !== false
}

/** Le tappe-lezione della settimana, divise per cosa se ne puo' fare adesso. */
export function dividiLaSettimana(tappe: TappaSettimana[]) {
  const adesso: Voce[] = []
  const complete: Completa[] = []
  const piuAvanti: (Voce & { perche: string })[] = []
  const daAcquistare: Voce[] = []
  const nonInProgramma: TappaSettimana[] = []
  const gia: Voce[] = []
  for (const t of tappe) {
    if (t.tipo !== 'lezione') continue
    if (t.stato === 'non_c_e' || !t.lezione_vera) {
      nonInProgramma.push(t)
      continue
    }
    const d = t.lezione_vera
    // Una lezione al completo che il socio ha gia' sostituito con un'alternativa e' sistemata: resta fra le prenotate.
    const presa = !d.prenotazione && d.liberi <= 0 ? (t.alternative ?? []).find((a) => a.prenotazione && !a.prenotazione.attesa) : undefined
    if (presa) gia.push({ t, d: presa, alternativa: presa })
    else if (d.prenotazione) gia.push({ t, d })
    else if (d.iniziata) continue
    else if (t.lezione?.compresa === false) daAcquistare.push({ t, d })
    else if (d.dopo) piuAvanti.push({ t, d, perche: d.dopo.messaggio })
    else if (d.limite) piuAvanti.push({ t, d, perche: d.limite.messaggio })
    else if (d.prenotabile_dal) piuAvanti.push({ t, d, perche: `Si apre il ${giornoOra(d.prenotabile_dal)}.` })
    else if (d.liberi <= 0) complete.push({ t, d, alternative: (t.alternative ?? []).filter(prenotabileOra) })
    else adesso.push({ t, d })
  }
  const cronologico = (a: Voce, b: Voce) => Date.parse(a.d.inizio) - Date.parse(b.d.inizio)
  return {
    adesso: adesso.sort(cronologico),
    complete: complete.sort(cronologico),
    piuAvanti: piuAvanti.sort(cronologico),
    daAcquistare: daAcquistare.sort(cronologico),
    nonInProgramma,
    gia: gia.sort(cronologico),
  }
}

/** Cosa fa il socio di una lezione al completo: la lista d'attesa, una delle alternative (per `class_id`), o niente. */
export type Scelta = 'attesa' | 'salta' | number

/**
 * Cosa si prenota davvero, in ordine di tempo: le lezioni con posti, poi — per ognuna delle complete — quello
 * che il socio ha scelto. **Di default la lista d'attesa**, come prima: e' la scelta che non cambia niente
 * al socio che non guarda; le alternative sono un'offerta, e si scelgono. Una stessa alternativa non si
 * prenota due volte (la seconda lezione completa che la sceglie la salta).
 */
export type DaPrenotare = { voce: Voce; classId: number; come: 'posto' | 'attesa' | 'alternativa'; alternativa?: Alternativa }

export function listaDaPrenotare(g: ReturnType<typeof dividiLaSettimana>, scelte: Record<number, Scelta | undefined>): DaPrenotare[] {
  const lista: DaPrenotare[] = g.adesso.map((voce) => ({ voce, classId: voce.d.class_id, come: 'posto' as const }))
  const prese = new Set<number>(g.adesso.map((v) => v.d.class_id))
  for (const c of g.complete) {
    const s = scelte[c.d.class_id] ?? 'attesa'
    if (s === 'salta') continue
    if (s === 'attesa') {
      lista.push({ voce: c, classId: c.d.class_id, come: 'attesa' })
      continue
    }
    const alt = c.alternative.find((a) => a.class_id === s)
    if (!alt || prese.has(alt.class_id)) continue
    prese.add(alt.class_id)
    lista.push({ voce: c, classId: alt.class_id, come: 'alternativa', alternativa: alt })
  }
  const inizio = (x: DaPrenotare) => Date.parse(x.alternativa?.inizio ?? x.voce.d.inizio)
  return lista.sort((a, b) => inizio(a) - inizio(b))
}

export const giornoOra = (iso: string) => {
  const d = new Date(iso)
  const giorno = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Rome' })
  return `${giorno} · ${ora}`
}
