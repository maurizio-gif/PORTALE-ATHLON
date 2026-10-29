// Cosa si vede della classifica (29/10/2026): le posizioni, quali righe si mostrano, il nome pubblico e il mese. Puro.
//
// **Parita'**: la stessa posizione (1, 2, 2, 4: «classifica sportiva»). **Si vedono le prime dieci posizioni e, se la persona e' piu' in
// basso, lei con due righe sopra e due sotto**: niente elenco completo (decisione di Maurizio). Chi e' alla pari al decimo posto entra tutto.
// **Non esce mai un member_id**: la riga ha un identificativo opaco (`riga_id`) che cambia ogni mese.

export type Candidato = { member_id: number; riga_id: string; punti: number }
export type Posizionato = Candidato & { posizione: number }

/** Le posizioni di una lista GIA' ordinata per punti decrescenti: parimerito = stessa posizione, poi si salta (1, 2, 2, 4). */
export function posizioni(ordinati: Candidato[]): Posizionato[] {
  let posizione = 0
  let ultimi: number | null = null
  return ordinati.map((c, i) => {
    if (ultimi === null || c.punti !== ultimi) {
      posizione = i + 1
      ultimi = c.punti
    }
    return { ...c, posizione }
  })
}

/** Le prime `primi` posizioni e, se `io` e' piu' in basso, lui con `vicini` righe sopra e sotto. In ordine, senza ripetizioni. */
export function scegliRighe(p: Posizionato[], io: number | null, primi = 10, vicini = 2): Posizionato[] {
  const scelte = new Set<number>()
  p.forEach((r, i) => {
    if (r.posizione <= primi) scelte.add(i)
  })
  const mio = io === null ? -1 : p.findIndex((r) => r.member_id === io)
  if (mio >= 0 && !scelte.has(mio)) for (let i = Math.max(0, mio - vicini); i <= Math.min(p.length - 1, mio + vicini); i++) scelte.add(i)
  return [...scelte].sort((a, b) => a - b).map((i) => p[i])
}

/** Una riga come la vede un altro socio: niente member_id, niente cognome intero, niente punti dei pilastri. */
export type RigaPubblica = { id: string; posizione: number; nome: string; punti: number; motto: string | null; foto: string | null; tu: boolean }
export type DettaglioRiga = { nome: string | null; cognome: string | null; motto: string | null; motto_nascosto: boolean }

/** L'unico posto che costruisce cio' che esce per ogni riga: il motto nascosto dallo staff non esce, la foto arriva gia' decisa (firmata o null). */
export function rigaPubblica(r: Posizionato, d: DettaglioRiga | undefined, foto: string | null, io: number): RigaPubblica {
  return {
    id: r.riga_id,
    posizione: r.posizione,
    nome: nomePubblico(d?.nome, d?.cognome),
    punti: r.punti,
    motto: d && !d.motto_nascosto ? d.motto : null,
    foto,
    tu: r.member_id === io,
  }
}

const iniziale = (s: string) => s.charAt(0).toLocaleUpperCase('it-IT') + s.slice(1).toLocaleLowerCase('it-IT')

/** «Marco R.»: il primo nome (anche «Anna-Maria») e l'iniziale del cognome. Non il cognome intero, mai. */
export function nomePubblico(nome: string | null | undefined, cognome: string | null | undefined): string {
  const primo = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  const n = primo.split('-').map(iniziale).join('-')
  const c = String(cognome ?? '').trim().charAt(0).toLocaleUpperCase('it-IT')
  if (!n && !c) return 'Socio'
  return c ? `${n || 'Socio'} ${c}.` : n
}

export type MeseClassifica = { id: string; inizio: string; fine: string; giorni_rimasti: number }

/** Il mese di `oggi` (a Roma): «AAAA-MM», primo e ultimo giorno, e quanti giorni restano (oggi compreso: l'ultimo giorno e' 1). */
export function meseDa(oggi: string): MeseClassifica {
  const anno = Number(oggi.slice(0, 4))
  const mese = Number(oggi.slice(5, 7))
  const fine = new Date(Date.UTC(anno, mese, 0)).toISOString().slice(0, 10)
  const resta = Math.round((Date.parse(`${fine}T12:00:00Z`) - Date.parse(`${oggi}T12:00:00Z`)) / 86_400_000) + 1
  return { id: oggi.slice(0, 7), inizio: `${oggi.slice(0, 7)}-01`, fine, giorni_rimasti: resta }
}

/** Il giorno di `d` a Roma, «AAAA-MM-GG». */
export const giornoRoma = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
