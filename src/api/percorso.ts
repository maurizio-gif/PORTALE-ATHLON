import { funzione, type SchedaLezione } from './lab'

// Il Percorso Athlon (20/10/2026): la funzione portale-lab-percorso di APP-ATHLON. Il «tutor tecnico» compone
// la settimana a tappe di un socio (sala, cardio, lezioni di gruppo); `genera` risponde con una **bozza** e
// non salva niente, `salva` la conferma, `settimana` la trasforma nelle lezioni vere di una settimana con i
// posti e le prenotazioni. **Non e' un piano di allenamento**: quello e' una scheda (esercizi, serie,
// carichi) e qui compare come tappa di sala.
//
// Le funzioni non sollevano mai: tornano `{ ok: false, errore }`. Il questionario non si conserva (le
// limitazioni sono dati sulla salute): vive in memoria nell'app e arriva a `genera`, e basta.

type Esito<T> = ({ ok: true } & T) | { ok: false; errore: string; stato?: number }

export const GRUPPI = ['mente_corpo', 'forza_tono', 'cardio_danza', 'acqua', 'combat'] as const
export type Gruppo = (typeof GRUPPI)[number]

export const FASCE = ['mattina_presto', 'mattina', 'pranzo', 'pomeriggio', 'sera', 'weekend'] as const
export type Fascia = (typeof FASCE)[number]

export const OBIETTIVI = ['Tonificazione', 'Ipertrofia', 'Dimagrimento', 'Forza', 'Resistenza', 'Mobilità', 'Benessere generale'] as const
export type Obiettivo = (typeof OBIETTIVI)[number]

export const LIVELLI = ['principiante', 'intermedio', 'esperto'] as const
export type Livello = (typeof LIVELLI)[number]

/** 1 = lunedi' … 7 = domenica, come ISO 8601. */
export type GiornoSettimana = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type TipoTappa = 'lezione' | 'sala' | 'cardio'

/** Le risposte al questionario: arrivano a `genera` e non si conservano. */
export type Questionario = {
  obiettivo: Obiettivo
  livello: Livello
  giorni: number
  sala_volte: number
  lezioni_volte: number
  minuti_sala: number
  gruppi: Gruppo[]
  preferite: string[]
  evitate: string[]
  fasce: Fascia[]
  giorni_liberi: number[]
  cardio: boolean
  includi_non_comprese: boolean
  limitazioni: string
  note: string
}

/** Cio' che del questionario si conserva col percorso: niente di sanitario. */
export type Preferenze = Pick<Questionario, 'giorni' | 'sala_volte' | 'lezioni_volte' | 'minuti_sala' | 'gruppi' | 'preferite' | 'evitate' | 'fasce' | 'giorni_liberi' | 'cardio' | 'includi_non_comprese'>

export type Tappa = {
  giorno: GiornoSettimana
  /** L'ordine nel giorno, da 1. */
  ordine: number
  tipo: TipoTappa
  minuti: number
  /** L'ora di inizio a Roma, «HH:MM». */
  ora: string | null
  /** Per sala e cardio: l'`ordine` della tappa dello stesso giorno a cui sono agganciate, e se vengono prima o dopo. */
  ancora: number | null
  posizione: 'prima' | 'dopo' | null
  /** Una riga del tutor sul perche' c'e' questa tappa. Senza numeri. */
  perche: string | null
  lezione?: { class_type_id: number; nome: string; categoria: string; scheda: string | null; compresa: boolean | null }
  sala?: {
    scheda_id: string
    giorno_posizione: number
    scheda_titolo: string
    giorno_nome: string | null
    /** Solo in lettura: l'id di adesso del giorno, e cosa lavora. */
    giorno_id?: string | null
    disponibile?: boolean
    esercizi?: number
    muscoli_primari?: Record<string, number>
    muscoli_secondari?: Record<string, number>
  }
  cardio?: { esercizio_id: string; nome: string }
}

export type PercorsoBozza = {
  titolo: string
  sintesi: string
  obiettivo: Obiettivo
  livello: Livello
  preferenze: Preferenze
  tappe: Tappa[]
  /** Quale modello l'ha scritta: torna alla funzione al salvataggio, che lo ricontrolla. */
  modello?: string | null
}

export type PercorsoSalvato = PercorsoBozza & { id: string; creato_il: string; aggiornato_il: string }

export type Quota = { usate: number; massimo: number }
export type Idoneita = { categorie: string[] | null; incerta: boolean }
export type SchedeLezioni = Record<string, SchedaLezione>

export type StatoPercorso = {
  percorso: PercorsoSalvato | null
  schede: SchedeLezioni
  quota: Quota
  maggiorenne: boolean
  idoneita: Idoneita
  piani: { suoi: number; del_club: number }
}

const chiama = (corpo: Record<string, unknown>) => funzione('portale-lab-percorso', corpo)

const errore = (dati: Record<string, any>, stato: number, ripiego: string) => ({ ok: false as const, errore: (dati.errore as string) ?? ripiego, stato })

export async function statoPercorso(): Promise<Esito<StatoPercorso>> {
  const { ok, dati, stato } = await chiama({ azione: 'stato' })
  if (ok)
    return {
      ok: true,
      percorso: dati.percorso ?? null,
      schede: dati.schede ?? {},
      quota: dati.quota ?? { usate: 0, massimo: 3 },
      maggiorenne: !!dati.maggiorenne,
      idoneita: dati.idoneita ?? { categorie: null, incerta: true },
      piani: dati.piani ?? { suoi: 0, del_club: 0 },
    }
  return errore(dati, stato, 'Non riusciamo a leggere il tuo percorso adesso.')
}

export async function leggiPercorso(): Promise<Esito<{ percorso: PercorsoSalvato | null; schede: SchedeLezioni }>> {
  const { ok, dati, stato } = await chiama({ azione: 'leggi' })
  if (ok) return { ok: true, percorso: dati.percorso ?? null, schede: dati.schede ?? {} }
  return errore(dati, stato, 'Non riusciamo a leggere il tuo percorso adesso.')
}

// ---------------------------------------------------------------------------
// La settimana vera

export type Limite = { categoria: string; massimo: number; messaggio: string; prenotate: { class_id: number; nome: string; inizio: string; attesa: boolean }[] }

export type DatiLezione = {
  class_id: number
  inizio: string
  fine: string
  nome: string
  istruttore: string | null
  posti: number
  liberi: number
  in_attesa: number
  iniziata: boolean
  prenotabile_dal: string | null
  prenotazione: { booking_id: number; attesa: boolean } | null
  limite: Limite | null
  /** Il limite si libera dopo un'altra lezione dello stesso percorso: quale, e il messaggio da mostrare. */
  dopo: { class_id: number; nome: string; inizio: string; messaggio: string } | null
}

/**
 * Una lezione che il socio puo' prendere al posto di una tappa che e' al completo o che questa settimana non c'e'.
 * **Lo stesso tipo di lezione** (un altro giorno o un'altra ora) viene prima; poi le **simili**, cioe' un altro
 * tipo dello stesso genere, che il socio vede come una cosa diversa e la sceglie lui.
 */
export type Alternativa = DatiLezione & {
  categoria: string
  /** La chiave della scheda in `lezioni.json` (sta in `settimana.schede`), per il pulsante «Dettagli». */
  scheda: string | null
  tipo: 'stessa' | 'simile'
  /** Compresa nell'abbonamento del socio; null se non si sa. */
  compresa: boolean | null
}

export type FasciaSala = 'con_assistenza' | 'libero' | null

export type SlotSala = DatiLezione & { fascia: FasciaSala }

export type TappaSettimana = Tappa & {
  /** Il giorno vero, AAAA-MM-GG. */
  data: string
  stato?: 'c_e' | 'non_c_e'
  lezione_vera?: DatiLezione
  /** Con la lezione al completo (e non del socio) o assente questa settimana: cosa si puo' prendere al suo posto, con posti liberi. */
  alternative?: Alternativa[]
  sala_slot?: SlotSala[]
}

export type Settimana = {
  percorso: { id: string; titolo: string; sintesi: string; obiettivo: Obiettivo; livello: Livello; preferenze: Preferenze } | null
  lunedi: string
  giorni: string[]
  member_id: number
  /** Falso se PerfectGym non ha risposto: la settimana si vede, ma non si sa cosa e' prenotato. */
  prenotazioni_lette: boolean
  tappe: TappaSettimana[]
  schede: SchedeLezioni
}

/** `lunedi` e' AAAA-MM-GG (il lunedi' della settimana, a Roma). */
export async function leggiSettimana(lunedi: string): Promise<Esito<{ settimana: Settimana }>> {
  const { ok, dati, stato } = await chiama({ azione: 'settimana', lunedi })
  if (ok) return { ok: true, settimana: dati as unknown as Settimana }
  return errore(dati, stato, 'Non riusciamo a leggere la tua settimana adesso.')
}

// ---------------------------------------------------------------------------
// Il catalogo, per cambiare una tappa

/** Le quattro barre che il club scrive per ogni lezione del sito, 0-100; null dove la lezione non le ha (non si inventano). */
export type Barre = { muscolare: number | null; cardio: number | null; coordinazione: number | null; flessibilita: number | null }

/** Quante lezioni di questo slot, nelle ultime settimane, hanno chiuso con tutti i posti presi: com'e' andata, non come andra'. */
export type Affollamento = { osservate: number; piene: number }

export type SlotRicorrente = {
  /** `<tipo>-<giorno>-<HHMM>`, per esempio «31-2-1830»: stabile da una settimana all'altra. */
  id: string
  class_type_id: number
  giorno: GiornoSettimana
  ora: string
  minuti: number
  nome: string
  categoria: string
  gruppo: Gruppo | null
  scheda: string | null
  barre: Barre
  compresa: boolean | null
  ricorrenze: number
  /** Null se si sono viste meno di tre lezioni, o se la funzione e' quella di prima. */
  affollamento?: Affollamento | null
}

export type GiornoPiano = { posizione: number; giorno_id: string; nome: string | null; esercizi: number; primari: Record<string, number>; secondari: Record<string, number> }
export type PianoSala = { id: string; titolo: string; del_club: boolean; giorni: GiornoPiano[] }

export type Catalogo = {
  slot: SlotRicorrente[]
  idoneita: Idoneita
  piani: PianoSala[]
  cardio: { id: string; nome: string }[]
  schede: SchedeLezioni
}

export async function leggiCatalogo(includiNonComprese: boolean): Promise<Esito<{ catalogo: Catalogo }>> {
  const { ok, dati, stato } = await chiama({ azione: 'catalogo', includi_non_comprese: includiNonComprese })
  if (ok)
    return {
      ok: true,
      catalogo: { slot: dati.slot ?? [], idoneita: dati.idoneita ?? { categorie: null, incerta: true }, piani: dati.piani ?? [], cardio: dati.cardio ?? [], schede: dati.schede ?? {} },
    }
  return errore(dati, stato, 'Non riusciamo a leggere le lezioni adesso.')
}

// ---------------------------------------------------------------------------
// Il tutor

/** Cosa torna dal tutor: la bozza da rivedere (non e' salvata), le schede delle lezioni usate e gli avvisi. */
export type RispostaTutor = { bozza: PercorsoBozza; schede: SchedeLezioni; avvisi: string[]; scartate: number }

/** Il questionario va al tutor e non si conserva. Ci vogliono una decina di secondi, a volte piu' di un minuto. */
export async function chiediAlTutor(q: Questionario): Promise<Esito<RispostaTutor>> {
  const { ok, dati, stato } = await chiama({ azione: 'genera', questionario: q })
  if (ok && dati.bozza) return { ok: true, bozza: dati.bozza, schede: dati.schede ?? {}, avvisi: dati.avvisi ?? [], scartate: Number(dati.scartate ?? 0) }
  return errore(dati, stato, 'Il tutor non è riuscito a comporre il percorso adesso. Riprova fra qualche minuto.')
}

/** Conferma la bozza (quella del tutor, o rivista a mano): sostituisce il percorso attivo. Il server ricontrolla tutto. */
export async function salvaPercorso(bozza: PercorsoBozza): Promise<Esito<{ id: string }>> {
  const { ok, dati, stato } = await chiama({ azione: 'salva', bozza })
  if (ok) return { ok: true, id: String(dati.id) }
  return errore(dati, stato, 'Non siamo riusciti a salvare il percorso. Riprova.')
}

export async function eliminaPercorso(): Promise<Esito<object>> {
  const { ok, dati, stato } = await chiama({ azione: 'elimina' })
  if (ok) return { ok: true }
  return errore(dati, stato, 'Non siamo riusciti a togliere il percorso. Riprova.')
}
