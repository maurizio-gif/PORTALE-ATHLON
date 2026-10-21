import { funzione, type BozzaScheda, type Continuo, type SchedaLezione, type Stile } from './lab'

// Il Percorso Athlon (20/10/2026): la funzione portale-lab-percorso di APP-ATHLON. Il «tutor tecnico» compone
// la settimana a tappe di un socio (sala, cardio, lezioni di gruppo); `genera` risponde con una **bozza** e
// non salva niente, `salva` la conferma, `settimana` la trasforma nelle lezioni vere di una settimana con i
// posti e le prenotazioni. **Non e' un piano di allenamento**: quello e' una scheda (esercizi, serie,
// carichi) e qui compare come tappa di sala.
//
// **Il nuoto** (20/10/2026): chi dice di voler nuotare ha, oltre ai turni di Nuoto Libero della settimana, un **piano di
// nuoto** (un piano come gli altri, con gli esercizi di vasca) che si conferma insieme al percorso: ogni tappa di Nuoto
// Libero apre un suo giorno, «cosa fai in vasca oggi». Si legge in vasca, non si registra.
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
  /** Quante volte a settimana in vasca (0-3): turni di Nuoto Libero **in piu'** delle lezioni, ognuno col suo giorno del piano di nuoto. */
  nuoto_volte: number
  /** Gli stili che sa nuotare e quanti metri nuota di fila: servono solo con `nuoto_volte` > 0. Il Nuoto Libero chiede stile libero e dorso. */
  nuoto_stili: Stile[]
  nuoto_continuo: Continuo | null
  limitazioni: string
  note: string
}

/**
 * Cio' che del questionario si conserva col percorso: niente di sanitario. `nuoto_minuti` lo sceglie la funzione dal turno
 * del Nuoto Libero (di solito un'ora): non e' una risposta del socio e non sta nel questionario.
 */
export type Preferenze = Pick<
  Questionario,
  'giorni' | 'sala_volte' | 'lezioni_volte' | 'minuti_sala' | 'gruppi' | 'preferite' | 'evitate' | 'fasce' | 'giorni_liberi' | 'cardio' | 'includi_non_comprese' | 'nuoto_volte' | 'nuoto_stili' | 'nuoto_continuo'
> & { nuoto_minuti?: 30 | 45 | 60 }

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
  /**
   * Solo per una lezione di Nuoto Libero: il giorno del piano di nuoto che si fa in quella vasca. Una **posizione** (la prima
   * seduta, la seconda…), come la sala, non un id. Nella bozza `scheda_id` e' null e `giorno_posizione` indica la seduta di
   * `PercorsoBozza.piano_nuoto` (il piano non esiste ancora); dopo la conferma e' il piano vero.
   */
  piano?: {
    scheda_id: string | null
    giorno_posizione: number
    scheda_titolo: string
    giorno_nome: string | null
    /** Solo in lettura: l'id di adesso del giorno, se il piano si apre ancora, e quanti metri e'. */
    giorno_id?: string | null
    disponibile?: boolean
    metri?: number
  }
  cardio?: { esercizio_id: string; nome: string }
}

/** Il piano di nuoto scritto insieme al percorso: la stessa forma di una bozza di piano, con `ambiente: 'vasca'`. */
export type PianoNuotoBozza = BozzaScheda & { ambiente: 'vasca' }

export type PercorsoBozza = {
  titolo: string
  sintesi: string
  obiettivo: Obiettivo
  livello: Livello
  preferenze: Preferenze
  tappe: Tappa[]
  /** Il piano di nuoto che le tappe di Nuoto Libero aprono: si conferma con il percorso. Assente se non e' stato chiesto o non e' riuscito. */
  piano_nuoto?: PianoNuotoBozza
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

// ---------------------------------------------------------------------------
// I consigli di Athlon (20/10/2026, rifatti il 21/10/2026)
//
// Al posto di una settimana composta e controllata, il socio riceve dei **consigli**: dal suo profilo (uno o piu' obiettivi,
// se ha mai praticato, se ha smesso o se pratica gia', cosa gli piace, quando preferisce venire) quali tipi di lezione
// potrebbero interessargli e perche', con le alternative e **gli orari in cui li trova**, e dove serve una **seduta** in sala o
// in vasca, che porta a comporre il piano di allenamento. **Giorni e fasce sono preferenze, non vincoli**: ordinano, non
// tolgono. L'AI dice cosa e perche'; la funzione trova gli orari e le prossime lezioni vere, coi posti. **Non si salva niente e
// non c'e' nessuna regola «dentro il percorso»**: ogni lezione si prenota come dal Calendario. Il questionario non si conserva
// (le limitazioni sono dati sulla salute): arriva al modello e basta.

export type NuotoScelta = 'libero' | 'imparare' | null

export const ESPERIENZE = ['mai', 'ex', 'pratico'] as const
export type Esperienza = (typeof ESPERIENZE)[number]
export const PAUSE = ['meno_di_un_anno', 'da_uno_a_tre_anni', 'oltre_tre_anni'] as const
export type Pausa = (typeof PAUSE)[number]
export const DISCIPLINE = ['sala_pesi', 'corsa', 'corsi_di_gruppo', 'yoga_pilates', 'nuoto', 'sport_di_squadra', 'combattimento', 'danza', 'ciclismo', 'altro'] as const
export type Disciplina = (typeof DISCIPLINE)[number]
export const INTENSITA = ['dolce', 'media', 'intensa'] as const
export type Intensita = (typeof INTENSITA)[number]
export const PERSONAL_ESPERIENZE = ['mai', 'passato', 'ora'] as const
export type PersonalEsperienza = (typeof PERSONAL_ESPERIENZE)[number]
export const PERSONAL_INTERESSI = ['no', 'curioso', 'si'] as const
export type PersonalInteresse = (typeof PERSONAL_INTERESSI)[number]
/** I bisogni dietro agli obiettivi: le domande indirette sul personal. */
export const BISOGNI = ['tecnica', 'scadenza', 'ripresa', 'costanza', 'su_misura'] as const
export type Bisogno = (typeof BISOGNI)[number]
/** Quanti macro obiettivi si scelgono insieme (lo stesso tetto della funzione). */
export const OBIETTIVI_MAX = 3

export type QuestionarioConsigli = {
  /** Da uno a tre macro obiettivi, il primo e' il principale. */
  obiettivi: Obiettivo[]
  /** Lo stesso di `obiettivi[0]`: per una funzione di prima, che leggeva un obiettivo solo. */
  obiettivo: Obiettivo
  esperienza: Esperienza
  /** Solo per chi ha smesso: da quanto. */
  pausa: Pausa | null
  /** Cosa pratica o praticava (vuoto per chi non ha mai praticato). */
  discipline: Disciplina[]
  /** La forma di oggi; per chi non ha mai praticato e' «principiante». */
  livello: Livello
  intensita: Intensita | null
  /** Quante volte a settimana pensa di venire (1-6): dice quanti consigli dare. */
  volte_settimana: number
  /** I generi di lezione che gli piacciono. */
  gruppi: Gruppo[]
  /** Gli piace allenarsi in sala pesi per conto suo. */
  sala: boolean
  /** `libero`: sa stile libero e dorso; `imparare`: si parte dalla Scuola Nuoto Adulti. */
  nuoto: NuotoScelta
  /** I nomi delle lezioni che non vuole: la funzione li confronta senza maiuscole e accenti. Sono l'unico limite duro. */
  evitate: string[]
  /** Quando preferisce venire: **non vincolante**. */
  fasce: Fascia[]
  /** Giorni preferiti (1-7): **non vincolanti**; vuoto = nessuna preferenza. */
  giorni: number[]
  includi_non_comprese: boolean
  /** Se l'ha mai seguito un personal trainer; null se non l'ha detto. */
  personal_esperienza: PersonalEsperienza | null
  /** Se gli piacerebbe; con «no» il personal non si propone. */
  personal_interesse: PersonalInteresse | null
  bisogni: Bisogno[]
  limitazioni: string
}

/** Le sedute di personal da affiancare alle lezioni: quante al mese (una e' la seduta singola; 2, 4, 8 gli abbonamenti PT) e perche'. Prezzi e acquisto: `statoPersonal`. */
export type ConsiglioPersonal = { sedute_mese: 1 | 2 | 4 | 8; perche: string | null }

export type TipoConsigliato = {
  /** `class_type_id` di PerfectGym. */
  id: number
  nome: string
  categoria: string
  gruppo: Gruppo | null
  scheda: string | null
  barre: Barre
  minuti: number
  compresa: boolean | null
  /** Almeno uno dei suoi orari, nelle ultime settimane, ha chiuso spesso con tutti i posti presi. */
  spessoCompleta: boolean
}

/** Un orario in cui la lezione si tiene di solito (giorno 1-7, ora di Roma); `tuo` dice se cade nelle sue preferenze (null: non ne ha date). */
export type OrarioLezione = { giorno: number; ora: string; tuo: boolean | null }

/** Una lezione vera nella forma dei pulsanti del Calendario: `dopo` e' sempre null (qui non ci sono limiti «dentro il percorso»). */
export type LezioneConsiglio = DatiLezione & { categoria: string; scheda: string | null; compresa: boolean | null }

export type ConsiglioRisolto = {
  tipo: TipoConsigliato
  perche: string | null
  /** Quante volte a settimana conviene. */
  volte: number
  /** Quando si tiene di solito: vuoto con una funzione di prima. */
  orari: OrarioLezione[]
  /** Le prossime lezioni di questo tipo (vuoto se nei prossimi giorni non ce ne sono). */
  prossime: LezioneConsiglio[]
  alternative: { tipo: TipoConsigliato; orari: OrarioLezione[]; prossime: LezioneConsiglio[] }[]
}

/** Una seduta per conto proprio: in sala (la Gym Floor) o in vasca (il Nuoto Libero). Non si prenota da qui: porta al piano e al calendario. */
export type SedutaConsigliata = {
  ambiente: 'sala' | 'vasca'
  /** Cosa fare, in poche parole («un lavoro di forza con i pesi»). */
  cosa: string | null
  perche: string | null
  volte: number
  giorni: number[]
  fascia: FasciaSala
  /** I prossimi giorni (AAAA-MM-GG) con turni da prenotare, per aprire il calendario. */
  prossimi: string[]
}

export type StatoConsigli = {
  member_id: number
  maggiorenne: boolean
  /** Le richieste fatte oggi e il massimo: si contano in un giorno, a differenza del Percorso. */
  quota: Quota
  /** Falso se il servizio dei consigli non e' acceso. */
  attivo: boolean
  idoneita: Idoneita
}

export type RispostaConsigli = {
  member_id: number
  sintesi: string | null
  integrazione: string | null
  consigli: ConsiglioRisolto[]
  sedute: SedutaConsigliata[]
  personal: ConsiglioPersonal | null
  schede: SchedeLezioni
  avvisi: string[]
  /** Falso se PerfectGym non ha risposto: i consigli si vedono, ma non si sa cosa e' gia' prenotato. */
  prenotazioni_lette: boolean
  quota: Quota
}

/** Per aprire la schermata: se i consigli sono accesi, se il socio puo' usarli, quante richieste gli restano oggi. */
export async function statoConsigli(): Promise<Esito<StatoConsigli>> {
  const { ok, dati, stato } = await chiama({ azione: 'consigli_stato' })
  if (ok)
    return {
      ok: true,
      member_id: Number(dati.member_id),
      maggiorenne: !!dati.maggiorenne,
      quota: dati.quota ?? { usate: 0, massimo: 10 },
      attivo: dati.attivo !== false,
      idoneita: dati.idoneita ?? { categorie: null, incerta: true },
    }
  // Una funzione che non conosce ancora l'azione risponde «Azione sconosciuta.»: per il socio e' «non ancora attivo».
  if (dati.errore === 'Azione sconosciuta.') return { ok: false, errore: 'I consigli non sono ancora attivi: riprova più avanti.', stato: 503 }
  return errore(dati, stato, 'Non riusciamo ad aprire i consigli adesso.')
}

/** Il questionario va all'AI e non si conserva. Ci vogliono pochi secondi, a volte mezzo minuto. */
export async function chiediConsigli(q: QuestionarioConsigli): Promise<Esito<{ risposta: RispostaConsigli }>> {
  const { ok, dati, stato } = await chiama({ azione: 'consigli', questionario: q })
  if (ok && Array.isArray(dati.consigli)) {
    return {
      ok: true,
      risposta: {
        member_id: Number(dati.member_id),
        sintesi: dati.sintesi ?? null,
        integrazione: dati.integrazione ?? null,
        // Una funzione di prima non manda gli orari: le carte restano senza «di solito».
        consigli: (dati.consigli as ConsiglioRisolto[]).map((c) => ({ ...c, orari: c.orari ?? [], alternative: (c.alternative ?? []).map((a) => ({ ...a, orari: a.orari ?? [] })) })),
        sedute: Array.isArray(dati.sedute) ? dati.sedute : [],
        personal: dati.personal && typeof dati.personal === 'object' ? dati.personal : null,
        schede: dati.schede ?? {},
        avvisi: dati.avvisi ?? [],
        prenotazioni_lette: dati.prenotazioni_lette !== false,
        quota: dati.quota ?? { usate: 0, massimo: 10 },
      },
    }
  }
  if (dati.errore === 'Azione sconosciuta.') return { ok: false, errore: 'I consigli non sono ancora attivi: riprova più avanti.', stato: 503 }
  return errore(dati, stato, 'L’assistente non è riuscito a dare i consigli adesso. Riprova fra qualche minuto.')
}
