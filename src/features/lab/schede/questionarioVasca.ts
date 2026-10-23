// Il questionario a passi della vasca (22/10/2026, richiesta di Maurizio: «qualcosa di piu' semplice e focalizzato sull'acqua»): una
// domanda per schermata, come in sala (`PassiVasca.tsx`), ma con le parole dell'acqua e **sei domande sole**: cosa vuoi ottenere in
// vasca, che stili sai nuotare, quanto nuoti di fila (anche in vasche da 25 m), quanto tempo hai, quante volte vieni, e se hai fastidi.
// Squat, piegamenti, strumenti, cardio e il resto del questionario di sala qui non ci sono: in acqua non servono.
//
// Tutto quello che segue e' puro (si prova con `LC_ALL=it_IT.UTF-8 npx tsx`: `t()` fuori da un browser sceglie l'inglese). **La funzione
// non e' cambiata**: `chiedi_nuoto` riceve lo stesso `QuestionarioNuoto` di prima (`_shared/nuoto/questionario.ts` di APP-ATHLON, che
// ricontrolla ogni risposta). Le etichette dell'acqua («Nuotare meglio») sono i valori di sempre («Tecnica»); il livello non si chiede,
// si stima da stili e distanza e si mostra nel riepilogo, dove il socio lo puo' cambiare; i fastidi, che sono dati sulla salute, vanno
// nel testo delle limitazioni e **non si conservano**: solo in memoria (`rispostePiano.ts`), come in sala.
//
// **Il Nuoto Libero chiede stile libero e dorso** (non e' un giudizio sul livello: e' la regola del corso). Chi non li sa non va avanti e
// legge dove si comincia (`MESSAGGIO_SCUOLA_NUOTO`, in `@/api/lab`); la stessa regola e' nella funzione, che risponde 400.

import type { Continuo, QuestionarioNuoto, Stile } from '@/api/lab'

import { t } from '../../../lib/lingua'
import { CONTINUO_ELENCO, MINUTI_VASCA, NOME_CONTINUO, NOME_STILE } from './nuoto'
import { eSalute, nomeObiettivo, NESSUNO, OBIETTIVO_SALUTE, ZONE, type CondizioneSalute, type Livello, type Opzione, type Zona } from './questionario'

// ---- cosa si risponde ------------------------------------------------------------------------------------------------------

/**
 * Gli obiettivi con le parole dell'acqua. `valore` e' quello che la funzione conosce (`OBIETTIVI_NUOTO`), l'etichetta e' per il socio.
 * Mobilita', Forza e Ipertrofia non ci sono: in acqua non sono obiettivi che una persona si dia (la funzione li accetta ancora).
 */
export const OBIETTIVI_ACQUA: Opzione<string>[] = [
  { valore: 'Tecnica', testo: t('Nuotare meglio', 'Swim better'), nota: t('Stile, respirazione, bracciata', 'Technique, breathing, stroke') },
  { valore: 'Resistenza', testo: t('Avere più fiato', 'Build stamina'), nota: t('Nuotare più a lungo senza fermarmi', 'Swim longer without stopping') },
  { valore: 'Tonificazione', testo: t('Tonificarmi', 'Tone up'), nota: t('Lavorare tutto il corpo, senza impatto', 'Work the whole body, with no impact') },
  { valore: 'Dimagrimento', testo: t('Dimagrire', 'Lose weight'), nota: t('Tanto movimento continuo, dolce per le articolazioni', 'Plenty of steady movement, easy on the joints') },
  { valore: 'Benessere generale', testo: t('Stare bene', 'Feel good'), nota: t('Un po’ di tutto, senza fretta', 'A bit of everything, no rush') },
]
/** «Salute» e' l'ultima carta e non produce un piano: porta al personal trainer (`SaluteBlocco`), come in sala. */
export const OBIETTIVO_ACQUA_SALUTE: Opzione<string> = { valore: OBIETTIVO_SALUTE, testo: nomeObiettivo(OBIETTIVO_SALUTE), nota: t('Un recupero o una patologia', 'A recovery or a medical condition') }

/** Come si legge un obiettivo nel riepilogo: l'etichetta dell'acqua, o quella di sempre se non e' fra queste. */
export const nomeObiettivoAcqua = (o: string | null): string => (o ? [...OBIETTIVI_ACQUA, OBIETTIVO_ACQUA_SALUTE].find((x) => x.valore === o)?.testo ?? nomeObiettivo(o) : '')

/** Quanto nuota di fila, anche in vasche: la vasca del Nuoto Libero e' da 25 m, quindi quattro vasche sono 100 m. */
const VASCHE: Record<Continuo, string> = {
  sotto_100: t('meno di 4 vasche', 'under 4 lengths'),
  '100_400': t('da 4 a 16 vasche', '4 to 16 lengths'),
  '400_1000': t('da 16 a 40 vasche', '16 to 40 lengths'),
  oltre_1000: t('più di 40 vasche', 'over 40 lengths'),
}
export const DISTANZE_VASCA: Opzione<Continuo>[] = CONTINUO_ELENCO.map(({ valore, testo }) => ({ valore, testo, nota: `${NOME_CONTINUO[valore].nota} · ${VASCHE[valore]}` }))

const NOTA_DURATA: Record<(typeof MINUTI_VASCA)[number], string> = {
  30: t('Una seduta breve, per le giornate piene', 'A short session, for busy days'),
  45: t('Riscaldamento, lavoro e defaticamento, senza fretta', 'Warm-up, main work and cool-down, no rush'),
  60: t('Tutto il turno del Nuoto Libero', 'The whole Nuoto Libero slot'),
}
export const DURATE_VASCA: Opzione<string>[] = MINUTI_VASCA.map((n) => ({ valore: String(n), testo: t(`${n} minuti`, `${n} minutes`), nota: NOTA_DURATA[n] }))

/** In acqua contano poche zone: quelle che un nuotatore sente davvero (spalle e collo, schiena, ginocchia nella rana, anche). Il resto lo scrive a mano. */
const ZONE_DELL_ACQUA: readonly Zona[] = ['spalle', 'cervicale', 'lombare', 'ginocchia', 'anche']
export const ZONE_VASCA = ZONE_DELL_ACQUA.map((v) => ZONE.find((z) => z.valore === v)!)
/** Come si scrivono al modello, che legge l'italiano qualunque sia la lingua dell'app. */
const ZONA_PER_IL_MODELLO: Record<string, string> = { spalle: 'spalle', cervicale: 'collo e cervicale', lombare: 'zona lombare', ginocchia: 'ginocchia', anche: 'anche' }

export const LIVELLI_VASCA: Opzione<Livello>[] = [
  { valore: 'principiante', testo: t('Principiante', 'Beginner'), nota: t('Nuoto da poco o riprendo dopo una pausa', 'I’ve just started swimming or I’m getting back after a break') },
  { valore: 'intermedio', testo: t('Intermedio', 'Intermediate'), nota: t('Nuoto con regolarità e me la cavo con più stili', 'I swim regularly and manage more than one stroke') },
  { valore: 'esperto', testo: t('Esperto', 'Advanced'), nota: t('Nuoto da anni e reggo lunghe distanze', 'I’ve swum for years and can handle long distances') },
]

/**
 * Le risposte, com'e' mentre si compila. `null` o vuoto = non ancora risposto. «Nessuno» sta dentro `stili` e `zone` come risposta che
 * esclude le altre: chi non sa ancora nessuno stile ha risposto (e legge dove si comincia), ed e' diverso da chi non ha ancora risposto.
 */
export type RisposteVasca = {
  obiettivo: string | null
  /** Sotto «Salute»: di cosa si tratta. Serve solo a dirlo al socio: qualunque sia, si va dal personal trainer. */
  condizione: CondizioneSalute | null
  stili: (Stile | typeof NESSUNO)[]
  continuo: Continuo | null
  /** Il livello scelto a mano dopo aver visto quello stimato; `null` = vale lo stimato. */
  livello: Livello | null
  minuti: 30 | 45 | 60 | null
  /** Le sedute scelte; `null` = vale il numero consigliato. */
  volte: number | null
  zone: (Zona | typeof NESSUNO)[]
  /** Facoltativo, e solo se c'e' una zona: «la spalla destra mi fa male quando respiro a destra». */
  limitazioni: string
}

export const RISPOSTE_VASCA_VUOTE: RisposteVasca = {
  obiettivo: null,
  condizione: null,
  stili: [],
  continuo: null,
  livello: null,
  minuti: null,
  volte: null,
  zone: [],
  limitazioni: '',
}

// ---- le regole -------------------------------------------------------------------------------------------------------------

/** Gli stili davvero scelti (senza «nessuno»). */
export const stiliVeri = (r: Pick<RisposteVasca, 'stili'>): Stile[] => r.stili.filter((s): s is Stile => s !== NESSUNO)

/**
 * Il Nuoto Libero chiede stile libero e dorso. **Stessa regola di `saNuotareAbbastanza` in `@/api/lab` e della funzione**: la si scrive
 * qui perche' importarla porterebbe il client di Supabase dentro un file che si prova senza rete.
 */
export const sapereAbbastanza = (stili: readonly Stile[]): boolean => stili.includes('stile_libero') && stili.includes('dorso')

/** Chi ha risposto sugli stili ma non ha stile libero e dorso: il messaggio della Scuola Nuoto e' suo. Vuoto finche' non ha scelto niente. */
export const vaAllaScuolaNuoto = (r: Pick<RisposteVasca, 'stili'>): boolean => r.stili.length > 0 && !sapereAbbastanza(stiliVeri(r))

/**
 * Il livello che si ricava da quello che il socio ha detto: quanto nuota di fila e quanti stili sa (da tre in su conta un punto). **Soglie
 * nostre**, da far validare dal Direttore Tecnico: il socio lo vede nel riepilogo e lo puo' cambiare, e' una stima e non un giudizio.
 *  - fino a 100-400 m di fila con due stili: principiante; da 400 m, o con tre stili e 100-400 m: intermedio;
 *  - oltre 1000 m di fila e almeno tre stili: esperto (e' il solo livello che apre lo sprint e la farfalla, nella funzione).
 */
export function livelloVascaDa(r: Pick<RisposteVasca, 'stili' | 'continuo'>): Livello {
  const metri = r.continuo ? CONTINUO_ELENCO.findIndex((c) => c.valore === r.continuo) : 0
  const punti = Math.max(0, metri) + (stiliVeri(r).length >= 3 ? 1 : 0)
  return punti >= 4 ? 'esperto' : punti >= 2 ? 'intermedio' : 'principiante'
}

/** Il livello che vale: quello scelto a mano, se c'e', altrimenti lo stimato. */
export const livelloVascaScelto = (r: RisposteVasca): Livello => r.livello ?? livelloVascaDa(r)

/**
 * Quante volte a settimana consigliamo. **Soglie nostre, da far validare dal Direttore Tecnico.** Due, tre per un esperto; una in piu'
 * per chi punta a fiato o dimagrimento (se e' intermedio) e per le sedute da mezz'ora; fra due e quattro: una volta sola a settimana in
 * acqua non fa progredire. Lo calcola il codice, non un modello: il socio lo vede come «Consigliato» e sceglie lui.
 */
export function volteConsigliate(r: Pick<RisposteVasca, 'obiettivo' | 'minuti'> & { livello: Livello }): number {
  let n = r.livello === 'esperto' ? 3 : 2
  if (r.livello === 'intermedio' && (r.obiettivo === 'Resistenza' || r.obiettivo === 'Dimagrimento')) n += 1
  if (r.minuti !== null && r.minuti <= 30) n += 1
  return Math.max(2, Math.min(4, n))
}

export const volteScelte = (r: RisposteVasca): number => r.volte ?? volteConsigliate({ ...r, livello: livelloVascaScelto(r) })

/** I passi, nell'ordine. «Il tuo livello» non e' un passo di fila: si apre dal riepilogo (`PassoVascaTutti`). */
export const PASSI_VASCA = ['obiettivo', 'stili', 'distanza', 'durata', 'volte', 'fastidi', 'riepilogo'] as const
export type PassoVasca = (typeof PASSI_VASCA)[number]
export type PassoVascaTutti = PassoVasca | 'livello'

/**
 * Se si puo' andare avanti da questo passo. Obbligatori: l'obiettivo (non «Salute»: lo ferma il riquadro del personal trainer), stile
 * libero e dorso, quanto nuota di fila, quanto dura la seduta, un fastidio o «nessuno». Le volte hanno sempre un valore (il consigliato).
 */
export function passoVascaCompleto(passo: PassoVascaTutti, r: RisposteVasca): boolean {
  switch (passo) {
    case 'obiettivo':
      return !!r.obiettivo && !eSalute(r.obiettivo)
    case 'stili':
      return sapereAbbastanza(stiliVeri(r))
    case 'distanza':
      return !!r.continuo
    case 'durata':
      return !!r.minuti
    case 'volte':
      return volteScelte(r) >= 1
    case 'fastidi':
      return r.zone.length > 0
    case 'livello':
    case 'riepilogo':
      return true
  }
}

/** Si puo' comporre il piano: tutte le risposte obbligatorie ci sono. «Salute» non parte mai (la funzione la rifiuterebbe). */
export const puoComporreVasca = (r: RisposteVasca): boolean =>
  (['obiettivo', 'stili', 'distanza', 'durata', 'fastidi'] as const).every((p) => passoVascaCompleto(p, r))

/** I fastidi come li legge il modello: le zone e, se c'e', quello che il socio ha scritto. Vuoto se non ha fastidi. Al massimo 500 caratteri. */
export function limitazioniVascaDa(r: Pick<RisposteVasca, 'zone' | 'limitazioni'>): string {
  const zone = r.zone.filter((z): z is Zona => z !== NESSUNO)
  if (!zone.length) return ''
  return `Fastidio o dolore a: ${zone.map((z) => ZONA_PER_IL_MODELLO[z] ?? z).join(', ')}. ${r.limitazioni.trim()}`.trim().slice(0, 500)
}

/** Quello che parte per la funzione: lo stesso `QuestionarioNuoto` di sempre. Le note non ci sono piu' (i fastidi stanno nelle limitazioni). */
export function questionarioVascaDa(r: RisposteVasca): QuestionarioNuoto {
  return {
    obiettivo: r.obiettivo!,
    livello: livelloVascaScelto(r),
    volte: volteScelte(r),
    minuti: r.minuti!,
    stili: stiliVeri(r),
    continuo: r.continuo!,
    limitazioni: limitazioniVascaDa(r),
    note: '',
  }
}

// ---- il riepilogo ----------------------------------------------------------------------------------------------------------

/** Una riga del riepilogo: cosa, la risposta, e il passo a cui si torna per cambiarla. */
export type RigaRiepilogoVasca = { titolo: string; valore: string; passo: PassoVascaTutti }

const testoDi = <T extends string>(lista: readonly { valore: T; testo: string }[], v: T | null) => lista.find((x) => x.valore === v)?.testo ?? ''

/** Le righe del riepilogo («Ecco cosa abbiamo capito»): niente promesse. Ogni riga porta al suo passo; il livello e' quello stimato o scelto. */
export function riepilogoVascaDa(r: RisposteVasca): RigaRiepilogoVasca[] {
  const zone = r.zone.filter((z): z is Zona => z !== NESSUNO)
  const righe: RigaRiepilogoVasca[] = [
    { titolo: t('Obiettivo', 'Goal'), valore: nomeObiettivoAcqua(r.obiettivo), passo: 'obiettivo' },
    { titolo: t('Livello', 'Level'), valore: testoDi(LIVELLI_VASCA, livelloVascaScelto(r)), passo: 'livello' },
    { titolo: t('Sedute a settimana', 'Sessions a week'), valore: String(volteScelte(r)), passo: 'volte' },
    { titolo: t('Durata di una seduta', 'Session length'), valore: r.minuti ? `${r.minuti} min` : '', passo: 'durata' },
    { titolo: t('Stili', 'Strokes'), valore: stiliVeri(r).map((s) => NOME_STILE[s]).join(', '), passo: 'stili' },
    { titolo: t('Di fila', 'Without stopping'), valore: r.continuo ? NOME_CONTINUO[r.continuo].titolo : '', passo: 'distanza' },
    { titolo: t('Fastidi', 'Aches'), valore: zone.length ? zone.map((z) => testoDi(ZONE, z)).join(', ') : t('Nessuno', 'None'), passo: 'fastidi' },
  ]
  return righe.filter((x) => x.valore)
}
