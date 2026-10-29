import { funzione } from './lab'
import { t } from '@/lib/lingua'

// La classifica mensile dell'Athlon Health Score (29/10/2026, richiesta di Maurizio): la funzione portale-lab-classifica di APP-ATHLON
// (da scrivere: il contratto e' in `docs/classifica-contratto.md`). Ogni mese si riparte da zero, dal primo all'ultimo giorno (a Roma).
// **Si entra solo con un consenso a parte** (nome e iniziale del cognome, punti e posizione; foto e motto solo se la persona vuole), si esce
// quando si vuole e si sparisce subito. **La classifica la vede solo chi e' dentro**: chi non c'e' vede l'invito e quanti sono, senza nomi.
// **I punti li calcola il server**, da fonti che la persona non scrive (ingressi e presenze segnate dalla reception per Train; il
// diario e il sonno per Food e Recover, come nell'Athlon Health Score): l'app non manda mai un punto, solo il consenso, il motto e se mostrare
// la foto. Le funzioni non sollevano mai: se la funzione non c'e' ancora (404) o risponde che l'azione non esiste, `disponibile: false` e l'app non
// mostra niente della classifica (il punteggio resta com'e').

export type MeseClassifica = {
  /** «AAAA-MM». */
  id: string
  /** «AAAA-MM-GG», primo e ultimo giorno (a Roma). */
  inizio: string
  fine: string
  /** Quanti giorni restano, oggi compreso: l'ultimo giorno del mese e' 1. */
  giorni_rimasti: number
}

export type ProfiloClassifica = { motto: string | null; mostra_foto: boolean }

export type MiaPosizione = {
  /** `null` finche' non ha nemmeno un punto nel mese: non e' in graduatoria. */
  posizione: number | null
  /** Quanti hanno almeno un punto nel mese. */
  su: number
  /** Il punteggio del mese, da 0 a 100 (la media dell'Athlon Health Score nelle settimane del mese, sui pilastri che la persona usa). */
  punti: number
}

export type StatoClassifica = {
  mese: MeseClassifica
  /** La versione corrente dell'informativa della classifica: e' quella che si accetta. */
  versione: string
  maggiorenne: boolean
  consenso: { versione: string; accettato_il: string } | null
  /** Come comparira': «Marco R.». */
  nome_pubblico: string
  /** Quanti sono in classifica (senza nomi: lo vede anche chi non c'e'). */
  partecipanti: number
  profilo: ProfiloClassifica | null
  me: MiaPosizione | null
}

export type RigaClassifica = {
  /** Identificativo della riga per la segnalazione: non e' il member_id di nessuno. */
  id: string
  posizione: number
  nome: string
  punti: number
  motto: string | null
  /** Link firmato (un'ora) della foto, solo per chi ha scelto di mostrarla. */
  foto: string | null
  tu: boolean
}

export type ClassificaMese = {
  mese: MeseClassifica
  /** Le prime dieci posizioni e, se la persona e' piu' in basso, lei con due sopra e due sotto. */
  righe: RigaClassifica[]
  su: number
  aggiornata_il: string | null
}

export type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string; /** La funzione non c'e' (ancora): la classifica non si mostra. */ disponibile: boolean; senzaConsenso?: boolean }

const num = (x: unknown, ripiego = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : ripiego)
const txt = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null)

function mancante(r: Awaited<ReturnType<typeof funzione>>): boolean {
  const e = String(r.dati.errore ?? '')
  return r.stato === 404 || e.startsWith('Azione sconosciuta') || e.startsWith('Unknown action')
}

function errore(r: Awaited<ReturnType<typeof funzione>>, ripiego: string): { ok: false; errore: string; disponibile: boolean; senzaConsenso?: boolean } {
  return { ok: false, errore: String(r.dati.errore ?? ripiego), disponibile: !mancante(r), senzaConsenso: r.dati.consenso === false }
}

function mese(m: unknown): MeseClassifica {
  const x = (m ?? {}) as Record<string, unknown>
  return { id: String(x.id ?? ''), inizio: String(x.inizio ?? ''), fine: String(x.fine ?? ''), giorni_rimasti: Math.max(0, num(x.giorni_rimasti)) }
}

function stato(d: Record<string, any>): StatoClassifica {
  const consenso = d.consenso && typeof d.consenso.versione === 'string' ? { versione: d.consenso.versione as string, accettato_il: String(d.consenso.accettato_il ?? '') } : null
  const me = d.me && typeof d.me === 'object' ? { posizione: d.me.posizione == null ? null : num(d.me.posizione), su: num(d.me.su), punti: num(d.me.punti) } : null
  return {
    mese: mese(d.mese),
    versione: String(d.versione ?? ''),
    maggiorenne: !!d.maggiorenne,
    consenso,
    nome_pubblico: String(d.nome_pubblico ?? ''),
    partecipanti: num(d.partecipanti),
    profilo: d.profilo && typeof d.profilo === 'object' ? { motto: txt(d.profilo.motto), mostra_foto: !!d.profilo.mostra_foto } : null,
    me,
  }
}

const chiama = (corpo: Record<string, unknown>) => funzione('portale-lab-classifica', corpo)

export async function statoClassifica(): Promise<Esito<StatoClassifica>> {
  const r = await chiama({ azione: 'stato' })
  if (!r.ok) return errore(r, t('Non riusciamo a leggere la classifica adesso.', 'We can’t load the leaderboard right now.'))
  return { ok: true, ...stato(r.dati) }
}

/** Il consenso: si entra. Foto e motto sono facoltativi e si possono mettere dopo. Risponde con lo stato aggiornato. */
export async function entraInClassifica(versione: string, profilo?: Partial<ProfiloClassifica>): Promise<Esito<StatoClassifica>> {
  const r = await chiama({ azione: 'consenso', versione, ...(profilo ?? {}) })
  if (!r.ok) return errore(r, t('Non siamo riusciti a metterti in classifica. Riprova.', 'We couldn’t add you to the leaderboard. Try again.'))
  return { ok: true, ...stato(r.dati) }
}

/** Il motto e se mostrare la foto. Il server ricontrolla il motto (lunghezza, indirizzi, parole non ammesse) e risponde 422 col motivo. */
export async function salvaProfiloClassifica(profilo: ProfiloClassifica): Promise<Esito<StatoClassifica>> {
  const r = await chiama({ azione: 'profilo', motto: profilo.motto, mostra_foto: profilo.mostra_foto })
  if (!r.ok) return errore(r, t('Non siamo riusciti a salvare adesso. Riprova.', 'We couldn’t save right now. Try again.'))
  return { ok: true, ...stato(r.dati) }
}

/** Si esce: sparisci dalla classifica subito, e cancelliamo motto e scelta della foto. */
export async function esciDallaClassifica(): Promise<Esito<StatoClassifica>> {
  const r = await chiama({ azione: 'revoca' })
  if (!r.ok) return errore(r, t('Non siamo riusciti a farti uscire adesso. Riprova.', 'We couldn’t take you out right now. Try again.'))
  return { ok: true, ...stato(r.dati) }
}

/** La classifica del mese. Solo per chi e' dentro: senza consenso la funzione risponde 403 con `consenso: false`. */
export async function classificaDelMese(): Promise<Esito<ClassificaMese>> {
  const r = await chiama({ azione: 'mese' })
  if (!r.ok) return errore(r, t('Non riusciamo a leggere la classifica adesso.', 'We can’t load the leaderboard right now.'))
  const righe = Array.isArray(r.dati.righe) ? (r.dati.righe as Record<string, unknown>[]) : []
  return {
    ok: true,
    mese: mese(r.dati.mese),
    righe: righe
      .filter((x) => typeof x.id === 'string' && typeof x.nome === 'string')
      .map((x) => ({ id: x.id as string, posizione: num(x.posizione), nome: x.nome as string, punti: num(x.punti), motto: txt(x.motto), foto: txt(x.foto), tu: !!x.tu })),
    su: num(r.dati.su),
    aggiornata_il: txt(r.dati.aggiornata_il),
  }
}

/** Segnala il motto o la foto di una riga (contenuto che una persona non vuole vedere): lo staff lo guarda dal CRM. */
export async function segnalaRiga(id: string): Promise<Esito<object>> {
  const r = await chiama({ azione: 'segnala', riga: id })
  if (!r.ok) return errore(r, t('Non siamo riusciti a inviare la segnalazione. Riprova.', 'We couldn’t send the report. Try again.'))
  return { ok: true }
}
