// Le guide con il video che si propongono la prima volta che si apre una sezione (08/11/2026, richiesta di Maurizio: «una finestra
// che manda al relativo articolo dell'Help Desk con il video»). Questa parte e' pura, cosi' si prova senza schermata (`npx tsx`):
// quale guida va con quale schermata, e il «gia' visto». `GuidaPrimaVolta.tsx` la usa, e le parole stanno in `testi.ts`.
//
// **Le guide sono schede dell'Help Desk** (area «L'app Athlon Club» e «Athlon Health System», `articoli-app/` del sito): la finestra
// non ricopia niente, apre la scheda con `percorsoScheda`. Se la scheda non e' nel feed di Club Life (il sito non e' ancora stato
// pubblicato, o l'hanno tolta) la finestra non compare: una finestra che porta a una pagina che non c'e' e' peggio di nessuna finestra.

export type ChiaveGuida = 'home' | 'prenotazioni' | 'junior' | 'certificato' | 'invita' | 'ahs'

/** L'id della scheda (`area/slug`) a cui porta ogni guida. */
export const SCHEDA_DI_GUIDA: Record<ChiaveGuida, string> = {
  home: 'app/home',
  prenotazioni: 'app/prenotazioni',
  junior: 'app/junior',
  certificato: 'app/certificato',
  invita: 'app/invita-un-amico',
  ahs: 'ahs/cos-e',
}

export const CHIAVI_GUIDA = Object.keys(SCHEDA_DI_GUIDA) as ChiaveGuida[]

/**
 * Quale guida va con la schermata in cui si e'. `percorso` e' quello di expo-router (`/`, `/calendario`...), `sezione` il parametro
 * `?sezione=` della Home. **Solo la schermata principale**: dentro un piano, un pagamento o una pagina di Athlon Health System la
 * persona sta gia' facendo qualcosa, e la guida di quella sezione l'ha vista (o l'ha rimandata) entrando.
 */
export function guidaDiRotta(percorso: string, sezione?: string | null): ChiaveGuida | null {
  const p = percorso.replace(/\/+$/, '') || '/'
  if (p === '/') return sezione === 'certificato' ? 'certificato' : 'home'
  if (p === '/calendario') return 'prenotazioni'
  if (p === '/junior') return 'junior'
  if (p === '/invita') return 'invita'
  if (p === '/allenamento') return 'ahs'
  return null
}

/** Un archivio come `localStorage`: tanto basta, e cosi' si prova senza browser. */
export type Memoria = Pick<Storage, 'getItem' | 'setItem'>

/**
 * La chiave del «gia' visto»: **per persona e per dispositivo**. Su un telefono condiviso la guida la vede ognuno la sua volta; e chi esce
 * e rientra non se la ritrova, perche' l'identificativo e' lo stesso.
 */
export function chiaveMemoria(utente: string, guida: ChiaveGuida): string {
  return `athlon:guida:${utente}:${guida}`
}

/** Non solleva mai: senza la memoria del browser la guida torna a ogni apertura, che e' meglio di non vederla mai. */
export function giaVista(memoria: Memoria | undefined, utente: string, guida: ChiaveGuida): boolean {
  try {
    return memoria?.getItem(chiaveMemoria(utente, guida)) === '1'
  } catch {
    return false
  }
}

export function segnaVista(memoria: Memoria | undefined, utente: string, guida: ChiaveGuida): void {
  try {
    memoria?.setItem(chiaveMemoria(utente, guida), '1')
  } catch {
    // Niente memoria: la guida tornera' alla prossima apertura, e va bene.
  }
}

/** La scheda c'e' nel feed? `schede` e' l'elenco di Club Life (basta l'id). */
export function schedaPresente(guida: ChiaveGuida, schede: readonly { id: string }[] | undefined | null): boolean {
  const id = SCHEDA_DI_GUIDA[guida]
  return Boolean(schede?.some((s) => s.id === id))
}
